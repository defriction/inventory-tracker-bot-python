"""
SQLAlchemy session manager — coexists with raw sqlite3 connections.
Uses same WAL-mode DB files but manages its own connections via NullPool.
"""
import os
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.database import get_db_path

Base = declarative_base()

# Engine cache: one per tenant DB
_engines: dict[str, any] = {}


def _get_engine(tenant_id: str):
    db_path = get_db_path(tenant_id)
    if db_path not in _engines:
        engine = create_engine(
            f"sqlite:///{db_path}",
            echo=False,
            connect_args={"check_same_thread": False},
            poolclass=None,  # NullPool — no connection pooling
        )

        @event.listens_for(engine, "connect")
        def _set_pragmas(dbapi_conn, _connection_record):
            dbapi_conn.execute("PRAGMA journal_mode=WAL")
            dbapi_conn.execute("PRAGMA foreign_keys=ON")
            dbapi_conn.execute("PRAGMA busy_timeout=5000")

        _engines[db_path] = engine
    return _engines[db_path]


def get_session(tenant_id: str):
    """Return a new SQLAlchemy session for the tenant."""
    engine = _get_engine(tenant_id)
    Session = sessionmaker(bind=engine)
    return Session()


def create_all(tenant_id: str):
    """Create all SA tables for the tenant."""
    engine = _get_engine(tenant_id)
    Base.metadata.create_all(engine)
