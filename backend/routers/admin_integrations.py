"""Admin Integrations — status panel for all external integrations.

Shows connection status, usage stats, and provides controls for:
Gmail, Stripe, AI (Emergent LLM), College Scorecard, Coach Scraper.
"""

from fastapi import APIRouter, HTTPException, Request, Depends
from datetime import datetime, timezone
from db_client import db
from admin_guard import require_admin
import os
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/integrations", dependencies=[Depends(require_admin)])


@router.get("")
async def get_integrations_status():
    # ── Gmail ──
    gmail_tokens = await db.gmail_tokens.find({}, {"_id": 0, "user_id": 1}).to_list(100)
    gmail_connected_users = []
    for t in gmail_tokens:
        user = await db.users.find_one({"user_id": t["user_id"]}, {"_id": 0, "email": 1, "name": 1, "user_id": 1})
        if user:
            gmail_connected_users.append(user)

    gmail_client_id = os.environ.get("GMAIL_CLIENT_ID", "")
    gmail_db_config = await db.app_config.find_one({"key": "gmail_oauth"}, {"_id": 0})
    gmail_db_client_id = (gmail_db_config or {}).get("client_id", "")
    gmail_configured = bool(gmail_client_id) or bool(gmail_db_client_id)

    # ── Stripe ──
    stripe_key = os.environ.get("STRIPE_API_KEY", "")
    stripe_connected = bool(stripe_key)
    stripe_key_masked = f"sk_...{stripe_key[-6:]}" if len(stripe_key) > 10 else ("Set" if stripe_key else "Not set")
    stripe_is_live = stripe_key.startswith("sk_live_") if stripe_key else False

    total_txns = await db.payment_transactions.count_documents({})
    paid_txns = await db.payment_transactions.count_documents({"payment_status": "paid"})
    revenue_pipeline = await db.payment_transactions.find({"payment_status": "paid"}, {"_id": 0, "amount": 1}).to_list(1000)
    total_revenue = sum(t.get("amount", 0) for t in revenue_pipeline)

    # ── AI (Emergent LLM) ──
    ai_key = os.environ.get("EMERGENT_LLM_KEY", "")
    ai_connected = bool(ai_key)
    ai_key_masked = f"sk-...{ai_key[-6:]}" if len(ai_key) > 10 else ("Set" if ai_key else "Not set")

    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    ai_usage_month = await db.ai_usage.count_documents({"created_at": {"$gte": month_start}})
    ai_usage_total = await db.ai_usage.count_documents({})

    # ── College Scorecard ──
    scorecard_key = os.environ.get("COLLEGE_SCORECARD_API_KEY", "")
    scorecard_connected = bool(scorecard_key)
    scorecard_key_masked = f"...{scorecard_key[-8:]}" if len(scorecard_key) > 10 else ("Set" if scorecard_key else "Not set")
    synced_count = await db.university_knowledge_base.count_documents({"scorecard": {"$exists": True}})
    total_universities = await db.university_knowledge_base.count_documents({})

    # ── Coach Scraper ──
    has_coach = await db.university_knowledge_base.count_documents({"coach_email": {"$ne": ""}})
    missing_coach = await db.university_knowledge_base.count_documents(
        {"$or": [{"coach_email": ""}, {"coach_email": {"$exists": False}}]}
    )

    # ── URL Discovery ──
    has_website = await db.university_knowledge_base.count_documents({"website": {"$ne": ""}})
    missing_website = await db.university_knowledge_base.count_documents(
        {"$or": [{"website": ""}, {"website": {"$exists": False}}]}
    )

    return {
        "gmail": {
            "connected": len(gmail_connected_users) > 0,
            "configured": gmail_configured,
            "config_source": "database" if gmail_db_client_id else ("env" if gmail_client_id else "none"),
            "connected_users": gmail_connected_users,
            "total_connected": len(gmail_connected_users),
        },
        "stripe": {
            "connected": stripe_connected,
            "key_masked": stripe_key_masked,
            "is_live": stripe_is_live,
            "mode": "Live" if stripe_is_live else "Test" if stripe_connected else "Not configured",
            "stats": {
                "total_transactions": total_txns,
                "paid_transactions": paid_txns,
                "total_revenue": total_revenue,
            },
        },
        "ai": {
            "connected": ai_connected,
            "key_masked": ai_key_masked,
            "provider": "Emergent LLM (Claude / GPT)",
            "stats": {
                "usage_this_month": ai_usage_month,
                "usage_total": ai_usage_total,
            },
        },
        "scorecard": {
            "connected": scorecard_connected,
            "key_masked": scorecard_key_masked,
            "stats": {
                "synced_schools": synced_count,
                "total_universities": total_universities,
            },
        },
        "coach_scraper": {
            "stats": {
                "has_coach_email": has_coach,
                "missing_coach_email": missing_coach,
                "total": total_universities,
            },
        },
        "url_discovery": {
            "stats": {
                "has_website": has_website,
                "missing_website": missing_website,
                "total": total_universities,
            },
        },
    }


@router.delete("/gmail/{user_id}")
async def disconnect_gmail(user_id: str):
    result = await db.gmail_tokens.delete_one({"user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Gmail connection not found for this user")
    return {"ok": True}
