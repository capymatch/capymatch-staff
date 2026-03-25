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

    # ── Resend ──
    resend_config = await db.app_config.find_one({"key": "resend"}, {"_id": 0})
    resend_api_key = (resend_config or {}).get("api_key", "")
    resend_sender = (resend_config or {}).get("sender_email", "onboarding@resend.dev")
    resend_connected = bool(resend_api_key)
    resend_key_masked = f"re_...{resend_api_key[-6:]}" if len(resend_api_key) > 10 else ("Set" if resend_api_key else "Not set")
    resend_emails_sent = await db.email_log.count_documents({"provider": "resend"})

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
        "resend": {
            "connected": resend_connected,
            "key_masked": resend_key_masked,
            "sender_email": resend_sender,
            "stats": {
                "emails_sent": resend_emails_sent,
            },
        },
    }


@router.delete("/gmail/{user_id}")
async def disconnect_gmail(user_id: str):
    result = await db.gmail_tokens.delete_one({"user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Gmail connection not found for this user")
    return {"ok": True}


# ── Gmail OAuth Config (Admin) ──

from pydantic import BaseModel
import asyncio


class GmailOAuthConfigPayload(BaseModel):
    client_id: str
    client_secret: str
    redirect_uri: str = ""


@router.put("/gmail/oauth-config")
async def save_gmail_oauth_config(payload: GmailOAuthConfigPayload):
    """Save Gmail OAuth Client ID, Secret, and Redirect URI in app_config."""
    if not payload.client_id.strip() or not payload.client_secret.strip():
        raise HTTPException(400, "client_id and client_secret are required")
    await db.app_config.update_one(
        {"key": "gmail_oauth"},
        {"$set": {
            "key": "gmail_oauth",
            "client_id": payload.client_id.strip(),
            "client_secret": payload.client_secret.strip(),
            "redirect_uri": payload.redirect_uri.strip() or os.environ.get("GMAIL_REDIRECT_URI", ""),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )
    # Clear the cached config in the gmail router
    try:
        from routers.athlete_gmail import _cached_gmail_creds
        _cached_gmail_creds["data"] = None
        _cached_gmail_creds["fetched_at"] = 0
    except Exception:
        pass
    return {"ok": True, "client_id_prefix": payload.client_id[:20] + "..."}


@router.get("/gmail/oauth-config")
async def get_gmail_oauth_config():
    """Get current Gmail OAuth config (masked secrets)."""
    doc = await db.app_config.find_one({"key": "gmail_oauth"}, {"_id": 0})
    if not doc:
        return {"configured": False}
    return {
        "configured": True,
        "client_id_prefix": doc.get("client_id", "")[:20] + "..." if doc.get("client_id") else "",
        "redirect_uri": doc.get("redirect_uri", ""),
        "updated_at": doc.get("updated_at", ""),
    }


# ── Resend Config ──


class ResendConfigPayload(BaseModel):
    api_key: str
    sender_email: str = "onboarding@resend.dev"


class ResendTestPayload(BaseModel):
    to_email: str
    subject: str = "CapyMatch Test Email"
    body: str = "This is a test email from CapyMatch via Resend."


@router.put("/resend/config")
async def save_resend_config(payload: ResendConfigPayload):
    """Save Resend API key and sender email in app_config."""
    await db.app_config.update_one(
        {"key": "resend"},
        {"$set": {
            "key": "resend",
            "api_key": payload.api_key,
            "sender_email": payload.sender_email,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )
    return {"ok": True, "message": "Resend configuration saved"}


@router.post("/resend/test")
async def test_resend(payload: ResendTestPayload):
    """Send a test email via Resend to verify the API key works."""
    import resend

    config = await db.app_config.find_one({"key": "resend"}, {"_id": 0})
    if not config or not config.get("api_key"):
        raise HTTPException(400, "Resend API key not configured")

    resend.api_key = config["api_key"]
    sender = config.get("sender_email", "onboarding@resend.dev")

    try:
        params = {
            "from": sender,
            "to": [payload.to_email],
            "subject": payload.subject,
            "html": f"<div style='font-family:sans-serif;padding:20px;'><h2 style='color:#ff6a3d;'>CapyMatch</h2><p>{payload.body}</p><hr style='border:none;border-top:1px solid #eee;margin:20px 0'/><p style='font-size:12px;color:#999;'>Sent via Resend integration</p></div>",
        }
        email = await asyncio.to_thread(resend.Emails.send, params)
        email_id = email.get("id") if isinstance(email, dict) else getattr(email, "id", str(email))

        # Log it
        await db.email_log.insert_one({
            "provider": "resend",
            "to": payload.to_email,
            "subject": payload.subject,
            "email_id": email_id,
            "status": "sent",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

        return {"ok": True, "message": f"Test email sent to {payload.to_email}", "email_id": email_id}
    except Exception as e:
        logger.error(f"Resend test failed: {e}")
        raise HTTPException(500, f"Failed to send test email: {str(e)}")


@router.delete("/resend/config")
async def delete_resend_config():
    """Remove Resend configuration."""
    await db.app_config.delete_one({"key": "resend"})
    return {"ok": True, "message": "Resend configuration removed"}
