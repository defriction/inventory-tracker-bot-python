import os.path
import logging
import sys
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
import gspread

logger = logging.getLogger(__name__)
if not logger.handlers:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)

# Si modificas estos scopes, borra el archivo token.json.
SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive"
]

def get_gs_client():
    """
    Autenticación como HUMANO (OAuth 2.0).
    Abre el navegador la primera vez para pedir permiso.
    """
    creds = None
    logger.info("🔑 Iniciando autenticación con Google...")
    
    # 1. ¿Ya iniciamos sesión antes? (Existe token.json)
    if os.path.exists("token.json"):
        creds = Credentials.from_authorized_user_file("token.json", SCOPES)
        logger.info("✅ Token encontrado.")
    
    # 2. Si no hay credenciales válidas, loguearse
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            # Aquí busca el archivo que descargaste en el Paso 1
            if not os.path.exists("client_secret.json"):
                raise FileNotFoundError("❌ Faltan las credenciales: Descarga el 'client_secret.json' de Google Cloud (OAuth Client Desktop).")
                
            logger.warning("⚠ Token inválido o inexistente. Intentando flujo OAuth...")
            flow = InstalledAppFlow.from_client_secrets_file(
                "client_secret.json", SCOPES
            )
            
            # EN DOCKER ESTO FALLARÁ SI INTENTA ABRIR NAVEGADOR
            # Solo permitimos esto si estamos en local, de lo contrario avisamos
            logger.info("🖥 Intentando abrir navegador local para login (Si estás en Docker, esto fallará si no tienes token.json válido)...")
            creds = flow.run_local_server(port=0)
            
        # 3. Guardar el token para la próxima vez
        with open("token.json", "w") as token:
            token.write(creds.to_json())

    # 4. Retornar el cliente de gspread conectado
    return gspread.authorize(creds)