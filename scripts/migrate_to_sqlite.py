"""
Migration script: Google Sheets → SQLite.
Reads all tenants from USUARIOS_PYMES, imports INVENTARIO + MOVIMIENTOS into SQLite.

Usage: python scripts/migrate_to_sqlite.py
Run from project root on the VPS (needs Google credentials and .env).
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.tenant_service import TenantService
from app.core.database import init_tenant_db, get_conn
from app.services.inventory_service import InventoryService

SHEET_COLS = ['uuid', 'sku', 'name', 'category', 'stock', 'unit', 'cost', 'price', 'expiration_date', 'location', 'invima', 'lote']


def migrate_tenant(tenant_id: str, sheet_id: str, pyme_name: str):
    """Import one tenant's data from Google Sheets into SQLite."""
    print(f"\n{'='*60}")
    print(f"Migrando: {pyme_name} (tenant_id={tenant_id})")
    print(f"Sheet ID: {sheet_id}")

    init_tenant_db(tenant_id)
    inv = InventoryService(sheet_id=sheet_id)

    # ── Products ──
    try:
        rows = inv.inventory_sheet.get_all_values()
        header = rows[0] if rows else []
        data_rows = rows[1:] if len(rows) > 1 else []
        print(f"  INVENTARIO: {len(data_rows)} productos encontrados")

        imported = 0
        with get_conn(tenant_id) as conn:
            for row in data_rows:
                if not row or not any(row):
                    continue
                # Pad row to 12 columns
                padded = (row + [''] * 12)[:12]
                uuid_val = padded[0].strip() if padded[0].strip() else None
                if not uuid_val:
                    continue

                conn.execute(
                    """INSERT OR REPLACE INTO products
                       (uuid, sku, name, category, stock, unit, cost, price, expiration_date, location, invima, lote)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (
                        uuid_val,
                        padded[1] or '',
                        padded[2] or 'Sin nombre',
                        padded[3] or 'General',
                        int(float(padded[4])) if padded[4] else 0,
                        padded[5] or 'UND',
                        float(padded[6]) if padded[6] else 0,
                        float(padded[7]) if padded[7] else 0,
                        padded[8] or '',
                        padded[9] or '',
                        padded[10] or '',
                        padded[11] or '',
                    )
                )
                imported += 1

        print(f"  ✅ {imported} productos importados")
    except Exception as e:
        print(f"  ❌ Error importando productos: {e}")

    # ── Movements ──
    try:
        rows = inv.history_sheet.get_all_values()
        data_rows = rows[1:] if len(rows) > 1 else []
        print(f"  MOVIMIENTOS: {len(data_rows)} registros encontrados")

        imported = 0
        with get_conn(tenant_id) as conn:
            for row in data_rows:
                if not row or not any(row):
                    continue
                padded = (row + [''] * 8)[:8]
                conn.execute(
                    """INSERT INTO movements (timestamp, tx_id, mov_type, sku, name, qty, user, notes)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                    (
                        padded[0] or '',
                        padded[1] or '',
                        padded[2] or 'DESCONOCIDO',
                        padded[3] or '',
                        padded[4] or '',
                        int(float(padded[5])) if padded[5] else 0,
                        padded[6] or '',
                        padded[7] or '',
                    )
                )
                imported += 1

        print(f"  ✅ {imported} movimientos importados")
    except Exception as e:
        print(f"  ❌ Error importando movimientos: {e}")


def main():
    print("🔍 Conectando a Google Sheets...")
    try:
        ts = TenantService()
    except Exception as e:
        print(f"❌ Error conectando a Google Sheets: {e}")
        print("   Asegúrate de tener token.json y client_secret.json en el directorio actual.")
        sys.exit(1)

    # Read all tenants
    try:
        all_rows = ts.admin_sheet.get_all_values()
        if not all_rows or len(all_rows) < 2:
            print("⚠️  No se encontraron tenants en USUARIOS_PYMES.")
            sys.exit(0)

        tenants = []
        for row in all_rows[1:]:  # Skip header
            if len(row) < 5:
                continue
            telegram_id = row[0] if len(row) > 0 else ''
            tenant_id = row[1] if len(row) > 1 else ''
            pyme_name = row[2] if len(row) > 2 else 'Sin nombre'
            sheet_id = row[3] if len(row) > 3 else ''
            token = row[4] if len(row) > 4 else ''

            if not tenant_id or not sheet_id:
                continue

            tenants.append({
                'tenant_id': tenant_id,
                'sheet_id': sheet_id,
                'pyme_name': pyme_name,
                'token': token,
            })

        print(f"📋 {len(tenants)} tenants encontrados en USUARIOS_PYMES")

        for t in tenants:
            migrate_tenant(t['tenant_id'], t['sheet_id'], t['pyme_name'])

        print(f"\n{'='*60}")
        print(f"✅ Migración completada. {len(tenants)} tenants migrados.")
        print(f"   Datos en: /app/data/inventory_*.db")
        print(f"\n   Para activar SQLite, agrega al .env:")
        print(f"   STORAGE_BACKEND=sqlite")

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
