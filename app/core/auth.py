"""
JWT authentication — encode/decode tokens for session management.
Eliminates Google Sheets lookup on every API request.
"""
import jwt
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import Header, Query, HTTPException
from app.core.config import settings
from app.core.cache import get_cache, set_cache

logger = logging.getLogger(__name__)


def create_token(tenant_id: str, original_token: str) -> str:
    """Create JWT with tenant info. Valid for JWT_EXPIRE_DAYS."""
    payload = {
        "sub": tenant_id,
        "token": original_token,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(days=settings.JWT_EXPIRE_DAYS),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    """Decode JWT. Returns payload dict or None if invalid/expired."""
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None


def get_tenant_id_from_jwt(token: str) -> Optional[str]:
    """Extract tenant_id from JWT. Returns None if invalid."""
    payload = decode_token(token)
    if payload:
        return payload.get("sub")
    return None


async def get_current_tenant(
    authorization: str = Header(None),
    token: str = Query(None),
) -> dict:
    """
    Shared dependency for all protected endpoints.
    Tries JWT (Authorization header) first, falls back to ?token= query param.

    Returns: {"tenant_id", "token", "pyme_name", "sheet_id"}
    """
    original_token = None
    tenant_id = None

    # Path 1: JWT from Authorization header — no DB call needed for tenant_id
    if authorization and authorization.startswith("Bearer "):
        jwt_token = authorization.replace("Bearer ", "")
        payload = decode_token(jwt_token)
        if payload:
            original_token = payload.get("token")
            tenant_id = payload.get("sub")

    # Path 2: query param token (fallback)
    if not tenant_id and token:
        original_token = token

    if not original_token:
        raise HTTPException(status_code=401, detail="Autenticacion requerida (JWT o token)")

    # Look up sheet_id + pyme_name from cache or DB
    cache_key = f"tenant_info:{original_token}"

    cached = get_cache(cache_key, ttl=300)
    if cached and (cached.get("sheet_id") or cached.get("tenant_id")):
        if not tenant_id:
            tenant_id = cached.get("tenant_id")
        return {
            "tenant_id": tenant_id,
            "token": original_token,
            "pyme_name": cached.get("pyme_name", ""),
            "sheet_id": cached.get("sheet_id", ""),
        }

    # Cache miss — look up in DB (SQLite or Google Sheets)
    try:
        from app.services.factory import get_tenant_service
        tenant_service = get_tenant_service()

        if settings.STORAGE_BACKEND == "sqlite":
            info = tenant_service.validate_token(original_token)
            if not info:
                raise HTTPException(status_code=401, detail="Token invalido")
        else:
            cell = tenant_service.admin_sheet.find(original_token)
            if not cell:
                raise HTTPException(status_code=401, detail="Token invalido")
            row = tenant_service.admin_sheet.row_values(cell.row)
            info = {
                "tenant_id": row[1],
                "token": original_token,
                "pyme_name": row[2],
                "sheet_id": row[3],
            }

        tenant_id = tenant_id or info["tenant_id"]
        info["tenant_id"] = tenant_id
        set_cache(cache_key, info, ttl=300)
        return info

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error buscando tenant: {e}")
        raise HTTPException(status_code=503, detail="Servicio temporalmente no disponible")
