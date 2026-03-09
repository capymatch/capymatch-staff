"""
Database seeding and loading for Persistence Phase 1 + Phase 2

Handles seed-if-empty logic and loading persisted data back into
in-memory structures on startup.

Phase 1: event_notes, recommendations
Phase 2: athletes, events
"""

import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


# ============================================================================
# PHASE 2 — Athletes
# ============================================================================

async def seed_athletes(db, athletes):
    """Seed athletes collection from mock data if empty"""
    count = await db.athletes.count_documents({})
    if count > 0:
        logger.info(f"athletes already has {count} docs — skipping seed")
        return False

    from services.org_foundation import DEFAULT_ORG_ID
    docs = [{**a, "org_id": DEFAULT_ORG_ID} for a in athletes]
    if docs:
        await db.athletes.insert_many(docs)
        logger.info(f"Seeded {len(docs)} athletes to MongoDB")
    return True


async def load_athletes_to_memory(db):
    """Load persisted athletes from DB, recompute time-relative fields"""
    athletes = await db.athletes.find({}, {"_id": 0}).to_list(10000)

    now = datetime.now(timezone.utc)
    for a in athletes:
        # Recompute daysSinceActivity from stored lastActivity timestamp
        try:
            last = datetime.fromisoformat(a["lastActivity"])
            a["daysSinceActivity"] = max(0, (now - last).days)
        except (KeyError, ValueError):
            pass

    logger.info(f"Loaded {len(athletes)} athletes from DB")
    return athletes


# ============================================================================
# PHASE 2 — Events
# ============================================================================

async def seed_events(db, events):
    """Seed events collection from mock data if empty.
    Stores event metadata WITHOUT capturedNotes (those live in event_notes collection).
    """
    count = await db.events.count_documents({})
    if count > 0:
        logger.info(f"events already has {count} docs — skipping seed")
        return False

    docs = []
    for e in events:
        doc = {k: v for k, v in e.items() if k != "capturedNotes"}
        docs.append(doc)

    if docs:
        await db.events.insert_many(docs)
        logger.info(f"Seeded {len(docs)} events to MongoDB")
    return True


async def load_events_to_memory(db):
    """Load persisted events from DB, recompute time-relative fields.
    Returns events with empty capturedNotes (merged separately from event_notes).
    """
    events = await db.events.find({}, {"_id": 0}).to_list(10000)

    now = datetime.now(timezone.utc)
    for e in events:
        # Recompute daysAway from stored date
        try:
            event_date = datetime.fromisoformat(e["date"])
            e["daysAway"] = (event_date - now).days
        except (KeyError, ValueError):
            pass

        # Recompute status from daysAway
        if e.get("daysAway") is not None:
            if e["daysAway"] < 0:
                e["status"] = "past"
            else:
                e["status"] = "upcoming"

        # Initialize capturedNotes (will be filled by load_event_notes_to_memory)
        e["capturedNotes"] = []

    logger.info(f"Loaded {len(events)} events from DB")
    return events


# ============================================================================
# PHASE 1 — Event Notes
# ============================================================================

async def seed_event_notes(db, events):
    """Seed event_notes collection from mock capturedNotes if empty"""
    count = await db.event_notes.count_documents({})
    if count > 0:
        logger.info(f"event_notes already has {count} docs — skipping seed")
        return False

    notes = []
    for event in events:
        for note in event.get("capturedNotes", []):
            notes.append({**note})

    if notes:
        await db.event_notes.insert_many(notes)
        logger.info(f"Seeded {len(notes)} event notes to MongoDB")
    return True


# ============================================================================
# PHASE 1 — Recommendations
# ============================================================================

async def seed_recommendations(db, recommendations):
    """Seed recommendations collection from in-memory data if empty"""
    count = await db.recommendations.count_documents({})
    if count > 0:
        logger.info(f"recommendations already has {count} docs — skipping seed")
        return False

    docs = []
    for rec in recommendations:
        docs.append({**rec})

    if docs:
        await db.recommendations.insert_many(docs)
        logger.info(f"Seeded {len(docs)} recommendations to MongoDB")
    return True


# ============================================================================
# Load helpers (shared across phases)
# ============================================================================

async def load_event_notes_to_memory(db, events):
    """Load persisted event notes from DB back into in-memory event objects"""
    all_notes = await db.event_notes.find({}, {"_id": 0}).to_list(10000)

    by_event = {}
    for note in all_notes:
        eid = note.get("event_id")
        by_event.setdefault(eid, []).append(note)

    for event in events:
        event["capturedNotes"] = by_event.get(event["id"], [])

    logger.info(f"Loaded {len(all_notes)} event notes into memory across {len(by_event)} events")


async def load_recommendations_to_memory(db):
    """Load persisted recommendations from DB"""
    recs = await db.recommendations.find({}, {"_id": 0}).to_list(10000)
    logger.info(f"Loaded {len(recs)} recommendations from DB")
    return recs
