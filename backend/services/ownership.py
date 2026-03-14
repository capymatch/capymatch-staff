"""Ownership service — resolves which athletes a user can see."""

from db_client import db

# In-memory cache refreshed on startup and after assignment changes
_coach_athlete_map: dict[str, set[str]] = {}  # coach_id -> {athlete_ids}
_all_athlete_ids: set[str] = set()
_unassigned_athlete_ids: set[str] = set()


async def refresh_ownership_cache():
    """Rebuild the coach→athletes mapping from the DB."""
    global _coach_athlete_map, _all_athlete_ids, _unassigned_athlete_ids
    _coach_athlete_map.clear()
    _all_athlete_ids.clear()
    _unassigned_athlete_ids.clear()

    athletes = await db.athletes.find({}, {"_id": 0, "id": 1, "primary_coach_id": 1}).to_list(500)
    for a in athletes:
        _all_athlete_ids.add(a["id"])
        coach_id = a.get("primary_coach_id")
        if coach_id:
            _coach_athlete_map.setdefault(coach_id, set()).add(a["id"])
        else:
            _unassigned_athlete_ids.add(a["id"])


def get_visible_athlete_ids(user: dict) -> set[str]:
    """Return the set of athlete IDs this user can see."""
    if user["role"] == "director":
        return _all_athlete_ids
    return _coach_athlete_map.get(user["id"], set())


def get_unassigned_athlete_ids() -> set[str]:
    """Return IDs of athletes with no coach assigned."""
    return _unassigned_athlete_ids


def get_coach_athlete_map() -> dict[str, set[str]]:
    """Return the full coach→athlete mapping (for director roster views)."""
    return _coach_athlete_map


def can_access_athlete(user: dict, athlete_id: str) -> bool:
    """Check if user can access a specific athlete."""
    if user["role"] == "director":
        return True
    return athlete_id in _coach_athlete_map.get(user["id"], set())


def filter_by_athlete_id(items: list, user: dict, athlete_id_key: str = "athlete_id") -> list:
    """Filter a list of dicts to only those whose athlete_id is visible to the user."""
    if user["role"] == "director":
        return items
    visible = get_visible_athlete_ids(user)
    return [item for item in items if item.get(athlete_id_key) in visible]


def filter_events_by_ownership(events: list, user: dict) -> list:
    """Filter events to those with at least one of the coach's athletes attending, or newly created events with no athletes."""
    if user["role"] == "director":
        return events
    visible = get_visible_athlete_ids(user)
    return [e for e in events if not e.get("athlete_ids") or visible & set(e.get("athlete_ids", []))]
