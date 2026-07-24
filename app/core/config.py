from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # --- CREDENCIALES ---
    TELEGRAM_BOT_TOKEN: str
    GROQ_API_KEY: str

    # --- JWT Auth ---
    JWT_SECRET: str = "inventory-tracker-jwt-secret-change-me-in-env"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_DAYS: int = 7

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
