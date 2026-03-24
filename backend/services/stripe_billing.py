"""Stripe subscription billing for Club Plans.

Handles:
  - Subscription checkout session creation (monthly/annual)
  - Webhook processing (idempotent)
  - Subscription state → plan entitlement sync
  - Billing portal sessions
  - Payment transaction logging
"""

import os
import uuid
import logging
from datetime import datetime, timezone

import stripe as stripe_sdk

from db_client import db
from club_plans import ClubPlan, get_plan_info

log = logging.getLogger(__name__)

# ── Plan → Stripe Price mapping ──────────────────────────────────────────
# Inline price_data used at checkout. No pre-created products needed.

PLAN_PRICES = {
    ClubPlan.STARTER: {
        "monthly": {"amount": 199.00, "interval": "month"},
        "annual":  {"amount": 2028.00, "interval": "year"},
    },
    ClubPlan.GROWTH: {
        "monthly": {"amount": 329.00, "interval": "month"},
        "annual":  {"amount": 3348.00, "interval": "year"},
    },
    ClubPlan.CLUB_PRO: {
        "monthly": {"amount": 449.00, "interval": "month"},
        "annual":  {"amount": 4584.00, "interval": "year"},
    },
    ClubPlan.ELITE: {
        "monthly": {"amount": 699.00, "interval": "month"},
        "annual":  {"amount": 7128.00, "interval": "year"},
    },
    # Enterprise = sales-led, no self-serve
}


def _get_stripe_key():
    key = os.environ.get("STRIPE_API_KEY")
    if not key:
        raise ValueError("STRIPE_API_KEY not configured")
    stripe_sdk.api_key = key
    return key


# ── Checkout Session ──────────────────────────────────────────────────────

async def create_subscription_checkout(
    plan_id: str,
    billing_cycle: str,
    org_id: str,
    user_id: str,
    user_email: str,
    origin_url: str,
) -> dict:
    """Create a Stripe Checkout Session for a club subscription.

    Returns: {"url": str, "session_id": str}
    If Stripe API fails (e.g., test key), falls back to direct plan activation.
    """
    _get_stripe_key()

    try:
        plan_enum = ClubPlan(plan_id)
    except ValueError:
        raise ValueError(f"Invalid plan: {plan_id}")

    if plan_enum == ClubPlan.ENTERPRISE:
        raise ValueError("Enterprise plans require custom setup")

    if plan_enum not in PLAN_PRICES:
        raise ValueError(f"No pricing for plan: {plan_id}")

    cycle = "annual" if billing_cycle == "annual" else "monthly"
    price_cfg = PLAN_PRICES[plan_enum][cycle]
    plan_info = get_plan_info(plan_id)

    origin = origin_url.rstrip("/")
    success_url = f"{origin}/club-billing?session_id={{CHECKOUT_SESSION_ID}}&checkout=success"
    cancel_url = f"{origin}/club-billing?checkout=cancelled"

    metadata = {
        "org_id": org_id,
        "user_id": user_id,
        "plan_id": plan_id,
        "billing_cycle": cycle,
    }

    try:
        # Get or create Stripe customer
        customer_id = await _get_or_create_customer(org_id, user_id, user_email)

        session = stripe_sdk.checkout.Session.create(
            mode="subscription",
            customer=customer_id,
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "product_data": {
                        "name": f"CapyMatch {plan_info['label']}",
                        "description": plan_info.get("tagline", ""),
                    },
                    "unit_amount": int(price_cfg["amount"] * 100),
                    "recurring": {"interval": price_cfg["interval"]},
                },
                "quantity": 1,
            }],
            success_url=success_url,
            cancel_url=cancel_url,
            metadata=metadata,
            subscription_data={"metadata": metadata},
        )

        # Record pending transaction
        txn_id = f"txn_{uuid.uuid4().hex[:12]}"
        await db.payment_transactions.insert_one({
            "txn_id": txn_id,
            "session_id": session.id,
            "org_id": org_id,
            "user_id": user_id,
            "email": user_email,
            "plan_id": plan_id,
            "billing_cycle": cycle,
            "amount": price_cfg["amount"],
            "currency": "usd",
            "payment_status": "pending",
            "metadata": metadata,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })

        log.info("Stripe checkout session created: org=%s plan=%s session=%s", org_id, plan_id, session.id)
        return {"url": session.url, "session_id": session.id}

    except stripe_sdk.error.AuthenticationError:
        # Stripe key is not valid — activate plan directly (demo mode)
        log.warning("Stripe API key invalid — activating plan directly (demo mode)")
        await _sync_subscription(
            org_id=org_id,
            plan_id=plan_id,
            billing_cycle=cycle,
            status="active",
        )
        return {
            "url": None,
            "session_id": None,
            "activated_directly": True,
            "plan_id": plan_id,
            "plan_label": plan_info["label"],
            "message": f"Plan activated: {plan_info['label']} ({cycle}). Connect a live Stripe key for real billing.",
        }


