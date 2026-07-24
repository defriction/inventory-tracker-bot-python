from fastapi import APIRouter, HTTPException, Query, Depends, Request
from pydantic import BaseModel
from typing import Optional, List
import datetime
from app.services.inventory_service import InventoryService
from app.services.analytics_service import AnalyticsService
from app.services.factory import get_inventory_service as _get_inventory_service
from app.core.config import settings
from app.core.auth import get_current_tenant
from app.core.database import get_conn

router = APIRouter(
    prefix='/api',
    tags=['REST API para Frontend']
)

# --- Schemas ---

class ProductSchema(BaseModel):
    model_config = {"extra": "allow"}
    uuid: str = ""
    sku: str = ""
    name: str = ""
    category: str = "General"
    stock: int = 0
    unit: str = "UND"
    cost: float = 0
    price: float = 0
    expiration_date: Optional[str] = ""
    location: Optional[str] = ""
    invima: Optional[str] = ""
    lote: Optional[str] = ""

class ProductUpdateSchema(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    stock: Optional[int] = None
    unit: Optional[str] = None
    cost: Optional[float] = None
    price: Optional[float] = None
    expiration_date: Optional[str] = None
    location: Optional[str] = None
    invima: Optional[str] = None
    lote: Optional[str] = None

class InventoryResponse(BaseModel):
    products: List[ProductSchema]
    total: int
    custom_columns: Optional[list] = None

class MovementSchema(BaseModel):
    timestamp: str
    tx_id: str
    mov_type: str
    sku: str
    name: str
    qty: int
    user: str
    notes: str

# --- Dependencies ---

def get_inventory_service(tenant: dict = Depends(get_current_tenant)):
    """Retorna InventoryService conectado al sheet del tenant"""
    return _get_inventory_service(
        sheet_id=tenant.get('sheet_id', ''),
        tenant_id=tenant.get('tenant_id', '')
    )

# --- Endpoints ---




@router.post('/products')
async def create_product(
    data: ProductSchema,
    token: str = Query(...),
    inventory_service: InventoryService = Depends(get_inventory_service)
):
    """Crea un nuevo producto en el inventario."""
    import logging
    log = logging.getLogger('crud.product')
    try:
        import uuid
        new_uuid = str(uuid.uuid4())[:8]
        sku = data.sku or f"GEN-{new_uuid[:4].upper()}"
        log.info(f"CREATE | sku={sku} | name={data.name} | stock={data.stock}")
        row = [new_uuid, sku, data.name, data.category, data.stock, data.unit,
               data.cost, data.price, data.expiration_date, data.location,
               data.invima, data.lote]
        inventory_service.inventory_sheet.append_row(row)
        inventory_service._log_movement("CREACION", sku, data.name, data.stock, "Admin", "Creacion manual")
        log.info(f"CREATE OK | sku={sku} | uuid={new_uuid}")
        product = {
            "uuid": new_uuid, "sku": sku, "name": data.name,
            "category": data.category, "stock": data.stock, "unit": data.unit,
            "cost": data.cost, "price": data.price,
            "expiration_date": data.expiration_date or "",
            "location": data.location or "", "invima": data.invima or "", "lote": data.lote or ""
        }
        return {"status": "created", "product": product}
    except Exception as e:
        log.error(f"CREATE FAIL | {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
@router.get('/inventory', response_model=InventoryResponse)
async def get_inventory(
    token: str = Query(...),
    inventory_service: InventoryService = Depends(get_inventory_service)
):
    """Obtiene todos los productos del inventario."""
    try:
        rows = inventory_service.inventory_sheet.get_all_values()
        if not rows or len(rows) < 2:
            return {"products": [], "total": 0}
        
        products = []
        for i, row in enumerate(rows[1:], start=2):  # Saltamos header
            if len(row) < 8:  # Mínimo requerido
                continue
            
            # Mapeo de columnas según estructura del Sheet
            product = {
                "uuid": str(row[0]) if len(row) > 0 else "",
                "sku": str(row[1]) if len(row) > 1 else "",
                "name": str(row[2]) if len(row) > 2 else "Sin nombre",
                "category": str(row[3]) if len(row) > 3 else "General",
                "stock": int(row[4]) if len(row) > 4 and str(row[4]).isdigit() else 0,
                "unit": str(row[5]) if len(row) > 5 else "UND",
                "cost": float(row[6]) if len(row) > 6 and str(row[6]).replace('.','').isdigit() else 0,
                "price": float(row[7]) if len(row) > 7 and str(row[7]).replace('.','').isdigit() else 0,
                "expiration_date": str(row[8]) if len(row) > 8 else "",
                "location": str(row[9]) if len(row) > 9 else "",
                "invima": str(row[10]) if len(row) > 10 else "",
                "lote": str(row[11]) if len(row) > 11 else ""
            }
            products.append(product)
        
        result = {"products": products, "total": len(products)}
        
        # Merge custom values
        try:
            custom_cols = _load_custom_columns(inventory_service.tenant_id)
            if custom_cols:
                for p in result["products"]:
                    cv = _load_custom_values(inventory_service.tenant_id, p["sku"])
                    for col in custom_cols:
                        p[col["name"]] = cv.get(col["name"], "")
                result["custom_columns"] = custom_cols
        except Exception:
            pass  # custom columns are optional
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error leyendo inventario: {str(e)}")

@router.get('/products/{sku}')
async def get_product(
    sku: str,
    token: str = Query(...),
    inventory_service: InventoryService = Depends(get_inventory_service)
):
    """Obtiene un producto específico por SKU"""
    try:
        row_idx, name = inventory_service._find_product_row_by_keyword(sku, exact_match=True)
        if not row_idx:
            raise HTTPException(status_code=404, detail="Producto no encontrado")
        
        values = inventory_service.inventory_sheet.row_values(row_idx)
        
        return {
            "uuid": values[0] if len(values) > 0 else "",
            "sku": values[1] if len(values) > 1 else "",
            "name": values[2] if len(values) > 2 else "",
            "category": values[3] if len(values) > 3 else "",
            "stock": int(values[4]) if len(values) > 4 and values[4].lstrip('-').isdigit() else 0,
            "unit": values[5] if len(values) > 5 else "UND",
            "cost": float(values[6]) if len(values) > 6 and values[6].replace('.','').replace('-','').isdigit() else 0,
            "price": float(values[7]) if len(values) > 7 and values[7].replace('.','').replace('-','').isdigit() else 0,
            "expiration_date": values[8] if len(values) > 8 else "",
            "location": values[9] if len(values) > 9 else "",
            "invima": values[10] if len(values) > 10 else "",
            "lote": values[11] if len(values) > 11 else ""
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback, logging
        logging.getLogger('crud.product').error(f"CRUD FAIL | {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.patch('/products/{sku}')
async def update_product(
    sku: str,
    updates: ProductUpdateSchema,
    token: str = Query(...),
    inventory_service: InventoryService = Depends(get_inventory_service),
    request: Request = None
):
    """Actualiza campos de un producto existente.
    Solo actualiza los campos enviados en el body.
    Campos desconocidos se guardan como custom values."""
    import logging
    log = logging.getLogger('crud.product')
    try:
        log.info(f"PATCH START | sku={sku}")
        row_idx, current_name = inventory_service._find_product_row_by_keyword(sku, exact_match=True)
        if not row_idx:
            log.warning(f"PATCH NOT FOUND | sku={sku}")
            raise HTTPException(status_code=404, detail="Producto no encontrado")
        
        log.info(f"PATCH FOUND | sku={sku} | name={current_name} | row={row_idx}")
        
        # Mapeo de campos a índices de columna (1-based)
        field_to_col = {
            'name': 3,
            'category': 4,
            'stock': 5,
            'unit': 6,
            'cost': 7,
            'price': 8,
            'expiration_date': 9,
            'location': 10,
            'invima': 11,
            'lote': 12
        }
        
        update_data = updates.dict(exclude_unset=True)
        log.info(f"PATCH FIELDS | sku={sku} | raw_body={update_data}")
        
        for field, value in update_data.items():
            if field in field_to_col and value is not None:
                col = field_to_col[field]
                log.info(f"PATCH CELL | sku={sku} | field={field} | col={col} | value={value!r}")
                inventory_service.inventory_sheet.update_cell(row_idx, col, value)
        
        # Handle custom fields from raw body
        if request:
            import json
            try:
                body = await request.json()
                known = set(ProductUpdateSchema.__fields__.keys())
                for key, val in body.items():
                    if key not in known and key != 'sku':
                        _save_custom_value(inventory_service.tenant_id, sku, key, val)
                        log.info(f"PATCH CUSTOM | sku={sku} | field={key} | value={val!r}")
            except Exception:
                pass
        
        log.info(f"PATCH OK | sku={sku} | fields_updated={list(update_data.keys())}")
        return {"status": "updated", "sku": sku, "changes": list(update_data.keys())}
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback, logging
        logging.getLogger('api').error(f"PATCH /products/{sku}: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete('/products/{sku}')
async def delete_product(
    sku: str,
    token: str = Query(...),
    inventory_service: InventoryService = Depends(get_inventory_service)
):
    """Elimina un producto del inventario."""
    try:
        row_idx, name = inventory_service._find_product_row_by_keyword(sku, exact_match=True)
        if not row_idx:
            raise HTTPException(status_code=404, detail="Producto no encontrado")
        
        inventory_service._delete_product(row_idx)
        return {"status": "deleted", "sku": sku}
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback, logging
        logging.getLogger('crud.product').error(f"CRUD FAIL | {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/movements')
async def get_movements(
    token: str = Query(...),
    limit: int = Query(100, ge=1, le=500),
    inventory_service: InventoryService = Depends(get_inventory_service)
):
    """Historial de movimientos."""
    try:
        rows = inventory_service.history_sheet.get_all_values()
        if not rows or len(rows) < 2:
            return {"movements": [], "total": 0}
        
        # Ordenar por timestamp descendente (más reciente primero)
        movements = []
        for row in rows[1:]:  # Saltamos header
            if len(row) < 7:
                continue
            movements.append({
                "timestamp": str(row[0]),
                "tx_id": str(row[1]),
                "mov_type": str(row[2]),
                "sku": str(row[3]),
                "name": str(row[4]),
                "qty": int(row[5]) if str(row[5]).replace('-','').isdigit() else 0,
                "user": str(row[6]),
                "notes": str(row[7]) if len(row) > 7 else ""
            })
        
        # Ordenar por timestamp descendente y limitar
        movements.sort(key=lambda x: x['timestamp'], reverse=True)
        limited = movements[:limit]
        
        result = {"movements": limited, "total": len(movements)}
        return result
        
    except Exception as e:
        import traceback, logging
        logging.getLogger('crud.product').error(f"CRUD FAIL | {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/stats')
async def get_stats(
    token: str = Query(...),
    inventory_service: InventoryService = Depends(get_inventory_service)
):
    """Estadisticas agregadas."""
    try:
        rows = inventory_service.inventory_sheet.get_all_values()
        if not rows or len(rows) < 2:
            return {"total_products": 0, "total_stock_value": 0, "low_stock_count": 0, "expiring_count": 0}

        total_products = 0
        total_stock_value = 0.0
        low_stock_count = 0
        expiring_count = 0
        today = datetime.date.today()

        for row in rows[1:]:
            if len(row) < 8:
                continue
            total_products += 1
            stock = int(row[4]) if len(row) > 4 and str(row[4]).isdigit() else 0
            price = float(row[7]) if len(row) > 7 and str(row[7]).replace('.', '').isdigit() else 0
            total_stock_value += stock * price
            if 0 < stock <= 5:
                low_stock_count += 1
            if len(row) > 8 and row[8]:
                try:
                    exp_date = datetime.datetime.strptime(str(row[8]), "%Y-%m-%d").date()
                    if (exp_date - today).days <= 30:
                        expiring_count += 1
                except Exception:
                    pass

        result = {
            "total_products": total_products,
            "total_stock_value": round(total_stock_value, 2),
            "low_stock_count": low_stock_count,
            "expiring_count": expiring_count,
        }
        return result
    except Exception as e:
        import traceback, logging
        logging.getLogger('crud.product').error(f"CRUD FAIL | {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get('/alerts')
async def get_alerts(
    token: str = Query(...),
    inventory_service: InventoryService = Depends(get_inventory_service)
):
    """Productos con stock bajo o proximos a vencer."""
    try:
        rows = inventory_service.inventory_sheet.get_all_values()
        if not rows or len(rows) < 2:
            return {"low_stock": [], "expiring": []}

        low_stock = []
        expiring = []
        today = datetime.date.today()

        for row in rows[1:]:
            if len(row) < 8:
                continue
            name = str(row[2]) if len(row) > 2 else ""
            sku = str(row[1]) if len(row) > 1 else ""
            if sku.endswith(".0"):
                sku = sku[:-2]
            stock = int(row[4]) if len(row) > 4 and str(row[4]).isdigit() else 0
            unit = str(row[5]) if len(row) > 5 else "UND"
            exp_str = str(row[8]) if len(row) > 8 else ""

            if 0 < stock <= 5:
                low_stock.append({"sku": sku, "name": name, "stock": stock, "unit": unit})

            if exp_str:
                try:
                    exp_date = datetime.datetime.strptime(exp_str, "%Y-%m-%d").date()
                    days = (exp_date - today).days
                    if days <= 30:
                        expiring.append({"sku": sku, "name": name, "expiration_date": exp_str, "days_left": days})
                except Exception:
                    pass

        result = {"low_stock": low_stock, "expiring": expiring}
        return result
    except Exception as e:
        import traceback, logging
        logging.getLogger('crud.product').error(f"CRUD FAIL | {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get('/analytics')
async def get_analytics(
    token: str = Query(...),
    inventory_service: InventoryService = Depends(get_inventory_service)
):
    """Analitica completa."""
    try:
        # Cargar datos
        rows = inventory_service.inventory_sheet.get_all_values()
        mov_rows = inventory_service.history_sheet.get_all_values()
        today = datetime.date.today()

        # --- INVENTARIO ---
        products = []
        for row in rows[1:]:
            if len(row) < 8: continue
            stock = int(row[4]) if len(row) > 4 and str(row[4]).isdigit() else 0
            cost = float(row[6]) if len(row) > 6 and str(row[6]).replace('.','').replace('-','').isdigit() else 0
            price = float(row[7]) if len(row) > 7 and str(row[7]).replace('.','').replace('-','').isdigit() else 0
            products.append({
                "sku": str(row[1]) if len(row) > 1 else "",
                "name": str(row[2]) if len(row) > 2 else "",
                "category": str(row[3]) if len(row) > 3 else "General",
                "stock": stock,
                "cost": cost,
                "price": price,
                "expiration_date": str(row[8]) if len(row) > 8 else "",
                "unit": str(row[5]) if len(row) > 5 else "UND",
            })

        # --- MOVIMIENTOS (ultimos 90 dias) ---
        cutoff = today - datetime.timedelta(days=90)
        movements = []
        for row in mov_rows[1:]:
            if len(row) < 7: continue
            ts_str = str(row[0])
            try:
                # Probar formato completo con hora: "2026-07-23 14:30:00"
                ts = datetime.datetime.strptime(ts_str[:19], "%Y-%m-%d %H:%M:%S")
            except:
                try:
                    # Fallback: solo fecha
                    ts = datetime.datetime.strptime(ts_str[:10], "%Y-%m-%d")
                except:
                    continue
            if ts.date() < cutoff: continue
            movements.append({
                "datetime": ts.isoformat(),
                "date": str(ts.date()),
                "type": str(row[2]),
                "sku": str(row[3]),
                "name": str(row[4]),
                "qty": int(row[5]) if str(row[5]).replace('-','').isdigit() else 0,
                "user": str(row[6]),
                "notes": str(row[7]) if len(row) > 7 else "",
            })

        # --- REVENUE POR PRODUCTO ---
        sales_by_product = {}
        for m in movements:
            if m["type"] != "VENTA": continue
            sku = m["sku"]
            if sku not in sales_by_product:
                sales_by_product[sku] = {"name": m["name"], "units_sold": 0, "revenue": 0.0}
            sales_by_product[sku]["units_sold"] += abs(m["qty"])
            # Buscar precio del producto
            prod = next((p for p in products if p["sku"] == sku), None)
            price = prod["price"] if prod else 0
            sales_by_product[sku]["revenue"] += abs(m["qty"]) * price

        # --- TOP 10 VENDIDOS ---
        top_sellers = sorted(
            [{"sku": k, **v} for k, v in sales_by_product.items()],
            key=lambda x: x["revenue"], reverse=True
        )[:10]

        # --- REVENUE POR CATEGORIA ---
        revenue_by_category = {}
        for m in movements:
            if m["type"] != "VENTA": continue
            prod = next((p for p in products if p["sku"] == m["sku"]), None)
            cat = prod["category"] if prod else "General"
            price = prod["price"] if prod else 0
            if cat not in revenue_by_category:
                revenue_by_category[cat] = 0.0
            revenue_by_category[cat] += abs(m["qty"]) * price

        category_breakdown = sorted(
            [{"category": k, "revenue": round(v, 2)} for k, v in revenue_by_category.items()],
            key=lambda x: x["revenue"], reverse=True
        )

        # --- TENDENCIA DE VENTAS (ultimos 30 dias, diario) ---
        daily_sales = {}
        for i in range(30):
            d = (today - datetime.timedelta(days=29-i)).strftime("%Y-%m-%d")
            daily_sales[d] = 0.0

        for m in movements:
            if m["type"] != "VENTA": continue
            d = m["date"]
            if d in daily_sales:
                prod = next((p for p in products if p["sku"] == m["sku"]), None)
                price = prod["price"] if prod else 0
                daily_sales[d] += abs(m["qty"]) * price

        sales_trend = [{"date": k, "revenue": round(v, 2)} for k, v in daily_sales.items()]

        # --- ABC CLASSIFICATION ---
        total_revenue = sum(v["revenue"] for v in sales_by_product.values()) or 1
        abc_items = sorted(
            [{"sku": k, "name": v["name"], "revenue": v["revenue"],
              "pct": round(v["revenue"] / total_revenue * 100, 1)}
             for k, v in sales_by_product.items()],
            key=lambda x: x["revenue"], reverse=True
        )
        running = 0
        for item in abc_items:
            running += item["pct"]
            if running <= 70: item["class"] = "A"
            elif running <= 90: item["class"] = "B"
            else: item["class"] = "C"

        # --- MARGENES ---
        margins = []
        for p in products:
            if p["price"] > 0:
                margin_pct = round((p["price"] - p["cost"]) / p["price"] * 100, 1) if p["price"] > 0 else 0
                margins.append({
                    "sku": p["sku"], "name": p["name"], "category": p["category"],
                    "cost": p["cost"], "price": p["price"], "margin_pct": margin_pct,
                    "stock": p["stock"]
                })

        # --- STOCK HEALTH ---
        expiring_list = []
        for p in products:
            if p["expiration_date"]:
                try:
                    exp_d = datetime.datetime.strptime(p["expiration_date"], "%Y-%m-%d").date()
                    days = (exp_d - today).days
                    if days <= 30:
                        expiring_list.append({"sku": p["sku"], "name": p["name"], "days_left": days})
                except: pass

        out_of_stock = [p for p in products if p["stock"] <= 0]
        low_stock = [p for p in products if 0 < p["stock"] <= 5]

        # --- RECOMENDACIONES ---
        recommendations = []
        rec_details = {}
        # Productos clase A con stock bajo
        a_low = [i for i in abc_items if i["class"] == "A" and any(
            p["sku"] == i["sku"] and p["stock"] <= 5 for p in products)]
        if a_low:
            items = [{"sku": i["sku"], "name": i["name"], "stock": next((p["stock"] for p in products if p["sku"] == i["sku"]), 0)} for i in a_low]
            recommendations.append(f"⚠️ {len(a_low)} productos clase A (alta rentabilidad) tienen stock bajo. Prioriza reabastecerlos.")
            rec_details["a_low_stock"] = items
        # Productos sin ventas en 90 dias con stock alto
        stale = [p for p in products if p["stock"] > 10 and p["sku"] not in sales_by_product]
        if stale:
            items = [{"sku": p["sku"], "name": p["name"], "stock": p["stock"]} for p in stale]
            recommendations.append(f"📦 {len(stale)} productos con stock alto no han tenido ventas en 90 dias. Considera promociones.")
            rec_details["stale_stock"] = items
        # Vencidos
        expired = [e for e in expiring_list if e["days_left"] <= 0]
        if expired:
            recommendations.append(f"🚨 {len(expired)} productos vencidos. Retiralos del inventario.")
            rec_details["expired"] = [{"sku": e["sku"], "name": e["name"], "days_left": e["days_left"]} for e in expired]
        # Margenes negativos
        negative_margins = [m for m in margins if m["margin_pct"] < 0]
        if negative_margins:
            recommendations.append(f"📉 {len(negative_margins)} productos se venden a perdida. Revisa sus precios.")
            rec_details["negative_margins"] = [{"sku": m["sku"], "name": m["name"], "margin_pct": m["margin_pct"], "price": m["price"], "cost": m["cost"]} for m in negative_margins]

        return {
            "top_sellers": top_sellers,
            "category_breakdown": category_breakdown,
            "sales_trend": sales_trend,
            "abc_classification": abc_items,
            "margins": sorted(margins, key=lambda x: x["margin_pct"], reverse=True),
            "stock_health": {
                "out_of_stock": len(out_of_stock),
                "low_stock": len(low_stock),
                "expiring": len(expiring_list),
            },
            "recommendations": recommendations,
            "recommendation_details": rec_details,
            "total_revenue_90d": round(total_revenue, 2),
            "total_units_sold_90d": sum(v["units_sold"] for v in sales_by_product.values()),
            # Advanced analytics with pandas + numpy + scipy
            "advanced": AnalyticsService(products, movements).full_report(),
        }

        return result

    except Exception as e:
        import traceback, logging
        logging.getLogger('crud.product').error(f"CRUD FAIL | {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get('/health')
async def health_check():
    """Health check para el frontend"""
    return {"status": "ok", "service": "inventory-api"}


class ReceiveOrderItem(BaseModel):
    sku: str
    name: str
    quantity: int


class ReceiveOrderRequest(BaseModel):
    items: list[ReceiveOrderItem]
    user_name: str = "Sistema"


@router.post('/receive-order')
async def receive_order(
    data: ReceiveOrderRequest,
    token: str = Query(...),
    inventory_service: InventoryService = Depends(get_inventory_service)
):
    """Registra la recepcion de un pedido: suma stock por cada producto."""
    messages = []
    for item in data.items:
        row_idx, real_name = inventory_service._find_product_row_by_keyword(item.sku, exact_match=True)
        if not row_idx:
            messages.append(f"⚠️ {item.name}: no encontrado en inventario")
            continue
        current_stock = int(inventory_service.inventory_sheet.cell(row_idx, 5).value or 0)
        new_stock = current_stock + item.quantity
        inventory_service.inventory_sheet.update_cell(row_idx, 5, new_stock)
        inventory_service._log_movement("COMPRA", item.sku, real_name, item.quantity, data.user_name, "Recepcion de pedido")
        messages.append(f"✅ {real_name}: {current_stock} → {new_stock}")


    return {"status": "ok", "messages": messages}


# ── Suppliers ──

class SupplierSchema(BaseModel):
    name: str
    contact: str = ""
    phone: str = ""
    email: str = ""
    address: str = ""
    notes: str = ""

class SupplierUpdateSchema(BaseModel):
    name: Optional[str] = None
    contact: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None


@router.get('/suppliers')
async def list_suppliers(
    inventory_service: InventoryService = Depends(get_inventory_service)
):
    """Lista todos los proveedores del tenant."""
    with get_conn(inventory_service.tenant_id) as conn:
        rows = conn.execute(
            "SELECT id, name, contact, phone, email, address, notes, created_at FROM suppliers ORDER BY name"
        ).fetchall()
    return {"suppliers": [dict(r) for r in rows]}


@router.post('/suppliers')
async def create_supplier(
    data: SupplierSchema,
    inventory_service: InventoryService = Depends(get_inventory_service)
):
    """Crea un nuevo proveedor."""
    with get_conn(inventory_service.tenant_id) as conn:
        cur = conn.execute(
            "INSERT INTO suppliers (name, contact, phone, email, address, notes) VALUES (?, ?, ?, ?, ?, ?)",
            (data.name, data.contact, data.phone, data.email, data.address, data.notes)
        )
        conn.commit()
    return {"status": "created", "id": cur.lastrowid}


@router.patch('/suppliers/{supplier_id}')
async def update_supplier(
    supplier_id: int,
    updates: SupplierUpdateSchema,
    inventory_service: InventoryService = Depends(get_inventory_service)
):
    """Actualiza un proveedor existente."""
    with get_conn(inventory_service.tenant_id) as conn:
        existing = conn.execute("SELECT id FROM suppliers WHERE id = ?", (supplier_id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Proveedor no encontrado")

        update_data = updates.dict(exclude_unset=True)
        if not update_data:
            return {"status": "unchanged"}

        set_clause = ", ".join(f"{k} = ?" for k in update_data)
        set_clause += ", updated_at = datetime('now','localtime')"
        values = list(update_data.values()) + [supplier_id]
        conn.execute(f"UPDATE suppliers SET {set_clause} WHERE id = ?", values)
        conn.commit()
    return {"status": "updated"}


@router.delete('/suppliers/{supplier_id}')
async def delete_supplier(
    supplier_id: int,
    inventory_service: InventoryService = Depends(get_inventory_service)
):
    """Elimina un proveedor."""
    with get_conn(inventory_service.tenant_id) as conn:
        existing = conn.execute("SELECT id FROM suppliers WHERE id = ?", (supplier_id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Proveedor no encontrado")
        conn.execute("DELETE FROM suppliers WHERE id = ?", (supplier_id,))
        conn.commit()
    return {"status": "deleted"}


# ── Custom Columns ──

class CustomColumnSchema(BaseModel):
    name: str
    col_type: str = "text"  # text, number, date


@router.get('/custom-columns')
async def list_custom_columns(
    inventory_service: InventoryService = Depends(get_inventory_service)
):
    """Lista las columnas personalizadas del tenant."""
    with get_conn(inventory_service.tenant_id) as conn:
        rows = conn.execute(
            "SELECT id, name, col_type, created_at FROM custom_columns ORDER BY id"
        ).fetchall()
    return {"columns": [dict(r) for r in rows]}


@router.post('/custom-columns')
async def create_custom_column(
    data: CustomColumnSchema,
    inventory_service: InventoryService = Depends(get_inventory_service)
):
    """Crea una nueva columna personalizada."""
    with get_conn(inventory_service.tenant_id) as conn:
        existing = conn.execute(
            "SELECT id FROM custom_columns WHERE name = ?", (data.name,)
        ).fetchone()
        if existing:
            raise HTTPException(status_code=409, detail="Ya existe una columna con ese nombre")
        cur = conn.execute(
            "INSERT INTO custom_columns (name, col_type) VALUES (?, ?)",
            (data.name, data.col_type)
        )
        conn.commit()
    return {"status": "created", "id": cur.lastrowid}


@router.delete('/custom-columns/{column_id}')
async def delete_custom_column(
    column_id: int,
    inventory_service: InventoryService = Depends(get_inventory_service)
):
    """Elimina una columna personalizada y todos sus valores."""
    with get_conn(inventory_service.tenant_id) as conn:
        conn.execute("DELETE FROM product_custom_values WHERE column_id = ?", (column_id,))
        conn.execute("DELETE FROM custom_columns WHERE id = ?", (column_id,))
        conn.commit()
    return {"status": "deleted"}


# ── Helpers for custom values ──

def _load_custom_columns(tenant_id: str) -> list[dict]:
    with get_conn(tenant_id) as conn:
        rows = conn.execute("SELECT id, name, col_type FROM custom_columns ORDER BY id").fetchall()
    return [dict(r) for r in rows]


def _load_custom_values(tenant_id: str, sku: str) -> dict:
    with get_conn(tenant_id) as conn:
        rows = conn.execute(
            "SELECT cc.name, pcv.value FROM product_custom_values pcv "
            "JOIN custom_columns cc ON cc.id = pcv.column_id "
            "WHERE pcv.product_sku = ?", (sku,)
        ).fetchall()
    return {r['name']: r['value'] for r in rows}


def _merge_custom_into_product(product: dict, custom_values: dict) -> dict:
    result = dict(product)
    result.update(custom_values)
    return result


def _save_custom_value(tenant_id: str, sku: str, column_name: str, value: any):
    with get_conn(tenant_id) as conn:
        col = conn.execute(
            "SELECT id, col_type FROM custom_columns WHERE name = ?", (column_name,)
        ).fetchone()
        if not col:
            return
        # Type coercion
        str_value = str(value) if value is not None else None
        conn.execute(
            "INSERT OR REPLACE INTO product_custom_values (product_sku, column_id, value) VALUES (?, ?, ?)",
            (sku, col['id'], str_value)
        )
        conn.commit()



# ── Clients (SQLAlchemy) ──

class ClientSchema(BaseModel):
    name: str
    contact: str = ""
    phone: str = ""
    email: str = ""
    address: str = ""
    notes: str = ""


class ClientUpdateSchema(BaseModel):
    name: Optional[str] = None
    contact: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None


@router.get('/clients')
async def list_clients(
    inventory_service: InventoryService = Depends(get_inventory_service)
):
    """Lista todos los clientes del tenant."""
    from app.database_sa import get_session
    from app.models import Client
    session = get_session(inventory_service.tenant_id)
    try:
        clients = session.query(Client).order_by(Client.name).all()
        return {"clients": [{"id": c.id, "name": c.name, "contact": c.contact,
                "phone": c.phone, "email": c.email, "address": c.address,
                "notes": c.notes, "created_at": str(c.created_at)} for c in clients]}
    finally:
        session.close()


@router.post('/clients')
async def create_client(
    data: ClientSchema,
    inventory_service: InventoryService = Depends(get_inventory_service)
):
    """Crea un nuevo cliente."""
    from app.database_sa import get_session
    from app.models import Client
    session = get_session(inventory_service.tenant_id)
    try:
        client = Client(**data.dict())
        session.add(client)
        session.commit()
        return {"status": "created", "id": client.id}
    except Exception as e:
        import traceback
        print(f"REMISION ERROR: {traceback.format_exc()}", flush=True)
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()


@router.patch('/clients/{client_id}')
async def update_client(
    client_id: int,
    updates: ClientUpdateSchema,
    inventory_service: InventoryService = Depends(get_inventory_service)
):
    """Actualiza un cliente."""
    from app.database_sa import get_session
    from app.models import Client
    session = get_session(inventory_service.tenant_id)
    try:
        client = session.query(Client).filter(Client.id == client_id).first()
        if not client:
            raise HTTPException(status_code=404, detail="Cliente no encontrado")
        for key, val in updates.dict(exclude_unset=True).items():
            setattr(client, key, val)
        session.commit()
        return {"status": "updated"}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"REMISION ERROR: {traceback.format_exc()}", flush=True)
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()


@router.delete('/clients/{client_id}')
async def delete_client(
    client_id: int,
    inventory_service: InventoryService = Depends(get_inventory_service)
):
    """Elimina un cliente."""
    from app.database_sa import get_session
    from app.models import Client
    session = get_session(inventory_service.tenant_id)
    try:
        client = session.query(Client).filter(Client.id == client_id).first()
        if not client:
            raise HTTPException(status_code=404, detail="Cliente no encontrado")
        session.delete(client)
        session.commit()
        return {"status": "deleted"}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"REMISION ERROR: {traceback.format_exc()}", flush=True)
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()


# ── Remisiones (SQLAlchemy) ──

class RemisionItemSchema(BaseModel):
    product_sku: str
    product_name: str
    quantity: int
    unit: str = "UND"
    unit_price: float = 0


class RemisionCreateSchema(BaseModel):
    client_id: int
    items: List[RemisionItemSchema]
    notes: str = ""


@router.get('/remisiones')
async def list_remisiones(
    inventory_service: InventoryService = Depends(get_inventory_service)
):
    """Lista todas las remisiones del tenant."""
    from app.database_sa import get_session
    from app.models import Remision, Client
    session = get_session(inventory_service.tenant_id)
    try:
        remisiones = session.query(Remision).order_by(Remision.created_at.desc()).all()
        result = []
        for r in remisiones:
            client_name = r.client.name if r.client else ""
            result.append({
                "id": r.id, "uid": r.uid, "client_name": client_name,
                "total_amount": r.total_amount, "notes": r.notes,
                "created_at": str(r.created_at), "item_count": len(r.items)
            })
        return {"remisiones": result}
    finally:
        session.close()


@router.get('/remisiones/{remision_id}')
async def get_remision(
    remision_id: int,
    inventory_service: InventoryService = Depends(get_inventory_service)
):
    """Obtiene una remision con sus items."""
    from app.database_sa import get_session
    from app.models import Remision
    session = get_session(inventory_service.tenant_id)
    try:
        r = session.query(Remision).filter(Remision.id == remision_id).first()
        if not r:
            raise HTTPException(status_code=404, detail="Remision no encontrada")
        return {
            "id": r.id, "uid": r.uid, "client_name": r.client.name if r.client else "",
            "total_amount": r.total_amount, "notes": r.notes,
            "created_at": str(r.created_at), "created_by": r.created_by,
            "items": [{"product_sku": i.product_sku, "product_name": i.product_name,
                       "quantity": i.quantity, "unit": i.unit,
                       "unit_price": i.unit_price, "subtotal": i.subtotal} for i in r.items]
        }
    finally:
        session.close()


@router.post('/remisiones')
async def create_remision(
    data: RemisionCreateSchema,
    token: str = Query(...),
    inventory_service: InventoryService = Depends(get_inventory_service)
):
    """Crea una remision y descuenta stock del inventario."""
    import uuid as _uuid_mod
    uid = _uuid_mod.uuid4().hex[:8].upper()
    
    from app.database_sa import get_session
    from app.models import Remision, RemisionItem, Client
    session = get_session(inventory_service.tenant_id)
    try:
        # Validate client exists
        client = session.query(Client).filter(Client.id == data.client_id).first()
        if not client:
            raise HTTPException(status_code=404, detail="Cliente no encontrado")

        # Validate stock for each item
        for item in data.items:
            row_idx, _ = inventory_service._find_product_row_by_keyword(item.product_sku, exact_match=True)
            if not row_idx:
                raise HTTPException(status_code=404, detail=f"Producto no encontrado: {item.product_sku}")
            current_stock = int(inventory_service.inventory_sheet.cell(row_idx, 5).value or 0)
            if current_stock < item.quantity:
                raise HTTPException(status_code=400, detail=f"Stock insuficiente para {item.product_name}")

        total = sum(i.quantity * i.unit_price for i in data.items)

        # Create remision + items via SA
        remision = Remision(client_id=data.client_id, notes=data.notes, total_amount=total, created_by="Web", uid=uid)
        session.add(remision)
        session.flush()

        for item in data.items:
            ri = RemisionItem(
                remision_id=remision.id, product_sku=item.product_sku, product_name=item.product_name,
                quantity=item.quantity, unit=item.unit, unit_price=item.unit_price, subtotal=item.quantity * item.unit_price
            )
            session.add(ri)

        session.commit()
        remision_id = remision.id
    except HTTPException:
        raise
    except Exception as e:
        try: session.rollback()
        except: pass
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        try: session.close()
        except: pass
        try: session.bind.dispose()
        except: pass

    # Deduct stock — separate connection, after SA fully released
    import time
    time.sleep(0.1)
    for item in data.items:
        row_idx, _ = inventory_service._find_product_row_by_keyword(item.product_sku, exact_match=True)
        current_stock = int(inventory_service.inventory_sheet.cell(row_idx, 5).value or 0)
        inventory_service.inventory_sheet.update_cell(row_idx, 5, current_stock - item.quantity)
        inventory_service._log_movement("REMISION", item.product_sku, item.product_name,
                                        -item.quantity, "Web", f"Remision {uid}")

    return {"status": "created", "id": remision_id, "uid": uid}


@router.get('/remisiones/{remision_id}/pdf')
async def remision_pdf(
    remision_id: int,
    inventory_service: InventoryService = Depends(get_inventory_service)
):
    """Genera PDF de una remision."""
    from app.database_sa import get_session
    from app.models import Remision
    from io import BytesIO
    from fastapi.responses import StreamingResponse
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet

    session = get_session(inventory_service.tenant_id)
    try:
        r = session.query(Remision).filter(Remision.id == remision_id).first()
        if not r:
            raise HTTPException(status_code=404, detail="Remision no encontrada")

        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=30, bottomMargin=30)
        styles = getSampleStyleSheet()
        elements = []

        # Header
        client_name = r.client.name if r.client else "Sin cliente"
        elements.append(Paragraph(f"<b>REMISION {r.uid}</b>", styles["Title"]))
        elements.append(Spacer(1, 6))
        elements.append(Paragraph(f"Cliente: {client_name}", styles["Normal"]))
        elements.append(Paragraph(f"Fecha: {str(r.created_at)[:16]}", styles["Normal"]))
        if r.notes:
            elements.append(Paragraph(f"Notas: {r.notes}", styles["Normal"]))
        elements.append(Spacer(1, 12))

        # Items table
        data = [["Producto", "SKU", "Cant.", "Unit.", "Precio", "Subtotal"]]
        for item in r.items:
            data.append([
                item.product_name, item.product_sku, str(item.quantity),
                item.unit, f"${item.unit_price:,.0f}", f"${item.subtotal:,.0f}"
            ])
        data.append(["", "", "", "", "TOTAL", f"${r.total_amount:,.0f}"])

        table = Table(data, colWidths=[140, 70, 50, 40, 70, 70])
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4F46E5")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("ALIGN", (2, 1), (3, -1), "CENTER"),
            ("ALIGN", (4, 1), (-1, -1), "RIGHT"),
            ("GRID", (0, 0), (-1, -2), 0.5, colors.grey),
            ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#EEF2FF")),
            ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ]))
        elements.append(table)

        doc.build(elements)
        buffer.seek(0)

        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=remision-{r.uid}.pdf"}
        )
    finally:
        session.close()
