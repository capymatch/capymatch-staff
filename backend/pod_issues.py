"""
Pod Issues — Issue lifecycle management for athlete Support Pods.

Issues are discrete intervention episodes (incidents), not static labels.
Each issue has a lifecycle: created → active → resolved.
If a similar problem recurs, a NEW issue instance is created.

Auto-resolution rules:
- momentum_drop / inactivity → resolves on check-in or interaction logged
- follow_up_overdue → resolves on outreach sent or follow-up logged
- engagement_drop → resolves on interaction logged
- event_prep → resolves on related prep task completed
- overdue_actions → resolves when overdue count drops to 0
- missing_blocker → manual resolution only
"""

import uuid
from datetime import datetime, timezone
from db_client import db


# ─── Issue type definitions ───────────────────────────────────────────

ISSUE_TYPES = {
    "missing_blocker": {
        "severity": "critical",
        "title_template": "Active Blocker — {detail}",
        "description_template": "{detail}. Resolve it to unblock the recruiting pipeline.",
        "auto_resolve": False,
    },
    "momentum_drop": {
        "severity": "critical",
        "title_template": "Momentum Drop — No activity in {days_inactive} days",
        "description_template": "Athlete has gone dark. Immediate check-in needed to prevent further momentum loss.",
        "auto_resolve": True,
        "resolve_on": ["check_in_logged", "interaction_logged"],
    },
    "overdue_actions": {
        "severity": "critical",
        "title_template": "{count} Overdue Action{s}",
        "description_template": "Actions are past due. The oldest is {days_old} day{s2} late.",
        "auto_resolve": True,
        "resolve_on": ["overdue_cleared"],
    },
    "deadline_proximity": {
        "severity": "high",
        "title_template": "Upcoming Event — Prep Needed",
        "description_template": "An event or deadline is approaching. Ensure the athlete is prepared.",
        "auto_resolve": True,
        "resolve_on": ["prep_task_completed"],
    },
    "engagement_drop": {
        "severity": "high",
        "title_template": "Engagement Dropping",
        "description_template": "School engagement is declining. Follow up to maintain recruiting momentum.",
        "auto_resolve": True,
        "resolve_on": ["interaction_logged", "outreach_sent"],
    },
    "follow_up_overdue": {
        "severity": "high",
        "title_template": "Follow-Up Overdue",
        "description_template": "Scheduled follow-ups are past due. Outreach is needed.",
        "auto_resolve": True,
        "resolve_on": ["outreach_sent", "follow_up_logged"],
    },
    "ownership_gap": {
        "severity": "medium",
        "title_template": "{count} Unassigned Action{s}",
        "description_template": "Actions have no owner. Assign them to keep progress moving.",
        "auto_resolve": True,
        "resolve_on": ["ownership_assigned"],
    },
    "readiness_issue": {
        "severity": "medium",
        "title_template": "Profile Readiness Gaps",
        "description_template": "Profile gaps may be limiting recruiting visibility.",
        "auto_resolve": False,
    },
}

SEVERITY_PRIORITY = {"critical": 1, "high": 2, "medium": 3}

_index_created = False

async def _ensure_index():
    """Create a unique compound index to prevent duplicate active issues."""
    global _index_created
    if _index_created:
        return
    await db.pod_issues.create_index(
        [("athlete_id", 1), ("type", 1), ("status", 1)],
        unique=True,
        partialFilterExpression={"status": "active"},
        name="unique_active_issue_per_type",
    )
    _index_created = True


# ─── Issue creation (idempotent) ──────────────────────────────────────

