"""Unified athlete status model — Journey State + Attention Status.

Collects signals from all sources (decision engine, school health, pod issues),
scores each by urgency, and derives two independent dimensions:
- Journey State: recruiting progress (always positive/stable)
- Attention Status: most urgent action needed (only when issues exist)
"""

from datetime import datetime, timezone

# ── CONFIGURABLE URGENCY WEIGHTS ──
# Tune these to change how signals are prioritized.
# All four must sum to 1.0.
URGENCY_WEIGHTS = {
    "severity": 0.40,
    "time_sensitivity": 0.30,
    "opportunity_cost": 0.20,
    "pipeline_impact": 0.10,
}

# ── SEVERITY SCORES ──
SEVERITY_SCORES = {
    "critical": 100,
    "high": 75,
    "medium": 50,
    "low": 25,
}

# ── JOURNEY STATE MAPPING ──
# Derived from the athlete's best pipeline stage (pipeline_best_stage).
JOURNEY_STATE_MAP = {
    "Committed": {"label": "Committed", "color": "#047857", "bg": "rgba(4,120,87,0.08)", "rank": 0},
    "Offer": {"label": "Offer Received", "color": "#059669", "bg": "rgba(5,150,105,0.08)", "rank": 1},
    "Campus Visit": {"label": "Visiting Schools", "color": "#0d9488", "bg": "rgba(13,148,136,0.08)", "rank": 2},
    "Visit Scheduled": {"label": "Visiting Schools", "color": "#0d9488", "bg": "rgba(13,148,136,0.08)", "rank": 2},
    "Visit": {"label": "Visiting Schools", "color": "#0d9488", "bg": "rgba(13,148,136,0.08)", "rank": 2},
    "Interested": {"label": "Building Interest", "color": "#2563eb", "bg": "rgba(37,99,235,0.08)", "rank": 3},
    "In Conversation": {"label": "Building Interest", "color": "#2563eb", "bg": "rgba(37,99,235,0.08)", "rank": 3},
    "Engaged": {"label": "Building Interest", "color": "#2563eb", "bg": "rgba(37,99,235,0.08)", "rank": 3},
    "Contacted": {"label": "Reaching Out", "color": "#64748b", "bg": "rgba(100,116,139,0.08)", "rank": 4},
    "Initial Contact": {"label": "Reaching Out", "color": "#64748b", "bg": "rgba(100,116,139,0.08)", "rank": 4},
}
JOURNEY_STATE_DEFAULT = {"label": "Getting Started", "color": "#94a3b8", "bg": "rgba(148,163,184,0.08)", "rank": 5}

# ── ATTENTION STATUS LABELS ──
# The label is derived from the nature of the winning signal.
ATTENTION_LABEL_MAP = {
    "blocker": {"label": "Blocker", "color": "#dc2626", "bg": "rgba(220,38,38,0.08)"},
    "urgent_followup": {"label": "Urgent Follow-up", "color": "#d97706", "bg": "rgba(217,119,6,0.08)"},
    "at_risk": {"label": "At Risk", "color": "#ef4444", "bg": "rgba(239,68,68,0.08)"},
    "needs_review": {"label": "Needs Review", "color": "#6366f1", "bg": "rgba(99,102,241,0.08)"},
    "all_clear": {"label": "All Clear", "color": "#10b981", "bg": "rgba(16,185,129,0.08)"},
}

# ── SIGNAL SOURCE → ATTENTION NATURE MAPPING ──
# Maps raw signal types to which attention label they produce.
SIGNAL_NATURE = {
    # Pod issue types
    "overdue_actions": "blocker",
    "missing_blocker": "blocker",
    "stalled_pipeline": "blocker",
    "missing_document": "blocker",
    # Decision engine categories
    "blocker": "blocker",
    "momentum_drop": "needs_review",
    "engagement_drop": "at_risk",
    "deadline_proximity": "urgent_followup",
    "event_follow_up": "urgent_followup",
    "readiness_issue": "needs_review",
    "ownership_gap": "needs_review",
    # School health states
    "at_risk": "at_risk",
    "cooling_off": "at_risk",
    "needs_attention": "at_risk",
    "needs_follow_up": "urgent_followup",
}


def compute_journey_state(athlete: dict) -> dict:
    """Derive journey state from the athlete's best pipeline stage.

    Always returns a positive/stable milestone — never overridden by negatives.
    """
    best_stage = athlete.get("pipeline_best_stage", "")
    return JOURNEY_STATE_MAP.get(best_stage, JOURNEY_STATE_DEFAULT)


def compute_urgency_score(signal: dict) -> float:
    """Compute a 0–100 urgency score for a normalized signal.

    Uses configurable weights across four dimensions.
    """
    severity_raw = SEVERITY_SCORES.get(signal.get("severity", "medium"), 50)
    time_raw = signal.get("time_sensitivity", 20)
    opportunity_raw = signal.get("opportunity_cost", 20)
    pipeline_raw = signal.get("pipeline_impact", 20)

    score = (
        severity_raw * URGENCY_WEIGHTS["severity"]
        + time_raw * URGENCY_WEIGHTS["time_sensitivity"]
        + opportunity_raw * URGENCY_WEIGHTS["opportunity_cost"]
        + pipeline_raw * URGENCY_WEIGHTS["pipeline_impact"]
    )
    return round(min(100, score), 1)


