"""Seed demo pipeline data for a newly claimed athlete.

Called from the registration claim flow to give the athlete a non-empty
dashboard on first login.
"""

from datetime import datetime, timezone, timedelta
import uuid


def _future(days: int) -> str:
    return (datetime.now(timezone.utc) + timedelta(days=days)).strftime("%Y-%m-%d")


def _past(days: int) -> str:
    return (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def seed_athlete_demo_data(db, tenant_id: str, athlete_name: str):
    """Insert demo programs, events, and interactions for a new athlete."""

    # Skip if data already exists
    existing = await db.programs.count_documents({"tenant_id": tenant_id})
    if existing > 0:
        return

    first_name = athlete_name.split(" ")[0] if athlete_name else "Athlete"

    # ── Programs (School Pipeline) ────────────────────────────────────
    programs = [
        {
            "program_id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "university_name": "University of Florida",
            "division": "D1",
            "conference": "SEC",
            "region": "Southeast",
            "recruiting_status": "Active Conversation",
            "reply_status": "Reply Received",
            "priority": "Very High",
            "next_action": "Schedule campus visit",
            "next_action_due": _future(3),
            "notes": "Coach mentioned they need players at my position",
            "initial_contact_sent": _past(21),
            "last_follow_up": _past(5),
            "follow_up_days": 14,
            "created_at": _now_iso(),
            "updated_at": _now_iso(),
        },
        {
            "program_id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "university_name": "Stanford University",
            "division": "D1",
            "conference": "Pac-12",
            "region": "West",
            "recruiting_status": "Contacted",
            "reply_status": "Awaiting Reply",
            "priority": "High",
            "next_action": "Send follow-up email",
            "next_action_due": _past(2),
            "notes": "",
            "initial_contact_sent": _past(16),
            "last_follow_up": _past(16),
            "follow_up_days": 14,
            "created_at": _now_iso(),
            "updated_at": _now_iso(),
        },
        {
            "program_id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "university_name": "UCLA",
            "division": "D1",
            "conference": "Pac-12",
            "region": "West",
            "recruiting_status": "Some Interest",
            "reply_status": "Reply Received",
            "priority": "High",
            "next_action": "Send thank-you after camp",
            "next_action_due": _future(1),
            "notes": "Met coach at summer showcase",
            "initial_contact_sent": _past(30),
            "last_follow_up": _past(10),
            "follow_up_days": 14,
            "created_at": _now_iso(),
            "updated_at": _now_iso(),
        },
        {
            "program_id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "university_name": "University of Tampa",
            "division": "D2",
            "conference": "SSC",
            "region": "Southeast",
            "recruiting_status": "Not Contacted",
            "reply_status": "No Reply",
            "priority": "Medium",
            "next_action": "Send introduction email",
            "next_action_due": "",
            "notes": "",
            "initial_contact_sent": "",
            "last_follow_up": "",
            "follow_up_days": 14,
            "created_at": _now_iso(),
            "updated_at": _now_iso(),
        },
        {
            "program_id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "university_name": "Emory University",
            "division": "D3",
            "conference": "UAA",
            "region": "Southeast",
            "recruiting_status": "Not Contacted",
            "reply_status": "No Reply",
            "priority": "Medium",
            "next_action": "Research program and reach out",
            "next_action_due": "",
            "notes": "",
            "initial_contact_sent": "",
            "last_follow_up": "",
            "follow_up_days": 14,
            "created_at": _now_iso(),
            "updated_at": _now_iso(),
        },
    ]

    # ── Events ────────────────────────────────────────────────────────
    events = [
        {
            "event_id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "title": "UF Elite Camp",
            "event_type": "Camp",
            "location": "Gainesville, FL",
            "description": "Elite skills camp with coaching staff",
            "start_date": _future(12),
            "end_date": _future(13),
            "start_time": "09:00",
            "end_time": "16:00",
            "program_id": programs[0]["program_id"],
            "created_at": _now_iso(),
        },
        {
            "event_id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "title": "Club Championships",
            "event_type": "Tournament",
            "location": "Columbus, OH",
            "description": "National Club Championship weekend",
            "start_date": _future(25),
            "end_date": _future(27),
            "start_time": "08:00",
            "end_time": "18:00",
            "program_id": None,
            "created_at": _now_iso(),
        },
        {
            "event_id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "title": "Stanford Virtual Info Session",
            "event_type": "Meeting",
            "location": "Zoom",
            "description": "Virtual recruiting information session",
            "start_date": _future(8),
            "end_date": _future(8),
            "start_time": "17:00",
            "end_time": "18:00",
            "program_id": programs[1]["program_id"],
            "created_at": _now_iso(),
        },
    ]

    # ── Interactions ──────────────────────────────────────────────────
    interactions = [
        {
            "interaction_id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "program_id": programs[0]["program_id"],
            "university_name": "University of Florida",
            "type": "coach_reply",
            "outcome": "Positive",
            "notes": "Coach asked about upcoming tournament schedule",
            "date_time": (datetime.now(timezone.utc) - timedelta(days=2)).isoformat(),
            "created_at": _now_iso(),
        },
        {
            "interaction_id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "program_id": programs[0]["program_id"],
            "university_name": "University of Florida",
            "type": "email_sent",
            "outcome": "Positive",
            "notes": f"Sent introduction email from {first_name}",
            "date_time": (datetime.now(timezone.utc) - timedelta(days=21)).isoformat(),
            "created_at": _now_iso(),
        },
        {
            "interaction_id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "program_id": programs[2]["program_id"],
            "university_name": "UCLA",
            "type": "camp",
            "outcome": "Positive",
            "notes": "Attended summer showcase — spoke with assistant coach",
            "date_time": (datetime.now(timezone.utc) - timedelta(days=10)).isoformat(),
            "created_at": _now_iso(),
        },
        {
            "interaction_id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "program_id": programs[1]["program_id"],
            "university_name": "Stanford University",
            "type": "email_sent",
            "outcome": "Neutral",
            "notes": "Sent initial introduction email",
            "date_time": (datetime.now(timezone.utc) - timedelta(days=16)).isoformat(),
            "created_at": _now_iso(),
        },
    ]

    await db.programs.insert_many(programs)
    await db.athlete_events.insert_many(events)
    await db.interactions.insert_many(interactions)
