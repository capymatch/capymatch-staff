"""Top Action Engine — determines the single most important action per school.

Deterministic rules engine that evaluates each program and produces:
  - action_key: machine-readable action type
  - reason_code: debuggable reason for the chosen action
  - label: human-friendly action text
  - owner: who should take this action (athlete / parent / coach / shared)
  - explanation: short context sentence
  - cta_label: button text
  - priority: numeric (1 = highest)

Priority order:
  1. Coach flags
  2. Director actions
  3. Overdue follow-up
  4. Reply needed / unanswered coach question
  5. Due today
  6. First outreach needed
  7. Engagement slowing / re-engage
  8. No action needed
"""

import logging
from datetime import datetime, timezone, timedelta
from db_client import db

log = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════
# ACTION MAP — centralized language table
# ═══════════════════════════════════════════════════════════════════════

ACTION_MAP = {
    # --- Priority 1: Coach flags ---
    "coach_flag_reply_needed": {
        "priority": 1,
        "label": "Reply to Coach Now",
        "owner": "athlete",
        "explanation_template": "Your club coach flagged this — they expect a reply from you",
        "cta_label": "Reply Now",
        "category": "coach_flag",
    },
    "coach_flag_update_requested": {
        "priority": 1,
        "label": "Send Updated Info",
        "owner": "athlete",
        "explanation_template": "Coach requested updated information — send it before they follow up",
        "cta_label": "Send Update",
        "category": "coach_flag",
    },
    "coach_flag_general": {
        "priority": 1,
        "label": "Review Coach Flag",
        "owner": "athlete",
        "explanation_template": "Your club coach flagged this for your attention — check the details",
        "cta_label": "Review Flag",
        "category": "coach_flag",
    },

    # --- Priority 2: Coach-assigned action items ---
    "coach_assigned_action": {
        "priority": 2,
        "label": "Complete Coach's Task",
        "owner": "athlete",
        "explanation_template": "{coach_name} assigned you a task: {action_title}",
        "cta_label": "Take Action",
        "category": "coach_flag",
    },

    # --- Priority 3: Director actions ---
    "director_action_open": {
        "priority": 3,
        "label": "Action Required from Director",
        "owner": "shared",
        "explanation_template": "Your director raised an action — review and respond",
        "cta_label": "Review Action",
        "category": "director_action",
    },

    # --- Priority 4: Overdue follow-up ---
    "overdue_followup": {
        "priority": 4,
        "label": "Follow Up Now — {days_overdue}d Overdue",
        "owner": "athlete",
        "explanation_template": "This follow-up is {days_overdue} day{s} late. Send a quick message to keep momentum",
        "cta_label": "Follow Up Now",
        "category": "past_due",
    },

    # --- Priority 5: Reply needed ---
    "reply_to_coach_question": {
        "priority": 5,
        "label": "Answer Coach's Question",
        "owner": "athlete",
        "explanation_template": "A coach asked you a question — reply to keep the conversation moving",
        "cta_label": "Reply Now",
        "category": "reply_needed",
    },
    "reply_to_coach_message": {
        "priority": 5,
        "label": "Reply to Coach Message",
        "owner": "athlete",
        "explanation_template": "Coach reached out — a timely reply shows strong interest",
        "cta_label": "Reply Now",
        "category": "reply_needed",
    },

    # --- Priority 6: Due today ---
    "due_today": {
        "priority": 6,
        "label": "Follow Up Today",
        "owner": "athlete",
        "explanation_template": "You have a follow-up scheduled for today — don't let it slip",
        "cta_label": "Follow Up",
        "category": "due_today",
    },

    # --- Priority 6: First outreach ---
    "send_intro_email": {
        "priority": 6,
        "label": "Send Your Intro Email",
        "owner": "athlete",
        "explanation_template": "You added this school but haven't reached out yet — make your first impression",
        "cta_label": "Start Outreach",
        "category": "first_outreach",
    },

    # --- Priority 7: Engagement slowing ---
    "follow_up_this_week": {
        "priority": 7,
        "label": "Check In This Week",
        "owner": "athlete",
        "explanation_template": "It's been {days} days since last contact. A short check-in keeps you on their radar",
        "cta_label": "Send Check-In",
        "category": "cooling_off",
    },
    "reengage_relationship": {
        "priority": 7,
        "label": "Re-engage This Program",
        "owner": "athlete",
        "explanation_template": "This relationship has gone quiet — send an update or schedule touchpoint",
        "cta_label": "Re-engage",
        "category": "cooling_off",
    },

    # --- Priority 8: No action ---
    "no_action_needed": {
        "priority": 8,
        "label": "On Track",
        "owner": "athlete",
        "explanation_template": "Everything looks good — keep the momentum going",
        "cta_label": "View School",
        "category": "on_track",
    },
}


