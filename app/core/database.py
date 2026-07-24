"""
SQLite database manager — one DB file per tenant + one admin DB.
Connection pool: reuses open connections instead of opening/closing per request.
"""
import sqlite3
import os
import logging
from contextlib import contextmanager
from typing import Optional

logger = logging.getLogger(__name__)

DB_DIR = "/app/data"
os.makedirs(DB_DIR, exist_ok=True)

ADMIN_DB = os.path.join(DB_DIR, "admin.db")


class ConnectionPool:
    """Pool of SQLite connections, one per database file."""

    def __init__(self):
        self._connections: dict[str, sqlite3.Connection] = {}

    def get(self, db_path: str) -> sqlite3.Connection:
        """Return a healthy connection for db_path, reusing or creating one."""
        conn = self._connections.get(db_path)
        if conn is not None:
            try:
                conn.execute("SELECT 1")
                return conn
            except Exception:
                logger.warning(f"Dead connection for {db_path}, recreating")
        conn = self._create_connection(db_path)
        self._connections[db_path] = conn
        return conn

    def _create_connection(self, db_path: str) -> sqlite3.Connection:
        conn = sqlite3.connect(db_path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
        conn.execute("PRAGMA busy_timeout=5000")
        return conn

    def close_all(self):
        """Close all pooled connections gracefully."""
        with self._lock:
            for path, conn in self._connections.items():
                try:
                    conn.close()
                except Exception:
                    pass
            self._connections.clear()


# Module-level pool — singleton for SQLite is acceptable
# (one pool per process, shared across all requests)
_pool = ConnectionPool()


def get_db_path(tenant_id: str) -> str:
    return os.path.join(DB_DIR, f"inventory_{tenant_id}.db")


@contextmanager
def get_conn(tenant_id: str):
    """Yields a pooled SQLite connection for the tenant. Commits on success, rollbacks on error."""
    db_path = get_db_path(tenant_id)
    conn = _pool.get(db_path)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise


@contextmanager
def get_admin_conn():
    """Yields a pooled SQLite connection for the admin DB."""
    conn = _pool.get(ADMIN_DB)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise


def init_admin_db():
    """Create admin tables if they don't exist."""
    conn = _pool.get(ADMIN_DB)
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
    conn = _pool.get(db_path)
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
    conn.execute("""
        CREATE TABLE IF NOT EXISTS suppliers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            contact TEXT,
            phone TEXT,
            email TEXT,
            address TEXT,
            notes TEXT,
            created_at TEXT DEFAULT (datetime('now', 'localtime')),
            updated_at TEXT DEFAULT (datetime('now', 'localtime'))
        )
    """)
    conn.commit()
