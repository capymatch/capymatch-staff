"""Subscription tiers and enforcement logic.

Matches the capymatch repo's subscription system exactly.
Free tier: up to 5 schools. Pro: 25. Premium: unlimited.
"""

import logging
from db_client import db

logger = logging.getLogger(__name__)

SUBSCRIPTION_TIERS = {
    "basic": {
        "label": "Starter",
        "price": 0,
        "description": "Perfect for getting started",
        "max_schools": 5,
        "max_members": 1,
        "ai_drafts_per_month": 0,
        "gmail_integration": True,
        "analytics": True,
        "recruiting_insights": False,
        "public_profile": True,
        "follow_up_reminders": True,
        "auto_reply_detection": False,
        "weekly_digest": False,
        "match_scores_limit": -1,
        "features": [
            "Track up to 5 schools",
            "Basic pipeline board",
            "Athlete profile page",
            "School discovery search",
            "Email support",
        ],
    },
    "pro": {
        "label": "Pro",
        "price": 29,
        "description": "For serious recruiting families",
        "max_schools": 25,
        "max_members": 2,
        "ai_drafts_per_month": 10,
        "gmail_integration": True,
        "analytics": True,
        "recruiting_insights": False,
        "public_profile": True,
        "follow_up_reminders": True,
        "auto_reply_detection": False,
        "weekly_digest": False,
        "match_scores_limit": -1,
        "features": [
            "Track up to 25 schools",
            "Gmail sync & timeline",
            "Automated follow-up reminders",
            "AI-powered next steps",
            "10 AI email drafts/month",
            "Today's action dashboard",
            "Priority email support",
        ],
    },
    "premium": {
        "label": "Premium",
        "price": 49,
        "description": "Complete recruiting solution",
        "max_schools": -1,
        "max_members": -1,
        "ai_drafts_per_month": -1,
        "gmail_integration": True,
        "analytics": True,
        "recruiting_insights": True,
        "public_profile": True,
        "follow_up_reminders": True,
        "auto_reply_detection": True,
        "weekly_digest": True,
        "match_scores_limit": -1,
        "features": [
            "Unlimited schools",
            "AI email draft generator",
            "Highlight video advisor",
            "Coach activity watch",
            "Advanced analytics",
            "Priority phone support",
            "Recruiting strategy calls",
        ],
    },
}

TIER_ORDER = ["basic", "pro", "premium"]


async def get_user_subscription(tenant_id: str) -> dict:
    """Get the subscription for a tenant. Returns tier data merged with DB overrides."""
    sub_doc = await db.subscriptions.find_one({"tenant_id": tenant_id}, {"_id": 0})
    tier_key = (sub_doc or {}).get("tier", "basic")
    if tier_key == "free":
        tier_key = "basic"
    if tier_key not in SUBSCRIPTION_TIERS:
        tier_key = "basic"
    tier = {**SUBSCRIPTION_TIERS[tier_key], "tier": tier_key}
    return tier


async def get_ai_usage_this_month(tenant_id: str) -> int:
    """Count AI drafts used this month for the given tenant."""
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    count = await db.ai_usage.count_documents({
        "tenant_id": tenant_id,
        "created_at": {"$gte": start_of_month},
    })
    return count


async def enforce_school_limit(tenant_id: str) -> dict:
    """Check if the tenant can add another school.
    Returns {"allowed": True/False, "current": N, "limit": M, "upgrade_to": tier_key}.
    """
    subscription = await get_user_subscription(tenant_id)
    max_schools = subscription["max_schools"]

    if max_schools == -1:
        return {"allowed": True, "current": 0, "limit": -1, "upgrade_to": None}

    school_count = await db.programs.count_documents({"tenant_id": tenant_id})

    if school_count >= max_schools:
        tier_key = subscription["tier"]
        idx = TIER_ORDER.index(tier_key) if tier_key in TIER_ORDER else 0
        upgrade_to = TIER_ORDER[idx + 1] if idx + 1 < len(TIER_ORDER) else None
        return {
            "allowed": False,
            "current": school_count,
            "limit": max_schools,
            "upgrade_to": upgrade_to,
        }

    return {"allowed": True, "current": school_count, "limit": max_schools, "upgrade_to": None}


async def enforce_ai_limit(tenant_id: str) -> dict:
    """Check if the tenant can use AI drafts.
    Returns {"allowed": True/False, "current": N, "limit": M, "upgrade_to": tier_key}.
    """
    subscription = await get_user_subscription(tenant_id)
    limit = subscription.get("ai_drafts_per_month", 0)

    if limit == 0:
        return {
            "allowed": False,
            "current": 0,
            "limit": 0,
            "upgrade_to": "pro",
            "message": "AI email drafts help you write personalized coach emails in seconds. Upgrade to Pro to unlock 10 drafts/month.",
        }
    if limit == -1:
        return {"allowed": True, "current": 0, "limit": -1, "upgrade_to": None}

    used = await get_ai_usage_this_month(tenant_id)
    if used >= limit:
        return {
            "allowed": False,
            "current": used,
            "limit": limit,
            "upgrade_to": "premium",
            "message": f"You've used all {limit} AI drafts this month. Upgrade to Premium for unlimited drafts.",
        }

    return {"allowed": True, "current": used, "limit": limit, "upgrade_to": None}


def check_feature_access(subscription: dict, feature: str) -> bool:
    """Check if a feature is available in the current subscription."""
    return subscription.get(feature, False)
