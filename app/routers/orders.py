from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel
from typing import Optional
from app.services.tenant_service import TenantService
from app.services.order_service import OrderService

router = APIRouter(
    prefix='/api/orders',
    tags=['Pedidos y Rastreo']
)


class OrderCreate(BaseModel):
    order_number: str
    supplier: str
    product_name: str = ""
    quantity: int = 1
    tracking_number: str = ""
    shipping_company: str = ""
    tracking_url: str = ""
    status: str = "pendiente"
    notes: str = ""


class OrderUpdate(BaseModel):
    order_number: Optional[str] = None
    supplier: Optional[str] = None
    product_name: Optional[str] = None
    quantity: Optional[int] = None
    tracking_number: Optional[str] = None
    shipping_company: Optional[str] = None
    tracking_url: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


def get_order_service(token: str = Query(..., description="Token de la pyme")):
    tenant_service = TenantService()
    cell = tenant_service.admin_sheet.find(token)
    if not cell:
        raise HTTPException(status_code=401, detail="Token invalido")
    row = tenant_service.admin_sheet.row_values(cell.row)
    tenant_id = row[1]  # UUID de la pyme
    return OrderService(tenant_id=tenant_id)


@router.get('')
def list_orders(
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    service: OrderService = Depends(get_order_service),
):
    orders = service.list_orders(status=status, search=search, limit=limit)
    stats = service.stats()
    return {"orders": orders, "stats": stats}


@router.get('/{order_id}')
def get_order(order_id: int, service: OrderService = Depends(get_order_service)):
    order = service.get_order(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    return order


@router.post('')
def create_order(data: OrderCreate, service: OrderService = Depends(get_order_service)):
    return service.create_order(data.model_dump())


@router.patch('/{order_id}')
def update_order(order_id: int, data: OrderUpdate, service: OrderService = Depends(get_order_service)):
    result = service.update_order(order_id, data.model_dump(exclude_unset=True))
    if not result:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    return result


@router.delete('/{order_id}')
def delete_order(order_id: int, service: OrderService = Depends(get_order_service)):
    if not service.delete_order(order_id):
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    return {"status": "deleted"}
