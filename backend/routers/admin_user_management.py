"""Admin User & Subscription Management endpoints.

Provides CRUD for users, subscription plan changes with audit logging,
and aggregated stats for the admin dashboard.
"""

from fastapi import APIRouter, HTTPException, Request, Depends
from typing import Optional
from datetime import datetime, timezone, timedelta
from db_client import db
from admin_guard import require_admin
from subscriptions import SUBSCRIPTION_TIERS
import uuid

router = APIRouter(dependencies=[Depends(require_admin)])


# ─── Users ────────────────────────────────────────────────────────────────────

@router.get("/admin/users")
async def list_users(
    search: Optional[str] = None,
    plan: Optional[str] = None,
    status: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
):
    """List all users with enriched data for admin table."""
    # Build user query
    user_query = {"role": {"$in": ["athlete", "parent"]}}
    if status and status != "all":
        user_query["status"] = status

    users_cursor = db.users.find(user_query, {"_id": 0}).sort("created_at", -1)
    all_users = await users_cursor.to_list(5000)

    rows = []
    for u in all_users:
        uid = u.get("id", "")
        # Find athlete record
        athlete = await db.athletes.find_one({"user_id": uid}, {"_id": 0})

        athlete_name = ""
        tenant_id = ""
        if athlete:
            athlete_name = athlete.get("full_name", "")
            tenant_id = athlete.get("tenant_id", "")

        display_name = athlete_name or u.get("name", "")
        email = u.get("email", "")

        # Search filter
        if search:
            q = search.lower()
            if q not in display_name.lower() and q not in email.lower():
                continue

        # Get subscription
        sub = await db.subscriptions.find_one({"tenant_id": tenant_id}, {"_id": 0}) if tenant_id else None
        current_plan = (sub or {}).get("tier", "basic")
        if current_plan == "free":
            current_plan = "basic"

        # Plan filter
        if plan and plan != "all" and current_plan != plan:
            continue

        school_count = await db.programs.count_documents({"tenant_id": tenant_id}) if tenant_id else 0
        interaction_count = await db.interactions.count_documents({"tenant_id": tenant_id}) if tenant_id else 0

        rows.append({
            "user_id": uid,
            "tenant_id": tenant_id,
            "name": u.get("name", ""),
            "email": email,
            "athlete_name": display_name,
            "role": u.get("role", ""),
            "plan": current_plan,
            "status": u.get("status", "active"),
            "school_count": school_count,
            "interaction_count": interaction_count,
            "created_at": u.get("created_at", ""),
        })

    total = len(rows)
    start = (page - 1) * limit
    paginated = rows[start:start + limit]
    return {"users": paginated, "total": total, "page": page, "limit": limit}


@router.get("/admin/users/{user_id}")
async def get_user_detail(user_id: str):
    """Full user detail for admin drill-down."""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    athlete = await db.athletes.find_one({"user_id": user_id}, {"_id": 0})
    tenant_id = (athlete or {}).get("tenant_id", "")

    # Subscription
    sub = await db.subscriptions.find_one({"tenant_id": tenant_id}, {"_id": 0}) if tenant_id else None
    current_plan = (sub or {}).get("tier", "basic")
    if current_plan == "free":
        current_plan = "basic"

    # Programs
    programs = []
    if tenant_id:
        programs = await db.programs.find(
            {"tenant_id": tenant_id},
            {"_id": 0, "university_name": 1, "division": 1, "recruiting_status": 1, "board_group": 1, "created_at": 1},
        ).to_list(200)

    # Recent interactions
    recent_interactions = []
    if tenant_id:
        recent_interactions = await db.interactions.find(
            {"tenant_id": tenant_id}, {"_id": 0}
        ).sort("created_at", -1).to_list(10)

    # Gmail connected?
    gmail = await db.gmail_tokens.find_one({"user_id": user_id}, {"_id": 0, "user_id": 1})

    # Questionnaire / recruiting profile
    recruiting_profile = (athlete or {}).get("recruiting_profile")

    # Stats
    school_count = len(programs)
    interaction_count = len(recent_interactions)

    return {
        "user": user,
        "athlete": athlete,
        "subscription": SUBSCRIPTION_TIERS.get(current_plan, SUBSCRIPTION_TIERS["basic"]),
        "plan": current_plan,
        "status": user.get("status", "active"),
        "stats": {
            "school_count": school_count,
            "interaction_count": interaction_count,
            "gmail_connected": gmail is not None,
            "questionnaire_completed": recruiting_profile is not None,
            "position": (athlete or {}).get("position", ""),
            "grad_year": (athlete or {}).get("grad_year", ""),
        },
        "recent_interactions": recent_interactions,
        "programs": programs,
    }


