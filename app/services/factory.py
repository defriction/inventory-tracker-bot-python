"""
Service factory — returns GS or SQLite backend based on STORAGE_BACKEND config.
"""
from app.core.config import settings


def get_inventory_service(sheet_id: str = "", tenant_id: str = ""):
    """
    Returns InventoryService (Google Sheets) or InventoryServiceSQLite (SQLite)
    depending on STORAGE_BACKEND setting.

    For Google Sheets: sheet_id is required.
    For SQLite: tenant_id is required.
    """
    if settings.STORAGE_BACKEND == "sqlite":
        from app.services.inventory_service_sqlite import InventoryServiceSQLite
        if not tenant_id:
            raise ValueError("tenant_id is required for SQLite backend")
        return InventoryServiceSQLite(tenant_id=tenant_id)
    else:
        from app.services.inventory_service import InventoryService
        if not sheet_id:
            raise ValueError("sheet_id is required for Google Sheets backend")
        return InventoryService(sheet_id=sheet_id)


def get_tenant_service():
    """
    Returns TenantService (Google Sheets) or TenantServiceSQLite (SQLite)
    depending on STORAGE_BACKEND setting.
    """
    if settings.STORAGE_BACKEND == "sqlite":
        from app.services.tenant_service_sqlite import TenantService
        return TenantService()
    else:
        from app.services.tenant_service import TenantService
        return TenantService()
