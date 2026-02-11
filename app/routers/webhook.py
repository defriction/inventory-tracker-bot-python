import httpx
from fastapi import APIRouter, Request, BackgroundTasks
from app.core.config import settings
from app.services.tenant_service import TenantService
from app.services.inventory_service import InventoryService
from app.services.ia_service import interpret_intent

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
        await client.post(url, json={"chat_id": chat_id, "text": text, "parse_mode": "MarkdownV2"})
        
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
        print(f"❌ Error procesando webhook: {e}")
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