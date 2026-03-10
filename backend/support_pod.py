"""
Support Pod — Data aggregation and pod logic

Generates pod member data, suggested actions from interventions,
calculates pod health, and provides helpers for the support pod endpoints.
"""

from datetime import datetime, timezone, timedelta
from services.athlete_store import get_all as get_athletes, get_interventions
from mock_data import UPCOMING_EVENTS


def get_athlete(athlete_id):
    return next((a for a in get_athletes() if a["id"] == athlete_id), None)


def get_athlete_interventions(athlete_id):
    return [i for i in get_interventions() if i["athlete_id"] == athlete_id]


def generate_pod_members(athlete):
    """Deterministic mock pod members based on athlete profile"""
    days = athlete["days_since_activity"]
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
            "name": f"{athlete['last_name']} Family",
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
            "name": athlete["full_name"],
            "role": "athlete",
            "role_label": "Athlete",
            "is_primary": False,
            "last_active": athlete["last_activity"],
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

    if athlete["days_since_activity"] > 21 or overdue >= 3:
        return "red"
    if athlete["days_since_activity"] > 7 or overdue >= 1 or non_coach_inactive:
        return "yellow"
    return "green"


def explain_pod_health(athlete, interventions):
    """
    Lightweight pod health for Mission Control cards.
    Returns { status, reason } based on observable signals.
    No DB queries — purely derived from athlete state + interventions.

    Signals evaluated:
    1. Recency of activity (daysSinceActivity)
    2. Open issue count (number of interventions)
    3. Unresolved blockers (blocker category present)
    4. Ownership clarity (ownership_gap category present)
    5. Issue severity (any critical-tier interventions)
    """
    days = athlete["days_since_activity"]
    issue_count = len(interventions)
    has_blocker = any(i["category"] == "blocker" for i in interventions)
    has_ownership_gap = any(i["category"] == "ownership_gap" for i in interventions)
    has_critical = any(i.get("priority_tier") == "critical" for i in interventions)

    reasons = []

    # --- RED: At Risk ---
    if days > 21:
        reasons.append(f"No activity in {days} days")
    if issue_count >= 3:
        reasons.append(f"{issue_count} open issues")
    if has_blocker and days > 14:
        reasons.append("Unresolved blocker + extended inactivity")

    if reasons:
        return {"status": "red", "label": "At Risk", "reason": reasons[0]}

    # --- YELLOW: Needs Attention ---
    if days > 7:
        reasons.append(f"Inactive for {days} days")
    if has_blocker:
        reasons.append("Active blocker")
    if has_ownership_gap:
        reasons.append("Ownership gap — response needs assignment")
    if issue_count >= 2:
        reasons.append(f"{issue_count} open issues")
    if has_critical:
        reasons.append("Critical intervention active")

    if reasons:
        return {"status": "yellow", "label": "Needs Attention", "reason": reasons[0]}

    # --- GREEN: Healthy ---
    if issue_count == 1:
        return {"status": "green", "label": "Healthy", "reason": "1 issue being tracked"}

    return {"status": "green", "label": "Healthy", "reason": "On track"}


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
