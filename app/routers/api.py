from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel
from typing import Optional, List
import datetime
from app.services.tenant_service import TenantService
from app.services.inventory_service import InventoryService
from app.core.config import settings

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

def get_tenant(token: str = Query(..., description="Token de invitación de la pyme")):
    """Valida el token y retorna el tenant"""
    tenant_service = TenantService()
    # Buscamos por token en la columna E (5)
    try:
        cell = tenant_service.admin_sheet.find(token)
        if not cell:
            raise HTTPException(status_code=401, detail="Token inválido")
        row = tenant_service.admin_sheet.row_values(cell.row)
        return {
            "pyme_name": row[2],
            "sheet_id": row[3],
            "token": row[4]
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Error validando token: {str(e)}")

def get_inventory_service(tenant: dict = Depends(get_tenant)):
    """Retorna InventoryService conectado al sheet del tenant"""
    return InventoryService(sheet_id=tenant['sheet_id'])

# --- Endpoints ---

@router.get('/inventory', response_model=InventoryResponse)
async def get_inventory(
    token: str = Query(...),
    inventory_service: InventoryService = Depends(get_inventory_service)
):
    """
    Obtiene todos los productos del inventario.
    El frontend Next.js consume este endpoint.
    """
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
        
        return {"products": products, "total": len(products)}
        
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

@router.get('/movements')
async def get_movements(
    token: str = Query(...),
    limit: int = Query(100, ge=1, le=500),
    inventory_service: InventoryService = Depends(get_inventory_service)
):
    """Obtiene el historial de movimientos (últimos N)"""
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
        
        return {"movements": limited, "total": len(movements)}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/stats')
async def get_stats(
    token: str = Query(...),
    inventory_service: InventoryService = Depends(get_inventory_service)
):
    """Estadisticas agregadas: total productos, valor inventario, alertas."""
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

        return {
            "total_products": total_products,
            "total_stock_value": round(total_stock_value, 2),
            "low_stock_count": low_stock_count,
            "expiring_count": expiring_count,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get('/alerts')
async def get_alerts(
    token: str = Query(...),
    inventory_service: InventoryService = Depends(get_inventory_service)
):
    """Productos con stock bajo (<=5) o proximos a vencer (<=30 dias)."""
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

        return {"low_stock": low_stock, "expiring": expiring}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get('/health')
async def health_check():
    """Health check para el frontend"""
    return {"status": "ok", "service": "inventory-api"}
