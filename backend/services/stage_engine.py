"""Stage Engine — Single Source of Truth for pipeline stage computation.

Sprint 3: Stage/Progress Consolidation.

This module is the ONLY place where pipeline_stage and board_group
are computed. No other file may independently derive stage.

Canonical Fields:
    recruiting_status  — user-controlled intent (7-value enum)
    pipeline_stage     — system-derived factual stage (7-value enum)
    board_group        — derived view bucket (never stored)

Rules:
    1. recruiting_status is source of truth for intent
    2. pipeline_stage = base_stage(recruiting_status) + signal upgrades
    3. Signals may only upgrade added→outreach and outreach→in_conversation
    4. Stages >= in_conversation are LOCKED to recruiting_status
    5. pipeline_stage_rank >= base_stage_rank (no downward contradiction)
    6. Archived overrides everything
    7. Stale engagement does NOT downgrade stage
"""

from datetime import datetime, timezone

# ── Canonical Enums ──────────────────────────────────────────────────────

RECRUITING_STATUS_ENUM = (
    "Not Contacted",
    "Contacted",
    "In Conversation",
    "Campus Visit",
    "Offer",
    "Committed",
    "Archived",
)

PIPELINE_STAGE_ENUM = (
    "archived",
    "added",
    "outreach",
    "in_conversation",
    "campus_visit",
    "offer",
    "committed",
)

# ── Rank Maps (central, reused everywhere) ───────────────────────────────

PIPELINE_STAGE_RANK = {
    "archived": -1,
    "added": 0,
    "outreach": 1,
    "in_conversation": 2,
    "campus_visit": 3,
    "offer": 4,
    "committed": 5,
}

RECRUITING_STATUS_RANK = {
    "Archived": -1,
    "Not Contacted": 0,
    "Contacted": 1,
    "In Conversation": 2,
    "Campus Visit": 3,
    "Offer": 4,
    "Committed": 5,
}

# ── Base Mapping: recruiting_status → pipeline_stage ─────────────────────

_BASE_STAGE_MAP = {
    "Not Contacted": "added",
    "Contacted": "outreach",
    "In Conversation": "in_conversation",
    "Campus Visit": "campus_visit",
    "Offer": "offer",
    "Committed": "committed",
    "Archived": "archived",
}

# ── Legacy Normalization Map ─────────────────────────────────────────────

NORMALIZE_RECRUITING_STATUS = {
    # Already canonical (identity)
    "Not Contacted": "Not Contacted",
    "Contacted": "Contacted",
    "In Conversation": "In Conversation",
    "Campus Visit": "Campus Visit",
    "Offer": "Offer",
    "Committed": "Committed",
    "Archived": "Archived",
    # Legacy values
    "Prospect": "Not Contacted",
    "Added": "Not Contacted",
    "": "Not Contacted",
    "Initial Contact": "Contacted",
    "Interested": "In Conversation",
    "Engaged": "In Conversation",
    "Active Conversation": "In Conversation",
    "Some Interest": "In Conversation",
    "Applied": "In Conversation",
    "Visit Scheduled": "Campus Visit",
    "Visit": "Campus Visit",
    "Camp Attended": "Campus Visit",
    "Offer Received": "Offer",
    "archived": "Archived",
    # Lowercase variants
    "not contacted": "Not Contacted",
    "contacted": "Contacted",
    "in conversation": "In Conversation",
    "campus visit": "Campus Visit",
    "offer": "Offer",
    "committed": "Committed",
    "prospect": "Not Contacted",
    "interested": "In Conversation",
    "engaged": "In Conversation",
    "initial contact": "Contacted",
    "active": "In Conversation",
}


def normalize_recruiting_status(raw: str | None) -> str:
    """Normalize any recruiting_status value to the canonical enum.

    Returns canonical value. Unknown values default to 'Not Contacted'.
    """
    if not raw:
        return "Not Contacted"
    stripped = raw.strip()
    return NORMALIZE_RECRUITING_STATUS.get(stripped,
           NORMALIZE_RECRUITING_STATUS.get(stripped.lower(), "Not Contacted"))


# ── Core Stage Computation ───────────────────────────────────────────────

