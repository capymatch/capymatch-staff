"""
Support Pod — Data aggregation and pod logic

Generates pod member data, suggested actions from interventions,
calculates pod health, and provides helpers for the support pod endpoints.
"""

from datetime import datetime, timezone, timedelta
from mock_data import ATHLETES, ALL_INTERVENTIONS, UPCOMING_EVENTS


def get_athlete(athlete_id):
    return next((a for a in ATHLETES if a["id"] == athlete_id), None)


def get_athlete_interventions(athlete_id):
    return [i for i in ALL_INTERVENTIONS if i["athlete_id"] == athlete_id]


def generate_pod_members(athlete):
    """Deterministic mock pod members based on athlete profile"""
    days = athlete["daysSinceActivity"]
    parent_inactive_days = max(0, days - 3)

    return [
        {
            "id": f"member_coach_{athlete['id']}",
            "name": "Coach Martinez",
            "role": "club_coach",
            "role_label": "Club Coach",
            "is_primary": True,
            "last_active": datetime.now(timezone.utc).isoformat(),
            "tasks_owned": 0,
            "tasks_overdue": 0,
            "status": "active",
        },
        {
            "id": f"member_parent_{athlete['id']}",
            "name": f"{athlete['lastName']} Family",
            "role": "parent",
            "role_label": "Parent/Guardian",
            "is_primary": False,
            "last_active": (datetime.now(timezone.utc) - timedelta(days=parent_inactive_days)).isoformat(),
            "tasks_owned": 0,
            "tasks_overdue": 0,
            "status": "active" if parent_inactive_days <= 7 else "inactive",
        },
        {
            "id": f"member_athlete_{athlete['id']}",
            "name": athlete["fullName"],
            "role": "athlete",
            "role_label": "Athlete",
            "is_primary": False,
            "last_active": athlete["lastActivity"],
            "tasks_owned": 0,
            "tasks_overdue": 0,
            "status": "active" if days <= 7 else "inactive",
        },
    ]


def generate_suggested_actions(athlete_id, interventions):
    """Auto-generate action items from intervention suggested_steps"""
    actions = []
    owner_map = {
        "momentum_drop": "Coach Martinez",
        "blocker": "Parent/Guardian",
        "deadline_proximity": "Coach Martinez",
        "engagement_drop": "Coach Martinez",
        "ownership_gap": "Unassigned",
        "readiness_issue": "Coach Martinez",
    }
    due_offset = {
        "deadline_proximity": 1,
        "ownership_gap": 1,
        "blocker": 3,
        "momentum_drop": 2,
        "engagement_drop": 2,
        "readiness_issue": 5,
    }

    for intervention in interventions:
        steps = intervention.get("details", {}).get("suggested_steps", [])
        base = due_offset.get(intervention["category"], 3)

        for i, step in enumerate(steps):
            actions.append({
                "id": f"suggested_{athlete_id}_{intervention['category']}_{i}",
                "athlete_id": athlete_id,
                "title": step,
                "owner": owner_map.get(intervention["category"], "Coach Martinez"),
                "status": "ready",
                "due_date": (datetime.now(timezone.utc) + timedelta(days=base + i)).isoformat(),
                "source": "intervention",
                "source_category": intervention["category"],
                "created_at": datetime.now(timezone.utc).isoformat(),
                "is_suggested": True,
                "completed_at": None,
            })

    return actions


def calculate_pod_health(athlete, members, actions):
    non_coach_inactive = any(
        m["status"] == "inactive" and m["role"] != "club_coach" for m in members
    )
    overdue = sum(1 for a in actions if a.get("status") == "overdue")

    if athlete["daysSinceActivity"] > 21 or overdue >= 3:
        return "red"
    if athlete["daysSinceActivity"] > 7 or overdue >= 1 or non_coach_inactive:
        return "yellow"
    return "green"


def get_relevant_events(athlete):
    return [e for e in UPCOMING_EVENTS if e["daysAway"] <= 14][:3]


def enrich_members_with_tasks(members, actions):
    """Update task counts on pod members based on action ownership"""
    member_name_to_role = {}
    for m in members:
        member_name_to_role[m["name"]] = m
        if m["role"] == "parent":
            member_name_to_role["Parent/Guardian"] = m

    active_actions = [a for a in actions if a.get("status") != "completed"]

    for m in members:
        m["tasks_owned"] = 0
        m["tasks_overdue"] = 0

    for action in active_actions:
        owner = action.get("owner", "")
        member = member_name_to_role.get(owner)
        if member:
            member["tasks_owned"] += 1
            if action.get("status") == "overdue":
                member["tasks_overdue"] += 1

    return members
