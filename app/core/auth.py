"""
JWT authentication — encode/decode tokens for session management.
Eliminates Google Sheets lookup on every API request.
"""
import jwt
from datetime import datetime, timedelta, timezone
from typing import Optional
from app.core.config import settings


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
