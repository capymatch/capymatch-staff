"""Organization foundation — enhanced for multi-tenant architecture.

Creates organizations collection, athlete_user_links, backfills org_id,
migrates coach → club_coach role, creates platform_admin account.
Idempotent: safe to run on every startup.
"""

import logging
from datetime import datetime, timezone
from passlib.hash import bcrypt

log = logging.getLogger(__name__)

DEFAULT_ORG_ID = "org-capymatch-default"
DEFAULT_ORG = {
    "id": DEFAULT_ORG_ID,
    "name": "CapyMatch Club",
    "slug": "capymatch-club",
    "owner_id": "director-1",
    "plan": "free",
    "billing_customer_id": None,
    "created_at": datetime.now(timezone.utc).isoformat(),
}

PLATFORM_ADMIN = {
    "id": "platform-admin-1",
    "email": "douglas@capymatch.com",
    "name": "Douglas",
    "role": "platform_admin",
    "org_id": None,
    "password": "1234",
}

# Roles that count as "staff" for org-scoped access
STAFF_ROLES = {"director", "club_coach"}
ALL_ROLES = {"platform_admin", "director", "club_coach", "athlete", "parent"}


async def ensure_org_foundation(db):
    """Full multi-tenant foundation. Idempotent."""

    # ── 1. Create default org ──
    existing = await db.organizations.find_one({"id": DEFAULT_ORG_ID})
    if not existing:
        await db.organizations.insert_one({**DEFAULT_ORG})
        log.info(f"Created default organization: {DEFAULT_ORG['name']}")
    else:
        # Ensure slug exists on older org docs
        if not existing.get("slug"):
            await db.organizations.update_one(
                {"id": DEFAULT_ORG_ID},
                {"$set": {"slug": "capymatch-club", "billing_customer_id": None}},
            )
        log.info(f"Organization already exists: {existing['name']}")

    # ── 2. Migrate coach → club_coach ──
    coach_migration = await db.users.update_many(
        {"role": "coach"},
        {"$set": {"role": "club_coach"}},
    )
    if coach_migration.modified_count > 0:
        log.info(f"Migrated {coach_migration.modified_count} users from coach → club_coach")

    # ── 3. Create platform_admin account ──
    admin_exists = await db.users.find_one({"email": PLATFORM_ADMIN["email"]})
    if not admin_exists:
        await db.users.insert_one({
            "id": PLATFORM_ADMIN["id"],
            "email": PLATFORM_ADMIN["email"],
            "name": PLATFORM_ADMIN["name"],
            "role": PLATFORM_ADMIN["role"],
            "org_id": PLATFORM_ADMIN["org_id"],
            "password_hash": bcrypt.hash(PLATFORM_ADMIN["password"]),
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        log.info(f"Created platform_admin: {PLATFORM_ADMIN['email']}")
    else:
        # Ensure role is correct
        if admin_exists.get("role") != "platform_admin":
            await db.users.update_one(
                {"email": PLATFORM_ADMIN["email"]},
                {"$set": {"role": "platform_admin", "org_id": None}},
            )
            log.info("Updated platform_admin role")

    # ── 4. Backfill org_id on athletes ──
    athletes_result = await db.athletes.update_many(
        {"$or": [{"org_id": {"$exists": False}}, {"org_id": None}]},
        {"$set": {"org_id": DEFAULT_ORG_ID}},
    )
    if athletes_result.modified_count > 0:
        log.info(f"Backfilled org_id on {athletes_result.modified_count} athletes")

    # ── 5. Backfill org_id on non-admin users that don't have it ──
    users_result = await db.users.update_many(
        {"$and": [
            {"$or": [{"org_id": {"$exists": False}}, {"org_id": None}]},
            {"role": {"$ne": "platform_admin"}},
        ]},
        {"$set": {"org_id": DEFAULT_ORG_ID}},
    )
    if users_result.modified_count > 0:
        log.info(f"Backfilled org_id on {users_result.modified_count} users")

    # ── 6. Backfill email on athletes for claim flow ──
    athletes_no_email = await db.athletes.find(
        {"$or": [{"email": {"$exists": False}}, {"email": None}]},
        {"_id": 0, "id": 1, "first_name": 1, "last_name": 1},
    ).to_list(10000)
    if athletes_no_email:
        for a in athletes_no_email:
            fn = a.get("first_name", "unknown").lower()
            ln = a.get("last_name", "unknown").lower()
            email = f"{fn}.{ln}@athlete.capymatch.com"
            await db.athletes.update_one({"id": a["id"]}, {"$set": {"email": email}})
        log.info(f"Backfilled email on {len(athletes_no_email)} athletes")

    # ── 7. Ensure claim fields exist ──
    await db.athletes.update_many(
        {"user_id": {"$exists": False}},
        {"$set": {"user_id": None, "tenant_id": None, "claimed_at": None}},
    )

    # ── 8. Backfill athlete_user_links for claimed athletes ──
    claimed = await db.athletes.find(
        {"user_id": {"$ne": None}},
        {"_id": 0, "id": 1, "user_id": 1},
    ).to_list(10000)
    for a in claimed:
        existing_link = await db.athlete_user_links.find_one({
            "athlete_id": a["id"], "user_id": a["user_id"],
        })
        if not existing_link:
            await db.athlete_user_links.insert_one({
                "athlete_id": a["id"],
                "user_id": a["user_id"],
                "relationship_type": "athlete",
                "permissions": ["full"],
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
    if claimed:
        log.info(f"Ensured athlete_user_links for {len(claimed)} claimed athletes")

    # ── 9. Create indexes ──
    await db.organizations.create_index("id", unique=True)
    await db.organizations.create_index("slug", unique=True)
    await db.athlete_user_links.create_index([("athlete_id", 1), ("user_id", 1)], unique=True)
    await db.athlete_user_links.create_index("user_id")
    await db.athletes.create_index("org_id")
    await db.users.create_index("org_id")

    # ── Verify ──
    total_athletes = await db.athletes.count_documents({"org_id": DEFAULT_ORG_ID})
    total_users = await db.users.count_documents({"org_id": DEFAULT_ORG_ID})
    total_links = await db.athlete_user_links.count_documents({})
    total_orgs = await db.organizations.count_documents({})
    log.info(
        f"Org foundation verified: {total_orgs} orgs, "
        f"{total_athletes} athletes, {total_users} users, "
        f"{total_links} athlete_user_links"
    )
