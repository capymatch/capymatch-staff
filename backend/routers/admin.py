"""Admin — internal status view (director-only)."""

from fastapi import APIRouter, HTTPException
from db_client import db
from auth_middleware import get_current_user_dep
from mock_data import SCHOOLS, ALL_INTERVENTIONS

router = APIRouter()


@router.get("/admin/status")
async def admin_status(current_user: dict = get_current_user_dep()):
    """Internal status view: persistence state, collection counts, data sources"""
    if current_user["role"] != "director":
        raise HTTPException(status_code=403, detail="Director access only")
    event_notes_count = await db.event_notes.count_documents({})
    recommendations_count = await db.recommendations.count_documents({})
    athletes_count = await db.athletes.count_documents({})
    events_count = await db.events.count_documents({})
    pod_actions_count = await db.pod_actions.count_documents({})
    athlete_notes_count = await db.athlete_notes.count_documents({})
    assignments_count = await db.assignments.count_documents({})
    messages_count = await db.messages.count_documents({})
    pod_resolutions_count = await db.pod_resolutions.count_documents({})
    pod_action_events_count = await db.pod_action_events.count_documents({})
    program_snapshots_count = await db.program_snapshots.count_documents({})

    return {
        "persistence_phase": "Phase 2",
        "collections": {
            "persisted": [
                {"name": "athletes", "count": athletes_count, "source": "MongoDB", "phase": 2, "description": "Athlete profiles — durable across restarts, daysSinceActivity recomputed on load"},
                {"name": "events", "count": events_count, "source": "MongoDB", "phase": 2, "description": "Event records — durable, daysAway recomputed on load, capturedNotes in event_notes"},
                {"name": "event_notes", "count": event_notes_count, "source": "MongoDB", "phase": 1, "description": "Live event captures — courtside notes, interest levels, follow-ups"},
                {"name": "recommendations", "count": recommendations_count, "source": "MongoDB", "phase": 1, "description": "Coach recommendations — full lifecycle with response history"},
                {"name": "program_snapshots", "count": program_snapshots_count, "source": "MongoDB", "phase": 2, "description": "Daily metrics snapshots for historical trending"},
                {"name": "pod_actions", "count": pod_actions_count, "source": "MongoDB", "phase": 0, "description": "Support Pod action items"},
                {"name": "athlete_notes", "count": athlete_notes_count, "source": "MongoDB", "phase": 0, "description": "Athlete timeline entries"},
                {"name": "assignments", "count": assignments_count, "source": "MongoDB", "phase": 0, "description": "Owner assignments from quick actions"},
                {"name": "messages", "count": messages_count, "source": "MongoDB", "phase": 0, "description": "Quick messages from peek panel"},
                {"name": "pod_resolutions", "count": pod_resolutions_count, "source": "MongoDB", "phase": 0, "description": "Issue resolution records"},
                {"name": "pod_action_events", "count": pod_action_events_count, "source": "MongoDB", "phase": 0, "description": "Action create/update audit log"},
            ],
            "in_memory_only": [
                {"name": "schools", "count": len(SCHOOLS), "source": "mock_data.py", "description": "10 static school entries — low priority for persistence"},
                {"name": "interventions", "count": len(ALL_INTERVENTIONS), "source": "decision_engine.py", "description": "Recomputed on startup from persisted data — stateless, no persistence needed"},
            ],
        },
        "seed_strategy": "seed-if-empty — mock data inserted on first run only, user data preserved across restarts",
        "startup_order": "athletes → events → event_notes → recommendations → recompute derived data",
        "limitations": [
            "Schools are static (10 entries) and loaded from code — low priority for persistence",
            "Interventions are recomputed on every startup from persisted athletes + events",
            "Momentum signals are regenerated on startup (not persisted individually)",
            "daysSinceActivity (athletes) and daysAway (events) are recomputed from stored timestamps on each load",
        ],
        "architecture": "Dual-write: mutations update MongoDB AND in-memory. Engines read from synced in-memory. Derived data recomputed after load.",
    }
