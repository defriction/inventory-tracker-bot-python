"""
Service factory — always returns SQLite backends.
Kept for clean import paths; all routers use these functions.
"""
from app.services.inventory_service import InventoryService
from app.services.tenant_service import TenantService


def get_inventory_service(sheet_id: str = "", tenant_id: str = ""):
    """Returns InventoryService (SQLite). tenant_id is required."""
    if not tenant_id:
        raise ValueError("tenant_id is required")
    return InventoryService(tenant_id=tenant_id)


def get_tenant_service():
    """Returns TenantService (SQLite)."""
    return TenantService()
