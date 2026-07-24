"""
Usage Analytics — tracks user behavior to improve product.
Stores events in SQLite per tenant.
"""
import sqlite3
import os
import json
from contextlib import contextmanager
from typing import Optional

DB_DIR = "/app/data"
os.makedirs(DB_DIR, exist_ok=True)


class UsageTracker:
    def __init__(self, tenant_id: str):
        self.db_path = os.path.join(DB_DIR, f"usage_{tenant_id}.db")
        self._init_db()

    @contextmanager
    def _conn(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        finally:
            conn.close()

    def _init_db(self):
        with self._conn() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    event TEXT NOT NULL,
                    category TEXT DEFAULT 'general',
                    tab TEXT DEFAULT '',
                    metadata TEXT DEFAULT '{}',
                    created_at TEXT DEFAULT (datetime('now','localtime'))
                )
            """)

    def track(self, event: str, category: str = "general", tab: str = "", metadata: dict = None):
        with self._conn() as conn:
            conn.execute(
                "INSERT INTO events (event, category, tab, metadata) VALUES (?, ?, ?, ?)",
                (event, category, tab, json.dumps(metadata or {}))
            )

    def stats(self, days: int = 30) -> dict:
        with self._conn() as conn:
            total = conn.execute(
                "SELECT COUNT(*) FROM events WHERE created_at >= datetime('now','localtime',?)",
                (f"-{days} days",)
            ).fetchone()[0]

            by_event = {}
            for row in conn.execute(
                "SELECT event, COUNT(*) c FROM events WHERE created_at >= datetime('now','localtime',?) GROUP BY event ORDER BY c DESC LIMIT 20",
                (f"-{days} days",)
            ).fetchall():
                by_event[row["event"]] = row["c"]

            by_category = {}
            for row in conn.execute(
                "SELECT category, COUNT(*) c FROM events WHERE created_at >= datetime('now','localtime',?) GROUP BY category",
                (f"-{days} days",)
            ).fetchall():
                by_category[row["category"]] = row["c"]

            by_tab = {}
            for row in conn.execute(
                "SELECT tab, COUNT(*) c FROM events WHERE tab != '' AND created_at >= datetime('now','localtime',?) GROUP BY tab ORDER BY c DESC",
                (f"-{days} days",)
            ).fetchall():
                by_tab[row["tab"]] = row["c"]

            daily = []
            for row in conn.execute(
                "SELECT date(created_at) d, COUNT(*) c FROM events WHERE created_at >= datetime('now','localtime',?) GROUP BY d ORDER BY d",
                (f"-{days} days",)
            ).fetchall():
                daily.append({"date": row["d"], "count": row["c"]})

            recent = []
            for row in conn.execute(
                "SELECT event, category, tab, created_at FROM events ORDER BY created_at DESC LIMIT 20"
            ).fetchall():
                recent.append({
                    "event": row["event"],
                    "category": row["category"],
                    "tab": row["tab"],
                    "created_at": row["created_at"],
                })

            return {
                "total_events": total,
                "by_event": by_event,
                "by_category": by_category,
                "by_tab": by_tab,
                "daily": daily,
                "recent": recent,
            }

    def feature_summary(self, days: int = 30) -> dict:
        """Summary of features used by this tenant."""
        with self._conn() as conn:
            total = conn.execute(
                "SELECT COUNT(*) FROM events WHERE created_at >= datetime('now','localtime',?)",
                (f"-{days} days",)
            ).fetchone()[0]

            by_event = dict(conn.execute(
                "SELECT event, COUNT(*) c FROM events WHERE created_at >= datetime('now','localtime',?) GROUP BY event",
                (f"-{days} days",)
            ).fetchall())

            last_active = conn.execute(
                "SELECT MAX(created_at) FROM events"
            ).fetchone()[0] or ""

            return {
                "total": total,
                "by_event": {k: v for k, v in by_event},
                "last_active": last_active,
            }
