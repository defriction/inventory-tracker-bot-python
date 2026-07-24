"""
In-memory cache — simple dict with TTL.
Used only for tenant_info lookup in auth.py.
"""
import json
import time
from typing import Optional

_cache: dict[str, tuple[float, str]] = {}


def get_cache(key: str, ttl: int = 300) -> Optional[dict]:
    """Retorna datos cacheados si existen y no expiraron."""
    if key in _cache:
        ts, val = _cache[key]
        if time.time() - ts < ttl:
            return json.loads(val)
        del _cache[key]
    return None


def set_cache(key: str, data: dict, ttl: int = 300):
    """Guarda datos en cache con TTL."""
    _cache[key] = (time.time(), json.dumps(data, default=str))
