from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel
from typing import Optional, List
import datetime
from app.services.inventory_service import InventoryService
from app.services.analytics_service import AnalyticsService
from app.services.factory import get_inventory_service
from app.core.config import settings
from app.core.cache import get_cache, set_cache
from app.core.auth import get_current_tenant

router = APIRouter(
    prefix='/api',
    tags=['REST API para Frontend']
)

# --- Schemas ---

class ProductSchema(BaseModel):
    uuid: str
    sku: str
    name: str
    category: str
    stock: int
    unit: str
    cost: float
    price: float
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
    return get_inventory_service(
        sheet_id=tenant.get('sheet_id', ''),
        tenant_id=tenant.get('tenant_id', '')
    )

# --- Endpoints ---


@router.get('/inventory', response_model=InventoryResponse)
async def get_inventory(
    token: str = Query(...),
    inventory_service: InventoryService = Depends(get_inventory_service)
):
    """Obtiene todos los productos del inventario."""
    cache_key = f"inventory:{token}"
    cached = get_cache(cache_key, ttl=60)
    if cached is not None:
        return cached

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
        set_cache(cache_key, result, ttl=30)
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
            "stock": int(values[4]) if len(values) > 4 else 0,
            "unit": values[5] if len(values) > 5 else "UND",
            "cost": float(values[6]) if len(values) > 6 else 0,
            "price": float(values[7]) if len(values) > 7 else 0,
            "expiration_date": values[8] if len(values) > 8 else "",
            "location": values[9] if len(values) > 9 else "",
            "invima": values[10] if len(values) > 10 else "",
            "lote": values[11] if len(values) > 11 else ""
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch('/products/{sku}')
async def update_product(
    sku: str,
    updates: ProductUpdateSchema,
    token: str = Query(...),
    inventory_service: InventoryService = Depends(get_inventory_service)
):
    """
    Actualiza campos de un producto existente.
    Solo actualiza los campos enviados en el body.
    """
    try:
        row_idx, current_name = inventory_service._find_product_row_by_keyword(sku, exact_match=True)
        if not row_idx:
            raise HTTPException(status_code=404, detail="Producto no encontrado")
        
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
        
        for field, value in update_data.items():
            if field in field_to_col and value is not None:
                col = field_to_col[field]
                inventory_service.inventory_sheet.update_cell(row_idx, col, value)
        
        return {"status": "updated", "sku": sku, "changes": list(update_data.keys())}
        
    except HTTPException:
        raise
    except Exception as e:
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
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/movements')
async def get_movements(
    token: str = Query(...),
    limit: int = Query(100, ge=1, le=500),
    inventory_service: InventoryService = Depends(get_inventory_service)
):
    """Historial de movimientos."""
    cache_key = f"movements:{token}:{limit}"
    cached = get_cache(cache_key, ttl=30)
    if cached is not None:
        return cached

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
        set_cache(cache_key, result, ttl=30)
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/stats')
async def get_stats(
    token: str = Query(...),
    inventory_service: InventoryService = Depends(get_inventory_service)
):
    """Estadisticas agregadas."""
    cache_key = f"stats:{token}"
    cached = get_cache(cache_key, ttl=30)
    if cached is not None:
        return cached

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
        set_cache(cache_key, result, ttl=30)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get('/alerts')
async def get_alerts(
    token: str = Query(...),
    inventory_service: InventoryService = Depends(get_inventory_service)
):
    """Productos con stock bajo o proximos a vencer."""
    cache_key = f"alerts:{token}"
    cached = get_cache(cache_key, ttl=30)
    if cached is not None:
        return cached

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
        set_cache(cache_key, result, ttl=30)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get('/analytics')
async def get_analytics(
    token: str = Query(...),
    inventory_service: InventoryService = Depends(get_inventory_service)
):
    """Analitica completa."""
    cache_key = f"analytics:{token}"
    cached = get_cache(cache_key, ttl=60)
    if cached is not None:
        return cached

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

        set_cache(cache_key, result, ttl=60)
        return result

    except Exception as e:
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

    # Invalidate caches
    from app.core.cache import invalidate_pattern
    invalidate_pattern(f"*:{token}*")

    return {"status": "ok", "messages": messages}


@router.post('/invalidate-cache')
async def invalidate_cache(token: str = Query(...)):
    """Fuerza limpieza de cache para refrescar datos."""
    from app.core.cache import invalidate_pattern
    count = invalidate_pattern(f"*:{token}*")
    return {"status": "ok", "keys_invalidated": count}