# ── Checkout Status Polling ───────────────────────────────────────────────

async def poll_checkout_status(session_id: str, org_id: str) -> dict:
    """Poll Stripe for checkout session status and sync subscription."""
    _get_stripe_key()

    session = stripe_sdk.checkout.Session.retrieve(session_id)

    # Update payment transaction
    txn = await db.payment_transactions.find_one({"session_id": session_id})
    if txn:
        already_paid = txn.get("payment_status") == "paid"
        new_status = session.payment_status or "unpaid"
        update = {
            "payment_status": new_status,
            "status": session.status,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        if session.subscription:
            update["stripe_subscription_id"] = session.subscription
        if session.customer:
            update["stripe_customer_id"] = session.customer

        await db.payment_transactions.update_one(
            {"session_id": session_id}, {"$set": update}
        )

        # Sync subscription only once per payment
        if new_status == "paid" and not already_paid:
            plan_id = txn.get("plan_id", "starter")
            cycle = txn.get("billing_cycle", "monthly")
            await _sync_subscription(
                org_id=txn.get("org_id", org_id),
                plan_id=plan_id,
                billing_cycle=cycle,
                stripe_subscription_id=session.subscription,
                stripe_customer_id=session.customer,
                status="active",
            )

    return {
        "status": session.status,
        "payment_status": session.payment_status,
        "subscription_id": session.subscription,
    }


# ── Billing Portal ────────────────────────────────────────────────────────

async def create_portal_session(org_id: str, return_url: str) -> dict:
    """Create a Stripe Customer Portal session."""
    _get_stripe_key()

    sub = await db.club_subscriptions.find_one({"org_id": org_id}, {"_id": 0})
    customer_id = (sub or {}).get("stripe_customer_id")

    if not customer_id:
        raise ValueError("No billing account found. Manage your plan from the billing page.")

    try:
        session = stripe_sdk.billing_portal.Session.create(
            customer=customer_id,
            return_url=return_url,
        )
        return {"url": session.url}
    except stripe_sdk.error.AuthenticationError:
        raise ValueError("Stripe is in demo mode. Connect a live key for billing portal.")


# ── Webhook Processing (idempotent) ──────────────────────────────────────

async def process_webhook_event(event_type: str, event_id: str, data: dict) -> bool:
    """Process a Stripe webhook event idempotently.

    Returns True if event was processed, False if already handled.
    """
    # Idempotency check
    existing = await db.stripe_events.find_one({"event_id": event_id})
    if existing:
        log.info("Webhook event already processed: %s", event_id)
        return False

    # Record event
    await db.stripe_events.insert_one({
        "event_id": event_id,
        "event_type": event_type,
        "processed_at": datetime.now(timezone.utc).isoformat(),
    })

    obj = data.get("object", {})
    metadata = obj.get("metadata", {})

    if event_type == "checkout.session.completed":
        await _handle_checkout_completed(obj, metadata)

    elif event_type == "customer.subscription.created":
        await _handle_subscription_change(obj, metadata, "created")

    elif event_type == "customer.subscription.updated":
        await _handle_subscription_change(obj, metadata, "updated")

    elif event_type == "customer.subscription.deleted":
        await _handle_subscription_deleted(obj, metadata)

    elif event_type == "invoice.paid":
        await _handle_invoice_paid(obj)

    elif event_type == "invoice.payment_failed":
        await _handle_invoice_failed(obj)

    else:
        log.info("Unhandled webhook event type: %s", event_type)

    return True


# ── Internal helpers ──────────────────────────────────────────────────────

async def _get_or_create_customer(org_id: str, user_id: str, email: str) -> str:
    """Get existing Stripe customer or create a new one."""
    sub = await db.club_subscriptions.find_one({"org_id": org_id}, {"_id": 0})
    if sub and sub.get("stripe_customer_id"):
        return sub["stripe_customer_id"]

    customer = stripe_sdk.Customer.create(
        email=email,
        metadata={"org_id": org_id, "user_id": user_id},
    )
    return customer.id


async def _sync_subscription(
    org_id: str,
    plan_id: str,
    billing_cycle: str,
    stripe_subscription_id: str = None,
    stripe_customer_id: str = None,
    status: str = "active",
    current_period_end: str = None,
    cancel_at_period_end: bool = False,
):
    """Upsert the club subscription, syncing Stripe state → entitlements."""
    now = datetime.now(timezone.utc).isoformat()

    update_fields = {
        "org_id": org_id,
        "plan_id": plan_id,
        "status": status,
        "billing_cycle": billing_cycle,
        "updated_at": now,
        "cancel_at_period_end": cancel_at_period_end,
    }
    if stripe_subscription_id:
        update_fields["stripe_subscription_id"] = stripe_subscription_id
    if stripe_customer_id:
        update_fields["stripe_customer_id"] = stripe_customer_id
    if current_period_end:
        update_fields["current_period_end"] = current_period_end

    await db.club_subscriptions.update_one(
        {"org_id": org_id},
        {
            "$set": update_fields,
            "$setOnInsert": {"started_at": now},
        },
        upsert=True,
    )

    # Audit log
    await db.subscription_logs.insert_one({
        "log_id": f"sublog_{uuid.uuid4().hex[:12]}",
        "org_id": org_id,
        "plan_id": plan_id,
        "status": status,
        "billing_cycle": billing_cycle,
        "stripe_subscription_id": stripe_subscription_id,
        "event": "sync",
        "created_at": now,
    })

    log.info("Subscription synced: org=%s plan=%s status=%s", org_id, plan_id, status)


def _resolve_plan_from_amount(amount_cents: int, interval: str) -> str:
    """Reverse-map a Stripe amount + interval back to a plan_id."""
    for plan_enum, prices in PLAN_PRICES.items():
        cycle = "annual" if interval == "year" else "monthly"
        if cycle in prices:
            expected = int(prices[cycle]["amount"] * 100)
            if expected == amount_cents:
                return plan_enum.value
    return "starter"


async def _handle_checkout_completed(obj: dict, metadata: dict):
    """Handle checkout.session.completed — subscription activated."""
    org_id = metadata.get("org_id")
    plan_id = metadata.get("plan_id")
    cycle = metadata.get("billing_cycle", "monthly")

    if not org_id or not plan_id:
        log.warning("checkout.session.completed missing metadata: %s", metadata)
        return

    customer_id = obj.get("customer")

    # Update payment transaction
    session_id = obj.get("id")
    if session_id:
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {
                "payment_status": "paid",
                "stripe_subscription_id": obj.get("subscription"),
                "stripe_customer_id": customer_id,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }},
        )

    await _sync_subscription(
        org_id=org_id,
        plan_id=plan_id,
        billing_cycle=cycle,
        stripe_subscription_id=obj.get("subscription"),
        stripe_customer_id=customer_id,
        status="active",
    )


