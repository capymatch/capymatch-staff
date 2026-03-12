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


# Quick-resolve config — only for simple mechanical issues
# Complex issues (blocker, momentum_drop, engagement_drop, family_inactive) are excluded
QUICK_RESOLVE_CONFIG = {
    "ownership_gap": {
        "label": "Assign Owner",
        "action": "assign_owner",
        "description": "Assign all unowned actions to you",
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
        action_ids = [a["id"] for a in unassigned]
        return _make_pod_action(
            "ownership_gap",
            f"ownership_gap:count={len(unassigned)}",
            template_vars={"count": str(len(unassigned)), "s": "s" if len(unassigned) != 1 else ""},
            issue_type=f"{len(unassigned)} unassigned action{'s' if len(unassigned) != 1 else ''}",
            resolve_target_ids=action_ids,
        )

    # Priority 7 removed — family_inactive not applicable without parent accounts

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


def _make_pod_action(action_key, reason_code, *, template_vars=None, issue_type="", detail="", resolve_target_ids=None):
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

    result = {
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
        "quick_resolve": None,
    }

    # Attach quick_resolve only for simple mechanical issues
    qr = QUICK_RESOLVE_CONFIG.get(action_key)
    if qr:
        result["quick_resolve"] = {
            "label": qr["label"],
            "action": qr["action"],
            "target_ids": resolve_target_ids or [],
        }

    return result




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


# ═══════════════════════════════════════════════════════════════
# Parameterized Deterministic Playbooks
#
# Each playbook adapts wording and includes/excludes steps based on
# athlete context. Structure is fixed; content is templated.
# ═══════════════════════════════════════════════════════════════

def _build_playbook_context(athlete, interventions, events):
    """Aggregate athlete state into a flat context dict for playbook templates."""
    days = athlete.get("days_since_activity", 0)
    targets = athlete.get("school_targets", 0)
    interest = athlete.get("active_interest", 0)
    completeness = athlete.get("profile_completeness", 100)
    name = athlete.get("first_name", "the athlete")
    full = athlete.get("full_name", "the athlete")
    last = athlete.get("last_name", "")
    position = athlete.get("position", "")
    grad = athlete.get("grad_year", "")
    video = bool(athlete.get("video_link"))
    video_age_days = 0
    if athlete.get("video_updated_at"):
        try:
            from datetime import datetime, timezone
            vid_dt = datetime.fromisoformat(athlete["video_updated_at"].replace("Z", "+00:00"))
            video_age_days = max(0, (datetime.now(timezone.utc) - vid_dt).days)
        except (ValueError, TypeError):
            pass

    response_rate = round(interest / max(targets, 1) * 100)
    momentum = athlete.get("momentum_score", 50)

    # Intervention details
    int_details = {}
    for i in interventions:
        if i.get("details"):
            int_details[i["category"]] = i["details"]

    # Event proximity
    upcoming = [e for e in events if 0 < e.get("daysAway", 99) <= 7]
    next_event = upcoming[0] if upcoming else None

    # Profile gaps
    missing_assets = []
    if not video:
        missing_assets.append("highlight video")
    if completeness < 80:
        missing_assets.append("profile sections")
    if not athlete.get("gpa"):
        missing_assets.append("GPA / academics")
    if video_age_days > 90:
        missing_assets.append("updated video (current is old)")

    # Blocker detail
    blocker_detail = int_details.get("blocker", {}).get("problem", "an unresolved blocker")

    return {
        "name": name,
        "full_name": full,
        "last_name": last,
        "position": position,
        "grad_year": grad,
        "days_inactive": days,
        "school_targets": targets,
        "active_interest": interest,
        "response_rate": response_rate,
        "profile_completeness": completeness,
        "momentum_score": momentum,
        "momentum_trend": athlete.get("momentum_trend", "stable"),
        "has_video": video,
        "video_age_days": video_age_days,
        "next_event": next_event,
        "event_name": next_event["name"] if next_event else None,
        "event_days_away": next_event["daysAway"] if next_event else None,
        "missing_assets": missing_assets,
        "blocker_detail": blocker_detail,
        "recruiting_stage": athlete.get("recruiting_stage", "unknown"),
        "family_name": f"{last} Family" if last else "the family",
        "int_details": int_details,
    }


def _playbook_momentum_recovery(ctx):
    """Momentum Recovery Plan — adapts to inactivity duration and pipeline state."""
    days = ctx["days_inactive"]
    name = ctx["name"]
    family = ctx["family_name"]
    targets = ctx["school_targets"]
    interest = ctx["active_interest"]
    has_video = ctx["has_video"]

    # Severity-adjusted wording
    if days > 28:
        urgency = "critical"
        call_action = f"Call {name} and {family} — no activity in {days} days. Establish what's blocking progress and agree on immediate next steps"
    elif days > 14:
        urgency = "high"
        call_action = f"Call {name} to check in — inactive for {days} days. Understand if interest has changed or if there's a practical blocker"
    else:
        urgency = "standard"
        call_action = f"Check in with {name} — activity has slowed. Confirm recruiting interest and identify any blockers"

    steps = [
        {"step": 1, "action": call_action, "owner": "Coach", "days": "Day 1"},
        {"step": 2, "action": f"Review and update {name}'s target school list together ({targets} schools currently targeted, {interest} responding)", "owner": "Coach + Athlete", "days": "Day 1-2"},
    ]

    # Conditional: outreach step adapts to pipeline
    if interest == 0 and targets > 0:
        steps.append({"step": 3, "action": f"Send personalized follow-up emails to all {targets} target schools — no responses yet", "owner": "Athlete", "days": "Day 2-3"})
    elif targets > 0:
        steps.append({"step": 3, "action": f"Send follow-up emails to top 3 target schools with updated content", "owner": "Athlete", "days": "Day 2-3"})
    else:
        steps.append({"step": 3, "action": f"Build an initial target school list and send first outreach", "owner": "Coach + Athlete", "days": "Day 2-3"})

    # Conditional: video refresh if old or missing
    if not has_video:
        steps.append({"step": len(steps) + 1, "action": f"Record and upload a highlight video — {name} has no video on profile", "owner": "Athlete", "days": "Day 3-4"})
    elif ctx["video_age_days"] > 60:
        steps.append({"step": len(steps) + 1, "action": f"Update highlight video — current one is {ctx['video_age_days']} days old", "owner": "Athlete", "days": "Day 3-4"})

    steps.append({"step": len(steps) + 1, "action": "Log conversation summary and updated recruiting plan", "owner": "Coach", "days": f"Day {3 if len(steps) <= 4 else 4}"})
    steps.append({"step": len(steps) + 1, "action": "Schedule next check-in within 1 week", "owner": "Coach", "days": f"Day {5 if len(steps) <= 5 else 5}"})

    criteria = f"{name} logs at least one recruiting activity within 5 days"
    if days > 28:
        criteria = f"{name} re-engages with at least one target school or logs meaningful activity within 5 days"

    return {
        "title": "Momentum Recovery Plan",
        "description": f"Re-engage {name} whose recruiting activity has stalled ({days} days inactive, momentum {ctx['momentum_score']})",
        "estimated_days": "3-5 days",
        "success_criteria": criteria,
        "steps": steps,
    }


def _playbook_blocker_resolution(ctx):
    """Blocker Resolution Playbook — adapts to blocker type."""
    name = ctx["name"]
    blocker = ctx["blocker_detail"]

    steps = [
        {"step": 1, "action": f"Identify the specific blocker for {name}: {blocker}", "owner": "Coach", "days": "Day 1"},
        {"step": 2, "action": "Contact the responsible party (parent, school admin, or registrar) to begin resolution", "owner": "Coach", "days": "Day 1"},
        {"step": 3, "action": "Follow up if no response within 24 hours — escalate if needed", "owner": "Coach", "days": "Day 2"},
        {"step": 4, "action": "Implement resolution or establish a workaround so recruiting can continue", "owner": "Shared", "days": "Day 2-3"},
        {"step": 5, "action": f"Verify blocker is cleared and update {name}'s status", "owner": "Coach", "days": "Day 3"},
    ]

    # Conditional: if athlete has been inactive while blocked
    if ctx["days_inactive"] > 14:
        steps.append({"step": 6, "action": f"Schedule a check-in with {name} — {ctx['days_inactive']} days inactive while blocked. Re-engage on recruiting plan", "owner": "Coach", "days": "Day 3"})

    return {
        "title": "Blocker Resolution Playbook",
        "description": f"Clear the blocker preventing {name}'s recruiting progress: {blocker}",
        "estimated_days": "1-3 days",
        "success_criteria": f"Blocker is resolved or has a clear workaround — {name} can resume recruiting",
        "steps": steps,
    }


def _playbook_event_prep(ctx):
    """Event / Deadline Prep Playbook — adapts to event proximity and profile state."""
    name = ctx["name"]
    event = ctx["event_name"] or "upcoming event"
    days_away = ctx["event_days_away"] or 3
    targets = ctx["school_targets"]
    missing = ctx["missing_assets"]

    steps = [
        {"step": 1, "action": f"Confirm which target schools are attending {event}", "owner": "Coach", "days": "Day 1"},
    ]

    # Conditional: only if missing assets
    if missing:
        steps.append({"step": len(steps) + 1, "action": f"Address profile gaps before the event: {', '.join(missing)}", "owner": "Athlete", "days": "Day 1"})
    elif ctx["has_video"]:
        steps.append({"step": len(steps) + 1, "action": f"Prepare updated highlight reel and latest stats for {event}", "owner": "Athlete", "days": "Day 1"})

    steps.append({"step": len(steps) + 1, "action": f"Send pre-event intro emails to target coaches attending {event}", "owner": "Athlete", "days": "Day 1"})
    steps.append({"step": len(steps) + 1, "action": f"Review game plan, talking points, and key matchups for {event}", "owner": "Coach + Athlete", "days": "Day 1"})

    # Conditional: parent logistics if event is soon
    if days_away <= 2:
        steps.append({"step": len(steps) + 1, "action": "Confirm logistics now — travel, schedule, jersey number. Event is imminent", "owner": "Parent", "days": "Today"})
    else:
        steps.append({"step": len(steps) + 1, "action": "Confirm logistics (travel, schedule, jersey number)", "owner": "Parent", "days": "Day 1"})

    est = "1 day" if days_away <= 1 else f"1-{min(days_away, 2)} days"

    return {
        "title": "Event Prep Checklist",
        "description": f"Ensure {name} is fully prepared for {event} ({days_away} day{'s' if days_away != 1 else ''} away)",
        "estimated_days": est,
        "success_criteria": f"All prep items completed before {event}",
        "steps": steps,
    }


def _playbook_reengagement(ctx):
    """Re-engagement Playbook — adapts to pipeline size and response rate."""
    name = ctx["name"]
    targets = ctx["school_targets"]
    interest = ctx["active_interest"]
    rate = ctx["response_rate"]
    has_video = ctx["has_video"]

    silent_count = max(0, targets - interest)

    steps = [
        {"step": 1, "action": f"Identify which {silent_count} of {targets} target schools have gone silent and when contact was last made", "owner": "Coach", "days": "Day 1"},
        {"step": 2, "action": f"Draft personalized follow-up messages for each silent school — include new content or a specific reason to re-engage", "owner": "Coach + Athlete", "days": "Day 2"},
    ]

    # Conditional: what to send depends on available assets
    if has_video and ctx["video_age_days"] <= 30:
        steps.append({"step": 3, "action": f"Send follow-ups with {name}'s recent highlight video and updated stats", "owner": "Athlete", "days": "Day 3"})
    elif has_video:
        steps.append({"step": 3, "action": f"Send follow-ups — consider updating the highlight video first (current is {ctx['video_age_days']} days old)", "owner": "Athlete", "days": "Day 3"})
    else:
        steps.append({"step": 3, "action": f"Send follow-ups with updated stats and academic info — {name} has no highlight video yet", "owner": "Athlete", "days": "Day 3"})

    # Conditional: expand target list if response rate is very low
    if rate < 25 and targets < 10:
        steps.append({"step": 4, "action": f"Expand target school list — only {targets} schools targeted with {rate}% response rate. Consider adding D2/D3 programs or new regions", "owner": "Coach", "days": "Day 5"})
    elif rate < 25:
        steps.append({"step": 4, "action": f"Review targeting strategy — {rate}% response rate across {targets} schools may indicate a positioning issue", "owner": "Coach", "days": "Day 5"})

    steps.append({"step": len(steps) + 1, "action": "Log outcomes for each follow-up and adjust strategy based on responses", "owner": "Coach", "days": "Day 7"})

    return {
        "title": "Re-engagement Playbook",
        "description": f"Revive engagement with {silent_count} silent school{'s' if silent_count != 1 else ''} ({rate}% response rate across {targets} targets)",
        "estimated_days": "5-7 days",
        "success_criteria": f"At least one previously-silent school re-engages with {name}",
        "steps": steps,
    }


def _playbook_ownership_assignment(ctx):
    """Ownership Assignment Playbook — adapts to team composition."""
    name = ctx["name"]

    steps = [
        {"step": 1, "action": f"Review all unassigned actions in {name}'s pod", "owner": "Coach", "days": "Day 1"},
        {"step": 2, "action": "Assign each action to the most appropriate person — coach, athlete, or parent", "owner": "Coach", "days": "Day 1"},
        {"step": 3, "action": "Notify assigned owners of their new tasks via email or message", "owner": "Coach", "days": "Day 1"},
        {"step": 4, "action": "Set due dates for all newly-assigned actions", "owner": "Coach", "days": "Day 1"},
    ]

    # Conditional: if athlete has been inactive, flag that assigning tasks to them may not work
    if ctx["days_inactive"] > 14:
        steps.append({"step": 5, "action": f"Note: {name} has been inactive for {ctx['days_inactive']} days — consider assigning athlete tasks to coach until re-engaged", "owner": "Coach", "days": "Day 1"})

    return {
        "title": "Ownership Assignment Guide",
        "description": f"Assign clear ownership to unassigned recruiting tasks for {name}",
        "estimated_days": "1 day",
        "success_criteria": "All open actions have a clear owner and due date",
        "steps": steps,
    }


def _playbook_readiness(ctx):
    """Readiness Improvement Plan — adapts to specific profile gaps."""
    name = ctx["name"]
    completeness = ctx["profile_completeness"]
    missing = ctx["missing_assets"]
    has_video = ctx["has_video"]

    steps = []

    # Step 1 always: identify gaps
    if missing:
        gap_list = ", ".join(missing)
        steps.append({"step": 1, "action": f"Address these specific gaps for {name}: {gap_list}", "owner": "Coach + Athlete", "days": "Day 1-2"})
    else:
        steps.append({"step": 1, "action": f"Review {name}'s profile ({completeness}% complete) and identify which sections need strengthening", "owner": "Coach", "days": "Day 1"})

    steps.append({"step": 2, "action": f"Create an action plan for each gap with {name} — prioritize what coaches see first", "owner": "Coach + Athlete", "days": "Day 2"})

    # Conditional steps based on what's missing
    if not has_video:
        steps.append({"step": len(steps) + 1, "action": f"Record and upload a highlight video — this is the most impactful missing asset", "owner": "Athlete", "days": "Day 3-5"})
    if ctx["video_age_days"] > 90 and has_video:
        steps.append({"step": len(steps) + 1, "action": f"Re-record highlight video — current one is {ctx['video_age_days']} days old and may not reflect current ability", "owner": "Athlete", "days": "Day 3-5"})

    steps.append({"step": len(steps) + 1, "action": f"Check in on progress — have the highest-priority gaps been addressed?", "owner": "Coach", "days": "Day 5"})
    steps.append({"step": len(steps) + 1, "action": f"Update {name}'s profile and notify target schools of improvements", "owner": "Athlete", "days": "Day 7-10"})

    return {
        "title": "Readiness Improvement Plan",
        "description": f"Address profile and recruiting readiness gaps for {name} (currently {completeness}% complete)",
        "estimated_days": "5-10 days",
        "success_criteria": f"Key readiness gaps are closed — {name}'s profile is coach-ready",
        "steps": steps,
    }


_PLAYBOOK_BUILDERS = {
    "momentum_drop": _playbook_momentum_recovery,
    "blocker": _playbook_blocker_resolution,
    "deadline_proximity": _playbook_event_prep,
    "engagement_drop": _playbook_reengagement,
    "ownership_gap": _playbook_ownership_assignment,
    "readiness_issue": _playbook_readiness,
}


def get_intervention_playbook(category, athlete=None, interventions=None, events=None):
    """Return a parameterized playbook for the given intervention category.
    Falls back to a generic version if no athlete context is provided."""
    builder = _PLAYBOOK_BUILDERS.get(category)
    if not builder:
        return None

    if athlete:
        ctx = _build_playbook_context(athlete, interventions or [], events or [])
        return builder(ctx)

    # Fallback: build with minimal defaults
    ctx = _build_playbook_context(
        {"first_name": "the athlete", "full_name": "the athlete", "last_name": "Athlete",
         "days_since_activity": 0, "school_targets": 0, "active_interest": 0,
         "profile_completeness": 100},
        interventions or [], events or [],
    )
    return builder(ctx)


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
