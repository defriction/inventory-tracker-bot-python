"""
SQLite database manager — one DB file per tenant + one admin DB.
Uses connection pooling: reuses open connections instead of opening/closing per request.
"""
import sqlite3
import os
from contextlib import contextmanager
from threading import Lock

DB_DIR = "/app/data"
os.makedirs(DB_DIR, exist_ok=True)

ADMIN_DB = os.path.join(DB_DIR, "admin.db")

_pool: dict[str, sqlite3.Connection] = {}
_pool_lock = Lock()


def _get_pooled_conn(db_path: str) -> sqlite3.Connection:
    """Get a cached connection or create a new one."""
    with _pool_lock:
        if db_path in _pool:
            try:
                _pool[db_path].execute("SELECT 1")
                return _pool[db_path]
            except Exception:
                pass  # Connection dead, recreate
        conn = sqlite3.connect(db_path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
        conn.execute("PRAGMA busy_timeout=5000")
        _pool[db_path] = conn
        return conn


def get_db_path(tenant_id: str) -> str:
    return os.path.join(DB_DIR, f"inventory_{tenant_id}.db")


@contextmanager
def get_conn(tenant_id: str):
    """Yields a pooled SQLite connection for the tenant. Commits on exit."""
    db_path = get_db_path(tenant_id)
    conn = _get_pooled_conn(db_path)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise


@contextmanager
def get_admin_conn():
    """Yields a pooled SQLite connection for the admin DB. Commits on exit."""
    conn = _get_pooled_conn(ADMIN_DB)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise


def init_admin_db():
    """Create admin tables if they don't exist."""
    db_path = ADMIN_DB
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    conn = _get_pooled_conn(db_path)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS tenants (
            id TEXT PRIMARY KEY,
            pyme_name TEXT NOT NULL,
            token TEXT NOT NULL UNIQUE,
            created_at TEXT DEFAULT (datetime('now', 'localtime'))
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS telegram_users (
            telegram_id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            linked_at TEXT DEFAULT (datetime('now', 'localtime')),
            FOREIGN KEY (tenant_id) REFERENCES tenants(id)
        )
    """)
    conn.commit()


def init_tenant_db(tenant_id: str):
    """Create tenant-specific tables (products + movements) if they don't exist."""
    db_path = get_db_path(tenant_id)
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    conn = _get_pooled_conn(db_path)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS products (
            uuid TEXT, sku TEXT, name TEXT, category TEXT, stock INTEGER, unit TEXT,
            cost REAL, price REAL, expiration_date TEXT, location TEXT,
            invima TEXT, lote TEXT,
            created_at TEXT DEFAULT (datetime('now', 'localtime')),
            updated_at TEXT DEFAULT (datetime('now', 'localtime'))
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS movements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT, sku TEXT, name TEXT, quantity INTEGER,
            user TEXT, notes TEXT,
            created_at TEXT DEFAULT (datetime('now', 'localtime'))
        )
    """)
    conn.commit()
