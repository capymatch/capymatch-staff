"""Subscription tiers and enforcement logic.

Mirrors the capymatch repo's subscription system exactly.
Free tier: up to 5 schools. Pro: 25. Premium: unlimited.
"""

import logging
from db_client import db

logger = logging.getLogger(__name__)

SUBSCRIPTION_TIERS = {
    "basic": {
        "label": "Starter",
        "price": 0,
        "description": "Get started with the essentials. Track schools, log outreach, and start building your recruiting pipeline.",
        "max_schools": 5,
        "max_members": 1,
        "ai_drafts_per_month": 3,
        "gmail_integration": False,
        "analytics": False,
        "recruiting_insights": False,
        "public_profile": False,
        "follow_up_reminders": True,
        "auto_reply_detection": False,
        "weekly_digest": False,
        "features": [
            "Track up to 5 schools",
            "3 AI-drafted emails/month",
            "Basic school profiles",
            "Manual email logging",
            "Follow-up reminders",
        ],
    },
    "pro": {
        "label": "Pro",
        "price": 12,
        "description": "Everything in Starter, plus Gmail sync, analytics, and smart recommendations.",
        "max_schools": 25,
        "max_members": 3,
        "ai_drafts_per_month": 50,
        "gmail_integration": True,
        "analytics": True,
        "recruiting_insights": True,
        "public_profile": True,
        "follow_up_reminders": True,
        "auto_reply_detection": True,
        "weekly_digest": True,
        "features": [
            "Track up to 25 schools",
            "50 AI-drafted emails/month",
            "Gmail integration",
            "Coach reply detection",
            "Outreach analytics",
            "Recruiting insights & recommendations",
            "Public recruiting profile",
            "Weekly progress digest",
            "Up to 3 family members",
        ],
    },
    "premium": {
        "label": "Premium",
        "price": 29,
        "description": "The ultimate recruiting toolkit. Unlimited everything plus priority support.",
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
        "features": [
            "Unlimited schools",
            "Unlimited AI-drafted emails",
            "Everything in Pro",
            "Unlimited family members",
            "Priority support",
            "Advanced analytics",
        ],
    },
}

TIER_ORDER = ["basic", "pro", "premium"]


async def get_user_subscription(tenant_id: str) -> dict:
    """Get the subscription for a tenant. Returns tier data merged with DB overrides."""
    sub_doc = await db.subscriptions.find_one({"tenant_id": tenant_id}, {"_id": 0})
    tier_key = (sub_doc or {}).get("tier", "basic")
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