async def ensure_issue(athlete_id: str, issue_type: str, source_context: dict = None):
    """Create an issue only if no active issue of this type exists for the athlete.
    Returns the active issue (existing or newly created)."""
    if issue_type not in ISSUE_TYPES:
        return None

    await _ensure_index()

    existing = await db.pod_issues.find_one(
        {"athlete_id": athlete_id, "type": issue_type, "status": "active"},
        {"_id": 0},
    )
    if existing:
        # Update source_context if it changed (e.g. days_inactive increased)
        if source_context and source_context != existing.get("source_context"):
            defn = ISSUE_TYPES[issue_type]
            ctx = source_context or {}
            try:
                new_title = defn["title_template"].format(**ctx)
            except (KeyError, IndexError):
                new_title = existing.get("title", "")
            try:
                new_desc = defn["description_template"].format(**ctx)
            except (KeyError, IndexError):
                new_desc = existing.get("description", "")
            await db.pod_issues.update_one(
                {"id": existing["id"]},
                {"$set": {"source_context": source_context, "title": new_title, "description": new_desc}},
            )
            existing["source_context"] = source_context
            existing["title"] = new_title
            existing["description"] = new_desc
        return existing

    # Cooldown: don't re-create if same type was resolved in the last 24 hours
    # BUT only if the condition has actually improved (resolution_source != manual)
    # If the caller is still detecting the same condition, the issue should be re-created
    recently_resolved = await db.pod_issues.find_one(
        {"athlete_id": athlete_id, "type": issue_type, "status": "resolved"},
        {"_id": 0},
        sort=[("resolved_at", -1)],
    )
    if recently_resolved and recently_resolved.get("resolved_at"):
        try:
            resolved_dt = datetime.fromisoformat(recently_resolved["resolved_at"].replace("Z", "+00:00"))
            cooldown_secs = (datetime.now(timezone.utc) - resolved_dt).total_seconds()
            # Only enforce cooldown if resolution was triggered by a real action
            # (auto-resolve, check-in, etc.), not a manual resolve from UI
            # Short 2-hour cooldown for action-based resolutions to prevent flapping
            if cooldown_secs < 7200 and recently_resolved.get("resolution_source") not in ("manual", "Manual", None):
                return None  # Short cooldown after legitimate resolution
        except (ValueError, TypeError):
            pass

    defn = ISSUE_TYPES[issue_type]
    ctx = source_context or {}
    now = datetime.now(timezone.utc).isoformat()

    # Determine instance number
    prev_count = await db.pod_issues.count_documents(
        {"athlete_id": athlete_id, "type": issue_type}
    )

    title = defn["title_template"]
    description = defn["description_template"]
    try:
        title = title.format(**ctx)
    except (KeyError, IndexError):
        pass
    try:
        description = description.format(**ctx)
    except (KeyError, IndexError):
        pass

    issue = {
        "id": str(uuid.uuid4()),
        "athlete_id": athlete_id,
        "type": issue_type,
        "severity": defn["severity"],
        "title": title,
        "description": description,
        "status": "active",
        "created_at": now,
        "resolved_at": None,
        "resolved_by": None,
        "resolution_source": None,
        "source_context": ctx,
        "instance_number": prev_count + 1,
    }
    try:
        await db.pod_issues.insert_one(issue)
    except Exception:
        # Unique index violation — another request already created it
        existing = await db.pod_issues.find_one(
            {"athlete_id": athlete_id, "type": issue_type, "status": "active"},
            {"_id": 0},
        )
        return existing
    issue.pop("_id", None)
    return issue


# ─── Issue evaluation — scan conditions and ensure issues ─────────────

async def evaluate_issues(athlete_id: str, athlete: dict, interventions: list, actions: list):
    """Evaluate athlete state and create/update issues as needed.
    Called on pod load. Idempotent — safe to call repeatedly."""
    now = datetime.now(timezone.utc)
    days_inactive = athlete.get("days_since_activity", 0)
    categories = {i.get("category") for i in interventions}

    # Active (non-completed) actions
    active_actions = [a for a in actions if a.get("status") not in ("completed", "cancelled", "escalated")]
    overdue = []
    for a in active_actions:
        if a.get("due_date"):
            try:
                due = datetime.fromisoformat(a["due_date"].replace("Z", "+00:00"))
                if due < now:
                    overdue.append(a)
            except (ValueError, TypeError):
                pass
    unassigned = [a for a in active_actions if a.get("owner") in ("Unassigned", None, "")]

    # ── Check each condition ──

    # Blockers
    if "blocker" in categories:
        blocker = next((i for i in interventions if i["category"] == "blocker"), None)
        detail = ""
        if blocker:
            detail = blocker.get("why_this_surfaced") or blocker.get("details", {}).get("problem", blocker.get("reason", "Unresolved blocker"))
        await ensure_issue(athlete_id, "missing_blocker", {"detail": detail})

    # Momentum drop
    if days_inactive > 14 or "momentum_drop" in categories:
        await ensure_issue(athlete_id, "momentum_drop", {"days_inactive": days_inactive})

    # Overdue actions
    if overdue:
        oldest_days = 0
        for a in overdue:
            try:
                due = datetime.fromisoformat(a["due_date"].replace("Z", "+00:00"))
                oldest_days = max(oldest_days, (now - due).days)
            except (ValueError, TypeError):
                pass
        await ensure_issue(athlete_id, "overdue_actions", {
            "count": len(overdue),
            "s": "s" if len(overdue) != 1 else "",
            "days_old": oldest_days,
            "s2": "s" if oldest_days != 1 else "",
        })
    else:
        # Auto-resolve overdue issue if overdue count is now 0
        await auto_resolve_by_type(athlete_id, "overdue_actions", "overdue_cleared", "System")

    # Deadline proximity
    if "deadline_proximity" in categories:
        await ensure_issue(athlete_id, "deadline_proximity", {})

    # Engagement drop
    if "engagement_drop" in categories:
        await ensure_issue(athlete_id, "engagement_drop", {
            "school_count_no_response": 0,
        })

    # Ownership gap
    if unassigned:
        await ensure_issue(athlete_id, "ownership_gap", {
            "count": len(unassigned),
            "s": "s" if len(unassigned) != 1 else "",
        })
    else:
        await auto_resolve_by_type(athlete_id, "ownership_gap", "ownership_assigned", "System")

    # Readiness issue
    if "readiness_issue" in categories:
        await ensure_issue(athlete_id, "readiness_issue", {})


