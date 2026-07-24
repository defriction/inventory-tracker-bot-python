from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.factory import get_tenant_service

router = APIRouter(
    prefix='/admin',
    tags=['Admin Saas']
)

class TenantCreateSchema(BaseModel):
    nombre_negocio: str
    tipo_negocio: str
    admin_telegram_id: str


@router.get('/tenants')
def list_tenants():
    """List all tenants (admin only)."""
    service = get_tenant_service()
    return {"tenants": service.list_all()}


@router.post('/create-pyme')
async def create_new_pyme(pyme: TenantCreateSchema):
    service = get_tenant_service()
    
    try:
        result = service.create_tenant(pyme.nombre_negocio, pyme.tipo_negocio, pyme.admin_telegram_id)
        return {
            'status': 'success',
            'data': result,
            'access_data': {
                'token_invitacion': result['token'],
                'sheet_id': result['sheet_id']
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete('/tenants/{tenant_id}')
def delete_tenant(tenant_id: str):
    """Delete a tenant and its data."""
    service = get_tenant_service()
    if service.delete_tenant(tenant_id):
        return {"status": "deleted"}
    raise HTTPException(status_code=404, detail="Tenant no encontrado")
