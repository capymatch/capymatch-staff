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
    days = athlete.get("days_since_activity", 0)
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
            "name": f"{athlete.get('last_name', 'Unknown')} Family",
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
            "name": athlete.get("full_name", "Athlete"),
            "role": "athlete",
            "role_label": "Athlete",
            "is_primary": False,
            "last_active": athlete.get("last_activity", datetime.now(timezone.utc).isoformat()),
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


# ═══════════════════════════════════════════════════════════════════════
# POD TOP ACTION ENGINE — reuses same decision pattern as Top Action Engine
# Fields: top_action, explanation, owner, urgency, reason_code, cta_label, category
# ═══════════════════════════════════════════════════════════════════════

POD_ACTION_MAP = {
    # Priority 1: Blockers (critical)
    "blocker_active": {
        "priority": 1,
        "urgency": "critical",
        "label": "Remove Blocker",
        "owner": "coach",
        "explanation_template": "A blocker is preventing recruiting progress — resolve it now",
        "cta_label": "Resolve Blocker",
        "category": "blocker",
    },
    # Priority 2: Momentum drop (critical)
    "momentum_drop": {
        "priority": 2,
        "urgency": "critical",
        "label": "Check In With Athlete",
        "owner": "coach",
        "explanation_template": "Athlete has gone dark — {days} days without activity. Immediate check-in needed",
        "cta_label": "Log Check-In",
        "category": "momentum_drop",
    },
    # Priority 3: Overdue actions
    "overdue_actions": {
        "priority": 3,
        "urgency": "critical",
        "label": "Clear Overdue Actions",
        "owner": "coach",
        "explanation_template": "{count} action{s} overdue — the oldest is {days_old} day{s2} late",
        "cta_label": "View Actions",
        "category": "past_due",
    },
    # Priority 4: Deadline proximity
    "deadline_approaching": {
        "priority": 4,
        "urgency": "follow_up",
        "label": "Prepare for Upcoming Deadline",
        "owner": "shared",
        "explanation_template": "An event or deadline is approaching — ensure the athlete is prepared",
        "cta_label": "Prep Now",
        "category": "deadline_proximity",
    },
    # Priority 5: Engagement dropping
    "engagement_drop": {
        "priority": 5,
        "urgency": "follow_up",
        "label": "Re-engage Athlete",
        "owner": "coach",
        "explanation_template": "School engagement is dropping — follow up to keep momentum",
        "cta_label": "Send Follow-Up",
        "category": "engagement_drop",
    },
    # Priority 6: Ownership gap
    "ownership_gap": {
        "priority": 6,
        "urgency": "follow_up",
        "label": "Assign Unowned Actions",
        "owner": "coach",
        "explanation_template": "{count} action{s} have no owner — assign them to keep progress moving",
        "cta_label": "Assign Actions",
        "category": "ownership_gap",
    },
    # Priority 7: Family/parent inactive
    "family_inactive": {
        "priority": 7,
        "urgency": "follow_up",
        "label": "Re-engage Family",
        "owner": "coach",
        "explanation_template": "Family hasn't been active in {days} days — loop them in",
        "cta_label": "Message Family",
        "category": "family_inactive",
    },
    # Priority 8: Readiness issue
    "readiness_issue": {
        "priority": 8,
        "urgency": "follow_up",
        "label": "Address Readiness Gaps",
        "owner": "shared",
        "explanation_template": "Profile gaps may be limiting recruiting visibility",
        "cta_label": "Review Profile",
        "category": "readiness_issue",
    },
    # Priority 9: On track
    "on_track": {
        "priority": 9,
        "urgency": "on_track",
        "label": "On Track",
        "owner": "athlete",
        "explanation_template": "Everything looks good — keep the momentum going",
        "cta_label": "View Details",
        "category": "on_track",
    },
}


