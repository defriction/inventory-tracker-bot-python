"""
TenantServiceSQLite — SQLite-backed tenant registry.
Same interface as TenantService: create_tenant, get_tenant_by_user, link_user.
"""
import uuid
import datetime
import logging
from app.core.database import init_admin_db, init_tenant_db, get_admin_conn

logger = logging.getLogger(__name__)


class TenantService:
    """
    Drop-in replacement for the Google Sheets TenantService.
    All tenant management via admin.db SQLite.
    """

    def __init__(self):
        init_admin_db()

    def validate_token(self, token: str):
        """Validate a token and return tenant info. Returns None if invalid."""
        try:
            with get_admin_conn() as conn:
                row = conn.execute(
                    "SELECT tenant_id, pyme_name, sheet_id, token, business_type, nit, address, description, created_at FROM tenants WHERE token = ?",
                    (token,)
                ).fetchone()
                if row:
                    return {
                        "tenant_id": row["tenant_id"],
                        "pyme_name": row["pyme_name"],
                        "sheet_id": row["sheet_id"] or "",
                        "token": row["token"],
                        "business_type": row["business_type"] or "",
                        "nit": row["nit"] or "",
                        "address": row["address"] or "",
                        "description": row["description"] or "",
                        "created_at": row["created_at"] or "",
                    }
            return None
        except Exception:
            return None

    def create_tenant(self, name: str, business_type: str, telegram_id: str = ""):
        """Register a new PyME. Creates the tenant inventory DB."""
        try:
            new_uuid = str(uuid.uuid4())
            token = str(uuid.uuid4())[:6].upper()
            timestamp = str(datetime.datetime.now())

            logger.info(f"Creando tenant: {name} (id={new_uuid})")

            # Init the tenant's inventory DB
            init_tenant_db(new_uuid)

            # Register in admin DB
            with get_admin_conn() as conn:
                conn.execute(
                    """INSERT INTO tenants (telegram_id, tenant_id, pyme_name, sheet_id, token, created_at, business_type)
                       VALUES (?, ?, ?, ?, ?, ?, ?)""",
                    (str(telegram_id), new_uuid, name, '', token, timestamp, business_type)
                )

            logger.info(f"Tenant creado: {name}")

            return {
                "token": token,
                "sheet_id": '',  # No sheet ID in SQLite mode
                "url": f"https://inventory.defriction.org/?token={token}"
            }

        except Exception as e:
            logger.error(f"Error creando tenant: {e}")
            raise Exception(f"Fallo al crear la infraestructura: {str(e)}")

    def get_tenant_by_user(self, telegram_id: str):
        """Find tenant by Telegram user ID. Supports multiple users per tenant (CSV)."""
        try:
            with get_admin_conn() as conn:
                rows = conn.execute(
                    "SELECT tenant_id, pyme_name, sheet_id, token FROM tenants WHERE telegram_id LIKE ?",
                    (f'%{telegram_id}%',)
                ).fetchall()

                for row in rows:
                    # Check if telegram_id is in the comma-separated list
                    owners = row['telegram_id'] if hasattr(row, 'telegram_id') else ''
                    # Re-query to get telegram_id explicitly
                    pass

                # Simpler: iterate all and check
                all_rows = conn.execute(
                    "SELECT tenant_id, pyme_name, sheet_id, token, telegram_id FROM tenants"
                ).fetchall()

            for row in all_rows:
                val = row['telegram_id'] or ''
                if str(telegram_id) in val.split(','):
                    return {
                        "tenant_id": row['tenant_id'],
                        "pyme_name": row['pyme_name'],
                        "sheet_id": row['sheet_id'],
                        "token": row['token'],
                    }
            return None
        except Exception:
            return None

    def link_user(self, telegram_id: str, token: str):
        """Link a Telegram user to a tenant by token."""
        try:
            with get_admin_conn() as conn:
                row = conn.execute(
                    "SELECT tenant_id, pyme_name, telegram_id FROM tenants WHERE token = ?",
                    (token,)
                ).fetchone()

                if not row:
                    return False, "❌ Token inválido o no encontrado\\."

                current = row['telegram_id'] or ''
                owners = [o.strip() for o in current.split(',') if o.strip()]

                if str(telegram_id) not in owners:
                    owners.append(str(telegram_id))
                    new_val = ','.join(owners)
                    conn.execute(
                        "UPDATE tenants SET telegram_id = ? WHERE token = ?",
                        (new_val, token)
                    )

                pyme_name = row['pyme_name']
                safe_pyme = str(pyme_name)
                for c in ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!']:
                    safe_pyme = safe_pyme.replace(c, f"\\{c}")

                return True, f"✅ ¡Vinculación exitosa\\!\\nBienvenido a *{safe_pyme}*\\."

        except Exception as e:
            logger.error(f"Error vinculando: {e}")
            return False, "Error técnico al vincular cuenta\\."

    def list_all(self):
        """List all tenants."""
        try:
            with get_admin_conn() as conn:
                rows = conn.execute(
                    "SELECT tenant_id, pyme_name, token, telegram_id, business_type, nit, address, description, created_at FROM tenants ORDER BY created_at DESC"
                ).fetchall()
            return [
                {
                    "tenant_id": r["tenant_id"],
                    "pyme_name": r["pyme_name"],
                    "token": r["token"],
                    "telegram_id": r["telegram_id"] or "",
                    "business_type": r["business_type"] or "",
                    "nit": r["nit"] or "",
                    "address": r["address"] or "",
                    "description": r["description"] or "",
                    "created_at": r["created_at"] or "",
                }
                for r in rows
            ]
        except Exception as e:
            logger.error(f"Error listando tenants: {e}")
            return []

    def delete_tenant(self, tenant_id: str):
        """Delete a tenant and its inventory database."""
        try:
            import os
            from app.core.database import get_db_path

            with get_admin_conn() as conn:
                conn.execute("DELETE FROM tenants WHERE tenant_id = ?", (tenant_id,))

            # Remove inventory DB file
            db_path = get_db_path(tenant_id)
            if os.path.exists(db_path):
                os.remove(db_path)

            return True
        except Exception as e:
            logger.error(f"Error eliminando tenant: {e}")
            return False