async def _handle_subscription_change(obj: dict, metadata: dict, action: str):
    """Handle subscription created/updated events."""
    org_id = metadata.get("org_id")
    if not org_id:
        # Try to find org by customer ID
        customer_id = obj.get("customer")
        if customer_id:
            sub = await db.club_subscriptions.find_one(
                {"stripe_customer_id": customer_id}, {"_id": 0}
            )
            if sub:
                org_id = sub.get("org_id")

    if not org_id:
        log.warning("subscription.%s: cannot resolve org_id: %s", action, metadata)
        return

    status = obj.get("status", "active")  # active, past_due, canceled, etc.
    cancel_at_period_end = obj.get("cancel_at_period_end", False)

    # Extract period end
    period_end = obj.get("current_period_end")
    period_end_iso = None
    if period_end:
        period_end_iso = datetime.fromtimestamp(period_end, tz=timezone.utc).isoformat()

    # Resolve plan from metadata or amount
    plan_id = metadata.get("plan_id")
    cycle = metadata.get("billing_cycle", "monthly")

    if not plan_id:
        items = obj.get("items", {}).get("data", [])
        if items:
            price = items[0].get("price", {})
            amount = price.get("unit_amount", 0)
            interval = price.get("recurring", {}).get("interval", "month")
            plan_id = _resolve_plan_from_amount(amount, interval)
            cycle = "annual" if interval == "year" else "monthly"

    plan_id = plan_id or "starter"

    # Map Stripe status to our entitlement status
    entitlement_status = _map_stripe_status(status)

    await _sync_subscription(
        org_id=org_id,
        plan_id=plan_id if entitlement_status != "expired" else "starter",
        billing_cycle=cycle,
        stripe_subscription_id=obj.get("id"),
        stripe_customer_id=obj.get("customer"),
        status=entitlement_status,
        current_period_end=period_end_iso,
        cancel_at_period_end=cancel_at_period_end,
    )


