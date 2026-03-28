"""Startup seed/load/recompute logic.

Explicit ordering (dependency chain):
  1. Users (no deps — seed default accounts)
  2. Athletes  (no deps)
  3. Events    (references athlete IDs)
  4. Event Notes (references event IDs)
  5. Recommendations (references athlete + school IDs)
  6. Recompute derived data (interventions, alerts, signals, snapshot)
"""

import logging
import bcrypt as _bcrypt

def _hash_password(password: str) -> str:
    return _bcrypt.hashpw(password.encode("utf-8"), _bcrypt.gensalt()).decode("utf-8")
from database import (
    seed_athletes,
    seed_events,
    seed_event_notes,
    seed_recommendations,
    load_athletes_to_memory,
    load_events_to_memory,
    load_event_notes_to_memory,
    load_recommendations_to_memory,
)

log = logging.getLogger(__name__)

DEFAULT_USERS = [
    {"id": "director-1", "email": "director@capymatch.com", "name": "Clara Adams", "role": "director", "password": "director123"},
    {"id": "coach-williams", "email": "coach.williams@capymatch.com", "name": "Coach Williams", "role": "coach", "password": "coach123"},
    {"id": "coach-garcia", "email": "coach.garcia@capymatch.com", "name": "Coach Garcia", "role": "coach", "password": "coach123"},
]

DEFAULT_ORG_ID = "org-capymatch-default"


async def seed_users(db):
    """Seed default user accounts if the collection is empty."""
    count = await db.users.count_documents({})
    if count > 0:
        log.info(f"Users collection already has {count} docs — skipping seed.")
        return
    for u in DEFAULT_USERS:
        doc = {
            "id": u["id"],
            "email": u["email"],
            "name": u["name"],
            "role": u["role"],
            "password_hash": _hash_password(u["password"]),
            "created_at": "2025-01-01T00:00:00+00:00",
            "org_id": DEFAULT_ORG_ID,
        }
        await db.users.insert_one(doc)
    log.info(f"Seeded {len(DEFAULT_USERS)} default users.")


async def assign_coaches_if_needed(db):
    """Assign primary_coach_id to athletes that don't have one yet.

    Splits athletes evenly between the two seed coaches.
    Only runs once — skips athletes that already have an assignment.
    """
    unassigned = await db.athletes.count_documents({
        "$or": [{"primary_coach_id": None}, {"primary_coach_id": {"$exists": False}}]
    })
    if unassigned == 0:
        log.info("All athletes already have coach assignments — skipping.")
        return

    # Get seed coaches
    coaches = await db.users.find(
        {"role": "coach", "id": {"$in": ["coach-williams", "coach-garcia"]}},
        {"_id": 0, "id": 1}
    ).to_list(10)
    if len(coaches) < 2:
        log.warning("Not enough seed coaches to assign — skipping.")
        return

    coach_ids = [c["id"] for c in coaches]
    athletes = await db.athletes.find(
        {"$or": [{"primary_coach_id": None}, {"primary_coach_id": {"$exists": False}}]},
        {"_id": 0, "id": 1}
    ).to_list(500)

    for i, a in enumerate(athletes):
        coach_id = coach_ids[i % len(coach_ids)]
        await db.athletes.update_one(
            {"id": a["id"]},
            {"$set": {"primary_coach_id": coach_id}}
        )

    log.info(f"Assigned {len(athletes)} athletes to {len(coach_ids)} coaches.")