def compute_pod_top_action(athlete, interventions, actions, members):
    """Deterministic rules engine for the pod — returns the single most important action.
    Reuses the same output shape as the Top Action Engine:
    top_action, explanation, owner, urgency, reason_code, cta_label, category, priority."""
    now = datetime.now(timezone.utc)
    days_inactive = athlete.get("days_since_activity", 0)

    # Enrich action statuses
    active_actions = []
    for a in actions:
        if a.get("status") == "completed":
            continue
        if a.get("due_date"):
            try:
                due = datetime.fromisoformat(a["due_date"].replace("Z", "+00:00"))
                if due < now:
                    a = {**a, "status": "overdue"}
            except (ValueError, TypeError):
                pass
        active_actions.append(a)

    overdue = [a for a in active_actions if a.get("status") == "overdue"]
    unassigned = [a for a in active_actions if a.get("owner") in ("Unassigned", None, "")]

    # Build intervention category set
    categories = {i.get("category") for i in interventions}

    # ── Priority 1: Active blocker ──
    if "blocker" in categories:
        blocker = next((i for i in interventions if i["category"] == "blocker"), None)
        detail = ""
        if blocker:
            detail = blocker.get("details", {}).get("problem", blocker.get("reason", ""))
        return _make_pod_action(
            "blocker_active",
            f"blocker:{blocker.get('id', '') if blocker else 'unknown'}",
            issue_type=blocker.get("details", {}).get("problem", "Active blocker") if blocker else "Active blocker",
            detail=detail,
        )

    # ── Priority 2: Momentum drop (athlete gone dark) ──
    if days_inactive > 14 or "momentum_drop" in categories:
        return _make_pod_action(
            "momentum_drop",
            f"momentum_drop:days={days_inactive}",
            template_vars={"days": str(days_inactive)},
            issue_type=f"No activity in {days_inactive} days",
        )

    # ── Priority 3: Overdue actions ──
    if overdue:
        oldest_days = 0
        for a in overdue:
            try:
                due = datetime.fromisoformat(a["due_date"].replace("Z", "+00:00"))
                diff = (now - due).days
                oldest_days = max(oldest_days, diff)
            except (ValueError, TypeError):
                pass
        return _make_pod_action(
            "overdue_actions",
            f"overdue:count={len(overdue)}:oldest={oldest_days}d",
            template_vars={
                "count": str(len(overdue)),
                "s": "s" if len(overdue) != 1 else "",
                "days_old": str(oldest_days),
                "s2": "s" if oldest_days != 1 else "",
            },
            issue_type=f"{len(overdue)} overdue action{'s' if len(overdue) != 1 else ''}",
        )

    # ── Priority 4: Deadline approaching ──
    if "deadline_proximity" in categories:
        return _make_pod_action(
            "deadline_approaching",
            "deadline_proximity",
            issue_type="Upcoming deadline",
        )

    # ── Priority 5: Engagement drop ──
    if "engagement_drop" in categories:
        return _make_pod_action(
            "engagement_drop",
            "engagement_drop",
            issue_type="Engagement dropping",
        )

    # ── Priority 6: Ownership gap ──
    if unassigned:
        return _make_pod_action(
            "ownership_gap",
            f"ownership_gap:count={len(unassigned)}",
            template_vars={"count": str(len(unassigned)), "s": "s" if len(unassigned) != 1 else ""},
            issue_type=f"{len(unassigned)} unassigned action{'s' if len(unassigned) != 1 else ''}",
        )

    # ── Priority 7: Family inactive ──
    parent = next((m for m in members if m["role"] == "parent"), None)
    if parent and parent.get("status") == "inactive":
        parent_days = 0
        try:
            last = datetime.fromisoformat(parent["last_active"].replace("Z", "+00:00"))
            parent_days = (now - last).days
        except (ValueError, TypeError):
            pass
        return _make_pod_action(
            "family_inactive",
            f"family_inactive:days={parent_days}",
            template_vars={"days": str(parent_days)},
            issue_type="Family not engaged",
        )

    # ── Priority 8: Readiness issue ──
    if "readiness_issue" in categories:
        return _make_pod_action(
            "readiness_issue",
            "readiness_issue",
            issue_type="Profile readiness gaps",
        )

    # ── Priority 9: All clear ──
    return _make_pod_action(
        "on_track",
        "on_track:health=green",
        issue_type="No issues detected",
    )


