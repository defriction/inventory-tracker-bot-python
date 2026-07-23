"""
Cache module — Redis with in-memory fallback.
Evita rate limits de Google Sheets (60 req/min/usuario).
"""

import json
import time
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Try Redis, fall back to in-memory
_redis_client = None
try:
    import redis
    _redis_client = redis.Redis(
        host='redis',
        port=6379,
        decode_responses=True,
        socket_connect_timeout=1,
        socket_timeout=1,
    )
    _redis_client.ping()
    logger.info("✅ Redis conectado — cache compartido entre workers")
except Exception:
    _redis_client = None
    logger.info("⚠️ Redis no disponible — usando cache en memoria")

# In-memory fallback
_memory_cache: dict[str, tuple[float, str]] = {}


def get_cache(key: str, ttl: int = 60) -> Optional[dict]:
    """Retorna datos cacheados si existen y no expiraron."""
    if _redis_client:
        try:
            raw = _redis_client.get(key)
            if raw:
                return json.loads(raw)
        except Exception:
            pass

    # Fallback to in-memory
    if key in _memory_cache:
        ts, val = _memory_cache[key]
        if time.time() - ts < ttl:
            return json.loads(val)
    return None


def set_cache(key: str, data: dict, ttl: int = 60):
    """Guarda datos en cache con TTL."""
    if _redis_client:
        try:
            _redis_client.setex(key, ttl, json.dumps(data, default=str))
            return
        except Exception:
            pass

    # Fallback to in-memory
    _memory_cache[key] = (time.time(), json.dumps(data, default=str))


def invalidate_pattern(pattern: str):
    """Invalida todas las keys que coincidan con el patron."""
    if _redis_client:
        try:
            keys = _redis_client.keys(pattern)
            if keys:
                _redis_client.delete(*keys)
        except Exception:
            pass

    # In-memory: remove matching keys
    to_delete = [k for k in _memory_cache if pattern.replace('*', '') in k]
    for k in to_delete:
        del _memory_cache[k]
