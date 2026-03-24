"""Club Plans API — plan info, org subscription, feature gating, and upgrade triggers."""

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from db_client import db
from auth_middleware import get_current_user_dep
from club_plans import (
    CLUB_PLANS,
    FEATURE_ENTITLEMENTS,
    check_club_feature,
    get_plan_entitlements,
    get_plan_limits,
)

router = APIRouter()
log = logging.getLogger(__name__)


# ── Models ──

class SetPlanRequest(BaseModel):
    plan_id: str


# ── Helpers ──

async def get_org_plan(org_id: str) -> dict:
    """Get the current club plan for an org. Default to 'starter'."""
    sub = await db.club_subscriptions.find_one(
        {"org_id": org_id}, {"_id": 0}
    )
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
    """Return all club plans with pricing and features."""
    plans = []
    for plan_id, plan in CLUB_PLANS.items():
        features = []
        for feat_id, feat_plans in FEATURE_ENTITLEMENTS.items():
            access = feat_plans.get(plan_id, False)
            if access and access is not False:
                features.append(feat_id)
        plans.append({
            **plan,
            "features": features,
            "entitlements": get_plan_entitlements(plan_id),
            "limits": get_plan_limits(plan_id),
        })
    return {"plans": plans}


# ── 2. Get current org subscription ──

@router.get("/club-plans/current")
async def get_current_plan(current_user: dict = get_current_user_dep()):
    """Get the current org's club plan + entitlements."""
    plan_id = await get_user_club_plan(current_user)
    plan = CLUB_PLANS.get(plan_id, CLUB_PLANS["starter"])

    org_id = current_user.get("org_id", "")
    sub = await get_org_plan(org_id)

    # Get current usage counts
    athlete_count = await db.athletes.count_documents({"tenant_id": org_id}) if org_id else 0
    coach_count = await db.users.count_documents({"role": "club_coach", "org_id": org_id}) if org_id else 0

    limits = get_plan_limits(plan_id)
    entitlements = get_plan_entitlements(plan_id)

    return {
        "plan": plan,
        "subscription": sub,
        "usage": {
            "athletes": athlete_count,
            "coaches": coach_count,
            "max_athletes": limits["max_athletes"],
            "max_coaches": limits["max_coaches"],
            "athletes_pct": round(athlete_count / limits["max_athletes"] * 100) if limits["max_athletes"] > 0 else 0,
            "coaches_pct": round(coach_count / limits["max_coaches"] * 100) if limits["max_coaches"] > 0 else 0,
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


# ── 4. Set plan (admin/director-only, for demo/testing) ──

@router.post("/club-plans/set")
async def set_plan(data: SetPlanRequest, current_user: dict = get_current_user_dep()):
    """Set the club plan for the current org. Director or admin only."""
    if current_user["role"] not in ("director", "platform_admin"):
        raise HTTPException(403, "Only directors can change the club plan")

    if data.plan_id not in CLUB_PLANS:
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

    log.info("Club plan updated: org=%s plan=%s by=%s", org_id, data.plan_id, current_user["id"])

    return {
        "plan_id": data.plan_id,
        "label": CLUB_PLANS[data.plan_id]["label"],
        "message": f"Plan updated to {CLUB_PLANS[data.plan_id]['label']}",
    }


# ── 5. Bulk entitlements for frontend hydration ──

@router.get("/club-plans/entitlements")
async def get_entitlements(current_user: dict = get_current_user_dep()):
    """Return all feature entitlements for the current org's plan.
    Used by frontend to hydrate the PlanGate context."""
    plan_id = await get_user_club_plan(current_user)
    limits = get_plan_limits(plan_id)
    entitlements = get_plan_entitlements(plan_id)

    return {
        "plan_id": plan_id,
        "plan_label": CLUB_PLANS.get(plan_id, {}).get("label", "Starter"),
        "limits": limits,
        "entitlements": entitlements,
    }
