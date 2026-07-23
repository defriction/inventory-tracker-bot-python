from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel
from typing import Optional
from app.services.tenant_service import TenantService
from app.services.usage_tracker import UsageTracker

router = APIRouter(prefix='/api/usage', tags=['Analytics de Uso'])


class TrackEvent(BaseModel):
    event: str
    category: str = "general"
    tab: str = ""
    metadata: Optional[dict] = None


def get_tracker(token: str = Query(...)):
    tenant_service = TenantService()
    cell = tenant_service.admin_sheet.find(token)
    if not cell:
        raise HTTPException(status_code=401, detail="Token invalido")
    row = tenant_service.admin_sheet.row_values(cell.row)
    return UsageTracker(tenant_id=row[1])


@router.post('/track')
def track_event(data: TrackEvent, tracker: UsageTracker = Depends(get_tracker)):
    tracker.track(data.event, data.category, data.tab, data.metadata)
    return {"status": "ok"}


@router.get('/stats')
def get_stats(days: int = Query(30, ge=1, le=90), tracker: UsageTracker = Depends(get_tracker)):
    return tracker.stats(days=days)
