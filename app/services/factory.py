"""
Service factory — always returns SQLite backends.
Kept for clean import paths; all routers use these functions.
"""
from app.services.inventory_service import InventoryService
from app.services.tenant_service import TenantService


class _DummyInventoryService:
    """Empty inventory service for admin — avoids creating unnecessary DB."""
    def __init__(self):
        self.inventory_sheet = _DummySheet()
        self.history_sheet = _DummySheet()
        self.pending_multi_match = None

    def _find_product_row_by_keyword(self, *args, **kwargs):
        return None, None

    def _log_movement(self, *args, **kwargs):
        pass


class _DummySheet:
    def get_all_values(self): return [['UUID', 'SKU', 'NAME']]
    def row_values(self, idx): return [''] * 12
    def cell(self, row, col): return _DummyCell()
    def update_cell(self, row, col, val): pass
    def append_row(self, data): pass


class _DummyCell:
    value = ''


def get_inventory_service(sheet_id: str = "", tenant_id: str = ""):
    """Returns InventoryService (SQLite). Admin gets dummy service."""
    if not tenant_id:
        raise ValueError("tenant_id is required")
    if tenant_id == "admin":
        return _DummyInventoryService()
    return InventoryService(tenant_id=tenant_id)


def get_tenant_service():
    """Returns TenantService (SQLite)."""
    return TenantService()
