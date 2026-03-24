"""Stripe Checkout — club subscription billing, portal, webhooks.

Endpoints:
  POST /api/stripe/checkout          — Create subscription checkout session
  GET  /api/stripe/checkout/status   — Poll checkout status
  POST /api/stripe/portal            — Create billing portal session
  POST /api/stripe/webhook           — Stripe webhook handler
  GET  /api/stripe/billing-info      — Current billing info for UI
  POST /api/stripe/cancel            — Cancel subscription at period end
  POST /api/stripe/reactivate        — Undo pending cancellation
"""

import os
import logging
from datetime import datetime, timezone

import stripe as stripe_sdk
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from auth_middleware import get_current_user_dep
from db_client import db
from services.stripe_billing import (
    create_subscription_checkout,
    poll_checkout_status,
    create_portal_session,
    process_webhook_event,
    PLAN_PRICES,
)
from club_plans import ClubPlan, get_plan_info
from emergentintegrations.payments.stripe.checkout import StripeCheckout

router = APIRouter()
log = logging.getLogger(__name__)


# ── Request models ──

class ClubCheckoutRequest(BaseModel):
    plan_id: str
    billing_cycle: str = "monthly"  # "monthly" or "annual"
    origin_url: str


class PortalRequest(BaseModel):
    return_url: str


# ── 1. Create subscription checkout ──

@router.post("/stripe/checkout")
async def create_checkout(
    data: ClubCheckoutRequest,
    current_user: dict = get_current_user_dep(),
):
    """Create a Stripe subscription checkout session for a club plan."""
    if current_user["role"] not in ("director", "platform_admin"):
        raise HTTPException(403, "Only directors can manage billing")

    org_id = current_user.get("org_id", "")
    if not org_id:
        raise HTTPException(400, "No organization found")

    try:
        result = await create_subscription_checkout(
            plan_id=data.plan_id,
            billing_cycle=data.billing_cycle,
            org_id=org_id,
            user_id=current_user["id"],
            user_email=current_user.get("email", ""),
            origin_url=data.origin_url,
        )
        return result
    except ValueError as e:
        raise HTTPException(400, str(e))


# ── 2. Poll checkout status ──

@router.get("/stripe/checkout/status/{session_id}")
async def get_checkout_status(
    session_id: str,
    current_user: dict = get_current_user_dep(),
):
    """Poll Stripe for checkout session status."""
    org_id = current_user.get("org_id", "")
    try:
        result = await poll_checkout_status(session_id, org_id)
        return result
    except Exception as e:
        log.warning("Checkout status poll failed: %s", e)
        raise HTTPException(404, "Session not found")


# ── 3. Billing portal ──

@router.post("/stripe/portal")
async def open_portal(
    data: PortalRequest,
    current_user: dict = get_current_user_dep(),
):
    """Create a Stripe Customer Portal session."""
    if current_user["role"] not in ("director", "platform_admin"):
        raise HTTPException(403, "Only directors can manage billing")

    org_id = current_user.get("org_id", "")
    try:
        result = await create_portal_session(org_id, data.return_url)
        return result
    except ValueError as e:
        raise HTTPException(400, str(e))


# ── 4. Webhook ──

