from fastapi import FastAPI
from app.core.config import settings
from app.routers import admin, webhook, api, orders, usage

app = FastAPI(
    title='Saas Inventory Bot',
    version='1.0.0',
    description='API para gestionar pymes y su inventario mediante un bot de Telegram y dashboard web'
)

app.include_router(admin.router)
app.include_router(webhook.router)
app.include_router(api.router)
app.include_router(orders.router)
app.include_router(usage.router)

@app.get('/')
def read_root():
    return {'status': 'API is running', 'mode':'webhook'}