def compute_pipeline_stage(program: dict, signals: dict | None = None) -> str:
    """Compute the canonical pipeline_stage for a program.

    Args:
        program: Program document (must have recruiting_status).
        signals: Canonical signals dict from program_metrics.extract_signals().

    Returns:
        One of PIPELINE_STAGE_ENUM values.

    Rules applied (in order):
        1. Normalize recruiting_status
        2. Archived override
        3. Map to base stage
        4. Apply signal upgrades (added→outreach, outreach→in_conversation)
        5. Enforce no-downward-contradiction
        6. Stages >= in_conversation are locked
    """
    raw_status = program.get("recruiting_status", "Not Contacted")
    status = normalize_recruiting_status(raw_status)

    # Rule 7: Archived override
    if status == "Archived" or not program.get("is_active", True):
        return "archived"

    # Rule 2: Base mapping
    base = _BASE_STAGE_MAP.get(status, "added")
    base_rank = PIPELINE_STAGE_RANK[base]

    # Rule 5: Stages >= in_conversation are LOCKED to base
    if base_rank >= PIPELINE_STAGE_RANK["in_conversation"]:
        return base

    # Rule 4: Signal upgrades (only for added and outreach)
    if signals:
        stage = base
        stage_rank = base_rank

        # added + outreach_count > 0 → outreach
        if stage == "added" and signals.get("outreach_count", 0) > 0:
            stage = "outreach"
            stage_rank = PIPELINE_STAGE_RANK["outreach"]

        # outreach + has_coach_reply → in_conversation
        if stage == "outreach" and signals.get("has_coach_reply", False):
            stage = "in_conversation"
            stage_rank = PIPELINE_STAGE_RANK["in_conversation"]

        # Rule 6: No downward contradiction
        if stage_rank >= base_rank:
            return stage

    return base


def compute_board_group(program: dict, pipeline_stage: str) -> str:
    """Derive board_group from pipeline_stage + urgency. Never stored.

    Evaluation order (first match wins):
        1. archived
        2. overdue (next_action_due in the past)
        3. in_conversation (stage >= in_conversation)
        4. waiting_on_reply (stage == outreach)
        5. needs_outreach (stage == added)
    """
    # 1. Archived
    if pipeline_stage == "archived":
        return "archived"

    # 2. Overdue
    next_due = program.get("next_action_due", "")
    if next_due and pipeline_stage != "committed":
        try:
            due_date = datetime.strptime(str(next_due)[:10], "%Y-%m-%d").date()
            if due_date < datetime.now(timezone.utc).date():
                return "overdue"
        except (ValueError, TypeError):
            pass

    # 3-5. Stage-based
    rank = PIPELINE_STAGE_RANK.get(pipeline_stage, 0)
    if rank >= PIPELINE_STAGE_RANK["in_conversation"]:
        return "in_conversation"
    if pipeline_stage == "outreach":
        return "waiting_on_reply"
    return "needs_outreach"


def compute_journey_rail(program: dict, pipeline_stage: str, signals: dict | None = None) -> dict:
    """Compute the 6-stage journey rail visualization from pipeline_stage.

    This replaces the old compute_journey_rail() in athlete_dashboard.py.
    The rail shows which stages have been completed, based on the canonical
    pipeline_stage (cascade fill up to current stage).
    """
    RAIL_ORDER = ["added", "outreach", "in_conversation", "campus_visit", "offer", "committed"]

    if pipeline_stage == "archived":
        pipeline_stage = "added"

    current_rank = PIPELINE_STAGE_RANK.get(pipeline_stage, 0)

    stages = {}
    for s in RAIL_ORDER:
        stages[s] = PIPELINE_STAGE_RANK[s] <= current_rank

    # Active = the pipeline_stage itself
    active = pipeline_stage if pipeline_stage in RAIL_ORDER else "added"

    # Pulse — relationship health from activity recency
    days = (signals or {}).get("days_since_activity")
    if days is None:
        pulse = "neutral"
    elif days <= 7:
        pulse = "hot"
    elif days <= 14:
        pulse = "warm"
    else:
        pulse = "cold"

    return {
        "stages": stages,
        "active": active,
        "line_fill": active,
        "pulse": pulse,
    }


# ── Auto-Normalization (write-time corrections) ─────────────────────────

def compute_auto_corrections(program: dict, signals: dict | None = None) -> dict | None:
    """Check if recruiting_status should be auto-corrected based on signals.

    Returns a dict of fields to update, or None if no correction needed.

    Auto-correction rules (write-time, not read-time):
        1. outreach_count > 0 AND recruiting_status == "Not Contacted"
           → recruiting_status = "Contacted"
        2. has_coach_reply AND recruiting_status == "Contacted"
           → recruiting_status = "In Conversation"
    """
    if not signals:
        return None

    raw_status = program.get("recruiting_status", "Not Contacted")
    status = normalize_recruiting_status(raw_status)
    corrections = {}

    # Rule: outreach detected but still "Not Contacted"
    if status == "Not Contacted" and signals.get("outreach_count", 0) > 0:
        corrections["recruiting_status"] = "Contacted"

    # Rule: coach replied but still "Contacted"
    if status == "Contacted" and signals.get("has_coach_reply", False):
        corrections["recruiting_status"] = "In Conversation"

    if corrections:
        corrections["updated_at"] = datetime.now(timezone.utc).isoformat()
        return corrections

    return None