@router.put("/admin/users/{user_id}")
async def update_user(user_id: str, request: Request):
    """Update a user's plan, status, or profile info."""
    body = await request.json()
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    athlete = await db.athletes.find_one({"user_id": user_id}, {"_id": 0})
    tenant_id = (athlete or {}).get("tenant_id", "")

    # Update user fields
    user_updates = {}
    if "name" in body:
        user_updates["name"] = body["name"]
    if "email" in body:
        user_updates["email"] = body["email"]
    if "status" in body and body["status"] in ("active", "suspended", "deactivated"):
        user_updates["status"] = body["status"]
    if user_updates:
        user_updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.users.update_one({"id": user_id}, {"$set": user_updates})

    # Update plan
    if "plan" in body and body["plan"] in SUBSCRIPTION_TIERS and tenant_id:
        old_sub = await db.subscriptions.find_one({"tenant_id": tenant_id}, {"_id": 0})
        old_plan = (old_sub or {}).get("tier", "basic")
        new_plan = body["plan"]
        now = datetime.now(timezone.utc).isoformat()

        await db.subscriptions.update_one(
            {"tenant_id": tenant_id},
            {"$set": {"tier": new_plan, "updated_at": now}},
            upsert=True,
        )

        # Audit log
        if old_plan != new_plan:
            log_entry = {
                "log_id": f"sublog_{uuid.uuid4().hex[:12]}",
                "user_id": user_id,
                "tenant_id": tenant_id,
                "user_name": user.get("name", ""),
                "user_email": user.get("email", ""),
                "old_plan": old_plan,
                "new_plan": new_plan,
                "reason": body.get("reason", "Admin change"),
                "changed_by": "admin",
                "created_at": now,
            }
            await db.subscription_logs.insert_one(log_entry)
            log_entry.pop("_id", None)

    # Update athlete name if provided
    if "athlete_name" in body and athlete:
        await db.athletes.update_one(
            {"user_id": user_id},
            {"$set": {"full_name": body["athlete_name"], "updated_at": datetime.now(timezone.utc).isoformat()}},
        )

    return {"ok": True}


@router.post("/admin/users")
async def create_user(request: Request):
    """Admin-created user (athlete account)."""
    body = await request.json()
    name = body.get("name", "").strip()
    email = body.get("email", "").strip()
    plan = body.get("plan", "basic")

    if not name or not email:
        raise HTTPException(status_code=400, detail="Name and email are required")

    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="A user with this email already exists")

    now = datetime.now(timezone.utc).isoformat()
    user_id = str(uuid.uuid4())
    tenant_id = f"tenant-{user_id}"

    # Create user doc
    import hashlib
    password_hash = hashlib.sha256("changeme123".encode()).hexdigest()
    user_doc = {
        "id": user_id,
        "email": email,
        "name": name,
        "password_hash": password_hash,
        "role": "athlete",
        "org_id": None,
        "status": "active",
        "created_at": now,
    }
    await db.users.insert_one(user_doc)
    user_doc.pop("_id", None)

    # Create athlete doc
    parts = name.strip().split(" ", 1)
    athlete_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "tenant_id": tenant_id,
        "org_id": None,
        "email": email,
        "full_name": name,
        "first_name": parts[0],
        "last_name": parts[1] if len(parts) > 1 else "",
        "position": "",
        "grad_year": "",
        "team": "",
        "height": "",
        "city": "",
        "state": "",
        "high_school": "",
        "gpa": "",
        "recruiting_stage": "prospect",
        "recruiting_profile": None,
        "onboarding_completed": False,
        "created_at": now,
        "updated_at": now,
        "claimed_at": now,
    }
    await db.athletes.insert_one(athlete_doc)
    athlete_doc.pop("_id", None)

    # Create subscription
    if plan in SUBSCRIPTION_TIERS:
        await db.subscriptions.insert_one({
            "tenant_id": tenant_id,
            "tier": plan,
            "created_at": now,
            "updated_at": now,
        })

    return {"ok": True, "user_id": user_id, "email": email}


# ─── Subscriptions ────────────────────────────────────────────────────────────

