"""Club Plans API — plan info, org subscription, feature gating, and upgrade triggers."""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from db_client import db
from auth_middleware import get_current_user_dep
from club_plans import (
    CLUB_PLANS,
    PLAN_ORDER,
    ClubPlan,
    get_plan_entitlements,
    get_plan_limits,
    get_plan_info,
    check_club_feature,
)

router = APIRouter()
log = logging.getLogger(__name__)


class SetPlanRequest(BaseModel):
    plan_id: str


# ── Helpers ──

async def get_org_plan(org_id: str) -> dict:
    """Get the current club plan for an org. Default to 'starter'."""
    sub = await db.club_subscriptions.find_one({"org_id": org_id}, {"_id": 0})
    if not sub:
        return {
            "org_id": org_id,
            "plan_id": "starter",
            "status": "active",
            "billing_cycle": "monthly",
            "started_at": None,
            "current_period_end": None,
        }
    return sub


async def get_user_club_plan(user: dict) -> str:
    """Resolve the club plan_id for a user."""
    org_id = user.get("org_id")
    if not org_id:
        return "starter"
    sub = await get_org_plan(org_id)
    return sub.get("plan_id", "starter")


# ── 1. List all plans ──

@router.get("/club-plans")
async def list_plans():
    """Return all club plans with pricing, entitlements, and limits."""
    plans = []
    for plan_enum in PLAN_ORDER:
        info = CLUB_PLANS[plan_enum]
        ent = get_plan_entitlements(plan_enum.value)
        limits = get_plan_limits(plan_enum.value)
        plans.append({
            **info,
            "entitlements": ent,
            "limits": limits,
        })
    return {"plans": plans}


# ── 2. Get current org subscription ──

@router.get("/club-plans/current")
async def get_current_plan(current_user: dict = get_current_user_dep()):
    """Get the current org's club plan + entitlements + usage."""
    plan_id = await get_user_club_plan(current_user)
    plan = get_plan_info(plan_id)
    org_id = current_user.get("org_id", "")
    sub = await get_org_plan(org_id)

    athlete_count = await db.athletes.count_documents({"tenant_id": org_id}) if org_id else 0
    coach_count = await db.users.count_documents({"role": "club_coach", "org_id": org_id}) if org_id else 0

    limits = get_plan_limits(plan_id)
    entitlements = get_plan_entitlements(plan_id)

    max_a = limits["max_athletes"]
    max_c = limits["max_coaches"]

    return {
        "plan": plan,
        "subscription": sub,
        "usage": {
            "athletes": athlete_count,
            "coaches": coach_count,
            "max_athletes": max_a,
            "max_coaches": max_c,
            "athletes_pct": round(athlete_count / max_a * 100) if max_a > 0 else 0,
            "coaches_pct": round(coach_count / max_c * 100) if max_c > 0 else 0,
        },
        "entitlements": entitlements,
    }


# ── 3. Check feature access ──

@router.get("/club-plans/check/{feature_id}")
async def check_feature(feature_id: str, current_user: dict = get_current_user_dep()):
    """Check if the current org's plan grants access to a specific feature."""
    plan_id = await get_user_club_plan(current_user)
    result = check_club_feature(plan_id, feature_id)
    result["current_plan"] = plan_id
    return result


# ── 4. Set plan (director-only) ──

@router.post("/club-plans/set")
async def set_plan(data: SetPlanRequest, current_user: dict = get_current_user_dep()):
    """Set the club plan for the current org. Director or admin only."""
    if current_user["role"] not in ("director", "platform_admin"):
        raise HTTPException(403, "Only directors can change the club plan")

    valid_ids = [p.value for p in ClubPlan]
    if data.plan_id not in valid_ids:
        raise HTTPException(400, f"Invalid plan: {data.plan_id}")

    org_id = current_user.get("org_id", "")
    if not org_id:
        raise HTTPException(400, "No organization found for this user")

    now = datetime.now(timezone.utc).isoformat()
    await db.club_subscriptions.update_one(
        {"org_id": org_id},
        {"$set": {
            "org_id": org_id,
            "plan_id": data.plan_id,
            "status": "active",
            "billing_cycle": "monthly",
            "updated_at": now,
            "updated_by": current_user["id"],
        },
        "$setOnInsert": {"started_at": now}},
        upsert=True,
    )

    info = get_plan_info(data.plan_id)
    log.info("Club plan updated: org=%s plan=%s by=%s", org_id, data.plan_id, current_user["id"])

    return {
        "plan_id": data.plan_id,
        "label": info["label"],
        "message": f"Plan updated to {info['label']}",
    }


# ── 5. Bulk entitlements for frontend hydration ──

@router.get("/club-plans/entitlements")
async def get_entitlements(current_user: dict = get_current_user_dep()):
    """Return all entitlements for the current org's plan.
    Used by frontend to hydrate the PlanContext."""
    plan_id = await get_user_club_plan(current_user)
    info = get_plan_info(plan_id)
    limits = get_plan_limits(plan_id)
    entitlements = get_plan_entitlements(plan_id)

    return {
        "plan_id": plan_id,
        "plan_label": info.get("label", "Starter"),
        "limits": limits,
        "entitlements": entitlements,
    }