def _make_pod_action(action_key, reason_code, *, template_vars=None, issue_type="", detail=""):
    """Build a structured pod action dict from POD_ACTION_MAP."""
    definition = POD_ACTION_MAP.get(action_key, POD_ACTION_MAP["on_track"])

    explanation = definition["explanation_template"]
    label = definition["label"]
    if template_vars:
        try:
            explanation = explanation.format(**template_vars)
        except (KeyError, IndexError):
            pass
        try:
            label = label.format(**template_vars)
        except (KeyError, IndexError):
            pass

    return {
        "action_key": action_key,
        "reason_code": reason_code,
        "priority": definition["priority"],
        "urgency": definition["urgency"],
        "category": definition["category"],
        "top_action": label,
        "explanation": explanation,
        "owner": definition["owner"],
        "cta_label": definition["cta_label"],
        "issue_type": issue_type,
        "detail": detail,
    }




def calculate_pod_health(athlete, members, actions):
    non_coach_inactive = any(
        m["status"] == "inactive" and m["role"] != "club_coach" for m in members
    )
    overdue = sum(1 for a in actions if a.get("status") == "overdue")

    if athlete.get("days_since_activity", 0) > 21 or overdue >= 3:
        return "red"
    if athlete.get("days_since_activity", 0) > 7 or overdue >= 1 or non_coach_inactive:
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
    days = athlete.get("days_since_activity", 0)
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


def generate_recruiting_timeline(athlete):
    """Generate compact recruiting milestones from athlete data."""
    stage = athlete.get("recruiting_stage", "exploring")
    targets = athlete.get("school_targets", 0)
    interest = athlete.get("active_interest", 0)
    days_inactive = athlete.get("days_since_activity", 0)
    now = datetime.now(timezone.utc)

    milestones = []

    # Always: Profile Created
    milestones.append({
        "id": "ms_profile",
        "type": "profile_created",
        "label": "Profile Created",
        "date": (now - timedelta(days=90)).isoformat(),
        "school": None,
        "detail": "Athlete profile set up on CapyMatch",
    })

    # If they have targets: First School Added
    if targets > 0:
        milestones.append({
            "id": "ms_first_school",
            "type": "school_added",
            "label": f"Added {targets} Target Schools",
            "date": (now - timedelta(days=75)).isoformat(),
            "school": None,
            "detail": f"{targets} schools added to pipeline",
        })

    # If actively recruiting: First Outreach
    if stage in ("actively_recruiting", "narrowing"):
        milestones.append({
            "id": "ms_first_outreach",
            "type": "outreach_sent",
            "label": "First Outreach Sent",
            "date": (now - timedelta(days=60)).isoformat(),
            "school": "Multiple Programs",
            "detail": "Initial contact emails sent to coaches",
        })

    # If they have interest: Coach Response
    if interest > 0:
        milestones.append({
            "id": "ms_coach_response",
            "type": "coach_responded",
            "label": f"{interest} Coach{'es' if interest > 1 else ''} Responded",
            "date": (now - timedelta(days=45)).isoformat(),
            "school": None,
            "detail": f"Received responses from {interest} programs",
        })

    # If narrowing: Visit Scheduled
    if stage == "narrowing":
        milestones.append({
            "id": "ms_visit",
            "type": "visit_scheduled",
            "label": "Campus Visit Scheduled",
            "date": (now - timedelta(days=20)).isoformat(),
            "school": "Top Choice Program",
            "detail": "Unofficial visit arranged",
        })

    # Last activity marker
    if days_inactive > 0:
        milestones.append({
            "id": "ms_last_active",
            "type": "last_activity",
            "label": "Last Activity",
            "date": athlete.get("last_activity", now.isoformat()),
            "school": None,
            "detail": f"{days_inactive} days ago" if days_inactive > 0 else "Today",
        })

    return milestones


