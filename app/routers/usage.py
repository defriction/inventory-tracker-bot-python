from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel
from typing import Optional
from app.services.usage_tracker import UsageTracker
from app.core.auth import get_current_tenant

router = APIRouter(prefix='/api/usage', tags=['Analytics de Uso'])


class TrackEvent(BaseModel):
    event: str
    category: str = "general"
    tab: str = ""
    metadata: Optional[dict] = None


def get_tracker(tenant: dict = Depends(get_current_tenant)):
    return UsageTracker(tenant_id=tenant['tenant_id'])


@router.post('/track')
def track(track: TrackEvent, tracker: UsageTracker = Depends(get_tracker)):
    tracker.track(track.event, track.category, track.tab, track.metadata)
    return {"status": "ok"}


@router.get('/stats')
def get_stats(
    token: str = Query(...),
    days: int = Query(30, ge=1, le=90),
    tracker: UsageTracker = Depends(get_tracker)
):
    """Stats for a single tenant."""
    return tracker.stats(days=days)


@router.get('/admin-stats')
def get_admin_stats(days: int = Query(30, ge=1, le=90)):
    """Admin: agrega stats de todos los tenants con desglose por PyME."""
    import os, glob
    from app.services.tenant_service import TenantService

    all_stats = {
        "total_events": 0,
        "by_event": {},
        "by_tab": {},
        "daily": {},
        "tenants": 0,
        "per_tenant": [],
    }

    try:
        ts = TenantService()
        tenants = ts.list_all()
        tenant_names = {t.get("id"): t.get("pyme_name", t.get("id", "")) for t in tenants}
    except Exception:
        tenant_names = {}

    for db_file in glob.glob(os.path.join("/app/data", "usage_*.db")):
        try:
            tid = db_file.split("usage_")[1].replace(".db", "")
            tracker = UsageTracker(tenant_id=tid)
            s = tracker.stats(days=days)
            fs = tracker.feature_summary(days=days)

            all_stats["total_events"] += s["total_events"]
            all_stats["tenants"] += 1

            for k, v in s.get("by_event", {}).items():
                all_stats["by_event"][k] = all_stats["by_event"].get(k, 0) + v
            for k, v in s.get("by_tab", {}).items():
                all_stats["by_tab"][k] = all_stats["by_tab"].get(k, 0) + v
            for d in s.get("daily", []):
                date = d["date"]
                all_stats["daily"][date] = all_stats["daily"].get(date, 0) + d["count"]

            all_stats["per_tenant"].append({
                "tenant_id": tid,
                "name": tenant_names.get(tid, tid),
                "total_events": fs["total"],
                "features": fs["by_event"],
                "last_active": fs["last_active"],
            })
        except Exception:
            pass

    all_stats["daily"] = [{"date": k, "count": v} for k, v in sorted(all_stats["daily"].items())]
    all_stats["per_tenant"].sort(key=lambda x: x["total_events"], reverse=True)
    return all_stats
