# 📦 Inventario Inteligente

SaaS de gestion de inventario para PyMEs colombianas. Bot de Telegram + Dashboard Web + Analytics IA + Pedidos + PDF.

---

## 🚀 Funcionalidades

### Bot de Telegram (`@SmartInventoryBot`)
- Registro de productos con IA (nombre, precio, categoria, unidad, ubicacion, vencimiento, INVIMA, lote)
- Ventas y compras por lenguaje natural ("Vendi 2 esferos", "Llegaron 10 cajas")
- Consultas de stock, precio y vencimiento
- Listados por categoria, ubicacion, stock bajo, vencimiento
- Busqueda inteligente con multi-match: si hay varios productos similares, pregunta cual exactamente
- Actualizacion de productos (precio, stock, nombre, SKU, ubicacion)
- Multi-tenant: cada PyME tiene su Google Sheet independiente
- Autenticacion por token de invitacion

### Dashboard Web (PWA)
- **Login** con validacion de token via API
- **Sesion persistente** en localStorage (no pide token al recargar)
- **Tema light** profesional con diseno Linear-style
- **Iconos lucide-react** en toda la interfaz
- **PWA instalable** en movil (Android + iOS) con service worker
- **Responsive** mobile-first con navegacion por iconos

#### Pestañas del Dashboard:

| Pestana | Funcionalidad |
|---|---|
| **Dashboard** | KPIs (productos, valor inventario, stock bajo, vencimientos), ultimos movimientos, notificaciones colapsables |
| **Inventario** | Tabla completa con paginacion, filtros (categoria, stock), ordenamiento por columnas, busqueda |
| **Analytics** | Revenue 90d, tendencia de ventas, top sellers, ABC Pareto, prediccion de demanda, ABC-XYZ, punto de reorden, anomalias, correlaciones, estacionalidad, rotacion, analisis de precios |
| **Pedidos** | Tracking de pedidos a proveedores con SQLite, estados (pendiente/en transito/entregado/cancelado), guias y URLs de rastreo |
| **Armar Pedido** | Constructor de ordenes de compra desde inventario real, cantidades sugeridas inteligentes, PDF profesional con reportlab, boton "Recibir" que actualiza Google Sheets |

---

## 🧠 Analytics Avanzado (pandas + numpy + scipy)

| Tecnica | Libreria | Descripcion |
|---|---|---|
| Prediccion de demanda | `pandas.ewm()` | Suavizacion exponencial, forecast 7 dias |
| ABC-XYZ | `pandas.groupby()` + CV | Clasificacion por revenue + variabilidad |
| Punto de reorden (ROP) | `scipy.stats.norm.ppf()` | Safety stock con nivel de servicio 95% |
| Anomalias | Rolling Z-Score `pandas.rolling()` | Deteccion de spikes/drops |
| Correlaciones | `pandas.DataFrame.corr()` | Productos que se venden juntos |
| Estacionalidad | `pandas.resample('ME')` | Patrones mensuales |
| Rotacion | Turnover Ratio | Eficiencia de inventario |
| Rendimiento usuarios | `pandas.groupby()` | Ventas por empleado, ticket promedio |
| Patrones horarios/semanales | `pandas.dt.hour/dayofweek` | Horas pico, dias fuertes |

---

## 🏗️ Arquitectura

```
inventory-tracker-bot-python/
├── app/
│   ├── main.py                    # FastAPI app
│   ├── core/
│   │   ├── config.py              # Settings (pydantic)
│   │   ├── google_client.py       # Google Sheets OAuth
│   │   └── cache.py               # Redis + in-memory cache
│   ├── routers/
│   │   ├── webhook.py             # Telegram webhook
│   │   ├── api.py                 # REST API (inventory, stats, analytics, receive-order)
│   │   ├── admin.py               # Admin (create tenant)
│   │   └── orders.py              # CRUD pedidos + PDF
│   └── services/
│       ├── inventory_service.py   # Operaciones Google Sheets
│       ├── ia_service.py          # Groq IA para interpretar mensajes
│       ├── tenant_service.py      # Gestion multi-tenant
│       ├── analytics_service.py   # pandas + numpy + scipy
│       ├── order_service.py       # SQLite pedidos
│       └── po_pdf.py              # reportlab PDF generator
├── front/
│   └── src/
│       ├── app/                   # Next.js App Router
│       ├── components/            # React components
│       │   ├── StatsCards.tsx     # KPIs
│       │   ├── AlertsPanel.tsx    # Notificaciones
│       │   ├── RecentMovements.tsx
│       │   ├── InventoryTable.tsx # Tabla con paginacion
│       │   ├── AnalyticsPanel.tsx # Graficos recharts
│       │   ├── OrderTracker.tsx   # Seguimiento pedidos
│       │   ├── PurchaseOrderBuilder.tsx  # Constructor OC + PDF
│       │   └── PwaInstallBanner.tsx
│       ├── lib/api.ts             # Fetch functions
│       └── types/index.ts         # TypeScript interfaces
├── docker-compose.yml             # Traefik, Redis, bot, frontend
├── requirements.txt               # Python deps
└── ANALYTICS.md                   # Documentacion tecnica de analitica
```

---

## 🔧 Stack Tecnologico

| Capa | Tecnologia |
|---|---|
| Backend | Python 3.11, FastAPI, Uvicorn |
| Bot | python-telegram-bot, Groq AI |
| Base de datos | Google Sheets (inventario), SQLite (pedidos) |
| Cache | Redis 7 |
| Analytics | pandas, numpy, scipy |
| PDF | reportlab |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| Graficos | recharts |
| Iconos | lucide-react |
| PWA | Service Worker, Web Manifest |
| Deploy | Docker, Traefik, GitHub Actions, VPS |

---

## 🔒 Infraestructura

- **Dominio:** inventory.defriction.org
- **SSL:** Let's Encrypt via Traefik
- **CI/CD:** GitHub Actions (push to main → deploy automatico)
- **Cache:** Redis compartido entre workers
- **Rate limiting:** Cache 60s en todos los endpoints (evita 429 de Google Sheets)
- **Persistencia:** SQLite en volumen Docker para pedidos

