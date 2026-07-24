"""
InventoryServiceSQLite — same interface as InventoryService, SQLite backend.
Drop-in replacement. api.py and webhook.py work unchanged.
"""
import datetime
import uuid
import logging
import sys
import unicodedata
from app.core.database import get_conn, init_tenant_db

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

if not logger.handlers:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
    logger.addHandler(handler)

# Column name → 1-indexed position mapping (matches Google Sheets layout)
INVENTORY_COLS = {
    'uuid': 1, 'sku': 2, 'name': 3, 'category': 4, 'stock': 5,
    'unit': 6, 'cost': 7, 'price': 8, 'expiration_date': 9,
    'location': 10, 'invima': 11, 'lote': 12,
}
INVENTORY_COL_NAMES = ['uuid', 'sku', 'name', 'category', 'stock', 'unit', 'cost', 'price', 'expiration_date', 'location', 'invima', 'lote']

MOVEMENTS_COLS = {
    'timestamp': 1, 'tx_id': 2, 'mov_type': 3, 'sku': 4,
    'name': 5, 'qty': 6, 'user': 7, 'notes': 8,
}
MOVEMENTS_COL_NAMES = ['timestamp', 'tx_id', 'mov_type', 'sku', 'name', 'qty', 'user', 'notes']


class _Cell:
    """Mimics gspread Cell object."""
    def __init__(self, value):
        self.value = value


class SheetAdapter:
    """Wraps a SQLite table to look like a gspread Worksheet.
    Only implements the methods that api.py and inventory_service.py actually call."""

    def __init__(self, tenant_id: str, table: str, col_names: list[str]):
        self._tenant_id = tenant_id
        self._table = table
        self._col_names = col_names
        # Header row: column names capitalized (matching Sheets behavior)
        self._header = [c.replace('_', ' ').upper() for c in col_names]

    def _conn(self):
        return get_conn(self._tenant_id)

    def get_all_values(self) -> list[list]:
        """Returns 2D array: [header_row, ...data_rows]. Matches gspread format."""
        with self._conn() as conn:
            cols = ', '.join(self._col_names)
            rows = conn.execute(f"SELECT {cols} FROM {self._table} ORDER BY rowid DESC").fetchall()

        result = [self._header]
        for row in rows:
            result.append([str(v) if v is not None else '' for v in row])
        return result

    def row_values(self, row_idx: int) -> list:
        """Get row values by 1-indexed position. Returns list of strings."""
        with self._conn() as conn:
            cols = ', '.join(self._col_names)
            row = conn.execute(
                f"SELECT {cols} FROM {self._table} ORDER BY rowid LIMIT 1 OFFSET ?",
                (row_idx - 1,)
            ).fetchone()
        if row:
            return [str(v) if v is not None else '' for v in row]
        return [''] * len(self._col_names)

    def cell(self, row_idx: int, col_idx: int) -> _Cell:
        """Get cell value by 1-indexed position. Returns object with .value attribute."""
        col_name = self._col_names[col_idx - 1] if col_idx <= len(self._col_names) else 'uuid'
        with self._conn() as conn:
            val = conn.execute(
                f"SELECT {col_name} FROM {self._table} ORDER BY rowid LIMIT 1 OFFSET ?",
                (row_idx - 1,)
            ).fetchone()
        return _Cell(val[0] if val else None)

    def update_cell(self, row_idx: int, col_idx: int, value):
        """Update a single cell by 1-indexed position."""
        col_name = self._col_names[col_idx - 1] if col_idx <= len(self._col_names) else 'uuid'
        with self._conn() as conn:
            # Find the actual rowid for the given 1-indexed position
            target = conn.execute(
                "SELECT rowid FROM {} ORDER BY rowid LIMIT 1 OFFSET ?".format(self._table),
                (row_idx - 1,)
            ).fetchone()
            if target:
                conn.execute(
                    f"UPDATE {self._table} SET {col_name} = ?, updated_at = datetime('now','localtime') WHERE rowid = ?",
                    (value, target[0])
                )

    def append_row(self, data: list):
        """Append a row to the table."""
        placeholders = ', '.join(['?'] * len(data))
        cols = ', '.join(self._col_names[:len(data)])
        with self._conn() as conn:
            conn.execute(
                f"INSERT INTO {self._table} ({cols}) VALUES ({placeholders})",
                data
            )


