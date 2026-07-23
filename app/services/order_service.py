"""
Order Service — SQLite-based order tracking.
Separate from Google Sheets. Each PyME gets its own DB file.
"""

import sqlite3
import os
import datetime
from typing import Optional
from contextlib import contextmanager

DB_DIR = "/app/data"
os.makedirs(DB_DIR, exist_ok=True)


class OrderService:
    def __init__(self, tenant_id: str):
        self.db_path = os.path.join(DB_DIR, f"orders_{tenant_id}.db")
        self._init_db()

    @contextmanager
    def _conn(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        try:
            yield conn
            conn.commit()
        finally:
            conn.close()

    def _init_db(self):
        with self._conn() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS orders (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    order_number TEXT NOT NULL,
                    supplier TEXT NOT NULL,
                    product_name TEXT DEFAULT '',
                    quantity INTEGER DEFAULT 1,
                    tracking_number TEXT DEFAULT '',
                    shipping_company TEXT DEFAULT '',
                    tracking_url TEXT DEFAULT '',
                    status TEXT DEFAULT 'pendiente',
                    notes TEXT DEFAULT '',
                    created_at TEXT DEFAULT (datetime('now','localtime')),
                    updated_at TEXT DEFAULT (datetime('now','localtime'))
                )
            """)

    def list_orders(self, status: Optional[str] = None, search: Optional[str] = None, limit: int = 50) -> list:
        query = "SELECT * FROM orders WHERE 1=1"
        params = []
        if status:
            query += " AND status = ?"
            params.append(status)
        if search:
            query += " AND (order_number LIKE ? OR supplier LIKE ? OR product_name LIKE ? OR tracking_number LIKE ?)"
            s = f"%{search}%"
            params.extend([s, s, s, s])
        query += " ORDER BY created_at DESC LIMIT ?"
        params.append(limit)

        with self._conn() as conn:
            return [dict(row) for row in conn.execute(query, params).fetchall()]

    def get_order(self, order_id: int) -> Optional[dict]:
        with self._conn() as conn:
            row = conn.execute("SELECT * FROM orders WHERE id = ?", (order_id,)).fetchone()
            return dict(row) if row else None

    def create_order(self, data: dict) -> dict:
        with self._conn() as conn:
            cursor = conn.execute("""
                INSERT INTO orders (order_number, supplier, product_name, quantity, tracking_number, shipping_company, tracking_url, status, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                data.get("order_number", ""),
                data.get("supplier", ""),
                data.get("product_name", ""),
                data.get("quantity", 1),
                data.get("tracking_number", ""),
                data.get("shipping_company", ""),
                data.get("tracking_url", ""),
                data.get("status", "pendiente"),
                data.get("notes", ""),
            ))
            return self.get_order(cursor.lastrowid)

    def update_order(self, order_id: int, data: dict) -> Optional[dict]:
        fields = []
        params = []
        allowed = ["order_number", "supplier", "product_name", "quantity", "tracking_number",
                   "shipping_company", "tracking_url", "status", "notes"]
        for field in allowed:
            if field in data:
                fields.append(f"{field} = ?")
                params.append(data[field])

        if not fields:
            return self.get_order(order_id)

        fields.append("updated_at = datetime('now','localtime')")
        params.append(order_id)

        with self._conn() as conn:
            conn.execute(f"UPDATE orders SET {', '.join(fields)} WHERE id = ?", params)
            return self.get_order(order_id)

    def delete_order(self, order_id: int) -> bool:
        with self._conn() as conn:
            cursor = conn.execute("DELETE FROM orders WHERE id = ?", (order_id,))
            return cursor.rowcount > 0

    def stats(self) -> dict:
        with self._conn() as conn:
            total = conn.execute("SELECT COUNT(*) FROM orders").fetchone()[0]
            by_status = {}
            for row in conn.execute("SELECT status, COUNT(*) c FROM orders GROUP BY status").fetchall():
                by_status[row["status"]] = row["c"]
            return {"total": total, "by_status": by_status}
