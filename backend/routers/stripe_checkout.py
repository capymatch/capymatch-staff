"""Stripe Checkout — subscription upgrade flow.

Tiers defined server-side. Frontend sends tier + origin_url.
"""

import os
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout,
    CheckoutSessionRequest,
)
from auth_middleware import get_current_user_dep
from db_client import db

router = APIRouter()
logger = logging.getLogger(__name__)

TIERS = {
    "pro": {"label": "Pro", "price": 12.00, "schools_limit": 25},
    "premium": {"label": "Premium", "price": 29.00, "schools_limit": -1},
}


class CheckoutRequest(BaseModel):
    tier: str
    origin_url: str


@router.post("/checkout/create-session")
async def create_checkout_session(
    data: CheckoutRequest,
    request: Request,
    current_user: dict = get_current_user_dep(),
):
    if data.tier not in TIERS:
        raise HTTPException(400, f"Invalid tier: {data.tier}")

    tier_info = TIERS[data.tier]
    api_key = os.environ.get("STRIPE_API_KEY")
    if not api_key:
        raise HTTPException(500, "Stripe not configured")

    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe = StripeCheckout(api_key=api_key, webhook_url=webhook_url)

    origin = data.origin_url.rstrip("/")
    success_url = f"{origin}/settings?session_id={{CHECKOUT_SESSION_ID}}&upgrade=success"
    cancel_url = f"{origin}/settings?upgrade=cancelled"

    metadata = {
        "user_id": current_user["id"],
        "email": current_user.get("email", ""),
        "tier": data.tier,
        "label": tier_info["label"],
    }

    checkout_req = CheckoutSessionRequest(
        amount=tier_info["price"],
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
    )

    session = await stripe.create_checkout_session(checkout_req)

    # Record pending transaction
    await db.payment_transactions.insert_one({
        "session_id": session.session_id,
        "user_id": current_user["id"],
        "email": current_user.get("email", ""),
        "tier": data.tier,
        "amount": tier_info["price"],
        "currency": "usd",
        "payment_status": "pending",
        "metadata": metadata,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    })

    return {"url": session.url, "session_id": session.session_id}


@router.get("/checkout/status/{session_id}")
async def get_checkout_status(session_id: str, current_user: dict = get_current_user_dep()):
    api_key = os.environ.get("STRIPE_API_KEY")
    if not api_key:
        raise HTTPException(500, "Stripe not configured")

    stripe = StripeCheckout(api_key=api_key, webhook_url="")
    status = await stripe.get_checkout_status(session_id)

    # Update transaction record
    txn = await db.payment_transactions.find_one({"session_id": session_id})
    if txn:
        already_paid = txn.get("payment_status") == "paid"
        new_status = status.payment_status
        update = {
            "payment_status": new_status,
            "status": status.status,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.payment_transactions.update_one(
            {"session_id": session_id}, {"$set": update}
        )

        # Upgrade user tier only once
        if new_status == "paid" and not already_paid:
            tier = txn.get("tier", "pro")
            tier_info = TIERS.get(tier, TIERS["pro"])
            await db.users.update_one(
                {"id": txn["user_id"]},
                {"$set": {
                    "subscription_plan": tier,
                    "subscription_tier": tier,
                    "subscription_label": tier_info["label"],
                    "schools_limit": tier_info["schools_limit"],
                    "upgraded_at": datetime.now(timezone.utc).isoformat(),
                }},
            )
            logger.info(f"User {txn['user_id']} upgraded to {tier}")

    return {
        "status": status.status,
        "payment_status": status.payment_status,
        "amount_total": status.amount_total,
        "currency": status.currency,
    }


@router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    sig = request.headers.get("Stripe-Signature", "")
    api_key = os.environ.get("STRIPE_API_KEY")
    if not api_key:
        return {"ok": False}

    try:
        stripe = StripeCheckout(api_key=api_key, webhook_url="")
        event = await stripe.handle_webhook(body, sig)
        logger.info(f"Stripe webhook: {event.event_type} session={event.session_id}")

        if event.payment_status == "paid":
            txn = await db.payment_transactions.find_one({"session_id": event.session_id})
            if txn and txn.get("payment_status") != "paid":
                tier = txn.get("tier", "pro")
                tier_info = TIERS.get(tier, TIERS["pro"])
                await db.payment_transactions.update_one(
                    {"session_id": event.session_id},
                    {"$set": {"payment_status": "paid", "updated_at": datetime.now(timezone.utc).isoformat()}},
                )
                await db.users.update_one(
                    {"id": txn["user_id"]},
                    {"$set": {
                        "subscription_plan": tier,
                        "subscription_tier": tier,
                        "subscription_label": tier_info["label"],
                        "schools_limit": tier_info["schools_limit"],
                        "upgraded_at": datetime.now(timezone.utc).isoformat(),
                    }},
                )
        return {"ok": True}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"ok": False}