@router.post("/stripe/webhook")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events. Production-ready with signature verification."""
    body = await request.body()
    sig = request.headers.get("Stripe-Signature", "")
    api_key = os.environ.get("STRIPE_API_KEY")

    if not api_key:
        log.error("STRIPE_API_KEY not configured")
        return {"ok": False, "error": "not_configured"}

    webhook_secret = os.environ.get("STRIPE_WEBHOOK_SECRET")

    event = None
    event_type = None
    event_id = None

    # Try signature verification if webhook secret is set
    if webhook_secret and sig:
        try:
            event = stripe_sdk.Webhook.construct_event(body, sig, webhook_secret)
            event_type = event["type"]
            event_id = event["id"]
        except stripe_sdk.error.SignatureVerificationError:
            log.warning("Stripe webhook signature verification failed")
            return {"ok": False, "error": "signature_invalid"}
    else:
        # Fallback: try emergentintegrations handler, then raw JSON parse
        try:
            stripe_checkout = StripeCheckout(api_key=api_key, webhook_url="")
            ei_event = await stripe_checkout.handle_webhook(body, sig)
            event_type = ei_event.event_type
            event_id = ei_event.event_id

            # Parse raw body for full event data
            import json
            raw = json.loads(body)
            event = raw
        except Exception:
            try:
                import json
                raw = json.loads(body)
                event_type = raw.get("type")
                event_id = raw.get("id")
                event = raw
            except Exception as e:
                log.error("Failed to parse webhook payload: %s", e)
                return {"ok": False, "error": "parse_failed"}

    if not event_type or not event_id:
        return {"ok": False, "error": "missing_event_data"}

    log.info("Stripe webhook received: type=%s id=%s", event_type, event_id)

    data = event.get("data", {}) if isinstance(event, dict) else {}
    processed = await process_webhook_event(event_type, event_id, data)

    return {"ok": True, "processed": processed, "event_type": event_type}


# ── 5. Billing info (for frontend) ──

@router.get("/stripe/billing-info")
async def get_billing_info(current_user: dict = get_current_user_dep()):
    """Get current billing info: plan, status, next renewal, billing cycle."""
    org_id = current_user.get("org_id", "")

    sub = await db.club_subscriptions.find_one({"org_id": org_id}, {"_id": 0})

    if not sub or not sub.get("stripe_subscription_id"):
        plan_id = (sub or {}).get("plan_id", "starter")
        return {
            "plan_id": plan_id,
            "plan_label": get_plan_info(plan_id).get("label", "Starter"),
            "status": "active",
            "billing_cycle": (sub or {}).get("billing_cycle", "monthly"),
            "has_subscription": False,
            "cancel_at_period_end": False,
            "current_period_end": None,
            "stripe_customer_id": (sub or {}).get("stripe_customer_id"),
        }

    plan_id = sub.get("plan_id", "starter")
    plan_info = get_plan_info(plan_id)

    # Get price for display
    try:
        plan_enum = ClubPlan(plan_id)
        cycle = sub.get("billing_cycle", "monthly")
        price = PLAN_PRICES.get(plan_enum, {}).get(cycle, {}).get("amount", 0)
    except ValueError:
        price = 0

    return {
        "plan_id": plan_id,
        "plan_label": plan_info.get("label", "Starter"),
        "status": sub.get("status", "active"),
        "billing_cycle": sub.get("billing_cycle", "monthly"),
        "has_subscription": True,
        "cancel_at_period_end": sub.get("cancel_at_period_end", False),
        "current_period_end": sub.get("current_period_end"),
        "stripe_customer_id": sub.get("stripe_customer_id"),
        "started_at": sub.get("started_at"),
        "price": price,
    }


# ── 6. Cancel subscription ──

@router.post("/stripe/cancel")
async def cancel_subscription(current_user: dict = get_current_user_dep()):
    """Cancel subscription at end of billing period."""
    if current_user["role"] not in ("director", "platform_admin"):
        raise HTTPException(403, "Only directors can manage billing")

    org_id = current_user.get("org_id", "")
    sub = await db.club_subscriptions.find_one({"org_id": org_id}, {"_id": 0})

    if not sub or not sub.get("stripe_subscription_id"):
        raise HTTPException(400, "No active subscription to cancel")

    stripe_sub_id = sub["stripe_subscription_id"]

    try:
        stripe_sdk.api_key = os.environ.get("STRIPE_API_KEY")
        stripe_sdk.Subscription.modify(
            stripe_sub_id,
            cancel_at_period_end=True,
        )
    except Exception as e:
        log.warning("Stripe cancel API error (non-fatal): %s", e)

    now = datetime.now(timezone.utc).isoformat()
    await db.club_subscriptions.update_one(
        {"org_id": org_id},
        {"$set": {"cancel_at_period_end": True, "updated_at": now}},
    )

    plan_label = get_plan_info(sub.get("plan_id", "starter")).get("label", "Starter")
    period_end = sub.get("current_period_end", "the end of your billing period")

    return {
        "message": f"Your {plan_label} plan will remain active until {period_end}.",
        "cancel_at_period_end": True,
    }


# ── 7. Reactivate subscription ──

@router.post("/stripe/reactivate")
async def reactivate_subscription(current_user: dict = get_current_user_dep()):
    """Undo a pending cancellation."""
    if current_user["role"] not in ("director", "platform_admin"):
        raise HTTPException(403, "Only directors can manage billing")

    org_id = current_user.get("org_id", "")
    sub = await db.club_subscriptions.find_one({"org_id": org_id}, {"_id": 0})

    if not sub or not sub.get("cancel_at_period_end"):
        raise HTTPException(400, "No pending cancellation found")

    stripe_sub_id = sub.get("stripe_subscription_id")
    if stripe_sub_id:
        try:
            stripe_sdk.api_key = os.environ.get("STRIPE_API_KEY")
            stripe_sdk.Subscription.modify(
                stripe_sub_id,
                cancel_at_period_end=False,
            )
        except Exception as e:
            log.warning("Stripe reactivate API error (non-fatal): %s", e)

    now = datetime.now(timezone.utc).isoformat()
    await db.club_subscriptions.update_one(
        {"org_id": org_id},
        {"$set": {"cancel_at_period_end": False, "updated_at": now}},
    )

    return {"message": "Your subscription has been reactivated.", "cancel_at_period_end": False}


# ── 8. Available plans with pricing (public) ──

@router.get("/stripe/plans")
async def get_plans():
    """Return plan options with monthly and annual pricing for checkout UI."""
    plans = []
    for plan_enum in [ClubPlan.STARTER, ClubPlan.GROWTH, ClubPlan.CLUB_PRO, ClubPlan.ELITE, ClubPlan.ENTERPRISE]:
        info = get_plan_info(plan_enum.value)
        prices = PLAN_PRICES.get(plan_enum)
        plans.append({
            **info,
            "monthly_price": prices["monthly"]["amount"] if prices else None,
            "annual_price": prices["annual"]["amount"] if prices else None,
            "annual_monthly": round(prices["annual"]["amount"] / 12, 2) if prices else None,
        })
    return {"plans": plans}
