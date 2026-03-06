"""
Database seeding and loading for Persistence Phase 1

Handles seed-if-empty logic for event_notes and recommendations collections,
and loading persisted data back into in-memory structures on startup.
"""

import logging

logger = logging.getLogger(__name__)


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
