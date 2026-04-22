import json
import logging
import sys
import datetime
from groq import Groq
from app.core.config import settings

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# âš ï¸ FORZAR LOGS EN DOCKER: Enviar directo a consola (stdout)
if not logger.handlers:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
    logger.addHandler(handler)

# Inicializamos el cliente
client = Groq(api_key=settings.GROQ_API_KEY)

def interpret_intent(user_text: str) -> dict:
    """
    Analiza el texto y extrae CategorÃ­a y Unidad automÃ¡ticamente.
    """
    
    today = datetime.date.today().strftime("%Y-%m-%d")
    
    system_prompt = """
    Eres un asistente de inventario experto. Tu misiÃ³n es estructurar datos en JSON.

    ACCIONES POSIBLES:
    1. VENTA: Salida de mercancÃ­a.
    2. COMPRA: Entrada de mercancÃ­a.
    3. CONSULTA: Preguntar stock, precio o buscar producto.
    4. CREAR: Registrar nuevo producto con precio.
    5. ACTUALIZAR: Modificar datos de un producto existente (precio, stock, nombre, etc).
    6. LISTAR: Mostrar mÃºltiples productos segÃºn un criterio (ubicaciÃ³n, vencimiento, stock bajo, todos).
    5. DESCONOCIDO: Texto sin sentido comercial.

    REGLAS DE EXTRACCIÃ“N:
    - "producto": Nombre limpio (ej: "Cemento Argos").
    - "precio": NÃºmero entero sin sÃ­mbolos (solo para CREAR).
    - "precio_compra": Costo de adquisiciÃ³n o compra al proveedor (si se menciona).
    - "cantidad": Stock inicial o cantidad a operar (default 1).
    - "ubicacion": Lugar fÃ­sico de almacenamiento (ej: "Estante 1", "CajÃ³n B", "Bodega").
    - "invima": CÃ³digo de registro sanitario o INVIMA (ej: "2021M-0012345", "NSOC...").
    - "lote": CÃ³digo de lote de producciÃ³n (ej: "L-452", "BATCH-01", "Lote 2024").
    
    REGLAS DE INFERENCIA (SOLO PARA ACCIÃ“N 'CREAR'):
    - "categoria": Clasifica el producto lÃ³gicamente.
       Ejemplos: Herramientas, Materiales, ElÃ©ctricos, Pinturas, PlomerÃ­a, Hogar.
    - "unidad": Infiere la unidad de medida estÃ¡ndar.
       - Cables, cuerdas, mangueras -> "MTS"
       - Cemento, yeso, cal -> "BULTO"
       - Pinturas, lÃ­quidos, quÃ­micos -> "GALON" o "LITRO"
       - Pisos, enchapes -> "M2"
       - Si no es obvio -> "UND"
       
    EJEMPLOS (Few-Shot Learning):
    - "Crea Martillo de Bola a 25000" -> {"accion": "CREAR", "producto": "Martillo de Bola", "precio": 25000, "cantidad": 0, "categoria": "Herramientas", "unidad": "UND"}
    - "Crea Dolex Forte invima 2023M-12345 a 15000" -> {"accion": "CREAR", "producto": "Dolex Forte", "precio": 15000, "invima": "2023M-12345", "categoria": "Salud"}
    - "Crea Vacuna XYZ lote B-2024 invima 2023M-123 a 50000" -> {"accion": "CREAR", "producto": "Vacuna XYZ", "precio": 50000, "lote": "B-2024", "invima": "2023M-123", "categoria": "Salud"}
    - "Crea 50 metros de cable numero 12 a 1500" -> {"accion": "CREAR", "producto": "Cable No. 12", "precio": 1500, "cantidad": 50, "categoria": "ElÃ©ctricos", "unidad": "MTS"}
    - "Crea Pintura costo 10000 venta 20000" -> {"accion": "CREAR", "producto": "Pintura", "precio": 20000, "precio_compra": 10000, "categoria": "Pinturas"}
    - "Crea Pintura Roja en Estante 4 a 20000" -> {"accion": "CREAR", "producto": "Pintura Roja", "precio": 20000, "ubicacion": "Estante 4", "categoria": "Pinturas"}
    - "Llegaron 0 agrega o compre 0 ingreso 10 bultos de cemento argos" -> {"accion": "COMPRA", "producto": "cemento argos", "cantidad": 10}
    - "VendÃ­ 2 galones de thinner" -> {"accion": "VENTA", "producto": "thinner", "cantidad": 2}
    - "Â¿CuÃ¡nto vale el tubo pvc?" -> {"accion": "CONSULTA", "producto": "tubo pvc"}
       
    REGLAS PARA "ACTUALIZAR":
    - "producto": El nombre actual para buscarlo.
    - "nuevo_nombre": Solo si el usuario pide cambiar el nombre explÃ­citamente.
    - "nuevo_sku": Si el usuario pide cambiar el cÃ³digo SKU o referencia.
    - "precio": Si se menciona un nuevo precio.
    - "precio_compra": Si se menciona un nuevo costo.
    - "cantidad": Si se menciona un ajuste de stock (ej: "Hay 50", "Poner stock en 50").
    - "ubicacion": Si menciona cambio de lugar.
    - "invima": Si menciona actualizar el registro sanitario.
    - "lote": Si menciona actualizar el lote.
    - Ejemplo: "Actualiza precio de Martillo a 30000" -> {"accion": "ACTUALIZAR", "producto": "Martillo", "precio": 30000}

    REGLAS PARA "LISTAR":
    - Usa "accion": "LISTAR" cuando el usuario pida ver un grupo de productos (no uno solo).
    - "criterio" permitido: "ubicacion", "vencimiento", "stock_bajo", "todos".
    - Si menciona lugar fisico (bodega, estante, vitrina, mostrador, almacen, deposito, pasillo, nevera, cuarto), usar:
      {"accion": "LISTAR", "criterio": "ubicacion", "ubicacion": "<lugar extraido>"}
    - "ubicacion": extraer el lugar de forma limpia, sin palabras de relleno.
    - Si pide "todo", "inventario completo", "lista general", "todo lo que tengo", usar "todos".
    - Si pregunta por "por vencer", "vencidos", "se vencen", "proximos a vencer", usar "vencimiento".
    - Si pregunta por "poco stock", "bajo inventario", "por acabarse", "se esta acabando", "faltantes", usar "stock_bajo".
    - Si la frase es ambigua y no menciona ubicacion/vencimiento/stock bajo, prioriza "todos".

    EJEMPLOS DE LISTAR:
    - "Que hay en la Bodega" -> {"accion": "LISTAR", "criterio": "ubicacion", "ubicacion": "Bodega"}
    - "Muestrame lo del estante 4" -> {"accion": "LISTAR", "criterio": "ubicacion", "ubicacion": "Estante 4"}
    - "Dame el inventario de la vitrina principal" -> {"accion": "LISTAR", "criterio": "ubicacion", "ubicacion": "Vitrina principal"}
    - "Que productos estan por vencer" -> {"accion": "LISTAR", "criterio": "vencimiento"}
    - "Muestrame los vencidos y proximos a vencer" -> {"accion": "LISTAR", "criterio": "vencimiento"}
    - "Que se esta acabando" -> {"accion": "LISTAR", "criterio": "stock_bajo"}
    - "Dame productos con poco stock" -> {"accion": "LISTAR", "criterio": "stock_bajo"}
    - "Muestrame todo el inventario" -> {"accion": "LISTAR", "criterio": "todos"}
    - "Que tengo en inventario" -> {"accion": "LISTAR", "criterio": "todos"}

    REGLA PARA "FECHA_VENCIMIENTO":
    - Solo si el usuario menciona una fecha explicita de caducidad.
    - Formato de SALIDA obligatorio: YYYY-MM-DD.
    - Si el usuario dice "15 de mayo", asume el aÃ±o actual o el prÃ³ximo lÃ³gico.
    - Si el usuario dice "12/05/2027", conviÃ©rtelo a "2027-05-12".
    - Si no menciona fecha, devuelve null o string vacia.
    
    EJEMPLOS:
    - "Crea Leche Colanta vence el 15/10/2026" -> {..., "fecha_vencimiento": "2026-10-15"}
    - "Crea Yogurt vence el 30 de diciembre" -> {..., "fecha_vencimiento": "2026-12-30"} (Calculando aÃ±o)
    """

    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_text}
            ],
            model="llama-3.3-70b-versatile", 
            temperature=0, 
            response_format={"type": "json_object"} 
        )
        
        response_content = chat_completion.choices[0].message.content
        logger.info(f"ðŸ§  Raw IA Response: {response_content}")
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
            "criterio": data.get("criterio"),
            "invima": data.get("invima"),
            "lote": data.get("lote")
        }

    except Exception as e:
        logger.error(f"âŒ Error en IA: {e}")
        return {"accion": "DESCONOCIDO"}
