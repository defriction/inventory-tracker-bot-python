import uuid
import datetime
import logging
from app.core.google_client import get_gs_client
from app.core.config import settings

logger = logging.getLogger(__name__)

class TenantService:
    def __init__(self):
        # Ahora get_gs_client() usa tus credenciales personales (OAuth)
        self.client = get_gs_client()
        
        try:
            # Conectamos a la DB Maestra
            self.admin_book = self.client.open_by_key(settings.ADMIN_SHEET_ID)
            self.admin_sheet = self.admin_book.worksheet("USUARIOS_PYMES")
        except Exception as e:
            logger.error(f"Error conectando a DB Admin: {e}")
            raise ValueError("No se pudo conectar a la Base de Datos Maestra.")

    def create_tenant(self, name: str, business_type: str, telegram_id: str = ""):
        """
        Crea una nueva Pyme copiando el Template.
        """
        try:
            # 1. Definir nombres y IDs
            new_uuid = str(uuid.uuid4())
            new_filename = f"DB_{name}_{new_uuid[:4]}"
            
            logger.info(f"🚀 Iniciando creación de: {new_filename}...")
            
            # Limpieza del Folder ID (por si en el .env pusiste la URL completa)
            folder_id = settings.SAAS_FOLDER_ID
            if folder_id and "drive.google.com" in folder_id:
                folder_id = folder_id.strip().split("/")[-1]

            # 2. COPIAR EL TEMPLATE (El paso clave)
            # Usamos folder_id para que quede ordenado en tu carpeta SAAS_INVENTARIO
            new_sheet = self.client.copy(
                file_id=settings.TEMPLATE_SHEET_ID, 
                title=new_filename, 
                copy_permissions=False,
                folder_id=folder_id
            )
            
            # NOTA: Ya no necesitamos .share() porque el archivo es tuyo (Human Account)
            
            # 3. Generar Token de Invitación
            token = str(uuid.uuid4())[:6].upper()
            
            # 4. Registrar en la DB Maestra
            timestamp = str(datetime.datetime.now())
            
            self.admin_sheet.append_row([
                str(telegram_id), # Telegram ID (Ahora sí se guarda en la Columna A)
                new_uuid,       # ID Interno
                name,           # Nombre Pyme
                new_sheet.id,   # ID del archivo NUEVO
                token,          # Token de acceso
                timestamp,      # Fecha creación
                business_type   # Tipo de negocio
            ])
            
            logger.info(f"✅ Pyme creada exitosamente: {name}")
            
            return {
                "token": token,
                "sheet_id": new_sheet.id,
                "url": f"https://docs.google.com/spreadsheets/d/{new_sheet.id}"
            }

        except Exception as e:
            logger.error(f"❌ Error creando tenant: {e}")
            raise Exception(f"Fallo al crear la infraestructura: {str(e)}")

    def get_tenant_by_user(self, telegram_id: str):
        """Busca en la DB Admin si el usuario ya tiene hoja asignada"""
        try:
            # Buscamos en la Columna A (Telegram ID) soportando múltiples usuarios (CSV)
            # Obtenemos toda la columna A para buscar manualmente
            owners_col = self.admin_sheet.col_values(1)
            
            for i, val in enumerate(owners_col):
                # val puede ser "123" o "123,456"
                if str(telegram_id) in val.split(','):
                    row = self.admin_sheet.row_values(i + 1) # i+1 porque gspread es 1-based
                    if len(row) > 4: # Aseguramos que la fila tenga datos
                        return {
                            "pyme_name": row[2], 
                            "sheet_id": row[3],
                            "token": row[4]
                        }
            return None
        except Exception:
            return None # No encontrado

    def link_user(self, telegram_id: str, token: str):
        """Vincula un Telegram ID con un Token existente"""
        try:
            # Buscamos el Token en la Columna E (5)
            cell = self.admin_sheet.find(token)
            
            if not cell:
                return False, "❌ Token inválido o no encontrado\."
            
            # Verificar dueños actuales (Columna A)
            current_val = self.admin_sheet.cell(cell.row, 1).value or ""
            owners = [o.strip() for o in current_val.split(',') if o.strip()]
            
            # Si ya está vinculado, no hacemos nada (idempotencia)
            if str(telegram_id) not in owners:
                owners.append(str(telegram_id))
                # Actualizamos la celda con la nueva lista separada por comas
                self.admin_sheet.update_cell(cell.row, 1, ",".join(owners))

            pyme_name = self.admin_sheet.cell(cell.row, 3).value

            # Escapar nombre para MarkdownV2
            safe_pyme = str(pyme_name)
            for c in ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!']:
                safe_pyme = safe_pyme.replace(c, f"\\{c}")
            
            return True, f"✅ ¡Vinculación exitosa\!\nBienvenido a *{safe_pyme}*\."

        except Exception as e:
            logger.error(f"Error vinculando: {e}")
            return False, "Error técnico al vincular cuenta\."