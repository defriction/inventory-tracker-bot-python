import os.path
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
import gspread

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
    
    # 1. ¿Ya iniciamos sesión antes? (Existe token.json)
    if os.path.exists("token.json"):
        creds = Credentials.from_authorized_user_file("token.json", SCOPES)
    
    # 2. Si no hay credenciales válidas, loguearse
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            # Aquí busca el archivo que descargaste en el Paso 1
            if not os.path.exists("client_secret.json"):
                raise FileNotFoundError("❌ Faltan las credenciales: Descarga el 'client_secret.json' de Google Cloud (OAuth Client Desktop).")
                
            flow = InstalledAppFlow.from_client_secrets_file(
                "client_secret.json", SCOPES
            )
            # Abre el navegador local para login
            creds = flow.run_local_server(port=0)
            
        # 3. Guardar el token para la próxima vez
        with open("token.json", "w") as token:
            token.write(creds.to_json())

    # 4. Retornar el cliente de gspread conectado
    return gspread.authorize(creds)