# ═══════════════════════════════════════════════════════════════════════
# PUBLIC API
# ═══════════════════════════════════════════════════════════════════════

async def compute_top_action(program_id: str, tenant_id: str, *, metrics: dict = None) -> dict:
    """Compute the single top action for a program. Returns action dict."""
    program = await db.programs.find_one(
        {"program_id": program_id, "tenant_id": tenant_id}, {"_id": 0}
    )
    if not program:
        return _make_action("no_action_needed", "program_not_found", program_id=program_id)

    # Get athlete for ID lookups
    athlete = await db.athletes.find_one({"tenant_id": tenant_id}, {"_id": 0})
    athlete_id = (athlete or {}).get("id", "")

    # Get or use provided metrics
    if not metrics:
        from services.program_metrics import get_metrics
        metrics = await get_metrics(program_id, tenant_id)

    now = datetime.now(timezone.utc)

    # ── Priority 1: Coach flags ──
    active_flags = await db.coach_flags.find(
        {"program_id": program_id, "tenant_id": tenant_id, "status": {"$in": ["active", "pending"]}},
        {"_id": 0},
    ).sort("created_at", -1).to_list(5)

    if active_flags:
        flag = active_flags[0]
        reason = (flag.get("reason") or "").lower()
        if "reply" in reason:
            action_key = "coach_flag_reply_needed"
        elif "update" in reason or "info" in reason:
            action_key = "coach_flag_update_requested"
        else:
            action_key = "coach_flag_general"

        return _make_action(
            action_key,
            f"coach_flag:{flag.get('flag_id', '')}:{flag.get('reason', '')}",
            program_id=program_id,
            university_name=program.get("university_name", ""),
            extra_context={
                "coach_name": flag.get("coach_name", ""),
                "flag_reason": flag.get("reason", ""),
                "flag_note": flag.get("note", ""),
            },
        )

    # ── Priority 2: Coach-assigned action items (from school pod) ──
    assigned_actions = await db.pod_actions.find(
        {
            "program_id": program_id,
            "athlete_id": athlete_id,
            "assigned_to_athlete": True,
            "status": {"$in": ["ready", "open"]},
        },
        {"_id": 0},
    ).sort("created_at", -1).to_list(5)

    if assigned_actions:
        action = assigned_actions[0]
        return _make_action(
            "coach_assigned_action",
            f"coach_action:{action.get('id', '')}:{action.get('title', '')}",
            program_id=program_id,
            university_name=program.get("university_name", ""),
            template_vars={
                "coach_name": action.get("created_by", "Your coach"),
                "action_title": action.get("title", ""),
            },
        )

    # ── Priority 3: Director actions ──
    open_actions = await db.director_actions.find(
        {"athlete_id": athlete_id, "status": {"$in": ["open", "acknowledged"]}},
        {"_id": 0},
    ).sort("created_at", -1).to_list(5)

    # Filter to program-relevant actions (if program-linked)
    program_actions = [a for a in open_actions if a.get("program_id") == program_id]
    if not program_actions:
        # Director actions may be athlete-wide, not program-specific
        program_actions = open_actions[:1] if open_actions else []

    if program_actions:
        action = program_actions[0]
        return _make_action(
            "director_action_open",
            f"director_action:{action.get('action_id', '')}:{action.get('action_type', '')}",
            program_id=program_id,
            university_name=program.get("university_name", ""),
        )

    # ── Priority 3: Overdue follow-up ──
    next_due = program.get("next_action_due")
    next_due_date = None
    if next_due:
        today = now.strftime("%Y-%m-%d")
        try:
            # Handle both "YYYY-MM-DD" and full ISO timestamps like "2026-03-17T20:51:37+00:00"
            due_str = next_due[:10] if len(next_due) >= 10 else next_due
            next_due_date = due_str
            diff = (datetime.strptime(today, "%Y-%m-%d") - datetime.strptime(due_str, "%Y-%m-%d")).days
        except (ValueError, TypeError):
            diff = 0

        if diff > 0:
            return _make_action(
                "overdue_followup",
                f"overdue:{diff}d:{next_due}",
                program_id=program_id,
                university_name=program.get("university_name", ""),
                template_vars={"days_overdue": str(diff), "s": "s" if diff != 1 else ""},
            )

    # ── Priority 4: Reply needed ──
    unanswered = metrics.get("unanswered_coach_questions", 0)
    if unanswered > 0:
        return _make_action(
            "reply_to_coach_question",
            f"unanswered_questions:{unanswered}",
            program_id=program_id,
            university_name=program.get("university_name", ""),
        )

    # Check if last interaction was a coach reply that hasn't been responded to
    health = metrics.get("pipeline_health_state", "")
    if health == "awaiting_reply":
        last_type = metrics.get("last_meaningful_engagement_type", "")
        if last_type and "coach" in last_type.lower():
            return _make_action(
                "reply_to_coach_message",
                f"awaiting_reply:last_type={last_type}",
                program_id=program_id,
                university_name=program.get("university_name", ""),
            )

    # ── Priority 5: Due today ──
    if next_due:
        today = now.strftime("%Y-%m-%d")
        if next_due_date == today:
            return _make_action(
                "due_today",
                f"due_today:{next_due}",
                program_id=program_id,
                university_name=program.get("university_name", ""),
            )

    # ── Priority 6: First outreach needed ──
    # Sprint 3 SSOT: use canonical pipeline_stage
    from services.stage_engine import compute_pipeline_stage
    from services.program_metrics import extract_signals
    pipeline_stage = program.get("pipeline_stage") or compute_pipeline_stage(program, extract_signals(metrics))
    is_uncontacted = pipeline_stage == "added"
    if is_uncontacted:
        return _make_action(
            "send_intro_email",
            f"first_outreach:stage={pipeline_stage}",
            program_id=program_id,
            university_name=program.get("university_name", ""),
        )

    # ── Priority 7: Engagement slowing ──
    days_meaningful = metrics.get("days_since_last_meaningful_engagement")
    if health in ("cooling_off", "at_risk"):
        action_key = "reengage_relationship"
        if days_meaningful and days_meaningful <= 30:
            action_key = "follow_up_this_week"
        return _make_action(
            action_key,
            f"engagement:{health}:days={days_meaningful}",
            program_id=program_id,
            university_name=program.get("university_name", ""),
            template_vars={"days": str(days_meaningful or "?")},
        )

    if health == "needs_follow_up":
        return _make_action(
            "follow_up_this_week",
            f"engagement:needs_follow_up:days={days_meaningful}",
            program_id=program_id,
            university_name=program.get("university_name", ""),
            template_vars={"days": str(days_meaningful or "?")},
        )

    # ── Priority 8: No action ──
    return _make_action(
        "no_action_needed",
        f"on_track:health={health}",
        program_id=program_id,
        university_name=program.get("university_name", ""),
    )


