"""
Migration script: Google Sheets → SQLite (complete).
Reads USUARIOS_PYMES, INVENTARIO, MOVIMIENTOS → SQLite.

Usage: python scripts/migrate_to_sqlite.py
Run from project root on the VPS (needs Google credentials and .env).
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.tenant_service import TenantService
from app.services.inventory_service import InventoryService
from app.core.database import init_admin_db, init_tenant_db, get_conn, get_admin_conn

SHEET_COLS = ['uuid', 'sku', 'name', 'category', 'stock', 'unit', 'cost', 'price', 'expiration_date', 'location', 'invima', 'lote']


def migrate_tenants_table(ts: TenantService):
    """Import USUARIOS_PYMES into admin.db tenants table."""
    print("\n📋 Migrando registro de tenants (USUARIOS_PYMES)...")
    init_admin_db()

    try:
        all_rows = ts.admin_sheet.get_all_values()
        if not all_rows or len(all_rows) < 2:
            print("   ⚠️  No se encontraron tenants.")
            return []

        tenants = []
        with get_admin_conn() as conn:
            for row in all_rows[1:]:  # Skip header
                if len(row) < 5:
                    continue
                # Col A=telegram_id, B=tenant_id, C=pyme_name, D=sheet_id, E=token, F=created_at, G=business_type
                telegram_id = str(row[0]).strip() if len(row) > 0 else ''
                tenant_id = str(row[1]).strip() if len(row) > 1 else ''
                pyme_name = str(row[2]).strip() if len(row) > 2 else 'Sin nombre'
                sheet_id = str(row[3]).strip() if len(row) > 3 else ''
                token = str(row[4]).strip() if len(row) > 4 else ''
                created_at = str(row[5]).strip() if len(row) > 5 else ''
                business_type = str(row[6]).strip() if len(row) > 6 else ''

                if not tenant_id or not token:
                    continue

                conn.execute(
                    """INSERT OR REPLACE INTO tenants
                       (telegram_id, tenant_id, pyme_name, sheet_id, token, created_at, business_type)
                       VALUES (?, ?, ?, ?, ?, ?, ?)""",
                    (telegram_id, tenant_id, pyme_name, sheet_id, token, created_at, business_type)
                )

                tenants.append({
                    'tenant_id': tenant_id,
                    'sheet_id': sheet_id,
                    'pyme_name': pyme_name,
                    'token': token,
                })

        print(f"   ✅ {len(tenants)} tenants importados en admin.db")
        return tenants

    except Exception as e:
        print(f"   ❌ Error importando tenants: {e}")
        import traceback
        traceback.print_exc()
        return []


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
        data_rows = rows[1:] if len(rows) > 1 else []
        print(f"  INVENTARIO: {len(data_rows)} productos encontrados")

        imported = 0
        with get_conn(tenant_id) as conn:
            for row in data_rows:
                if not row or not any(row):
                    continue
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

    # Step 1: Migrate tenants registry
    tenants = migrate_tenants_table(ts)

    if not tenants:
        print("\n⚠️  No hay tenants para migrar. Saliendo.")
        sys.exit(0)

    # Step 2: Migrate each tenant's inventory + movements
    for t in tenants:
        migrate_tenant(t['tenant_id'], t['sheet_id'], t['pyme_name'])

    print(f"\n{'='*60}")
    print(f"✅ Migración completada.")
    print(f"   Tenants: admin.db")
    print(f"   Datos: /app/data/inventory_*.db")
    print(f"\n   ⚡ STORAGE_BACKEND ya está en 'sqlite' por defecto.")
    print(f"   Después del deploy, reinicia: docker compose restart")


if __name__ == '__main__':
    main()
