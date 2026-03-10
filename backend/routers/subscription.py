"""Subscription API router.

Endpoints:
  GET /api/subscription       — Current user's subscription + usage
  GET /api/subscription/tiers — All available tiers for comparison
"""

from fastapi import APIRouter, HTTPException
from auth_middleware import get_current_user_dep
from db_client import db
from models import SubscriptionResponse
from subscriptions import (
    SUBSCRIPTION_TIERS,
    TIER_ORDER,
    get_user_subscription,
    get_ai_usage_this_month,
)

router = APIRouter()


@router.get("/subscription", response_model=SubscriptionResponse)
async def get_my_subscription(current_user: dict = get_current_user_dep()):
    """Get the current user's subscription details and usage stats."""
    user_id = current_user["id"]

    athlete = await db.athletes.find_one(
        {"user_id": user_id}, {"_id": 0, "tenant_id": 1}
    )
    if not athlete or not athlete.get("tenant_id"):
        # Return default basic subscription for users without athlete profile
        tier = {**SUBSCRIPTION_TIERS["basic"], "tier": "basic"}
        return {
            "tier": "basic",
            "label": tier["label"],
            "price": tier.get("price", 0),
            "features": tier.get("features", []),
            "limits": {
                "max_schools": tier["max_schools"],
                "ai_drafts_per_month": tier["ai_drafts_per_month"],
                "gmail_integration": tier.get("gmail_integration", False),
                "analytics": tier.get("analytics", False),
                "recruiting_insights": tier.get("recruiting_insights", False),
                "public_profile": tier.get("public_profile", False),
                "follow_up_reminders": tier.get("follow_up_reminders", False),
                "auto_reply_detection": tier.get("auto_reply_detection", False),
                "weekly_digest": tier.get("weekly_digest", False),
            },
            "usage": {
                "schools": 0,
                "schools_limit": tier["max_schools"],
                "schools_remaining": tier["max_schools"],
                "ai_drafts_used": 0,
                "ai_drafts_limit": tier["ai_drafts_per_month"],
                "ai_drafts_remaining": tier["ai_drafts_per_month"],
            },
        }

    tenant_id = athlete["tenant_id"]
    subscription = await get_user_subscription(tenant_id)
    tier = subscription["tier"]

    school_count = await db.programs.count_documents({"tenant_id": tenant_id})
    ai_used = await get_ai_usage_this_month(tenant_id)

    max_schools = subscription.get("max_schools", 5)
    ai_limit = subscription.get("ai_drafts_per_month", 0)

    return {
        "tier": tier,
        "label": subscription["label"],
        "price": subscription.get("price", 0),
        "features": subscription.get("features", []),
        "limits": {
            "max_schools": max_schools,
            "ai_drafts_per_month": ai_limit,
            "gmail_integration": subscription.get("gmail_integration", False),
            "analytics": subscription.get("analytics", False),
            "recruiting_insights": subscription.get("recruiting_insights", False),
            "public_profile": subscription.get("public_profile", False),
            "follow_up_reminders": subscription.get("follow_up_reminders", False),
            "auto_reply_detection": subscription.get("auto_reply_detection", False),
            "weekly_digest": subscription.get("weekly_digest", False),
        },
        "usage": {
            "schools": school_count,
            "schools_limit": max_schools,
            "schools_remaining": (max_schools - school_count) if max_schools != -1 else -1,
            "ai_drafts_used": ai_used,
            "ai_drafts_limit": ai_limit,
            "ai_drafts_remaining": (ai_limit - ai_used) if ai_limit != -1 else -1,
        },
    }


@router.get("/subscription/tiers")
async def get_all_tiers():
    """Get all available subscription tiers for comparison."""
    tiers = []
    for key in TIER_ORDER:
        tier_data = SUBSCRIPTION_TIERS[key]
        tiers.append({
            "id": key,
            "label": tier_data["label"],
            "price": tier_data.get("price", 0),
            "features": tier_data.get("features", []),
            "description": tier_data.get("description", ""),
            "max_schools": tier_data["max_schools"],
            "max_members": tier_data.get("max_members", 1),
            "ai_drafts_per_month": tier_data["ai_drafts_per_month"],
            "gmail_integration": tier_data["gmail_integration"],
            "analytics": tier_data["analytics"],
            "recruiting_insights": tier_data["recruiting_insights"],
            "public_profile": tier_data["public_profile"],
        })
    return {"tiers": tiers}