@router.get("/admin/subscriptions")
async def list_subscriptions(
    search: Optional[str] = None,
    plan: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
):
    """Subscription overview with stats and user list."""
    users_cursor = db.users.find(
        {"role": {"$in": ["athlete", "parent"]}}, {"_id": 0}
    ).sort("created_at", -1)
    all_users = await users_cursor.to_list(5000)

    rows = []
    all_plan_counts = {"basic": 0, "pro": 0, "premium": 0}

    for u in all_users:
        uid = u.get("id", "")
        athlete = await db.athletes.find_one({"user_id": uid}, {"_id": 0})
        tenant_id = (athlete or {}).get("tenant_id", "")

        sub = await db.subscriptions.find_one({"tenant_id": tenant_id}, {"_id": 0}) if tenant_id else None
        current_plan = (sub or {}).get("tier", "basic")
        if current_plan == "free":
            current_plan = "basic"

        all_plan_counts[current_plan] = all_plan_counts.get(current_plan, 0) + 1

        display_name = (athlete or {}).get("full_name", "") or u.get("name", "")
        email = u.get("email", "")

        if search:
            q = search.lower()
            if q not in display_name.lower() and q not in email.lower():
                continue
        if plan and plan != "all" and current_plan != plan:
            continue

        tier_info = SUBSCRIPTION_TIERS.get(current_plan, SUBSCRIPTION_TIERS["basic"])
        school_count = await db.programs.count_documents({"tenant_id": tenant_id}) if tenant_id else 0

        now_utc = datetime.now(timezone.utc)
        month_start = now_utc.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
        ai_used = 0
        if tenant_id:
            ai_used = await db.ai_usage.count_documents({
                "tenant_id": tenant_id,
                "created_at": {"$gte": month_start},
            })

        rows.append({
            "user_id": uid,
            "tenant_id": tenant_id,
            "name": u.get("name", ""),
            "email": email,
            "athlete_name": display_name,
            "plan": current_plan,
            "status": u.get("status", "active"),
            "school_count": school_count,
            "school_limit": tier_info.get("max_schools", 5),
            "ai_used": ai_used,
            "ai_limit": tier_info.get("ai_drafts_per_month", 0),
            "created_at": u.get("created_at", ""),
        })

    total = len(rows)
    start_idx = (page - 1) * limit
    paginated = rows[start_idx:start_idx + limit]

    pro_price = SUBSCRIPTION_TIERS["pro"]["price"]
    premium_price = SUBSCRIPTION_TIERS["premium"]["price"]
    mrr = all_plan_counts.get("pro", 0) * pro_price + all_plan_counts.get("premium", 0) * premium_price

    return {
        "users": paginated,
        "total": total,
        "page": page,
        "limit": limit,
        "stats": {
            "plan_counts": all_plan_counts,
            "mrr": mrr,
            "total_users": sum(all_plan_counts.values()),
        },
    }


@router.put("/admin/subscriptions/{user_id}")
async def change_subscription(user_id: str, request: Request):
    """Change a user's plan with audit logging."""
    body = await request.json()
    new_plan = body.get("plan")
    reason = body.get("reason", "Admin change")

    if new_plan not in SUBSCRIPTION_TIERS:
        raise HTTPException(status_code=400, detail="Invalid plan")

    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    athlete = await db.athletes.find_one({"user_id": user_id}, {"_id": 0})
    if not athlete:
        raise HTTPException(status_code=404, detail="Athlete not found")

    tenant_id = athlete.get("tenant_id", "")
    old_sub = await db.subscriptions.find_one({"tenant_id": tenant_id}, {"_id": 0})
    old_plan = (old_sub or {}).get("tier", "basic")
    if old_plan == "free":
        old_plan = "basic"

    now = datetime.now(timezone.utc).isoformat()

    await db.subscriptions.update_one(
        {"tenant_id": tenant_id},
        {"$set": {"tier": new_plan, "updated_at": now}},
        upsert=True,
    )

    log_entry = {
        "log_id": f"sublog_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "tenant_id": tenant_id,
        "user_name": user.get("name", ""),
        "user_email": user.get("email", ""),
        "old_plan": old_plan,
        "new_plan": new_plan,
        "reason": reason,
        "changed_by": "admin",
        "created_at": now,
    }
    await db.subscription_logs.insert_one(log_entry)
    log_entry.pop("_id", None)

    return {"ok": True, "log": log_entry}


@router.get("/admin/subscription-logs")
async def list_subscription_logs(page: int = 1, limit: int = 30):
    """Recent subscription change audit logs."""
    total = await db.subscription_logs.count_documents({})
    skip = (page - 1) * limit
    logs = await db.subscription_logs.find(
        {}, {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return {"logs": logs, "total": total, "page": page, "limit": limit}


@router.get("/admin/subscription-tiers")
async def get_subscription_tiers():
    """Return all subscription tier definitions."""
    return {"tiers": SUBSCRIPTION_TIERS}
