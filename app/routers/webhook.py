import httpx
import logging
import sys
from fastapi import APIRouter, Request, BackgroundTasks
from app.core.config import settings
from app.services.tenant_service import TenantService
from app.services.inventory_service import InventoryService
from app.services.ia_service import interpret_intent

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

if not logger.handlers:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
    logger.addHandler(handler)

router = APIRouter(
    prefix='/webhook',
    tags=['Integracion Telegram']
)

TELEGRAM_SAFE_TEXT_LIMIT = 3800


def escape_markdown_v2(text):
    """Escapa caracteres para MarkdownV2"""
    chars = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!']
    text = str(text)
    for c in chars:
        text = text.replace(c, f"\\{c}")
    return text


def split_telegram_text(text: str, limit: int = TELEGRAM_SAFE_TEXT_LIMIT) -> list[str]:
    """
    Divide textos largos para evitar el limite de longitud de Telegram.
    Intenta cortar por lineas para no romper reportes.
    """
    raw = str(text or "")
    if len(raw) <= limit:
        return [raw]

    chunks: list[str] = []
    current = ""

    for line in raw.splitlines(keepends=True):
        if len(line) > limit:
            if current:
                chunks.append(current.rstrip("\n"))
                current = ""
            for i in range(0, len(line), limit):
                chunks.append(line[i:i + limit].rstrip("\n"))
            continue

        if len(current) + len(line) > limit:
            chunks.append(current.rstrip("\n"))
            current = line
        else:
            current += line

    if current:
        chunks.append(current.rstrip("\n"))

    return chunks or [raw[:limit]]


async def send_telegram_message(chat_id: str, text: str):
    url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage"
    chunks = split_telegram_text(text)

    async with httpx.AsyncClient() as client:
        try:
            for chunk in chunks:
                response = await client.post(
                    url,
                    json={"chat_id": chat_id, "text": chunk, "parse_mode": "MarkdownV2"}
                )
                # Lanza excepcion si Telegram responde con error HTTP
                response.raise_for_status()
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 401:
                logger.critical("ERROR CRITICO: Telegram dice Unauthorized. Tu token es invalido.")
                masked_token = settings.TELEGRAM_BOT_TOKEN[:5] + "..." if settings.TELEGRAM_BOT_TOKEN else "VACIO"
                logger.critical(f"El sistema esta usando el token que empieza por: '{masked_token}'")
                logger.critical("Verifica tu archivo .env o tus secretos de GitHub.")
            else:
                logger.error(f"Telegram rechazo el mensaje: {e.response.text}")
                # Fallback: reenviar sin parse_mode por si fue error de Markdown
                fallback_text = f"Error de formato en respuesta:\n{text}"
                for chunk in split_telegram_text(fallback_text):
                    await client.post(url, json={"chat_id": chat_id, "text": chunk})
        except Exception as e:
            logger.error(f"Error de conexion enviando a Telegram: {e}")


async def process_telegram_update(data: dict):
    """Logica principal del bot (procesamiento en segundo plano)."""
    try:
        # 1. Extraer datos basicos
        message = data.get("message", {})
        chat_id = message.get("chat", {}).get("id")
        user_id = message.get("from", {}).get("id")
        text = message.get("text", "")
        user_name = message.get("from", {}).get("first_name", "Usuario")

        if not text or not chat_id:
            return

        # 2. Verificar usuario en el sistema
        tenant_service = TenantService()
        tenant = tenant_service.get_tenant_by_user(str(user_id))

        # Flujo A: usuario nuevo (no registrado)
        if not tenant:
            if text.startswith("/conectar"):
                parts = text.split()
                if len(parts) < 2:
                    await send_telegram_message(chat_id, "Debes enviar el token. Ejemplo: `/conectar AB123`")
                    return

                token = parts[1].strip()
                success, msg = tenant_service.link_user(str(user_id), token)
                await send_telegram_message(chat_id, msg)
            else:
                safe_name = escape_markdown_v2(user_name)
                await send_telegram_message(
                    chat_id,
                    f"Hola {safe_name}. No tienes un negocio vinculado.\n"
                    "Si ya compraste el software, envia tu token asi:\n`/conectar TU_CODIGO`"
                )
            return

        # Flujo B: usuario registrado (negocio activo)

        # 3. Interpretar intencion con IA
        intent_json = interpret_intent(text)

        # 4. Ejecutar en su inventario especifico
        inventory_service = InventoryService(sheet_id=tenant['sheet_id'])
        response_text = inventory_service.process_instruction(intent_json, user_name)

        # 5. Responder
        await send_telegram_message(chat_id, response_text)

    except Exception as e:
        logger.error(f"Error procesando webhook: {e}")


@router.post("/telegram")
async def telegram_webhook_handler(request: Request, background_tasks: BackgroundTasks):
    """
    Telegram envia los mensajes aqui.
    Respondemos 200 OK rapido y procesamos en background.
    """
    data = await request.json()
    background_tasks.add_task(process_telegram_update, data)
    return {"status": "ok"}
