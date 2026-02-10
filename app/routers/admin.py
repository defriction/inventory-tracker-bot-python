from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.services.tenant_service import TenantService

router = APIRouter(
    prefix='/admin',
    tags=['Admin Saas']
)

class TenantCreateSchema(BaseModel):
    nombre_negocio: str
    tipo_negocio: str
    admin_telegram_id: str
    
@router.post('/create-pyme')
async def create_new_pyme(pyme: TenantCreateSchema):
    service = TenantService()
    
    try:
        result = service.create_tenant(pyme.nombre_negocio, pyme.tipo_negocio, pyme.admin_telegram_id)
        return {
            'status': 'success',
            'data': result,
            'access_data':{
                'token_invitacion': result['token'],
                'sheet_id': result['sheet_id']
            
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))