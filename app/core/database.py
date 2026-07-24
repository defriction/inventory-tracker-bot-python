"""
SQLite database manager — one DB file per tenant.
Pattern: /app/data/inventory_{tenant_id}.db
"""
import sqlite3
import os
from contextlib import contextmanager

DB_DIR = "/app/data"
os.makedirs(DB_DIR, exist_ok=True)


def get_db_path(tenant_id: str) -> str:
    return os.path.join(DB_DIR, f"inventory_{tenant_id}.db")


@contextmanager
def get_conn(tenant_id: str):
    """Context manager for tenant DB connection. Auto-commits on success."""
    conn = sqlite3.connect(get_db_path(tenant_id))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_tenant_db(tenant_id: str):
    """Create tables for a tenant. Idempotent (CREATE TABLE IF NOT EXISTS)."""
    with get_conn(tenant_id) as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS products (
                uuid TEXT PRIMARY KEY,
                sku TEXT NOT NULL,
                name TEXT NOT NULL,
                category TEXT DEFAULT 'General',
                stock INTEGER DEFAULT 0,
                unit TEXT DEFAULT 'UND',
                cost REAL DEFAULT 0,
                price REAL DEFAULT 0,
                expiration_date TEXT DEFAULT '',
                location TEXT DEFAULT '',
                invima TEXT DEFAULT '',
                lote TEXT DEFAULT '',
                created_at TEXT DEFAULT (datetime('now','localtime')),
                updated_at TEXT DEFAULT (datetime('now','localtime'))
            );

            CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
            CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
            CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
            CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock);

            CREATE TABLE IF NOT EXISTS movements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                tx_id TEXT NOT NULL,
                mov_type TEXT NOT NULL,
                sku TEXT NOT NULL,
                name TEXT NOT NULL,
                qty INTEGER NOT NULL,
                user TEXT NOT NULL,
                notes TEXT DEFAULT '',
                created_at TEXT DEFAULT (datetime('now','localtime'))
            );

            CREATE INDEX IF NOT EXISTS idx_movements_timestamp ON movements(timestamp);
            CREATE INDEX IF NOT EXISTS idx_movements_type ON movements(mov_type);
            CREATE INDEX IF NOT EXISTS idx_movements_sku ON movements(sku);
        """)