def generate_recruiting_signals(athlete, interventions, events):
    """Rule-based signal detection — interprets recruiting patterns."""
    signals = []
    targets = athlete.get("school_targets", 0)
    interest = athlete.get("active_interest", 0)
    momentum = athlete.get("momentum_score", 50)
    days_inactive = athlete.get("days_since_activity", 0)
    divisions = athlete.get("recruiting_profile", {}).get("division", [])

    # Signal: Low response rate
    if targets > 3 and interest <= 1:
        signals.append({
            "id": "sig_low_response",
            "type": "warning",
            "title": "Low Coach Response Rate",
            "description": f"Only {interest} of {targets} target schools have responded",
            "recommendation": "Follow up with personalized video or updated stats",
            "priority": "high",
        })

    # Signal: Division mismatch
    if "D1" in divisions and interest == 0 and targets > 2:
        signals.append({
            "id": "sig_d1_silence",
            "type": "insight",
            "title": "No D1 Engagement Yet",
            "description": "Targeting D1 programs but no responses received",
            "recommendation": "Consider expanding to D2 programs or strengthening highlight reel",
            "priority": "medium",
        })

    # Signal: Extended inactivity
    if days_inactive > 14:
        signals.append({
            "id": "sig_inactive",
            "type": "alert",
            "title": "Extended Inactivity",
            "description": f"No recruiting activity in {days_inactive} days",
            "recommendation": "Schedule a check-in call to re-engage athlete and family",
            "priority": "high",
        })

    # Signal: Momentum declining
    if momentum < 30 and athlete.get("momentum_trend") == "declining":
        signals.append({
            "id": "sig_momentum",
            "type": "alert",
            "title": "Momentum Critically Low",
            "description": f"Momentum score at {momentum} and declining",
            "recommendation": "Activate the momentum recovery playbook immediately",
            "priority": "critical",
        })

    # Signal: Upcoming event but no prep
    upcoming_soon = [e for e in events if 0 < e.get("daysAway", 99) <= 3]
    if upcoming_soon:
        signals.append({
            "id": "sig_event_prep",
            "type": "warning",
            "title": f"Event in {upcoming_soon[0]['daysAway']} Day{'s' if upcoming_soon[0]['daysAway'] > 1 else ''}",
            "description": f"{upcoming_soon[0]['name']} is approaching — ensure prep is complete",
            "recommendation": "Review target school list and complete prep checklist",
            "priority": "high",
        })

    # Signal: Good engagement (positive)
    if targets > 0 and interest / max(targets, 1) >= 0.5:
        signals.append({
            "id": "sig_good_engagement",
            "type": "positive",
            "title": "Strong Coach Engagement",
            "description": f"{interest} of {targets} schools are engaging — above average",
            "recommendation": "Focus on deepening relationships with responding programs",
            "priority": "low",
        })

    # Signal: Profile incomplete
    completeness = athlete.get("profile_completeness", 100)
    if completeness < 70:
        signals.append({
            "id": "sig_profile",
            "type": "warning",
            "title": "Profile Incomplete",
            "description": f"Profile is only {completeness}% complete — coaches may skip incomplete profiles",
            "recommendation": "Complete missing profile sections to improve visibility",
            "priority": "medium",
        })

    return signals