def normalize_decision_engine_signal(intervention: dict) -> dict:
    """Convert a decision engine intervention into a normalized signal."""
    category = intervention.get("category", "")
    nature = SIGNAL_NATURE.get(category, "needs_review")
    raw_urgency = intervention.get("urgency", 0)

    # Severity: blockers can be critical, others cap at high
    if nature == "blocker" and raw_urgency >= 7:
        severity = "critical"
    elif raw_urgency >= 8:
        severity = "high"  # Non-blockers cap at high even with high urgency
    elif raw_urgency >= 5:
        severity = "high"
    elif raw_urgency >= 3:
        severity = "medium"
    else:
        severity = "low"

    # Time sensitivity
    time_sensitivity = 20
    if category == "deadline_proximity":
        time_sensitivity = 80
    elif category == "event_follow_up":
        time_sensitivity = 60
    elif category in ("blocker", "momentum_drop"):
        time_sensitivity = 40

    # Opportunity cost
    opportunity_cost = 20
    if category == "event_follow_up":
        opportunity_cost = 60
    elif category == "blocker":
        opportunity_cost = 50

    return {
        "source": "decision_engine",
        "type": category,
        "nature": nature,
        "severity": severity,
        "time_sensitivity": time_sensitivity,
        "opportunity_cost": opportunity_cost,
        "pipeline_impact": 20,
        "reason": intervention.get("why_this_surfaced", ""),
        "details": intervention.get("details", {}),
    }


def normalize_pod_issue_signal(issue: dict) -> dict:
    """Convert an active pod_issue into a normalized signal."""
    issue_type = issue.get("type", "")
    severity = issue.get("severity", "medium")

    # Pod issues like overdue_actions are always time-sensitive and blocking
    time_sensitivity = 60 if severity == "critical" else 40
    opportunity_cost = 60 if issue_type in ("overdue_actions", "missing_blocker") else 30

    return {
        "source": "pod_issues",
        "type": issue_type,
        "nature": SIGNAL_NATURE.get(issue_type, "blocker"),
        "severity": severity,
        "time_sensitivity": time_sensitivity,
        "opportunity_cost": opportunity_cost,
        "pipeline_impact": 30,
        "reason": issue.get("title", "Active issue"),
        "details": {"issue_id": issue.get("id")},
    }


def normalize_school_alert_signal(school: dict) -> dict:
    """Convert a school health alert into a normalized signal."""
    health = school.get("health", "")
    university = school.get("university_name", "Unknown")

    severity = "high" if health == "at_risk" else "medium"
    time_sensitivity = 30  # School relationships don't expire overnight
    opportunity_cost = 50 if health == "at_risk" else 30

    # Schools at advanced stages matter more
    stage = school.get("recruiting_status", "")
    pipeline_impact = 20
    if stage in ("Campus Visit", "Visit Scheduled", "Offer", "Interested"):
        pipeline_impact = 70
    elif stage in ("Contacted", "Initial Contact", "In Conversation"):
        pipeline_impact = 40

    return {
        "source": "school_health",
        "type": health,
        "nature": SIGNAL_NATURE.get(health, "at_risk"),
        "severity": severity,
        "time_sensitivity": time_sensitivity,
        "opportunity_cost": opportunity_cost,
        "pipeline_impact": pipeline_impact,
        "reason": f"{university} is {health.replace('_', ' ')}",
        "details": {"university_name": university, "health": health},
    }


def derive_attention_status(signals: list) -> dict:
    """From a list of scored signals, derive the primary attention status + secondary context.

    Returns:
        {
            "primary": { "label", "color", "bg", "reason", "nature", "score" } or None,
            "secondary": [ { "reason", "nature" }, ... ],
            "total_issues": int,
        }
    """
    if not signals:
        return {
            "primary": None,
            "secondary": [],
            "total_issues": 0,
        }

    # Score and sort all signals
    scored = []
    for s in signals:
        s["urgency_score"] = compute_urgency_score(s)
        scored.append(s)

    scored.sort(key=lambda s: (-s["urgency_score"], SEVERITY_SCORES.get(s.get("severity"), 50) * -1))

    winner = scored[0]
    nature = winner.get("nature", "needs_review")
    label_config = ATTENTION_LABEL_MAP.get(nature, ATTENTION_LABEL_MAP["needs_review"])

    primary = {
        "label": label_config["label"],
        "color": label_config["color"],
        "bg": label_config["bg"],
        "reason": winner["reason"],
        "nature": nature,
        "score": winner["urgency_score"],
    }

    secondary = [
        {"reason": s["reason"], "nature": s.get("nature", "needs_review")}
        for s in scored[1:]
    ]

    return {
        "primary": primary,
        "secondary": secondary,
        "total_issues": len(scored),
    }
