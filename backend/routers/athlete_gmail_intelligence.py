"""Gmail Intelligence API — endpoints for AI email analysis insights."""

import asyncio
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from auth_middleware import get_current_user_dep
from db_client import db
from services.gmail_intelligence import (
    should_scan, run_intelligence_scan, SIGNAL_LABELS, URGENCY_ORDER,
)

router = APIRouter()


async def _get_athlete_tenant(current_user: dict) -> str:
    if current_user["role"] not in ("athlete", "parent"):
        raise HTTPException(403, "Only athletes/parents can access this")
    athlete = await db.athletes.find_one(
        {"user_id": current_user["id"]}, {"_id": 0, "tenant_id": 1}
    )
    if not athlete or not athlete.get("tenant_id"):
        raise HTTPException(404, "No claimed athlete profile found")
    return athlete["tenant_id"]


# ─── Trigger scan ───

@router.post("/athlete/gmail/intelligence/scan")
async def trigger_scan(current_user: dict = get_current_user_dep()):
    """Trigger an intelligence scan if cooldown has passed."""
    user_id = current_user["id"]
    tenant_id = await _get_athlete_tenant(current_user)

    can_scan = await should_scan(db, user_id)
    if not can_scan:
        state = await db.gmail_scan_state.find_one(
            {"user_id": user_id}, {"_id": 0}
        )
        return {
            "triggered": False,
            "reason": "Scan recently completed or in progress",
            "last_scan_at": state.get("last_scan_at") if state else None,
            "status": state.get("status") if state else None,
        }

    # Check Gmail connection
    from routers.athlete_gmail import get_gmail_credentials, get_gmail_service
    creds = await get_gmail_credentials(user_id)
    if not creds:
        return {"triggered": False, "reason": "Gmail not connected"}

    # Run scan in background
    asyncio.create_task(
        run_intelligence_scan(user_id, tenant_id, db, get_gmail_credentials, get_gmail_service)
    )
    return {"triggered": True, "status": "scanning"}


# ─── Get scan status ───

@router.get("/athlete/gmail/intelligence/status")
async def get_scan_status(current_user: dict = get_current_user_dep()):
    user_id = current_user["id"]
    state = await db.gmail_scan_state.find_one(
        {"user_id": user_id}, {"_id": 0}
    )
    if not state:
        return {"has_scanned": False, "status": None}
    return {
        "has_scanned": True,
        "status": state.get("status"),
        "last_scan_at": state.get("last_scan_at"),
        "threads_analyzed": state.get("threads_analyzed", 0),
        "insights_found": state.get("insights_found", 0),
    }


# ─── Get insights ───

@router.get("/athlete/gmail/intelligence/insights")
async def get_insights(
    current_user: dict = get_current_user_dep(),
    status: Optional[str] = Query(None, description="Filter: pending, confirmed, dismissed"),
    limit: int = Query(20, ge=1, le=100),
):
    user_id = current_user["id"]
    query = {"user_id": user_id}
    if status:
        query["status"] = status

    insights = await db.gmail_insights.find(query, {"_id": 0}).sort(
        "analyzed_at", -1
    ).to_list(limit)

    # Sort by urgency then date
    def sort_key(i):
        return (URGENCY_ORDER.get(i.get("urgency", "low"), 3), i.get("analyzed_at", ""))
    insights.sort(key=sort_key)

    # Add user-facing labels
    for i in insights:
        i["signal_label"] = SIGNAL_LABELS.get(i.get("signal_type", ""), "Update")

    # Count by status
    pending_count = await db.gmail_insights.count_documents({"user_id": user_id, "status": "pending"})

    return {
        "insights": insights,
        "pending_count": pending_count,
    }


# ─── Get insights for a specific program ───

@router.get("/athlete/gmail/intelligence/insights/program/{program_id}")
async def get_program_insights(
    program_id: str,
    current_user: dict = get_current_user_dep(),
):
    user_id = current_user["id"]
    insights = await db.gmail_insights.find(
        {"user_id": user_id, "program_id": program_id},
        {"_id": 0},
    ).sort("analyzed_at", -1).to_list(20)

    for i in insights:
        i["signal_label"] = SIGNAL_LABELS.get(i.get("signal_type", ""), "Update")

    return {"insights": insights}


