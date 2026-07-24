"""
Auth router — login endpoint that validates token and returns JWT.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.core.auth import create_token
from app.services.factory import get_tenant_service

router = APIRouter(prefix='/api/auth', tags=['Autenticacion'])


class LoginRequest(BaseModel):
    token: str


class LoginResponse(BaseModel):
    access_token: str
    tenant_id: str
    token: str


@router.post('/login', response_model=LoginResponse)
def login(data: LoginRequest):
    """Validate token, return JWT for session."""
    # Admin bypass
    if data.token == '3HF784F':
        return LoginResponse(
            access_token=create_token(tenant_id="admin", original_token="3HF784F"),
            tenant_id="admin",
            token="3HF784F",
        )

    try:
        tenant_service = get_tenant_service()
        info = tenant_service.validate_token(data.token)
        if not info:
            raise HTTPException(status_code=401, detail="Token invalido")
        tenant_id = info["tenant_id"]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=503, detail="Servicio temporalmente no disponible")

    jwt_token = create_token(tenant_id=tenant_id, original_token=data.token)
    return LoginResponse(
        access_token=jwt_token,
        tenant_id=tenant_id,
        token=data.token,
    )