async def _handle_subscription_deleted(obj: dict, metadata: dict):
    """Handle subscription cancellation — downgrade to starter."""
    org_id = metadata.get("org_id")
    if not org_id:
        customer_id = obj.get("customer")
        if customer_id:
            sub = await db.club_subscriptions.find_one(
                {"stripe_customer_id": customer_id}, {"_id": 0}
            )
            if sub:
                org_id = sub.get("org_id")

    if not org_id:
        log.warning("subscription.deleted: cannot resolve org_id")
        return

    await _sync_subscription(
        org_id=org_id,
        plan_id="starter",
        billing_cycle="monthly",
        stripe_subscription_id=obj.get("id"),
        stripe_customer_id=obj.get("customer"),
        status="canceled",
    )
    log.info("Subscription deleted — org %s downgraded to starter", org_id)


async def _handle_invoice_paid(obj: dict):
    """Handle invoice.paid — confirm recurring payment."""
    sub_id = obj.get("subscription")
    if not sub_id:
        return

    sub = await db.club_subscriptions.find_one(
        {"stripe_subscription_id": sub_id}, {"_id": 0}
    )
    if sub and sub.get("status") != "active":
        await db.club_subscriptions.update_one(
            {"stripe_subscription_id": sub_id},
            {"$set": {"status": "active", "updated_at": datetime.now(timezone.utc).isoformat()}},
        )
        log.info("Invoice paid — subscription %s reactivated", sub_id)


async def _handle_invoice_failed(obj: dict):
    """Handle invoice.payment_failed — mark subscription as past_due."""
    sub_id = obj.get("subscription")
    if not sub_id:
        return

    sub = await db.club_subscriptions.find_one(
        {"stripe_subscription_id": sub_id}, {"_id": 0}
    )
    if sub:
        await db.club_subscriptions.update_one(
            {"stripe_subscription_id": sub_id},
            {"$set": {"status": "past_due", "updated_at": datetime.now(timezone.utc).isoformat()}},
        )
        log.info("Invoice failed — subscription %s marked past_due", sub_id)


def _map_stripe_status(stripe_status: str) -> str:
    """Map Stripe subscription status to our entitlement status."""
    mapping = {
        "active": "active",
        "trialing": "active",
        "past_due": "past_due",
        "canceled": "canceled",
        "unpaid": "past_due",
        "incomplete": "pending",
        "incomplete_expired": "expired",
        "paused": "paused",
    }
    return mapping.get(stripe_status, "active")
