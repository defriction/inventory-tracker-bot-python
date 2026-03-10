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
            
        # 🧠 LOGICA DE RESPALDO: Si no hay nombre de producto, buscamos por SKU, Lote o Invima.
        if not product_name:
            # La IA puede extraer el SKU en 'nuevo_sku'. Le damos prioridad a este identificador.
            if intent.get('nuevo_sku'):
                product_name = intent.get('nuevo_sku')
            elif intent.get('lote'):
                product_name = intent.get('lote')
            elif intent.get('invima'):
                product_name = intent.get('invima')

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
        invima = intent.get('invima') or ""
        lote = intent.get('lote') or ""

        if action == "DESCONOCIDO":
            logger.warning("⚠️ Acción desconocida recibida")
            return "🤷‍♂️ No entendí qué quieres hacer\. Intenta: 'Vendí 2 articulos'\."
            
        # --- ACCIÓN LISTAR (No requiere nombre de producto) ---
        if action == "LISTAR":
            return self._handle_list(intent)
        
        if not product_name and action != "DESCONOCIDO":
            logger.warning("⚠️ Falta nombre del producto en la instrucción")
            return "❌ Necesito que me digas el nombre del producto\."

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
                    response_text = f"⚠️ Ya encontré un producto similar: *{self._escape(real_name)}*\. Usa otro nombre si es diferente\."
                else:
                    # AHORA PASAMOS LA FECHA DE VENCIMIENTO A LA FUNCIÓN
                    response_text = self._create_product(product_name, price, qty, user_name, category, unit, expiration_date, location, purchase_price, invima, lote)
            
            # Para el resto de acciones el producto DEBE existir
            elif not row_idx:
                response_text = f"❌ No encontré nada relacionado con '{self._escape(product_name)}' en tu inventario\."

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
            return "💥 Ocurrió un error técnico actualizando tu Excel\."

        logger.warning(f"⚠️ Comando no reconocido: {action}")
        return "Comando no reconocido\."

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
            # Optimización: Leer todo de una vez para buscar en múltiples columnas (SKU, Nombre, Invima, Lote)
            rows = self.inventory_sheet.get_all_values()
            if not rows: return None, None
            
            query_norm = self._normalize(query)
            
            # FIX: Limpieza profunda de la búsqueda (Query)
            # Quitamos prefijos comunes que la IA o el usuario podrían incluir
            query_clean = query_norm
            for prefix in ["sku ", "lote ", "invima ", "inv "]:
                if query_clean.startswith(prefix):
                    query_clean = query_clean[len(prefix):].strip()
            
            if query_clean.endswith(".0"):
                query_clean = query_clean[:-2]

            # 1. BÚSQUEDA POR IDENTIFICADORES (SKU, INVIMA, LOTE) - Prioridad Máxima
            for i, row in enumerate(rows):
                if i == 0: continue # Saltar encabezado
                
                # Indices: 1=SKU, 2=Nombre, 10=Invima, 11=Lote
                sku = str(row[1]) if len(row) > 1 else ""
                name = str(row[2]) if len(row) > 2 else "Producto sin nombre"
                invima = str(row[10]) if len(row) > 10 else ""
                lote = str(row[11]) if len(row) > 11 else ""
                
                # Limpieza de SKU del excel
                if sku.endswith(".0"): sku = sku[:-2]

                # Comparamos contra SKU, INVIMA o LOTE
                if (self._normalize(sku) == query_clean or 
                    self._normalize(invima) == query_clean or 
                    self._normalize(lote) == query_clean):
                    return i + 1, name

            # 2. BÚSQUEDA POR NOMBRE (Exacta)
            for i, row in enumerate(rows):
                if i == 0: continue
                name = str(row[2]) if len(row) > 2 else ""
                if self._normalize(name) == query_norm:
                    return i + 1, name
            
            # 3. BÚSQUEDA POR NOMBRE (Parcial / Inferencia)
            if not exact_match:
                for i, row in enumerate(rows):
                    if i == 0: continue
                    name = str(row[2]) if len(row) > 2 else ""
                    if query_norm in self._normalize(name):
                        return i + 1, name 

            return None, None
        except Exception as e:
            logger.error(f"Error buscando producto: {e}")
            return None, None

    def _create_product(self, name, price, initial_stock, user, category="General", unit="UND", expiration_date="", location="", purchase_price=0, invima="", lote=""):
        """Crea producto nuevo incluyendo Fecha de Vencimiento"""
        logger.info(f"🆕 Creando producto: {name} | Precio: {price} | Stock: {initial_stock}")
        
        new_uuid = str(uuid.uuid4())[:8]
        sku = f"GEN-{new_uuid[:4].upper()}"
        price_val = price if price else 0
        cost_val = purchase_price if purchase_price else 0
        
        # Estructura Columnas: 
        # A: UUID, B: SKU, C: Nombre, D: Categoria, E: Stock, F: Unidad, G: Costo, H: Precio, I: Vencimiento, J: Ubicacion, K: Invima, L: Lote
        row_data = [new_uuid, sku, name, category, initial_stock, unit, cost_val, price_val, expiration_date, location, invima, lote]
        
        self.inventory_sheet.append_row(row_data)
        
        if initial_stock > 0:
            self._log_movement("CREACION", sku, name, initial_stock, user, "Stock Inicial")

        # Formatear mensaje de respuesta
        exp_msg = f" \| 📅 Vence: {self._escape(expiration_date)}" if expiration_date else ""
        
        # Construir bloque de detalles opcionales verticalmente
        details = []
        if location: details.append(f"📍 Ubicación: {self._escape(location)}")
        if invima: details.append(f"📝 INVIMA: {self._escape(invima)}")
        if lote: details.append(f"📦 Lote: {self._escape(lote)}")
        
        details_msg = "\n".join(details)
        if details_msg: details_msg = "\n" + details_msg

        return (f"🆕 *Producto Creado*\n"
                f"📦 {self._escape(name)}\n"
                f"📂 Cat: {self._escape(category)} \| 📏 Unidad: {self._escape(unit)}\n"
                f"💰 Costo: ${self._escape(cost_val)}\n"
                f"💲 Precio: ${self._escape(price_val)}{exp_msg}"
                f"{details_msg}\n"
                f"🔢 Stock inicial: {self._escape(initial_stock)}")

    def _handle_sale(self, row_idx, name, qty, user):
        """Procesa venta"""
        logger.info(f"📉 Procesando venta: {name} | Cantidad: {qty}")
        current_stock = int(self.inventory_sheet.cell(row_idx, 5).value or 0)
        
        if current_stock < qty:
            logger.warning(f"⚠️ Stock insuficiente para {name}. Actual: {current_stock}, Solicitado: {qty}")
            return f"⚠️ *Stock Insuficiente*\nProducto: {self._escape(name)}\nTienes: {self._escape(current_stock)}\nIntentas vender: {self._escape(qty)}"

        new_stock = current_stock - qty
        self.inventory_sheet.update_cell(row_idx, 5, new_stock)
        
        sku = self.inventory_sheet.cell(row_idx, 2).value
        # Limpieza visual del SKU (para evitar .0 en números)
        if str(sku).endswith(".0"):
            sku = str(sku)[:-2]
            
        self._log_movement("VENTA", sku, name, -qty, user)

        return f"✅ *Venta Registrada*\n🔻 {self._escape(name)} \(SKU: {self._escape(sku)}\)\nStock: {self._escape(current_stock)} ➡ {self._escape(new_stock)}"

    def _handle_purchase(self, row_idx, name, qty, user):
        """Procesa compra"""
        logger.info(f"📈 Procesando compra: {name} | Cantidad: {qty}")
        current_stock = int(self.inventory_sheet.cell(row_idx, 5).value or 0)
        
        new_stock = current_stock + qty
        self.inventory_sheet.update_cell(row_idx, 5, new_stock)
        
        sku = self.inventory_sheet.cell(row_idx, 2).value
        # Limpieza visual del SKU
        if str(sku).endswith(".0"):
            sku = str(sku)[:-2]
            
        self._log_movement("COMPRA", sku, name, qty, user)

        return f"✅ *Entrada Registrada*\n🟢 {self._escape(name)} \(SKU: {self._escape(sku)}\)\nStock: {self._escape(current_stock)} ➡ {self._escape(new_stock)}"

    def _handle_query(self, row_idx, name):
        """Consulta datos, incluyendo vencimiento"""
        logger.info(f"ℹ️ Consultando datos de: {name} (Fila {row_idx})")
        values = self.inventory_sheet.row_values(row_idx)
        logger.info(f"🔍 Datos crudos recuperados: {values}")
        
        # Índices de lista (Python empieza en 0): 
        # 1=SKU, 3=Categoria, 4=Stock, 5=Unidad, 7=Precio, 8=Vencimiento (Columna I)
        sku = values[1] if len(values) > 1 else "??"
        # Limpieza visual del SKU (para que no se vea 1001.0)
        if str(sku).endswith(".0"):
            sku = str(sku)[:-2]
            
        category = values[3] if len(values) > 3 else "-"
        stock = values[4] if len(values) > 4 else "0"
        unit = values[5] if len(values) > 5 else "UND"
        cost = values[6] if len(values) > 6 else "0"
        price = values[7] if len(values) > 7 else "0"
        
        # Leemos la fecha de vencimiento
        expiration = values[8] if len(values) > 8 else ""
        location = values[9] if len(values) > 9 else ""
        invima = values[10] if len(values) > 10 else ""
        lote = values[11] if len(values) > 11 else ""
        logger.info(f"📊 Datos parseados - SKU: {sku}, Stock: {stock}, Precio: {price}, Vence: {expiration}, Ubic: {location}, Invima: {invima}, Lote: {lote}")

        exp_msg = f"\n📅 Vence: {self._escape(expiration)}" if expiration else ""
        loc_msg = f"\n📍 Ubicación: {self._escape(location)}" if location else ""
        invima_msg = f"\n📝 INVIMA: {self._escape(invima)}" if invima else ""
        lote_msg = f"\n📦 Lote: {self._escape(lote)}" if lote else ""

        return (f"📦 *Consulta de Inventario*\n"
                f"📝 Producto: {self._escape(name)}\n"
                f"📂 Cat: {self._escape(category)} \| 🏷 SKU: {self._escape(sku)}\n"
                f"🔢 Stock: {self._escape(stock)} {self._escape(unit)}\n"
                f"💰 Costo: ${self._escape(cost)}\n"
                f"💲 Precio: ${self._escape(price)}"
                f"{exp_msg}{loc_msg}{invima_msg}{lote_msg}")

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

        # 8. Invima (Columna K -> 11)
        new_invima = intent.get('invima')
        if new_invima:
            self.inventory_sheet.update_cell(row_idx, 11, new_invima)
            updates.append(f"INVIMA: {self._escape(new_invima)}")

        # 9. Lote (Columna L -> 12)
        new_lote = intent.get('lote')
        if new_lote:
            self.inventory_sheet.update_cell(row_idx, 12, new_lote)
            updates.append(f"Lote: {self._escape(new_lote)}")

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
            return f"⚠️ Entendí que quieres actualizar *{self._escape(current_name)}*, pero no me dijiste qué cambiar \(precio, stock, etc\)\."

        return f"✅ *Producto Actualizado*\n📝 {self._escape(current_name)}\nCambios: {', '.join(updates)}"

    def _log_movement(self, mov_type, sku, name, qty, user, notes=""):
        """Auditoría"""
        logger.info(f"📝 Registrando movimiento en historial: {mov_type} | {sku}")
        ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        tx_id = str(uuid.uuid4())[:6]
        self.history_sheet.append_row([ts, tx_id, mov_type, sku, name, qty, user, notes])

    def _handle_list(self, intent):
        """Genera un reporte de productos según criterio"""
        criterio = intent.get('criterio')
        loc_filter = intent.get('ubicacion')
        
        logger.info(f"📋 Generando lista por criterio: {criterio}")
        
        # Obtenemos todos los datos (Cuidado con inventarios gigantes, para PyMEs está bien)
        rows = self.inventory_sheet.get_all_values()
        if not rows or len(rows) < 2:
            return "📭 Tu inventario está vacío\."
            
        # Indices (0-based): 2=Nombre, 4=Stock, 8=Vencimiento, 9=Ubicacion
        results = []
        today = datetime.date.today()
        
        for i, row in enumerate(rows[1:]): # Saltamos header
            # Asegurar que la fila tenga suficientes columnas
            if len(row) < 10: continue
            
            name = row[2]
            stock = int(row[4]) if row[4].isdigit() else 0
            exp_str = row[8]
            loc = row[9]
            invima = row[10] if len(row) > 10 else ""
            lote = row[11] if len(row) > 11 else ""
            
            match = False
            
            if criterio == "ubicacion":
                # Búsqueda parcial (ej: "Estante" coincide con "Estante 1")
                if loc_filter and self._normalize(loc_filter) in self._normalize(loc):
                    match = True
            
            elif criterio == "stock_bajo":
                # Umbral fijo de 5 unidades (podría ser configurable)
                if stock <= 5:
                    match = True
                    
            elif criterio == "vencimiento":
                if exp_str:
                    try:
                        exp_date = datetime.datetime.strptime(exp_str, "%Y-%m-%d").date()
                        days_diff = (exp_date - today).days
                        # Listar vencidos o que venzan en próximos 30 días
                        if days_diff <= 30:
                            match = True
                    except:
                        pass # Fecha inválida, ignorar
            
            elif criterio == "todos":
                match = True

            if match:
                # Guardamos tupla para mostrar
                invima_str = f" \| Inv: {self._escape(invima)}" if invima else ""
                lote_str = f" \| Lote: {self._escape(lote)}" if lote else ""
                results.append(f"• {self._escape(name)} \(Stock: {self._escape(stock)}\){invima_str}{lote_str}")

        if not results:
            return f"🔍 No encontré productos con el criterio: *{self._escape(criterio)}*\."
            
        # Limitamos a 15 para no saturar Telegram
        limit = 30
        display = results[:limit]
        msg = f"📋 *Reporte: {self._escape(criterio.upper())}*\n" + "\n".join(display)
        
        if len(results) > limit:
            msg += f"\n\n_\.\.\.y {len(results) - limit} más\._"
            
        return msg