async def run_startup(db):
    """Run the full seed → load → recompute pipeline."""
    import mock_data
    import advocacy_engine
    from decision_engine import (
        detect_all_interventions,
        rank_interventions,
        get_priority_alerts,
        get_athletes_needing_attention,
    )

    # ── Step 0: Organization foundation (create org, backfill org_id) ──
    from services.org_foundation import ensure_org_foundation
    await ensure_org_foundation(db)

    # ── Step 0.5: Seed users if empty ──
    await seed_users(db)

    # ── Step 1: Seed all collections if empty ──
    await seed_athletes(db, mock_data.ATHLETES)
    await seed_events(db, mock_data.UPCOMING_EVENTS)
    await seed_event_notes(db, mock_data.UPCOMING_EVENTS)
    await seed_recommendations(db, advocacy_engine.RECOMMENDATIONS)

    # ── Step 1.5: Assign coaches to athletes if not yet assigned ──
    await assign_coaches_if_needed(db)

    # ── Step 2: Load athletes from DB into athlete_store (canonical source) ──
    from services.athlete_store import recompute_derived_data as recompute_athlete_data

    # ── Step 3: Load events from DB (capturedNotes initialized empty) ──
    loaded_events = await load_events_to_memory(db)
    if loaded_events:
        mock_data.UPCOMING_EVENTS.clear()
        mock_data.UPCOMING_EVENTS.extend(loaded_events)

    # ── Step 4: Load event notes and merge into events ──
    await load_event_notes_to_memory(db, mock_data.UPCOMING_EVENTS)

    # ── Step 5: Load recommendations ──
    loaded_recs = await load_recommendations_to_memory(db)
    if loaded_recs:
        advocacy_engine.RECOMMENDATIONS.clear()
        advocacy_engine.RECOMMENDATIONS.extend(loaded_recs)

    # ── Step 6: Load athletes from DB + recompute all derived data via athlete_store ──
    await recompute_athlete_data()

    # ── Step 7: Seed historical program snapshots for trending ──
    from program_engine import compute_all as compute_program_intelligence
    from services.snapshots import extract_snapshot_metrics, seed_historical_snapshots

    program_data = await compute_program_intelligence()
    current_metrics = extract_snapshot_metrics(program_data)
    await seed_historical_snapshots(db, current_metrics)

    # ── Step 8: Refresh ownership cache ──
    from services.ownership import refresh_ownership_cache
    await refresh_ownership_cache()

    # ── Step 9: Ensure all MongoDB indexes ──

    # Core collection indexes for fast lookups
    await db.athletes.create_index("id", unique=True)
    await db.athletes.create_index("tenant_id")
    await db.athletes.create_index("primary_coach_id")
    await db.athletes.create_index("user_id")

    await db.programs.create_index("program_id", unique=True)
    await db.programs.create_index("athlete_id")
    await db.programs.create_index("tenant_id")
    await db.programs.create_index([("athlete_id", 1), ("recruiting_status", 1)])

    await db.interactions.create_index("athlete_id")
    await db.interactions.create_index("program_id")
    await db.interactions.create_index([("athlete_id", 1), ("created_at", -1)])
    await db.interactions.create_index("tenant_id")

    await db.users.create_index("id", unique=True)
    await db.users.create_index("email", unique=True)
    await db.users.create_index("org_id")

    await db.support_messages.create_index("thread_id")
    await db.support_messages.create_index([("thread_id", 1), ("created_at", -1)])
    await db.support_messages.create_index("tenant_id")

    await db.notifications.create_index([("user_id", 1), ("read", 1)])
    await db.notifications.create_index("tenant_id")

    await db.coach_watch_alerts.create_index("tenant_id")

    # TTL indexes for auto-expiring security data
    await db.refresh_tokens.create_index("expires_at", expireAfterSeconds=0)
    await db.refresh_tokens.create_index("user_id")

    log.info("MongoDB indexes ensured on all core collections")

    # Performance indexes for Pipeline & Journey page queries
    await db.interactions.create_index([("tenant_id", 1), ("program_id", 1), ("date_time", -1)])
    await db.programs.create_index([("tenant_id", 1), ("is_active", 1)])
    await db.program_metrics.create_index([("tenant_id", 1), ("program_id", 1)])
    await db.coach_flags.create_index([("tenant_id", 1), ("program_id", 1), ("status", 1)])
    await db.pod_actions.create_index([("program_id", 1), ("athlete_id", 1), ("status", 1)])
    await db.director_actions.create_index([("athlete_id", 1), ("status", 1)])
    await db.engagement_events.create_index([("tenant_id", 1), ("program_id", 1)])
    await db.athlete_events.create_index([("tenant_id", 1), ("program_id", 1)])
    await db.athlete_notes.create_index([("athlete_id", 1), ("program_id", 1), ("tag", 1)])
    await db.email_tracking.create_index("message_id")

    log.info("Performance indexes ensured for Pipeline & Journey")

    # Knowledge Base indexes
    kb_count = await db.university_knowledge_base.count_documents({})
    if kb_count > 0:
        await db.university_knowledge_base.create_index("university_name")
        await db.university_knowledge_base.create_index("division")
        await db.university_knowledge_base.create_index("region")
        await db.university_knowledge_base.create_index("conference")
        await db.university_knowledge_base.create_index("domain")
        log.info(f"Knowledge Base: {kb_count} schools present (indexes ensured)")
    else:
        from seeders.seed_kb import seed_kb
        kb_count = await seed_kb(db)
        log.info(f"Knowledge Base: {kb_count} schools seeded/refreshed")

    from services.athlete_store import get_all, get_interventions
    all_athletes = await get_all()
    all_interventions = await get_interventions()
    log.info(
        f"Persistence startup complete: "
        f"{len(all_athletes)} athletes, "
        f"{len(mock_data.UPCOMING_EVENTS)} events, "
        f"{len(all_interventions)} interventions recomputed"
    )

    # ── Schema V2: Structured signals migration ──
    from migrations.schema_v2_signals import run_migration as run_v2_migration
    await run_v2_migration()
