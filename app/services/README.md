# 📦 Manual de Usuario - Chatbot de Inventario

Bienvenido a tu asistente de inventario inteligente. Este bot te permite gestionar tu inventario en Google Sheets usando lenguaje natural directamente desde Telegram.

## 🚀 Primeros Pasos

Antes de empezar, asegúrate de vincular tu cuenta de Telegram con tu negocio.

1.  Recibirás un **Token de Invitación** (ej: `AB1234`) de tu administrador.
2.  Envía el comando al bot:
    `/conectar AB1234`

---

## 📋 Acciones Disponibles

El bot entiende instrucciones como si hablaras con una persona. Aquí tienes ejemplos de lo que puedes hacer:

### 1. Crear Productos Nuevos
Registra productos indicando su nombre y precio. El bot intentará deducir la categoría y unidad automáticamente.

*   **Básico:** "Crea Martillo de uña a 15000"
*   **Con ubicación:** "Crea Pintura Blanca en Estante 4 a 45000"
*   **Con vencimiento:** "Crea Leche Colanta vence el 20/12/2026"
*   **Con costo y precio:** "Crea Cable #12 costo 1000 venta 2500"

### 2. Registrar Ventas (Salidas)
Descuenta unidades del inventario.

*   "Vendí 2 martillos"
*   "Salieron 5 bultos de cemento"
*   "Facturar 3 galones de thinner"

### 3. Registrar Compras (Entradas)
Aumenta el stock cuando llega mercancía.

*   "Llegaron 10 cajas de tornillos"
*   "Compré 50 metros de manguera"
*   "Ingresa 5 unidades de silicona"

### 4. Consultar Precios y Stock
Pregunta por un producto para ver su información detallada (Precio, Stock, Ubicación, Vencimiento).

*   "¿Cuánto vale el tubo pvc?"
*   "Precio del cemento"
*   "¿Hay stock de pintura roja?"

### 5. Actualizar Productos
Modifica cualquier dato de un producto existente.

*   **Precio:** "Actualiza precio de Martillo a 18000"
*   **Stock (Ajuste):** "Pon el stock de tornillos en 100"
*   **Ubicación:** "Mueve el Cemento a la Bodega 2"
*   **Nombre:** "Cambia el nombre de 'Tubo' a 'Tubo PVC 1/2'"

### 6. Reportes y Listados 📊
Pide listas de productos según diferentes criterios.

*   **Por Ubicación:** "¿Qué hay en el Estante 1?"
*   **Stock Bajo:** "¿Qué se está acabando?" o "Productos con poco stock"
*   **Vencimientos:** "¿Qué productos están por vencer?"
*   **General:** "Listar todo"

---

## 💡 Consejos
*   **Sé específico:** Si tienes productos con nombres similares (ej: "Tubo 1/2" y "Tubo 3/4"), trata de escribir el nombre completo o el bot te preguntará o elegirá el más parecido.
*   **Fechas:** Puedes decir "vence el 30 de octubre" y el bot calculará el año automáticamente.
*   **Errores:** Si te equivocas en una venta, puedes corregirlo haciendo una "Compra" por la misma cantidad o usando "Actualiza stock".