class InventoryService:
    """
    Drop-in replacement for InventoryService using SQLite.
    Same interface: self.inventory_sheet, self.history_sheet, process_instruction(), etc.
    """

    def __init__(self, tenant_id: str):
        logger.info(f"Conectando a SQLite para tenant: {tenant_id}")
        init_tenant_db(tenant_id)
        self.tenant_id = tenant_id
        self.inventory_sheet = SheetAdapter(tenant_id, 'products', INVENTORY_COL_NAMES)
        self.history_sheet = SheetAdapter(tenant_id, 'movements', MOVEMENTS_COL_NAMES)
        self.pending_multi_match = None

    # ── Normalization helpers (same as original) ──

    def _normalize(self, text: str) -> str:
        if not text:
            return ''
        text = str(text)
        text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode('ascii')
        return text.strip().lower()

    def _escape(self, text) -> str:
        text = str(text or '')
        for c in ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!']:
            text = text.replace(c, f'\\{c}')
        return text

    # ── Product search (SQL, not sheet scan) ──

    def _find_product_row_by_keyword(self, query: str, exact_match: bool = False):
        """Search by SKU, name, invima, or lote. Returns (row_idx, name) or (None, None).
        Same signature as InventoryService for api.py compatibility."""
        query_norm = self._normalize(query)
        if not query_norm:
            return None, None

        query_clean = query_norm
        for prefix in ["sku ", "lote ", "invima ", "inv "]:
            if query_clean.startswith(prefix):
                query_clean = query_clean[len(prefix):].strip()
        if query_clean.endswith(".0"):
            query_clean = query_clean[:-2]

        with get_conn(self.tenant_id) as conn:
            # 1. Exact match by SKU, INVIMA, LOTE
            row = conn.execute(
                "SELECT rowid, name FROM products WHERE lower(sku) = ? OR lower(invima) = ? OR lower(lote) = ? LIMIT 1",
                (query_clean, query_clean, query_clean)
            ).fetchone()
            if row:
                return row[0], row[1]

            # 2. Exact name match
            row = conn.execute(
                "SELECT rowid, name FROM products WHERE lower(name) = ? LIMIT 1",
                (query_norm,)
            ).fetchone()
            if row:
                return row[0], row[1]

            # 3. Partial name match (only if exact_match=False)
            if not exact_match:
                row = conn.execute(
                    "SELECT rowid, name FROM products WHERE lower(name) LIKE ? LIMIT 1",
                    (f'%{query_norm}%',)
                ).fetchone()
                if row:
                    return row[0], row[1]

        return None, None

    def _find_products_by_keyword(self, query: str) -> list[dict]:
        """Search products by SKU, name, invima, or lote. Returns list of {row_idx, sku, name, category, stock}."""
        query_norm = self._normalize(query)
        if not query_norm:
            return []

        with get_conn(self.tenant_id) as conn:
            # Try exact SKU/Invima/Lote match
            row = conn.execute(
                "SELECT rowid, sku, name, category, stock FROM products WHERE lower(sku) = ? OR lower(invima) = ? OR lower(lote) = ? LIMIT 1",
                (query_norm, query_norm, query_norm)
            ).fetchone()
            if row:
                return [{'row_idx': row[0], 'sku': row[1], 'name': row[2], 'category': row[3], 'stock': row[4]}]

            # Try exact name match
            row = conn.execute(
                "SELECT rowid, sku, name, category, stock FROM products WHERE lower(name) = ? LIMIT 1",
                (query_norm,)
            ).fetchone()
            if row:
                return [{'row_idx': row[0], 'sku': row[1], 'name': row[2], 'category': row[3], 'stock': row[4]}]

            # Partial name match (for fuzzy)
            rows = conn.execute(
                "SELECT rowid, sku, name, category, stock FROM products WHERE lower(name) LIKE ? LIMIT 10",
                (f'%{query_norm}%',)
            ).fetchall()
            return [
                {'row_idx': r[0], 'sku': r[1], 'name': r[2], 'category': r[3], 'stock': r[4]}
                for r in rows
            ]

    # ── Movement logging ──

    def _delete_product(self, row_idx: int):
        """Delete a product by 1-indexed row position."""
        with get_conn(self.tenant_id) as conn:
            product = conn.execute(
                "SELECT rowid, sku, name FROM products ORDER BY rowid LIMIT 1 OFFSET ?",
                (row_idx - 1,)
            ).fetchone()
            if product:
                conn.execute("DELETE FROM products WHERE rowid = ?", (product['rowid'],))

    def _log_movement(self, mov_type, sku, name, qty, user, notes=""):
        logger.info(f"Registrando movimiento: {mov_type} | {sku}")
        ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        tx_id = str(uuid.uuid4())[:6]
        with get_conn(self.tenant_id) as conn:
            conn.execute(
                "INSERT INTO movements (timestamp, tx_id, mov_type, sku, name, qty, user, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (ts, tx_id, mov_type, sku, name, qty, user, notes)
            )

    # ── Create product ──

    def _create_product(self, name, price, initial_stock, user, category="General", unit="UND",
                        expiration_date="", location="", purchase_price=0, invima="", lote="", requested_sku=""):
        logger.info(f"Creando producto: {name} | Precio: {price} | Stock: {initial_stock}")
        new_uuid = str(uuid.uuid4())[:8]
        sku = str(requested_sku).strip().upper() if requested_sku else f"GEN-{new_uuid[:4].upper()}"
        price_val = price if price else 0
        cost_val = purchase_price if purchase_price else 0

        with get_conn(self.tenant_id) as conn:
            conn.execute(
                """INSERT INTO products (uuid, sku, name, category, stock, unit, cost, price, expiration_date, location, invima, lote)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (new_uuid, sku, name, category, initial_stock, unit, cost_val, price_val,
                 expiration_date, location, invima, lote)
            )

        if initial_stock > 0:
            self._log_movement("CREACION", sku, name, initial_stock, user, "Stock Inicial")

        exp_msg = f" | 📅 Vence: {self._escape(expiration_date)}" if expiration_date else ""
        details = []
        if location: details.append(f"📍 Ubicación: {self._escape(location)}")
        if invima: details.append(f"🏥 INVIMA: {self._escape(invima)}")
        if lote: details.append(f"🏷️ Lote: {self._escape(lote)}")
        details_msg = "\n".join(details)
        if details_msg: details_msg = "\n" + details_msg

        return (f"✅ *Producto Creado*\n"
                f"🛒 {self._escape(name)}\n"
                f"📂 Cat: {self._escape(category)} | 📦 Unidad: {self._escape(unit)}\n"
                f"💰 Costo: ${self._escape(cost_val)}\n"
                f"🏷️ Precio: ${self._escape(price_val)}{exp_msg}"
                f"{details_msg}\n"
                f"📊 Stock inicial: {self._escape(initial_stock)}")

    # ── Sale ──

    def _handle_sale(self, row_idx, name, qty, user):
        logger.info(f"Procesando venta: {name} | Cantidad: {qty}")
        with get_conn(self.tenant_id) as conn:
            product = conn.execute(
                "SELECT sku, stock FROM products ORDER BY rowid LIMIT 1 OFFSET ?",
                (row_idx - 1,)
            ).fetchone()
            if not product:
                return f"⚠️ Producto no encontrado."

            current_stock = product['stock']
            if current_stock < qty:
                return f"⚠️ *Stock Insuficiente*\n🛒 Producto: {self._escape(name)}\n📦 Tienes: {self._escape(current_stock)}\n🛒 Intentas vender: {self._escape(qty)}"

            new_stock = current_stock - qty
            conn.execute(
                "UPDATE products SET stock = ?, updated_at = datetime('now','localtime') WHERE rowid = (SELECT rowid FROM products ORDER BY rowid LIMIT 1 OFFSET ?)",
                (new_stock, row_idx - 1)
            )
            sku = product['sku']

        self._log_movement("VENTA", sku, name, -qty, user)
        alert = f"\n⚠️ *Alerta:* ¡Stock bajo! ({new_stock})" if new_stock <= 5 else ""
        return f"✅ *Venta Registrada*\n🛒 {self._escape(name)}\n➖ {self._escape(qty)} unidades\n📦 Stock restante: {self._escape(new_stock)}{alert}"

    # ── Purchase / restock ──

    def _handle_purchase(self, row_idx, name, qty, user):
        logger.info(f"Procesando compra: {name} | Cantidad: {qty}")
        with get_conn(self.tenant_id) as conn:
            product = conn.execute(
                "SELECT sku, stock FROM products ORDER BY rowid LIMIT 1 OFFSET ?",
                (row_idx - 1,)
            ).fetchone()
            if not product:
                return f"⚠️ Producto no encontrado."

            new_stock = product['stock'] + qty
            conn.execute(
                "UPDATE products SET stock = ?, updated_at = datetime('now','localtime') WHERE rowid = (SELECT rowid FROM products ORDER BY rowid LIMIT 1 OFFSET ?)",
                (new_stock, row_idx - 1)
            )
            sku = product['sku']

        self._log_movement("COMPRA", sku, name, qty, user)
        return f"✅ *Compra Registrada*\n🛒 {self._escape(name)}\n➕ {self._escape(qty)} unidades\n📦 Stock actual: {self._escape(new_stock)}"

    # ── Adjustment ──

    def _handle_adjustment(self, row_idx, name, qty, user):
        logger.info(f"Procesando ajuste: {name} | Cantidad: {qty}")
        with get_conn(self.tenant_id) as conn:
            product = conn.execute(
                "SELECT sku, stock FROM products ORDER BY rowid LIMIT 1 OFFSET ?",
                (row_idx - 1,)
            ).fetchone()
            if not product:
                return f"⚠️ Producto no encontrado."

            new_stock = max(0, product['stock'] + qty)
            conn.execute(
                "UPDATE products SET stock = ?, updated_at = datetime('now','localtime') WHERE rowid = (SELECT rowid FROM products ORDER BY rowid LIMIT 1 OFFSET ?)",
                (new_stock, row_idx - 1)
            )
            sku = product['sku']

        self._log_movement("AJUSTE", sku, name, qty, user)
        return f"✅ *Ajuste Realizado*\n🛒 {self._escape(name)}\n🔧 Cambio: {self._escape('+' if qty >= 0 else '')}{self._escape(qty)}\n📦 Stock actual: {self._escape(new_stock)}"

    # ── Update product ──

    def _handle_update(self, row_idx, name, intent):
        logger.info(f"Actualizando producto en fila {row_idx}: {intent}")
        with get_conn(self.tenant_id) as conn:
            product = conn.execute(
                "SELECT rowid, name, sku, stock FROM products ORDER BY rowid LIMIT 1 OFFSET ?",
                (row_idx - 1,)
            ).fetchone()
            if not product:
                return f"⚠️ Producto no encontrado."

            current_name = product['name']
            sku = product['sku']
            updates = []
            params = []

            if intent.get('precio') is not None:
                updates.append("price = ?"); params.append(intent['precio'])
            if intent.get('precio_compra') is not None:
                updates.append("cost = ?"); params.append(intent['precio_compra'])
            if intent.get('cantidad') is not None:
                new_stock = int(intent['cantidad'])
                updates.append("stock = ?"); params.append(new_stock)
            if intent.get('categoria'):
                updates.append("category = ?"); params.append(intent['categoria'].title())
            if intent.get('fecha_vencimiento') is not None:
                updates.append("expiration_date = ?"); params.append(intent['fecha_vencimiento'])
            if intent.get('ubicacion') is not None:
                updates.append("location = ?"); params.append(intent['ubicacion'])
            if intent.get('invima') is not None:
                updates.append("invima = ?"); params.append(intent['invima'])
            if intent.get('lote') is not None:
                updates.append("lote = ?"); params.append(intent['lote'])
            if intent.get('nombre'):
                updates.append("name = ?"); params.append(intent['nombre'])
            if intent.get('nuevo_sku') or intent.get('sku'):
                new_sku = (intent.get('nuevo_sku') or intent.get('sku')).strip().upper()
                updates.append("sku = ?"); params.append(new_sku)

            if updates:
                updates.append("updated_at = datetime('now','localtime')")
                params.append(product['rowid'])
                conn.execute(
                    f"UPDATE products SET {', '.join(updates)} WHERE rowid = ?",
                    params
                )

        return f"✅ *Producto Actualizado*\n🛒 {self._escape(current_name)}\n🔧 Campos modificados: {len(updates) - 1}"

    # ── List / report ──

    def _handle_list(self, intent):
        criterio = intent.get('criterio')
        loc_filter = intent.get('ubicacion')
        cat_filter = intent.get('categoria')

        with get_conn(self.tenant_id) as conn:
            query = "SELECT name, sku, stock, unit, expiration_date, location, category FROM products WHERE 1=1"
            params = []

            if criterio == 'bajo_stock':
                query += " AND stock <= 5 AND stock > 0"
            elif criterio == 'sin_stock':
                query += " AND stock <= 0"
            elif criterio == 'por_vencer':
                query += " AND expiration_date != '' AND date(expiration_date) <= date('now', '+30 days')"

            if loc_filter:
                query += " AND lower(location) = ?"
                params.append(loc_filter.lower())
            if cat_filter:
                query += " AND lower(category) = ?"
                params.append(cat_filter.lower())

            query += " ORDER BY stock ASC, name ASC LIMIT 30"
            rows = conn.execute(query, params).fetchall()

        if not rows:
            return "📭 No se encontraron productos con ese criterio."

        lines = [f"📋 *Resultados* ({len(rows)} productos):"]
        for r in rows:
            stock_icon = "🔴" if r['stock'] <= 0 else "⚠️" if r['stock'] <= 5 else "📦"
            exp = f" | 📅 {r['expiration_date']}" if r['expiration_date'] else ""
            loc = f" | 📍 {r['location']}" if r['location'] else ""
            lines.append(
                f"• {self._escape(r['name'])} — {stock_icon} {r['stock']} {r['unit']}"
                f"\\n  `{self._escape(r['sku'])}` | 📂 {self._escape(r['category'])}{exp}{loc}"
            )

        return "\n".join(lines)

    # ── Multi-match formatting ──

    def _format_multi_match(self, matches, action, query):
        action_label = {
            'VENDER': 'vender', 'COMPRAR': 'comprar', 'AJUSTAR': 'ajustar',
            'BUSCAR': 'buscar', 'ACTUALIZAR': 'actualizar', 'LISTAR': 'listar',
        }.get(action, 'procesar')

        lines = [
            f"🔍 Encontre *{len(matches)}* productos para *{self._escape(query)}*\\.\n",
            f"Selecciona cual quieres *{action_label}*:\\n",
        ]
        for idx, m in enumerate(matches, 1):
            stock_badge = "⚠️" if m["stock"] <= 5 else "📦"
            lines.append(
                f"{idx}️⃣  *{self._escape(m['name'])}*  \\|  🔢 `{self._escape(m['sku'])}`\\n"
                f"     📂 {self._escape(m['category'])}  \\|  {stock_badge} {self._escape(m['stock'])} UND"
            )
        lines.append(f"\n_Responde con el *SKU* o *nombre exacto* para {action_label}\\._")
        return "\n".join(lines)

    # ── Main instruction processor (same signature as original) ──

    def process_instruction(self, intent: dict, user_name: str) -> str:
        logger.info(f"Procesando instrucción de '{user_name}': {intent}")

        action = intent.get('accion')
        product_name = intent.get('producto')
        if product_name is not None:
            product_name = str(product_name)

        if not product_name:
            if intent.get('nuevo_sku'):
                product_name = intent.get('nuevo_sku')
            elif intent.get('lote'):
                product_name = intent.get('lote')
            elif intent.get('invima'):
                product_name = intent.get('invima')

        qty_val = intent.get('cantidad')
        qty = int(qty_val) if qty_val is not None else 1
        price = intent.get('precio')
        purchase_price = intent.get('precio_compra')
        category = intent.get('categoria') or 'General'
        unit = intent.get('unidad') or 'UND'
        expiration_date = intent.get('fecha_vencimiento') or ""
        location = intent.get('ubicacion') or ""
        invima = intent.get('invima') or ""
        lote = intent.get('lote') or ""
        requested_sku = intent.get('nuevo_sku') or intent.get('sku') or ""

        if action == "DESCONOCIDO":
            return "🤔 No entendí qué quieres hacer\\.\\nIntenta con: *Vendí 2 articulos* o *Cuánto vale el cemento*\\."

        if action == "LISTAR":
            return self._handle_list(intent)

        if not product_name and action != "DESCONOCIDO":
            return "📝 Necesito que me digas el nombre del producto\\."

        try:
            matches = self._find_products_by_keyword(product_name)

            if len(matches) == 1:
                row_idx = matches[0]["row_idx"]
                real_name = matches[0]["name"]
            elif len(matches) > 1:
                self.pending_multi_match = {
                    "action": action,
                    "intent": intent,
                    "matches": matches,
                    "query": product_name
                }
                return self._format_multi_match(matches, action, product_name)
            else:
                # Product not found — create it if intent suggests it
                if action in ("VENDER", "COMPRAR", "CREAR") or intent.get('precio'):
                    return self._create_product(
                        name=product_name, price=price, initial_stock=qty if action == "COMPRAR" else 0,
                        user=user_name, category=category, unit=unit,
                        expiration_date=expiration_date, location=location,
                        purchase_price=purchase_price, invima=invima, lote=lote,
                        requested_sku=requested_sku
                    )
                return f"🔍 No encontré *{self._escape(product_name)}*\\. ¿Quieres crearlo? Envía: *crear {self._escape(product_name)}*"

            # Execute action
            if action == "VENDER":
                return self._handle_sale(row_idx, real_name, qty, user_name)
            elif action == "COMPRAR":
                return self._handle_purchase(row_idx, real_name, qty, user_name)
            elif action == "AJUSTAR":
                return self._handle_adjustment(row_idx, real_name, qty, user_name)
            elif action == "ACTUALIZAR":
                return self._handle_update(row_idx, real_name, intent)
            elif action == "BUSCAR":
                with get_conn(self.tenant_id) as conn:
                    p = conn.execute(
                        "SELECT name, sku, category, stock, unit, price, cost, expiration_date, location, invima, lote FROM products ORDER BY rowid LIMIT 1 OFFSET ?",
                        (row_idx - 1,)
                    ).fetchone()
                if not p:
                    return "⚠️ Producto no encontrado."
                exp = f"\\n📅 Vence: {self._escape(p['expiration_date'])}" if p['expiration_date'] else ""
                loc = f"\\n📍 Ubicación: {self._escape(p['location'])}" if p['location'] else ""
                inv = f"\\n🏥 INVIMA: {self._escape(p['invima'])}" if p['invima'] else ""
                lot = f"\\n🏷️ Lote: {self._escape(p['lote'])}" if p['lote'] else ""
                return (
                    f"🔎 *{self._escape(p['name'])}*\\n"
                    f"🔢 SKU: `{self._escape(p['sku'])}`\\n"
                    f"📂 Categoría: {self._escape(p['category'])} | 📦 Unidad: {self._escape(p['unit'])}\\n"
                    f"📊 Stock: {self._escape(p['stock'])} | 💰 Precio: ${self._escape(p['price'])}\\n"
                    f"💵 Costo: ${self._escape(p['cost'])}"
                    f"{exp}{loc}{inv}{lot}"
                )
            else:
                return "🤔 No entendí la acción."

        except Exception as e:
            logger.error(f"Error en process_instruction: {e}")
            return "❌ Ocurrió un error procesando tu solicitud."