async def compute_all_top_actions(tenant_id: str) -> list:
    """Compute top actions for all active programs for a tenant.
    Returns list of action dicts sorted by priority (highest first).
    Uses batch queries instead of per-program N+1."""
    import asyncio

    programs = await db.programs.find(
        {"tenant_id": tenant_id, "is_active": {"$ne": False}},
        {"_id": 0},
    ).to_list(200)

    # Exclude committed (Sprint 3 SSOT: canonical recruiting_status only)
    from services.stage_engine import normalize_recruiting_status
    active = [
        p for p in programs
        if normalize_recruiting_status(p.get("recruiting_status")) != "Committed"
    ]

    program_ids = [p["program_id"] for p in active]
    if not program_ids:
        return []

    # Get athlete ID for pod/director action lookups
    athlete_doc = await db.athletes.find_one({"tenant_id": tenant_id}, {"_id": 0, "id": 1})
    athlete_id = (athlete_doc or {}).get("id", "")

    # Batch-fetch ALL related data in parallel
    metrics_fut = db.program_metrics.find(
        {"program_id": {"$in": program_ids}, "tenant_id": tenant_id},
        {"_id": 0},
    ).to_list(len(program_ids))

    flags_fut = db.coach_flags.find(
        {"program_id": {"$in": program_ids}, "tenant_id": tenant_id, "status": {"$in": ["active", "pending"]}},
        {"_id": 0},
    ).sort("created_at", -1).to_list(500)

    futs = [metrics_fut, flags_fut]

    if athlete_id:
        futs.append(db.pod_actions.find(
            {"program_id": {"$in": program_ids}, "athlete_id": athlete_id, "assigned_to_athlete": True, "status": {"$in": ["ready", "open"]}},
            {"_id": 0},
        ).sort("created_at", -1).to_list(500))
        futs.append(db.director_actions.find(
            {"athlete_id": athlete_id, "status": {"$in": ["open", "acknowledged"]}},
            {"_id": 0},
        ).sort("created_at", -1).to_list(500))

    results = await asyncio.gather(*futs, return_exceptions=True)
    metrics_list = results[0] if not isinstance(results[0], Exception) else []
    flags_list = results[1] if not isinstance(results[1], Exception) else []
    pod_list = results[2] if len(results) > 2 and not isinstance(results[2], Exception) else []
    dir_list = results[3] if len(results) > 3 and not isinstance(results[3], Exception) else []

    metrics_map = {m["program_id"]: m for m in metrics_list}

    # Index batch data by program_id
    flags_by_pid = {}
    for f in flags_list:
        flags_by_pid.setdefault(f["program_id"], []).append(f)
    pod_by_pid = {}
    for pa in pod_list:
        pod_by_pid.setdefault(pa["program_id"], []).append(pa)

    actions = []
    for p in active:
        pid = p["program_id"]
        m = metrics_map.get(pid, {})
        try:
            action = await _compute_top_action_batched(
                p, tenant_id, m,
                flags_by_pid.get(pid, []),
                pod_by_pid.get(pid, []),
                dir_list,
                athlete_id,
            )
            actions.append(action)
        except Exception as e:
            log.warning(f"Failed to compute top action for {pid}: {e}")

    # Sort by priority (lower = higher priority), then by university name
    actions.sort(key=lambda a: (a["priority"], a.get("university_name", "")))
    return actions