# ─── Confirm an insight ───

@router.post("/athlete/gmail/intelligence/insights/{insight_id}/confirm")
async def confirm_insight(
    insight_id: str,
    body: dict = None,
    current_user: dict = get_current_user_dep(),
):
    """Confirm an insight. Optionally apply stage change or log interaction.
    Body can include:
      - apply_stage: bool (default False) — apply the suggested stage change
      - apply_interaction: bool (default True) — log as interaction
    """
    user_id = current_user["id"]
    tenant_id = await _get_athlete_tenant(current_user)
    body = body or {}

    insight = await db.gmail_insights.find_one(
        {"insight_id": insight_id, "user_id": user_id}, {"_id": 0}
    )
    if not insight:
        raise HTTPException(404, "Insight not found")
    if insight["status"] != "pending":
        raise HTTPException(400, f"Insight already {insight['status']}")

    now_iso = datetime.now(timezone.utc).isoformat()
    apply_stage = body.get("apply_stage", False)
    apply_interaction = body.get("apply_interaction", True)
    program_id = insight.get("program_id")

    # Apply stage change if requested and program exists
    if apply_stage and program_id and insight.get("suggested_stage"):
        await db.programs.update_one(
            {"tenant_id": tenant_id, "program_id": program_id},
            {"$set": {
                "journey_stage": insight["suggested_stage"],
                "updated_at": now_iso,
            }},
        )

    # Log as interaction on the journey timeline
    if apply_interaction and program_id:
        signal_label = SIGNAL_LABELS.get(insight.get("signal_type", ""), "Update")
        interaction_doc = {
            "interaction_id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "program_id": program_id,
            "university_name": insight.get("university_name", ""),
            "type": "ai_gmail_insight",
            "outcome": signal_label,
            "notes": f"[AI Detected] {insight.get('explanation', '')}",
            "date_time": insight.get("email_date") or now_iso,
            "created_at": now_iso,
            "coach_name": insight.get("coach_name", ""),
            "source": "gmail_intelligence",
            "insight_id": insight_id,
        }
        await db.interactions.insert_one(interaction_doc)

    # Mark confirmed
    await db.gmail_insights.update_one(
        {"insight_id": insight_id},
        {"$set": {"status": "confirmed", "confirmed_at": now_iso}},
    )

    return {"confirmed": True, "stage_applied": apply_stage and bool(program_id)}


# ─── Dismiss an insight ───

@router.post("/athlete/gmail/intelligence/insights/{insight_id}/dismiss")
async def dismiss_insight(
    insight_id: str,
    current_user: dict = get_current_user_dep(),
):
    user_id = current_user["id"]
    insight = await db.gmail_insights.find_one(
        {"insight_id": insight_id, "user_id": user_id}, {"_id": 0}
    )
    if not insight:
        raise HTTPException(404, "Insight not found")

    now_iso = datetime.now(timezone.utc).isoformat()
    await db.gmail_insights.update_one(
        {"insight_id": insight_id},
        {"$set": {"status": "dismissed", "dismissed_at": now_iso}},
    )
    return {"dismissed": True}


# ─── Get pending insight count for pipeline signal dots ───

@router.get("/athlete/gmail/intelligence/signals")
async def get_pipeline_signals(current_user: dict = get_current_user_dep()):
    """Returns a map of program_id -> highest urgency pending insight for pipeline dots."""
    user_id = current_user["id"]
    pending = await db.gmail_insights.find(
        {"user_id": user_id, "status": "pending", "program_id": {"$ne": None}},
        {"_id": 0, "program_id": 1, "urgency": 1, "signal_type": 1},
    ).to_list(200)

    signals = {}
    for p in pending:
        pid = p["program_id"]
        if pid not in signals or URGENCY_ORDER.get(p["urgency"], 3) < URGENCY_ORDER.get(signals[pid]["urgency"], 3):
            signals[pid] = {
                "urgency": p["urgency"],
                "signal_label": SIGNAL_LABELS.get(p.get("signal_type", ""), "Update"),
            }

    return {"signals": signals}
