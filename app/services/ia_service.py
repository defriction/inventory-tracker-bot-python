import json
import logging
import sys
import datetime
from groq import Groq
from app.core.config import settings

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# ⚠️ FORZAR LOGS EN DOCKER: Enviar directo a consola (stdout)
if not logger.handlers:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
    logger.addHandler(handler)

# Inicializamos el cliente
client = Groq(api_key=settings.GROQ_API_KEY)

def interpret_intent(user_text: str) -> dict:
    """
    Analiza el texto y extrae Categoría y Unidad automáticamente.
    """
    
    today = datetime.date.today().strftime("%Y-%m-%d")
    
    system_prompt = """
    Eres un asistente de inventario experto. Tu misión es estructurar datos en JSON.

    ACCIONES POSIBLES:
    1. VENTA: Salida de mercancía.
    2. COMPRA: Entrada de mercancía.
    3. CONSULTA: Preguntar stock, precio o buscar producto.
    4. CREAR: Registrar nuevo producto con precio.
    5. ACTUALIZAR: Modificar datos de un producto existente (precio, stock, nombre, etc).
    6. LISTAR: Mostrar múltiples productos según un criterio (ubicación, vencimiento, stock bajo, todos).
    5. DESCONOCIDO: Texto sin sentido comercial.

    REGLAS DE EXTRACCIÓN:
    - "producto": Nombre limpio (ej: "Cemento Argos").
    - "precio": Número entero sin símbolos (solo para CREAR).
    - "precio_compra": Costo de adquisición o compra al proveedor (si se menciona).
    - "cantidad": Stock inicial o cantidad a operar (default 1).
    - "ubicacion": Lugar físico de almacenamiento (ej: "Estante 1", "Cajón B", "Bodega").
    
    REGLAS DE INFERENCIA (SOLO PARA ACCIÓN 'CREAR'):
    - "categoria": Clasifica el producto lógicamente.
       Ejemplos: Herramientas, Materiales, Eléctricos, Pinturas, Plomería, Hogar.
    - "unidad": Infiere la unidad de medida estándar.
       - Cables, cuerdas, mangueras -> "MTS"
       - Cemento, yeso, cal -> "BULTO"
       - Pinturas, líquidos, químicos -> "GALON" o "LITRO"
       - Pisos, enchapes -> "M2"
       - Si no es obvio -> "UND"
       
    EJEMPLOS (Few-Shot Learning):
    - "Crea Martillo de Bola a 25000" -> {"accion": "CREAR", "producto": "Martillo de Bola", "precio": 25000, "cantidad": 0, "categoria": "Herramientas", "unidad": "UND"}
    - "Crea 50 metros de cable numero 12 a 1500" -> {"accion": "CREAR", "producto": "Cable No. 12", "precio": 1500, "cantidad": 50, "categoria": "Eléctricos", "unidad": "MTS"}
    - "Crea Pintura costo 10000 venta 20000" -> {"accion": "CREAR", "producto": "Pintura", "precio": 20000, "precio_compra": 10000, "categoria": "Pinturas"}
    - "Crea Pintura Roja en Estante 4 a 20000" -> {"accion": "CREAR", "producto": "Pintura Roja", "precio": 20000, "ubicacion": "Estante 4", "categoria": "Pinturas"}
    - "Llegaron 0 agrega o compre 0 ingreso 10 bultos de cemento argos" -> {"accion": "COMPRA", "producto": "cemento argos", "cantidad": 10}
    - "Vendí 2 galones de thinner" -> {"accion": "VENTA", "producto": "thinner", "cantidad": 2}
    - "¿Cuánto vale el tubo pvc?" -> {"accion": "CONSULTA", "producto": "tubo pvc"}
       
    REGLAS PARA "ACTUALIZAR":
    - "producto": El nombre actual para buscarlo.
    - "nuevo_nombre": Solo si el usuario pide cambiar el nombre explícitamente.
    - "nuevo_sku": Si el usuario pide cambiar el código SKU o referencia.
    - "precio": Si se menciona un nuevo precio.
    - "precio_compra": Si se menciona un nuevo costo.
    - "cantidad": Si se menciona un ajuste de stock (ej: "Hay 50", "Poner stock en 50").
    - "ubicacion": Si menciona cambio de lugar.
    - Ejemplo: "Actualiza precio de Martillo a 30000" -> {"accion": "ACTUALIZAR", "producto": "Martillo", "precio": 30000}

    REGLAS PARA "LISTAR":
    - "criterio": "ubicacion", "vencimiento", "stock_bajo", "todos".
    - "ubicacion": Extraer nombre del lugar si el criterio es ubicacion.
    - Ejemplo: "Qué hay en la Bodega" -> {"accion": "LISTAR", "criterio": "ubicacion", "ubicacion": "Bodega"}
    - Ejemplo: "Productos por vencer" -> {"accion": "LISTAR", "criterio": "vencimiento"}
    - Ejemplo: "Qué se está acabando" -> {"accion": "LISTAR", "criterio": "stock_bajo"}

    REGLA PARA "FECHA_VENCIMIENTO":
    - Solo si el usuario menciona una fecha explícita de caducidad.
    - Formato de SALIDA obligatorio: YYYY-MM-DD.
    - Si el usuario dice "15 de mayo", asume el año actual o el próximo lógico.
    - Si el usuario dice "12/05/2027", conviértelo a "2027-05-12".
    - Si no menciona fecha, devuelve null o string vacío.
    
    EJEMPLOS:
    - "Crea Leche Colanta vence el 15/10/2026" -> {..., "fecha_vencimiento": "2026-10-15"}
    - "Crea Yogurt vence el 30 de diciembre" -> {..., "fecha_vencimiento": "2026-12-30"} (Calculando año)
    """

    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_text}
            ],
            model="llama-3.1-8b-instant", 
            temperature=0, 
            response_format={"type": "json_object"} 
        )
        
        response_content = chat_completion.choices[0].message.content
        logger.info(f"🧠 Raw IA Response: {response_content}")
        data = json.loads(response_content)
        
        return {
            "accion": data.get("accion", "DESCONOCIDO"),
            "producto": data.get("producto", None),
            "nuevo_nombre": data.get("nuevo_nombre", None),
            "nuevo_sku": data.get("nuevo_sku", None),
            "cantidad": data.get("cantidad"), # Sin default, para detectar si es None
            "precio": data.get("precio"),     # Sin default
            "precio_compra": data.get("precio_compra"), # Nuevo campo
            "categoria": data.get("categoria"), 
            "unidad": data.get("unidad"),      
            "fecha_vencimiento": data.get("fecha_vencimiento"),
            "ubicacion": data.get("ubicacion"),
            "criterio": data.get("criterio")
        }

    except Exception as e:
        logger.error(f"❌ Error en IA: {e}")
        return {"accion": "DESCONOCIDO"}