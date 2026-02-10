from fastapi import FastAPI
from app.core.config import settings
from app.routers import admin, webhook


app = FastAPI(
    title='Saas Inventory Bot',
    version='1.0.0',
    description='API para gestionar pymes y su inventario mediante un bot de Telegram'
)

app.include_router(admin.router)
app.include_router(webhook.router)

@app.get('/')
def read_root():
    return {'status': 'API is running', 'mode':'webhook'}

