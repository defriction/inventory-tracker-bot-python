import datetime
import uuid
import logging
import sys
import unicodedata
from app.core.google_client import get_gs_client

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# ⚠️ FORZAR LOGS EN DOCKER: Enviar directo a consola (stdout)
if not logger.handlers:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
    logger.addHandler(handler)

class InventoryService:
    def __init__(self, sheet_id: str):
        """
        Inicializa la conexión con el Excel específico de una Pyme.
        """
        logger.info(f"🔌 Conectando a hoja de inventario ID: {sheet_id}")
        self.client = get_gs_client()
        try:
            self.book = self.client.open_by_key(sheet_id)
            self.inventory_sheet = self.book.worksheet("INVENTARIO")
            self.history_sheet = self.book.worksheet("MOVIMIENTOS")
            logger.info("✅ Conexión exitosa a las hojas INVENTARIO y MOVIMIENTOS")
        except Exception as e:
            logger.error(f"Error abriendo hoja {sheet_id}: {e}")
            raise ValueError("No se pudo acceder al inventario del cliente.")

    def process_instruction(self, intent: dict, user_name: str) -> str:
        """
        Recibe la intención de la IA y ejecuta la acción.
        """
        logger.info(f"📩 Procesando instrucción de '{user_name}': {intent}")

        action = intent.get('accion')
        product_name = intent.get('producto')
        # Sanitización: Aseguramos que el nombre sea texto, incluso si parece una operación (ej: 4*50)
        if product_name is not None:
            product_name = str(product_name)
            
        # Valores crudos (pueden ser None)
        qty_val = intent.get('cantidad')
        qty = int(qty_val) if qty_val is not None else 1 # Default 1 solo para operaciones
        price = intent.get('precio') 
        purchase_price = intent.get('precio_compra')
        
        # --- NUEVOS DATOS (Recibidos de la IA) ---
        category = intent.get('categoria') or 'General'
        unit = intent.get('unidad') or 'UND'
        expiration_date = intent.get('fecha_vencimiento') or ""
        location = intent.get('ubicacion') or ""

        if action == "DESCONOCIDO":
            logger.warning("⚠️ Acción desconocida recibida")
            return "🤷‍♂️ No entendí qué quieres hacer. Intenta: 'Vendí 2 articulos'."
        
        if not product_name and action != "DESCONOCIDO":
            logger.warning("⚠️ Falta nombre del producto en la instrucción")
            return "❌ Necesito que me digas el nombre del producto."

        try:
            # 1. BUSCAR EL PRODUCTO (Lógica de Keywords)
            logger.info(f"🔍 Buscando producto: '{product_name}'")
            
            # Habilitamos inferencia (Exacta > Parcial) para TODAS las acciones (incluido ACTUALIZAR)
            use_exact_match = False
            row_idx, real_name = self._find_product_row_by_keyword(product_name, exact_match=use_exact_match)

            if row_idx:
                logger.info(f"✅ Producto encontrado: '{real_name}' en fila {row_idx}")
            else:
                logger.info(f"❌ Producto '{product_name}' no encontrado")

            # --- ENRUTADOR ---

            response_text = None

            if action == "CREAR":
                if row_idx:
                    logger.warning(f"⚠️ Intento de crear producto duplicado: {real_name}")
                    response_text = f"⚠️ Ya encontré un producto similar: *{self._escape(real_name)}*. Usa otro nombre si es diferente."
                else:
                    # AHORA PASAMOS LA FECHA DE VENCIMIENTO A LA FUNCIÓN
                    response_text = self._create_product(product_name, price, qty, user_name, category, unit, expiration_date, location, purchase_price)
            
            # Para el resto de acciones el producto DEBE existir
            elif not row_idx:
                response_text = f"❌ No encontré nada relacionado con '{self._escape(product_name)}' en tu inventario."

            elif action == "VENTA":
                response_text = self._handle_sale(row_idx, real_name, qty, user_name)
            
            elif action == "COMPRA":
                response_text = self._handle_purchase(row_idx, real_name, qty, user_name)
            
            elif action == "CONSULTA":
                response_text = self._handle_query(row_idx, real_name)
            
            elif action == "ACTUALIZAR":
                response_text = self._update_product(row_idx, real_name, intent, user_name)

            if response_text:
                logger.info(f"📤 Respuesta generada para Telegram: {response_text!r}")
                return response_text

        except Exception as e:
            logger.error(f"Error procesando accion: {e}")
            return "💥 Ocurrió un error técnico actualizando tu Excel."

        logger.warning(f"⚠️ Comando no reconocido: {action}")
        return "Comando no reconocido."

    # ==========================================
    # MÉTODOS PRIVADOS (Lógica Interna)
    # ==========================================

    def _escape(self, text) -> str:
        """Escapa caracteres especiales para evitar errores de MarkdownV2 en Telegram"""
        if text is None:
            return ""
        text = str(text)
        # Lista oficial de caracteres reservados en MarkdownV2
        chars = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!']
        for c in chars:
            text = text.replace(c, f"\\{c}")
        return text

    def _normalize(self, text: str) -> str:
        """Elimina acentos y convierte a minúsculas para comparaciones robustas"""
        return ''.join(
            c for c in unicodedata.normalize('NFD', str(text))
            if unicodedata.category(c) != 'Mn'
        ).lower().strip()

    def _find_product_row_by_keyword(self, query: str, exact_match: bool = False):
        """
        Busca en Columna B (SKU) y Columna C (Nombres).
        Prioridad:
        1. SKU Exacto.
        2. Nombre Exacto.
        3. Nombre Parcial (si exact_match=False).
        """
        try:
            skus = self.inventory_sheet.col_values(2) # Columna B
            product_names = self.inventory_sheet.col_values(3) # Columna C
            query_norm = self._normalize(query)

            # 1. BÚSQUEDA POR SKU (Exacta - Prioridad Máxima)
            for i, sku in enumerate(skus):
                if i == 0: continue # Saltar encabezado
                if self._normalize(sku) == query_norm:
                    # Encontramos por SKU, devolvemos el nombre asociado (si existe)
                    real_name = product_names[i] if i < len(product_names) else "Producto sin nombre"
                    return i + 1, real_name

            # 2. BÚSQUEDA POR NOMBRE (Exacta)
            for i, name in enumerate(product_names):
                if i == 0: continue # Saltar encabezado
                cell_norm = self._normalize(name)
                if query_norm == cell_norm:
                    return i + 1, name
            
            # 3. BÚSQUEDA POR NOMBRE (Parcial / Inferencia)
            if not exact_match:
                for i, name in enumerate(product_names):
                    if i == 0: continue
                    cell_norm = self._normalize(name)
                    if query_norm in cell_norm:
                        return i + 1, name 

            return None, None
        except Exception as e:
            logger.error(f"Error buscando producto: {e}")
            return None, None

    def _create_product(self, name, price, initial_stock, user, category="General", unit="UND", expiration_date="", location="", purchase_price=0):
        """Crea producto nuevo incluyendo Fecha de Vencimiento"""
        logger.info(f"🆕 Creando producto: {name} | Precio: {price} | Stock: {initial_stock}")
        
        new_uuid = str(uuid.uuid4())[:8]
        sku = f"GEN-{new_uuid[:4].upper()}"
        price_val = price if price else 0
        cost_val = purchase_price if purchase_price else 0
        
        # Estructura Columnas: 
        # A: UUID, B: SKU, C: Nombre, D: Categoria, E: Stock, F: Unidad, G: Costo, H: Precio, I: Vencimiento, J: Ubicacion
        row_data = [new_uuid, sku, name, category, initial_stock, unit, cost_val, price_val, expiration_date, location]
        
        self.inventory_sheet.append_row(row_data)
        
        if initial_stock > 0:
            self._log_movement("CREACION", sku, name, initial_stock, user, "Stock Inicial")

        # Formatear mensaje de respuesta
        exp_msg = f" \| 📅 Vence: {self._escape(expiration_date)}" if expiration_date else ""
        loc_msg = f"\n📍 Ubicación: {self._escape(location)}" if location else ""

        return (f"🆕 *Producto Creado*\n"
                f"📦 {self._escape(name)}\n"
                f"📂 Cat: {self._escape(category)} \| 📏 Unidad: {self._escape(unit)}\n"
                f"💰 Costo: ${self._escape(cost_val)}\n"
                f"💲 Precio: ${self._escape(price_val)}{exp_msg}\n"
                f"{loc_msg}"
                f"🔢 Stock inicial: {self._escape(initial_stock)}")

    def _handle_sale(self, row_idx, name, qty, user):
        """Procesa venta"""
        logger.info(f"📉 Procesando venta: {name} | Cantidad: {qty}")
        current_stock = int(self.inventory_sheet.cell(row_idx, 5).value or 0)
        
        if current_stock < qty:
            logger.warning(f"⚠️ Stock insuficiente para {name}. Actual: {current_stock}, Solicitado: {qty}")
            return f"⚠️ *Stock Insuficiente*\nProducto: {self._escape(name)}\nTienes: {current_stock}\nIntentas vender: {qty}"

        new_stock = current_stock - qty
        self.inventory_sheet.update_cell(row_idx, 5, new_stock)
        
        sku = self.inventory_sheet.cell(row_idx, 2).value
        self._log_movement("VENTA", sku, name, -qty, user)

        return f"✅ *Venta Registrada*\n🔻 {self._escape(name)}\nStock: {current_stock} ➡ {new_stock}"

    def _handle_purchase(self, row_idx, name, qty, user):
        """Procesa compra"""
        logger.info(f"📈 Procesando compra: {name} | Cantidad: {qty}")
        current_stock = int(self.inventory_sheet.cell(row_idx, 5).value or 0)
        
        new_stock = current_stock + qty
        self.inventory_sheet.update_cell(row_idx, 5, new_stock)
        
        sku = self.inventory_sheet.cell(row_idx, 2).value
        self._log_movement("COMPRA", sku, name, qty, user)

        return f"✅ *Entrada Registrada*\n🟢 {self._escape(name)}\nStock: {current_stock} ➡ {new_stock}"

    def _handle_query(self, row_idx, name):
        """Consulta datos, incluyendo vencimiento"""
        logger.info(f"ℹ️ Consultando datos de: {name} (Fila {row_idx})")
        values = self.inventory_sheet.row_values(row_idx)
        logger.info(f"🔍 Datos crudos recuperados: {values}")
        
        # Índices de lista (Python empieza en 0): 
        # 1=SKU, 3=Categoria, 4=Stock, 5=Unidad, 7=Precio, 8=Vencimiento (Columna I)
        sku = values[1] if len(values) > 1 else "??"
        category = values[3] if len(values) > 3 else "-"
        stock = values[4] if len(values) > 4 else "0"
        unit = values[5] if len(values) > 5 else "UND"
        cost = values[6] if len(values) > 6 else "0"
        price = values[7] if len(values) > 7 else "0"
        
        # Leemos la fecha de vencimiento
        expiration = values[8] if len(values) > 8 else ""
        location = values[9] if len(values) > 9 else ""
        logger.info(f"📊 Datos parseados - SKU: {sku}, Stock: {stock}, Precio: {price}, Vence: {expiration}, Ubic: {location}")

        exp_msg = f"\n📅 Vence: {self._escape(expiration)}" if expiration else ""
        loc_msg = f"\n📍 Ubicación: {self._escape(location)}" if location else ""

        return (f"📦 *Consulta de Inventario*\n"
                f"📝 Producto: {self._escape(name)}\n"
                f"📂 Cat: {self._escape(category)} \| 🏷 SKU: {self._escape(sku)}\n"
                f"🔢 Stock: {self._escape(stock)} {self._escape(unit)}\n"
                f"💰 Costo: ${self._escape(cost)}\n"
                f"💲 Precio: ${self._escape(price)}"
                f"{exp_msg}{loc_msg}")

    def _update_product(self, row_idx, current_name, intent, user):
        """Actualiza campos específicos del producto"""
        logger.info(f"🔄 Actualizando producto: {current_name}")
        
        updates = []
        
        # 1. Precio (Columna H -> 8)
        new_price = intent.get('precio')
        if new_price is not None:
            self.inventory_sheet.update_cell(row_idx, 8, new_price)
            updates.append(f"Precio: ${self._escape(new_price)}")

        # 1.1 Costo (Columna G -> 7)
        new_cost = intent.get('precio_compra')
        if new_cost is not None:
            self.inventory_sheet.update_cell(row_idx, 7, new_cost)
            updates.append(f"Costo: ${self._escape(new_cost)}")

        # 2. Stock / Cantidad (Columna E -> 5) - CORRECCIÓN DE INVENTARIO
        new_stock = intent.get('cantidad')
        if new_stock is not None:
            self.inventory_sheet.update_cell(row_idx, 5, int(new_stock))
            sku = self.inventory_sheet.cell(row_idx, 2).value
            self._log_movement("AJUSTE", sku, current_name, int(new_stock), user, "Corrección Manual")
            updates.append(f"Stock: {self._escape(new_stock)}")

        # 3. Categoría (Columna D -> 4)
        new_cat = intent.get('categoria')
        if new_cat:
            self.inventory_sheet.update_cell(row_idx, 4, new_cat.title())
            updates.append(f"Cat: {self._escape(new_cat)}")

        # 4. Fecha Vencimiento (Columna I -> 9)
        new_exp = intent.get('fecha_vencimiento')
        if new_exp:
            self.inventory_sheet.update_cell(row_idx, 9, new_exp)
            updates.append(f"Vence: {self._escape(new_exp)}")
            
        # 6. Ubicación (Columna J -> 10)
        new_loc = intent.get('ubicacion')
        if new_loc:
            self.inventory_sheet.update_cell(row_idx, 10, new_loc)
            updates.append(f"Ubicación: {self._escape(new_loc)}")

        # 5. Nuevo Nombre (Columna C -> 3)
        new_name = intent.get('nuevo_nombre')
        if new_name:
            self.inventory_sheet.update_cell(row_idx, 3, new_name)
            updates.append(f"Nombre: {self._escape(new_name)}")
            current_name = new_name # Para el mensaje final
            
        # 7. SKU (Columna B -> 2)
        new_sku = intent.get('nuevo_sku')
        if new_sku:
            new_sku = str(new_sku).upper() # Forzamos mayúsculas
            self.inventory_sheet.update_cell(row_idx, 2, new_sku)
            updates.append(f"SKU: {self._escape(new_sku)}")

        if not updates:
            return f"⚠️ Entendí que quieres actualizar *{self._escape(current_name)}*, pero no me dijiste qué cambiar (precio, stock, etc)."

        return f"✅ *Producto Actualizado*\n📝 {self._escape(current_name)}\nCambios: {', '.join(updates)}"

    def _log_movement(self, mov_type, sku, name, qty, user, notes=""):
        """Auditoría"""
        logger.info(f"📝 Registrando movimiento en historial: {mov_type} | {sku}")
        ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        tx_id = str(uuid.uuid4())[:6]
        self.history_sheet.append_row([ts, tx_id, mov_type, sku, name, qty, user, notes])