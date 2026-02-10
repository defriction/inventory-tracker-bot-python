from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # --- CREDENCIALES ---
    TELEGRAM_BOT_TOKEN: str
    GROQ_API_KEY: str
    
    # --- GOOGLE SHEETS & DRIVE ---
    GOOGLE_CREDS_FILE: str = "client_secret.json" # Ahora usamos el secreto de OAuth
    ADMIN_SHEET_ID: str
    TEMPLATE_SHEET_ID: str
    SAAS_FOLDER_ID: str   # <--- NUEVA VARIABLE IMPORTANTE

    # --- WHATSAPP (Opcional) ---
    WHATSAPP_SERVER_URL: str = ""
    WHATSAPP_API_KEY: str = ""
    WHATSAPP_INSTANCE: str = ""

    model_config = SettingsConfigDict(
        env_file=".env", 
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()