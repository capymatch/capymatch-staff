"""Organization foundation — Step 1.2

Creates the organizations collection and backfills org_id on athletes and users.
Idempotent: safe to run on every startup.
"""

import logging
from datetime import datetime, timezone

log = logging.getLogger(__name__)

DEFAULT_ORG_ID = "org-capymatch-default"
DEFAULT_ORG = {
    "id": DEFAULT_ORG_ID,
    "name": "CapyMatch Club",
    "owner_id": "director-1",
    "plan": "free",
    "created_at": datetime.now(timezone.utc).isoformat(),
}


async def ensure_org_foundation(db):
    """Ensure the default organization exists and all athletes/users have org_id.

    Idempotent — skips work that's already done.
    """

    # 1. Create org if it doesn't exist
    existing = await db.organizations.find_one({"id": DEFAULT_ORG_ID})
    if not existing:
        await db.organizations.insert_one({**DEFAULT_ORG})
        log.info(f"Created default organization: {DEFAULT_ORG['name']}")
    else:
        log.info(f"Organization already exists: {existing['name']}")

    # 2. Backfill org_id on athletes that don't have it
    athletes_result = await db.athletes.update_many(
        {"org_id": {"$exists": False}},
        {"$set": {"org_id": DEFAULT_ORG_ID}},
    )
    if athletes_result.modified_count > 0:
        log.info(f"Backfilled org_id on {athletes_result.modified_count} athletes")

    # Also set org_id on athletes where it exists but is null
    athletes_null = await db.athletes.update_many(
        {"org_id": None},
        {"$set": {"org_id": DEFAULT_ORG_ID}},
    )
    if athletes_null.modified_count > 0:
        log.info(f"Fixed null org_id on {athletes_null.modified_count} athletes")

    # 3. Backfill org_id on users that don't have it
    users_result = await db.users.update_many(
        {"org_id": {"$exists": False}},
        {"$set": {"org_id": DEFAULT_ORG_ID}},
    )
    if users_result.modified_count > 0:
        log.info(f"Backfilled org_id on {users_result.modified_count} users")

    users_null = await db.users.update_many(
        {"org_id": None},
        {"$set": {"org_id": DEFAULT_ORG_ID}},
    )
    if users_null.modified_count > 0:
        log.info(f"Fixed null org_id on {users_null.modified_count} users")

    # 4. Backfill email on athletes that don't have one (for claim flow)
    athletes_no_email = await db.athletes.find(
        {"$or": [{"email": {"$exists": False}}, {"email": None}]},
        {"_id": 0, "id": 1, "first_name": 1, "last_name": 1},
    ).to_list(10000)
    if athletes_no_email:
        for a in athletes_no_email:
            fn = a.get("first_name", "unknown").lower()
            ln = a.get("last_name", "unknown").lower()
            email = f"{fn}.{ln}@athlete.capymatch.com"
            await db.athletes.update_one(
                {"id": a["id"]},
                {"$set": {"email": email}},
            )
        log.info(f"Backfilled email on {len(athletes_no_email)} athletes")

    # 5. Ensure claim fields exist on all athletes
    await db.athletes.update_many(
        {"user_id": {"$exists": False}},
        {"$set": {"user_id": None, "tenant_id": None, "claimed_at": None}},
    )

    # Verify
    total_athletes = await db.athletes.count_documents({"org_id": DEFAULT_ORG_ID})
    total_users = await db.users.count_documents({"org_id": DEFAULT_ORG_ID})
    log.info(f"Org foundation verified: {total_athletes} athletes, {total_users} users with org_id={DEFAULT_ORG_ID}")
