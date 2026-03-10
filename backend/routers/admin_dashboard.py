"""Admin Dashboard — platform-level stats for directors."""

from fastapi import APIRouter, Depends
from datetime import datetime, timezone, timedelta
from db_client import db
from admin_guard import require_admin
from subscriptions import SUBSCRIPTION_TIERS

router = APIRouter(prefix="/admin/dashboard", dependencies=[Depends(require_admin)])


@router.get("/stats")
async def get_admin_stats():
    total_athletes = await db.athletes.count_documents({})
    total_users = await db.users.count_documents({})
    total_schools_kb = await db.university_knowledge_base.count_documents({})
    total_programs = await db.programs.count_documents({})
    total_interactions = await db.interactions.count_documents({})
    total_events = await db.events.count_documents({})

    # Subscription breakdown
    plan_counts = {"basic": 0, "pro": 0, "premium": 0}
    subs = await db.subscriptions.find({}, {"_id": 0, "tier": 1}).to_list(5000)
    for s in subs:
        tier = s.get("tier", "basic")
        if tier in plan_counts:
            plan_counts[tier] += 1
    # Users without subscription doc default to basic
    plan_counts["basic"] += max(0, total_athletes - sum(plan_counts.values()))

    # Active this week
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    active_tenants = await db.interactions.distinct("tenant_id", {"created_at": {"$gte": week_ago}})

    # KB health
    has_coach_email = await db.university_knowledge_base.count_documents({"coach_email": {"$ne": ""}})
    has_scorecard = await db.university_knowledge_base.count_documents({"scorecard": {"$exists": True}})
    has_logo = await db.university_knowledge_base.count_documents({"logo_url": {"$exists": True, "$nin": [None, ""]}})

    # MRR
    pro_price = SUBSCRIPTION_TIERS.get("pro", {}).get("price", 29)
    premium_price = SUBSCRIPTION_TIERS.get("premium", {}).get("price", 49)
    mrr = plan_counts["pro"] * pro_price + plan_counts["premium"] * premium_price

    return {
        "users": {
            "total_athletes": total_athletes,
            "total_users": total_users,
            "active_this_week": len(active_tenants),
        },
        "subscriptions": {
            "plan_counts": plan_counts,
            "mrr": mrr,
        },
        "activity": {
            "total_programs_on_boards": total_programs,
            "total_interactions": total_interactions,
            "total_events": total_events,
        },
        "knowledge_base": {
            "total_schools": total_schools_kb,
            "has_coach_email": has_coach_email,
            "has_scorecard": has_scorecard,
            "has_logo": has_logo,
        },
    }
