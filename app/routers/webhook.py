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

def escape_markdown_v2(text):
    """Escapa caracteres para MarkdownV2"""
    chars = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!']
    text = str(text)
    for c in chars:
        text = text.replace(c, f"\\{c}")
    return text

async def send_telegram_message(chat_id: str, text: str):
    url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage"
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, json={"chat_id": chat_id, "text": text, "parse_mode": "MarkdownV2"})
            # Esto lanzará una excepción si Telegram devuelve 400 (Bad Request) o 500
            response.raise_for_status()
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 401:
                logger.critical("🚨 ERROR CRÍTICO: Telegram dice 'Unauthorized'. Tu TOKEN es inválido.")
                # Mostramos los primeros 5 caracteres para que verifiques si es el correcto
                masked_token = settings.TELEGRAM_BOT_TOKEN[:5] + "..." if settings.TELEGRAM_BOT_TOKEN else "VACÍO"
                logger.critical(f"🔍 El sistema está usando el token que empieza por: '{masked_token}'")
                logger.critical("👉 Verifica tu archivo .env o tus Secretos de GitHub.")
            else:
                logger.error(f"❌ Telegram rechazó el mensaje: {e.response.text}")
                # FALLBACK: Intentar enviar sin formato Markdown por si hubo un error de sintaxis
                fallback_text = f"⚠️ Error de formato en respuesta:\n{text}"
                await client.post(url, json={"chat_id": chat_id, "text": fallback_text})
        except Exception as e:
            logger.error(f"❌ Error de conexión enviando a Telegram: {e}")
        
async def process_telegram_update(data: dict):
    """Lógica principal del Bot (Procesamiento en segundo plano)"""
    try:
        # 1. Extraer datos básicos
        message = data.get("message", {})
        chat_id = message.get("chat", {}).get("id")
        user_id = message.get("from", {}).get("id")
        text = message.get("text", "")
        user_name = message.get("from", {}).get("first_name", "Usuario")

        if not text or not chat_id:
            return # Ignorar actualizaciones sin texto

        # 2. Verificar Usuario en el Sistema
        tenant_service = TenantService()
        tenant = tenant_service.get_tenant_by_user(str(user_id))

        # --- FLUJO A: USUARIO NUEVO (NO REGISTRADO) ---
        if not tenant:
            # Comando para vincularse: /conectar TOKEN
            if text.startswith("/conectar"):
                parts = text.split()
                if len(parts) < 2:
                    await send_telegram_message(chat_id, "⚠️ Debes enviar el token\. Ejemplo: `/conectar AB123`")
                    return
                
                token = parts[1].strip()
                success, msg = tenant_service.link_user(str(user_id), token)
                await send_telegram_message(chat_id, msg)
            else:
                safe_name = escape_markdown_v2(user_name)
                await send_telegram_message(chat_id, 
                    f"👋 Hola {safe_name}\. No tienes un negocio vinculado\.\n"
                    "Si ya compraste el software, envía tu token así:\n`/conectar TU_CODIGO`"
                )
            return

        # --- FLUJO B: USUARIO REGISTRADO (NEGOCIO ACTIVO) ---
        
        # 3. Interpretar Intención con IA (Groq)
        # Esto convierte "Vendí 2" en {"accion": "VENTA", ...}
        intent_json = interpret_intent(text)

        # 4. Ejecutar en su Inventario Específico
        inventory_service = InventoryService(sheet_id=tenant['sheet_id'])
        response_text = inventory_service.process_instruction(intent_json, user_name)

        # 5. Responder
        await send_telegram_message(chat_id, response_text)

    except Exception as e:
        logger.error(f"❌ Error procesando webhook: {e}")
        # Opcional: Enviar mensaje de error al usuario si es crítico

# --- ENDPOINT PÚBLICO ---

@router.post("/telegram")
async def telegram_webhook_handler(request: Request, background_tasks: BackgroundTasks):
    """
    Telegram envía los mensajes aquí.
    Respondemos 200 OK rápido y procesamos la lógica en background.
    """
    data = await request.json()
    
    # BackgroundTasks es vital para no dejar a Telegram esperando
    background_tasks.add_task(process_telegram_update, data)
    
    return {"status": "ok"}