# 📦 Smart Inventory Bot (Defriction)

SaaS de gestión de inventario para PyMEs colombianas.
Stack: Bot de Telegram + Backend FastAPI + Dashboard Next.js PWA + Analytics + Remisiones PDF.

---

## 🚀 Funcionalidades actuales

### Bot de Telegram (`@inventario_smart_bot`)
- CRUD de productos por lenguaje natural (CREAR, COMPRAR, VENDER, ACTUALIZAR)
- Búsqueda inteligente fuzzy (exacta, por palabras, reverse match)
- Soporte de campos personalizados por producto desde ACTUALIZAR
- Consulta de remisiones con comando `/remisiones`
- Multi-tenant por token de invitación
- Normalización de variantes de intención en español (`_ACTION_MAP`)

### Dashboard Web (Next.js + PWA)
- Login por token + sesión JWT persistente
- Tema claro (estilo Linear), responsive mobile-first
- Feedback con `react-hot-toast`
- Estado optimista con Zustand

#### Tabs principales
- **Inicio**: KPIs, movimientos recientes, alertas
- **Inventario**: tabla paginada, filtros, búsqueda, ordenamiento, columnas personalizadas
- **Analítica**: métricas avanzadas (revenue, top sellers, ABC/XYZ, forecast, ROP, anomalías, correlaciones, estacionalidad, rotación)
- **Pedido**: tracking de pedidos a proveedores
- **Armar Pedido**: creación de remisiones, búsqueda de productos, precio editable, cliente, generación PDF y descuento de stock
- **Remisiones**: historial y descarga de PDF
- **Perfil**: edición self-service de PyME (NIT, nombre, dirección, descripción), KPIs y actividad
- **Admin/Uso** (admin): CRUD de PyMEs + analytics de uso por PyME

---

## 🧠 Analytics

Implementado con `pandas`, `numpy`, `scipy`:
- Predicción de demanda (EWM)
- Clasificación ABC y ABC-XYZ
- Punto de reorden (ROP + safety stock)
- Detección de anomalías (rolling Z-score)
- Correlaciones entre productos
- Estacionalidad mensual
- Rotación de inventario

---

## 🏗️ Arquitectura del proyecto

```
inventory-tracker-bot-python/
├── app/
│   ├── main.py
│   ├── core/
│   │   ├── auth.py
│   │   ├── config.py
│   │   ├── database.py
│   │   └── cache.py
│   ├── routers/
│   │   ├── webhook.py
│   │   ├── api.py
│   │   ├── auth.py
│   │   ├── admin.py
│   │   ├── orders.py
│   │   └── usage.py
│   ├── services/
│   │   ├── inventory_service.py
│   │   ├── analytics_service.py
│   │   ├── ia_service.py
│   │   ├── tenant_service.py
│   │   ├── order_service.py
│   │   ├── usage_tracker.py
│   │   └── po_pdf.py
│   ├── database_sa.py
│   ├── models.py
│   └── models_admin.py
├── front/
│   └── src/
│       ├── app/
│       ├── components/
│       ├── lib/
│       └── types/
├── scripts/
├── docker-compose.yml
├── requirements.txt
└── ANALYTICS.md
```

---

## 🗄️ Persistencia y datos

- **SQLite puro** (sin Google Sheets, sin Redis)
- `admin.db`: tenants (PyMEs)
- `inventory_{tenant_id}.db`: productos, movimientos, proveedores, columnas personalizadas, clientes, remisiones
- SQLAlchemy usado para entidades relacionales (clientes/remisiones), coexistiendo con sqlite3 raw
- WAL mode + `busy_timeout=5000`

---

## 🔌 Endpoints destacados

- `POST /api/auth/login`
- `GET/POST /api/products`
- `PATCH/DELETE /api/products/{sku}`
- `GET/POST /api/suppliers`
- `PATCH/DELETE /api/suppliers/{id}`
- `GET/POST /api/custom-columns`
- `DELETE /api/custom-columns/{id}`
- `POST /api/clients`
- `POST /api/remisiones`
- `GET /api/remisiones`
- `GET /api/remisiones/{id}/pdf`
- `POST /api/usage/track`
- `GET /api/usage/admin-stats`
- `GET/POST /admin/tenants`
- `DELETE /admin/tenants/{id}`
- `POST /api/webhook`

---

## ⚙️ Stack tecnológico

- **Backend:** Python 3.11, FastAPI, Uvicorn
- **Bot:** python-telegram-bot + Groq
- **DB:** SQLite
- **Analytics:** pandas, numpy, scipy
- **PDF:** reportlab
- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS 4
- **UI:** lucide-react, react-hot-toast, Zustand
- **Deploy:** Docker, Traefik, GitHub Actions, VPS

---

## 🌐 Infraestructura

- Dominio: `inventory.defriction.org`
- SSL: Let's Encrypt (Traefik)
- CI/CD: GitHub Actions (push a `main`)
- Persistencia: volumen Docker con SQLite
