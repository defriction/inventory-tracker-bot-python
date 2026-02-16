import os
import os.path
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials

# --- CONFIGURACIÓN DE PERMISOS ---
# Estos son los mismos permisos que usa tu bot en el servidor
SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive"
]

def main():
    """Genera un nuevo token.json válido."""
    
    print("--- INICIANDO GENERADOR DE TOKEN ---")

    # 1. Verificar que existe el archivo de credenciales de la App
    if not os.path.exists('client_secret.json'):
        print("❌ ERROR: No encontré el archivo 'client_secret.json'.")
        print("   Descárgalo de Google Cloud Console (OAuth Client ID) y ponlo en esta carpeta.")
        return

    # 2. Borrar el token viejo si existe (para forzar renovación)
    if os.path.exists('token.json'):
        print("🗑️  Eliminando token.json antiguo/vencido...")
        os.remove('token.json')

    # 3. Iniciar el flujo de OAuth
    print("🚀 Abriendo navegador para iniciar sesión...")
    
    try:
        flow = InstalledAppFlow.from_client_secrets_file(
            'client_secret.json', SCOPES)
        
        # Esto abre una ventana local para que te loguees
        creds = flow.run_local_server(port=0)
        
    except Exception as e:
        print(f"❌ Error durante la autenticación: {e}")
        return

    # 4. Guardar el nuevo token
    print("💾 Guardando nuevo token...")
    with open('token.json', 'w') as token:
        token.write(creds.to_json())

    print("\n" + "="*60)
    print("✅ ¡ÉXITO! Se ha creado el archivo 'token.json'.")
    print("="*60)
    print("⚠️  PASO OBLIGATORIO AHORA:")
    print("1. Abre el archivo 'token.json' que se acaba de crear.")
    print("2. Copia TODO su contenido.")
    print("3. Ve a tu GitHub -> Settings -> Secrets -> Actions.")
    print("4. Actualiza el secreto llamado 'TOKEN_JSON' con este nuevo contenido.")
    print("5. Haz un nuevo Deploy en GitHub Actions.")
    print("="*60)

if __name__ == '__main__':
    main()