INTERVENTION_PLAYBOOKS = {
    "momentum_drop": {
        "title": "Momentum Recovery Plan",
        "description": "Re-engage an athlete whose recruiting activity has stalled",
        "estimated_days": "3-5 days",
        "success_criteria": "Athlete logs at least one recruiting activity within 5 days",
        "steps": [
            {"step": 1, "action": "Call athlete/family to check in on recruiting interest", "owner": "Coach", "days": "Day 1"},
            {"step": 2, "action": "Review and update target school list together", "owner": "Coach + Athlete", "days": "Day 1-2"},
            {"step": 3, "action": "Send follow-up emails to top 3 target schools", "owner": "Athlete", "days": "Day 2-3"},
            {"step": 4, "action": "Log conversation summary and updated plan", "owner": "Coach", "days": "Day 3"},
            {"step": 5, "action": "Schedule next check-in within 1 week", "owner": "Coach", "days": "Day 5"},
        ],
    },
    "blocker": {
        "title": "Blocker Resolution Playbook",
        "description": "Clear a blocking issue that's preventing recruiting progress",
        "estimated_days": "1-3 days",
        "success_criteria": "Blocking issue is resolved or has a clear workaround",
        "steps": [
            {"step": 1, "action": "Identify the specific blocker and who can resolve it", "owner": "Coach", "days": "Day 1"},
            {"step": 2, "action": "Contact the responsible party (parent, school, admin)", "owner": "Coach", "days": "Day 1"},
            {"step": 3, "action": "Follow up if no response within 24 hours", "owner": "Coach", "days": "Day 2"},
            {"step": 4, "action": "Implement resolution or establish workaround", "owner": "Shared", "days": "Day 2-3"},
            {"step": 5, "action": "Verify blocker is cleared and update status", "owner": "Coach", "days": "Day 3"},
        ],
    },
    "deadline_proximity": {
        "title": "Event Prep Checklist",
        "description": "Ensure the athlete is fully prepared for an upcoming event or deadline",
        "estimated_days": "1-2 days",
        "success_criteria": "All prep items completed before the event",
        "steps": [
            {"step": 1, "action": "Confirm target schools attending the event", "owner": "Coach", "days": "Day 1"},
            {"step": 2, "action": "Prepare highlight reel and updated stats", "owner": "Athlete", "days": "Day 1"},
            {"step": 3, "action": "Send pre-event emails to target coaches", "owner": "Athlete", "days": "Day 1"},
            {"step": 4, "action": "Review game plan and talking points", "owner": "Coach + Athlete", "days": "Day 1"},
            {"step": 5, "action": "Confirm logistics (travel, schedule, jersey number)", "owner": "Parent", "days": "Day 1"},
        ],
    },
    "engagement_drop": {
        "title": "Re-engagement Playbook",
        "description": "Revive engagement with schools that have gone quiet",
        "estimated_days": "5-7 days",
        "success_criteria": "At least one previously-silent school re-engages",
        "steps": [
            {"step": 1, "action": "Identify which schools have gone silent and when", "owner": "Coach", "days": "Day 1"},
            {"step": 2, "action": "Draft personalized follow-up messages with new content", "owner": "Coach + Athlete", "days": "Day 2"},
            {"step": 3, "action": "Send follow-ups with updated highlights or stats", "owner": "Athlete", "days": "Day 3"},
            {"step": 4, "action": "Consider expanding target list if pattern persists", "owner": "Coach", "days": "Day 5"},
            {"step": 5, "action": "Log outcomes and adjust strategy", "owner": "Coach", "days": "Day 7"},
        ],
    },
    "ownership_gap": {
        "title": "Ownership Assignment Guide",
        "description": "Assign clear ownership to unassigned recruiting tasks",
        "estimated_days": "1 day",
        "success_criteria": "All open actions have a clear owner",
        "steps": [
            {"step": 1, "action": "Review all unassigned actions in the pod", "owner": "Coach", "days": "Day 1"},
            {"step": 2, "action": "Assign each action to the most appropriate person", "owner": "Coach", "days": "Day 1"},
            {"step": 3, "action": "Notify assigned owners of their new tasks", "owner": "Coach", "days": "Day 1"},
            {"step": 4, "action": "Set due dates for all newly-assigned actions", "owner": "Coach", "days": "Day 1"},
        ],
    },
    "readiness_issue": {
        "title": "Readiness Improvement Plan",
        "description": "Address gaps in the athlete's recruiting readiness",
        "estimated_days": "5-10 days",
        "success_criteria": "Key readiness gaps are closed or have active plans",
        "steps": [
            {"step": 1, "action": "Identify specific readiness gaps (highlight reel, GPA, test scores)", "owner": "Coach", "days": "Day 1"},
            {"step": 2, "action": "Create an action plan for each gap with the athlete", "owner": "Coach + Athlete", "days": "Day 2"},
            {"step": 3, "action": "Begin working on the highest-priority gap", "owner": "Athlete", "days": "Day 3-5"},
            {"step": 4, "action": "Check in on progress midway", "owner": "Coach", "days": "Day 5"},
            {"step": 5, "action": "Update profile and notify target schools of improvements", "owner": "Athlete", "days": "Day 7-10"},
        ],
    },
}


def get_intervention_playbook(category):
    """Return the playbook matching the active intervention category."""
    return INTERVENTION_PLAYBOOKS.get(category)


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