# ─── Get current active issue (highest priority) ─────────────────────

async def get_current_issue(athlete_id: str):
    """Return the highest-priority active issue, or None.

    Auto-resolves stale momentum_drop issues when pipeline momentum is high,
    since momentum is now based on pipeline progress, not activity recency.
    """
    active = await db.pod_issues.find(
        {"athlete_id": athlete_id, "status": "active"},
        {"_id": 0},
    ).to_list(20)

    if not active:
        return None

    # Auto-resolve momentum_drop issues that are no longer valid
    # under the pipeline-based momentum model
    from services.athlete_store import get_all as get_athletes
    athlete = next((a for a in get_athletes() if a["id"] == athlete_id), None)
    pipeline_momentum = athlete.get("pipeline_momentum", 0) if athlete else 0

    still_active = []
    for issue in active:
        if issue.get("type") == "momentum_drop" and pipeline_momentum >= 50:
            # Auto-resolve: pipeline progress makes this irrelevant
            now = datetime.now(timezone.utc).isoformat()
            await db.pod_issues.update_one(
                {"id": issue["id"]},
                {"$set": {"status": "resolved", "resolved_at": now,
                          "resolved_by": "system", "resolution_source": "auto_pipeline_momentum"}}
            )
            continue
        still_active.append(issue)

    if not still_active:
        return None

    # Sort by severity priority
    still_active.sort(key=lambda i: SEVERITY_PRIORITY.get(i.get("severity"), 99))
    return still_active[0]


async def get_all_active_issues(athlete_id: str):
    """Return all active issues sorted by priority."""
    active = await db.pod_issues.find(
        {"athlete_id": athlete_id, "status": "active"},
        {"_id": 0},
    ).to_list(20)
    active.sort(key=lambda i: SEVERITY_PRIORITY.get(i.get("severity"), 99))
    return active


# ─── Resolution ───────────────────────────────────────────────────────

async def resolve_issue(issue_id: str, resolved_by: str, resolution_source: str):
    """Resolve a specific issue and log it to the timeline."""
    issue = await db.pod_issues.find_one({"id": issue_id, "status": "active"}, {"_id": 0})
    if not issue:
        return None

    now = datetime.now(timezone.utc).isoformat()
    await db.pod_issues.update_one(
        {"id": issue_id},
        {"$set": {
            "status": "resolved",
            "resolved_at": now,
            "resolved_by": resolved_by,
            "resolution_source": resolution_source,
        }},
    )

    # Log resolution to timeline
    source_labels = {
        "check_in_logged": "check-in logged",
        "interaction_logged": "interaction logged",
        "outreach_sent": "outreach sent",
        "follow_up_logged": "follow-up logged",
        "prep_task_completed": "prep task completed",
        "overdue_cleared": "overdue actions cleared",
        "ownership_assigned": "actions assigned",
        "manual": "manually by coach",
    }
    source_label = source_labels.get(resolution_source, resolution_source)

    await db.pod_action_events.insert_one({
        "id": str(uuid.uuid4()),
        "athlete_id": issue["athlete_id"],
        "type": "issue_resolved",
        "description": f'Issue resolved: "{issue["title"]}" — {source_label}',
        "actor": resolved_by,
        "issue_id": issue_id,
        "issue_type": issue["type"],
        "resolution_source": resolution_source,
        "created_at": now,
    })

    issue["status"] = "resolved"
    issue["resolved_at"] = now
    issue["resolved_by"] = resolved_by
    issue["resolution_source"] = resolution_source
    return issue


async def auto_resolve_by_type(athlete_id: str, issue_type: str, resolution_source: str, resolved_by: str):
    """Auto-resolve all active issues of a given type for an athlete."""
    active = await db.pod_issues.find(
        {"athlete_id": athlete_id, "type": issue_type, "status": "active"},
        {"_id": 0},
    ).to_list(10)

    for issue in active:
        await resolve_issue(issue["id"], resolved_by, resolution_source)


async def auto_resolve_on_interaction(athlete_id: str, actor_name: str):
    """Called when a coach logs a check-in or interaction.
    Resolves: momentum_drop, engagement_drop, follow_up_overdue."""
    for issue_type, source in [
        ("momentum_drop", "check_in_logged"),
        ("engagement_drop", "interaction_logged"),
        ("follow_up_overdue", "interaction_logged"),
    ]:
        await auto_resolve_by_type(athlete_id, issue_type, source, actor_name)


async def auto_resolve_on_outreach(athlete_id: str, actor_name: str):
    """Called when outreach/email is sent.
    Resolves: follow_up_overdue, engagement_drop."""
    for issue_type, source in [
        ("follow_up_overdue", "outreach_sent"),
        ("engagement_drop", "outreach_sent"),
    ]:
        await auto_resolve_by_type(athlete_id, issue_type, source, actor_name)
