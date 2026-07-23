from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel
from typing import Optional
from app.services.tenant_service import TenantService
from app.services.usage_tracker import UsageTracker
from app.core.cache import get_cache, set_cache

router = APIRouter(prefix='/api/usage', tags=['Analytics de Uso'])


class TrackEvent(BaseModel):
    event: str
    category: str = "general"
    tab: str = ""
    metadata: Optional[dict] = None


def get_tracker(token: str = Query(...)):
    cache_key = f"tenant_lookup:{token}"

    # Cache hit — skip Google Sheets entirely
    cached = get_cache(cache_key, ttl=300)
    if cached and cached.get("tenant_id"):
        return UsageTracker(tenant_id=cached["tenant_id"])

    try:
        tenant_service = TenantService()
        cell = tenant_service.admin_sheet.find(token)
        if not cell:
            raise HTTPException(status_code=401, detail="Token invalido")
        row = tenant_service.admin_sheet.row_values(cell.row)
        tenant_id = row[1]

        # Cache for 5 minutes
        set_cache(cache_key, {"tenant_id": tenant_id}, ttl=300)

        return UsageTracker(tenant_id=tenant_id)
    except HTTPException:
        raise
    except Exception as e:
        logger = __import__('logging').getLogger(__name__)
        logger.error(f"Error buscando token en Google Sheets: {e}")
        raise HTTPException(status_code=503, detail="Servicio temporalmente no disponible")


@router.post('/track')
def track_event(data: TrackEvent, tracker: UsageTracker = Depends(get_tracker)):
    tracker.track(data.event, data.category, data.tab, data.metadata)
    return {"status": "ok"}


@router.get('/stats')
def get_stats(days: int = Query(30, ge=1, le=90), tracker: UsageTracker = Depends(get_tracker)):
    return tracker.stats(days=days)


@router.get('/admin-stats')
def get_admin_stats(days: int = Query(30, ge=1, le=90)):
    """Admin: agrega stats de todos los tenants."""
    import os, glob
    all_stats = {"total_events": 0, "by_event": {}, "by_tab": {}, "daily": {}, "tenants": 0}
    for db_file in glob.glob(os.path.join("/app/data", "usage_*.db")):
        try:
            tid = db_file.split("usage_")[1].replace(".db", "")
            tracker = UsageTracker(tenant_id=tid)
            s = tracker.stats(days=days)
            all_stats["total_events"] += s["total_events"]
            all_stats["tenants"] += 1
            for k, v in s.get("by_event", {}).items():
                all_stats["by_event"][k] = all_stats["by_event"].get(k, 0) + v
            for k, v in s.get("by_tab", {}).items():
                all_stats["by_tab"][k] = all_stats["by_tab"].get(k, 0) + v
            for d in s.get("daily", []):
                date = d["date"]
                all_stats["daily"][date] = all_stats["daily"].get(date, 0) + d["count"]
        except: pass

    all_stats["daily"] = [{"date": k, "count": v} for k, v in sorted(all_stats["daily"].items())]
    all_stats["recent"] = []  # Admin view doesn't show per-tenant recent events
    return all_stats