async def _compute_top_action_batched(
    program: dict, tenant_id: str, metrics: dict,
    flags: list, pod_actions: list, all_director_actions: list,
    athlete_id: str,
) -> dict:
    """Compute top action for a single program using pre-fetched batch data (no extra DB calls)."""
    program_id = program["program_id"]
    now = datetime.now(timezone.utc)

    # Priority 1: Coach flags
    if flags:
        flag = flags[0]
        reason = (flag.get("reason") or "").lower()
        if "reply" in reason:
            action_key = "coach_flag_reply_needed"
        elif "update" in reason or "info" in reason:
            action_key = "coach_flag_update_requested"
        else:
            action_key = "coach_flag_general"
        return _make_action(
            action_key,
            f"coach_flag:{flag.get('flag_id', '')}:{flag.get('reason', '')}",
            program_id=program_id,
            university_name=program.get("university_name", ""),
            extra_context={
                "coach_name": flag.get("coach_name", ""),
                "flag_reason": flag.get("reason", ""),
                "flag_note": flag.get("note", ""),
            },
        )

    # Priority 2: Coach-assigned actions
    if pod_actions:
        action = pod_actions[0]
        return _make_action(
            "coach_assigned_action",
            f"coach_action:{action.get('id', '')}:{action.get('title', '')}",
            program_id=program_id,
            university_name=program.get("university_name", ""),
            template_vars={
                "coach_name": action.get("created_by", "Your coach"),
                "action_title": action.get("title", ""),
            },
        )

    # Priority 3: Director actions
    program_actions = [a for a in all_director_actions if a.get("program_id") == program_id]
    if not program_actions:
        program_actions = all_director_actions[:1] if all_director_actions else []
    if program_actions:
        action = program_actions[0]
        return _make_action(
            "director_action_open",
            f"director_action:{action.get('action_id', '')}:{action.get('action_type', '')}",
            program_id=program_id,
            university_name=program.get("university_name", ""),
        )

    # Priority 3: Overdue follow-up
    next_due = program.get("next_action_due")
    next_due_date = None
    if next_due:
        today = now.strftime("%Y-%m-%d")
        try:
            due_str = next_due[:10] if len(next_due) >= 10 else next_due
            next_due_date = due_str
            diff = (datetime.strptime(today, "%Y-%m-%d") - datetime.strptime(due_str, "%Y-%m-%d")).days
        except (ValueError, TypeError):
            diff = 0
        if diff > 0:
            return _make_action(
                "overdue_followup",
                f"overdue:{diff}d:{next_due}",
                program_id=program_id,
                university_name=program.get("university_name", ""),
                template_vars={"days_overdue": str(diff), "s": "s" if diff != 1 else ""},
            )

    # Priority 4: Reply needed
    unanswered = metrics.get("unanswered_coach_questions", 0)
    if unanswered > 0:
        return _make_action(
            "reply_to_coach_question",
            f"unanswered_questions:{unanswered}",
            program_id=program_id,
            university_name=program.get("university_name", ""),
        )
    health = metrics.get("pipeline_health_state", "")
    if health == "awaiting_reply":
        last_type = metrics.get("last_meaningful_engagement_type", "")
        if last_type and "coach" in last_type.lower():
            return _make_action(
                "reply_to_coach_message",
                f"awaiting_reply:last_type={last_type}",
                program_id=program_id,
                university_name=program.get("university_name", ""),
            )

    # Priority 5: Due today
    if next_due:
        today = now.strftime("%Y-%m-%d")
        if next_due_date == today:
            return _make_action(
                "due_today",
                f"due_today:{next_due}",
                program_id=program_id,
                university_name=program.get("university_name", ""),
            )

    # Priority 6: First outreach needed
    from services.stage_engine import compute_pipeline_stage
    from services.program_metrics import extract_signals
    pipeline_stage = program.get("pipeline_stage") or compute_pipeline_stage(program, extract_signals(metrics))
    is_uncontacted = pipeline_stage == "added"
    if is_uncontacted:
        return _make_action(
            "send_intro_email",
            f"first_outreach:stage={pipeline_stage}",
            program_id=program_id,
            university_name=program.get("university_name", ""),
        )

    # Priority 7: Engagement slowing
    days_meaningful = metrics.get("days_since_last_meaningful_engagement")
    if health in ("cooling_off", "at_risk"):
        action_key = "reengage_relationship"
        if days_meaningful and days_meaningful <= 30:
            action_key = "follow_up_this_week"
        return _make_action(
            action_key,
            f"engagement:{health}:days={days_meaningful}",
            program_id=program_id,
            university_name=program.get("university_name", ""),
            template_vars={"days": str(days_meaningful or "?")},
        )
    if health == "needs_follow_up":
        return _make_action(
            "follow_up_this_week",
            f"engagement:needs_follow_up:days={days_meaningful}",
            program_id=program_id,
            university_name=program.get("university_name", ""),
            template_vars={"days": str(days_meaningful or "?")},
        )

    # Priority 8: No action
    return _make_action(
        "no_action_needed",
        f"on_track:health={health}",
        program_id=program_id,
        university_name=program.get("university_name", ""),
    )


# ═══════════════════════════════════════════════════════════════════════
# INTERNAL HELPERS
# ═══════════════════════════════════════════════════════════════════════

def _make_action(
    action_key: str,
    reason_code: str,
    *,
    program_id: str = "",
    university_name: str = "",
    template_vars: dict = None,
    extra_context: dict = None,
) -> dict:
    """Build a structured action dict from the ACTION_MAP."""
    definition = ACTION_MAP.get(action_key, ACTION_MAP["no_action_needed"])

    explanation = definition["explanation_template"]
    label = definition["label"]
    if template_vars:
        try:
            explanation = explanation.format(**template_vars)
        except (KeyError, IndexError):
            pass  # Keep template as-is if vars don't match
        try:
            label = label.format(**template_vars)
        except (KeyError, IndexError):
            pass

    return {
        "program_id": program_id,
        "university_name": university_name,
        "action_key": action_key,
        "reason_code": reason_code,
        "priority": definition["priority"],
        "category": definition["category"],
        "label": label,
        "owner": definition["owner"],
        "explanation": explanation,
        "cta_label": definition["cta_label"],
        **({"context": extra_context} if extra_context else {}),
    }
