from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel
from typing import Optional
from app.services.order_service import OrderService
from app.core.auth import get_current_tenant

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


def get_order_service(tenant: dict = Depends(get_current_tenant)):
    return OrderService(tenant_id=tenant['tenant_id'])


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


class PORequest(BaseModel):
    supplier: str
    order_number: str = ""
    notes: str = ""
    items: list[dict]  # [{sku, name, quantity, unit, unit_price}]


@router.post('/generate-pdf')
def generate_po_pdf(data: PORequest, token: str = Query(...)):
    """Genera PDF de orden de compra y lo retorna."""
    from fastapi.responses import Response
    from app.services.po_pdf import generate_po_pdf as gen_pdf
    import base64

    pdf_bytes = gen_pdf(
        supplier=data.supplier,
        items=data.items,
        order_number=data.order_number,
        notes=data.notes,
    )
    return {"pdf_base64": base64.b64encode(pdf_bytes).decode(), "filename": f"OC_{data.order_number or 'pedido'}.pdf"}
