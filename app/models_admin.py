"""SQLAlchemy models for admin.db — tenant management."""
from sqlalchemy import Column, String, DateTime, create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base
import os

AdminBase = declarative_base()
ADMIN_DB = os.path.join("/app/data", "admin.db")
os.makedirs(os.path.dirname(ADMIN_DB), exist_ok=True)

_admin_engine = None


def _get_admin_engine():
    global _admin_engine
    if _admin_engine is None:
        _admin_engine = create_engine(
            f"sqlite:///{ADMIN_DB}",
            echo=False,
            connect_args={"check_same_thread": False},
            poolclass=None,
        )

        @event.listens_for(_admin_engine, "connect")
        def _set_pragmas(dbapi_conn, _connection_record):
            dbapi_conn.execute("PRAGMA journal_mode=WAL")
            dbapi_conn.execute("PRAGMA foreign_keys=ON")
            dbapi_conn.execute("PRAGMA busy_timeout=5000")

        AdminBase.metadata.create_all(_admin_engine)

        # Ensure columns exist (idempotent)
        with _admin_engine.connect() as c:
            for col, col_type in [
                ("telegram_id", "TEXT DEFAULT ''"),
                ("tenant_id", "TEXT DEFAULT ''"),
                ("sheet_id", "TEXT DEFAULT ''"),
                ("business_type", "TEXT DEFAULT ''"),
                ("nit", "TEXT DEFAULT ''"),
                ("address", "TEXT DEFAULT ''"),
                ("description", "TEXT DEFAULT ''"),
            ]:
                try:
                    c.execute(f"ALTER TABLE tenants ADD COLUMN {col} {col_type}")
                except:
                    pass
            c.commit()

    return _admin_engine


def get_admin_session():
    Session = sessionmaker(bind=_get_admin_engine())
    return Session()


class TenantProfile(AdminBase):
    __tablename__ = "tenants"

    id = Column(String, primary_key=True)
    pyme_name = Column(String, nullable=False)
    token = Column(String, unique=True, nullable=False)
    telegram_id = Column(String, default="")
    tenant_id = Column(String, default="")
    sheet_id = Column(String, default="")
    business_type = Column(String, default="")
    nit = Column(String, default="")
    address = Column(String, default="")
    description = Column(String, default="")
    created_at = Column(DateTime)
