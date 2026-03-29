"""Risk Engine v3 — Severity, Trajectory, Confidence, Intervention.

Deterministic, rule-based risk evaluation for athlete-school pairs
and athlete-level grouped risk items.

Extends the existing signal system with:
  - Severity scoring with stage-aware weighting
  - Compound risk interaction multipliers
  - Trajectory inference from recent patterns
  - Confidence classification
  - Intervention type classification
  - Role-aware action recommendations
  - "Why now" explanations
"""

from datetime import datetime, timezone, timedelta

# ═══════════════════════════════════════════════════════════════
# CONSTANTS
# ═══════════════════════════════════════════════════════════════

# Base severity score per signal type (0-100 scale)
SIGNAL_BASE_SCORE = {
    "escalation":        70,
    "missing_documents": 60,
    "no_coach_assigned": 55,
    "overdue_followup":  55,
    "stalled_stage":     50,
    "event_blocker":     50,
    "awaiting_reply":    40,
    "no_activity":       35,
    "follow_up":         30,
}

# Stage multipliers — higher stages = more at stake
STAGE_MULTIPLIER = {
    "Offer":            1.5,
    "Campus Visit":     1.4,
    "Visit":            1.4,
    "Visit Scheduled":  1.4,
    "In Conversation":  1.25,
    "Engaged":          1.25,
    "Interested":       1.3,
    "Talking":          1.2,
    "Contacted":        1.0,
    "Initial Contact":  1.0,
    "Prospect":         0.9,
    "Added":            0.8,
    "Not Contacted":    0.8,
}

# Compound risk interaction rules: (signal_a, signal_b) -> multiplier
COMPOUND_RULES = [
    ({"no_activity", "awaiting_reply"},       1.40, "Conversation has stalled — risk of losing momentum"),
    ({"missing_documents", "event_blocker"},  1.50, "Missing requirement may block an upcoming deadline"),
    ({"no_coach_assigned", "no_activity"},    1.35, "No coach and no activity — athlete is drifting without support"),
    ({"escalation", "no_activity"},           1.30, "Escalated issue with no recent engagement — momentum at risk"),
    ({"escalation", "awaiting_reply"},        1.25, "Escalated with a pending reply — response delay may hurt"),
    ({"no_activity", "follow_up"},            1.20, "Overdue follow-up with no recent activity"),
    ({"missing_documents", "no_activity"},    1.25, "Missing docs and no momentum — progress likely blocked"),
    ({"stalled_stage", "no_activity"},        1.30, "Pipeline stalled with no engagement — relationship cooling"),
    ({"overdue_followup", "no_activity"},     1.45, "Overdue school follow-ups compounded by overall inactivity — relationships at risk"),
    ({"overdue_followup", "awaiting_reply"},  1.30, "Overdue follow-ups with pending replies — schools may lose interest"),
]

# Severity bands
def _severity_band(score):
    if score >= 76:
        return "critical"
    if score >= 56:
        return "high"
    if score >= 31:
        return "medium"
    return "low"

# Confidence rules per signal
CONFIDENCE_MAP = {
    "escalation":        "high",
    "missing_documents": "high",
    "no_coach_assigned": "high",
    "overdue_followup":  "high",
    "event_blocker":     "high",
    "stalled_stage":     "medium",
    "awaiting_reply":    "medium",
    "no_activity":       "medium",
    "follow_up":         "medium",
}

# Human-readable signal labels
SIGNAL_LABELS = {
    "escalation":        "Escalated issue",
    "awaiting_reply":    "Awaiting reply",
    "follow_up":         "Needs follow-up",
    "no_activity":       "No activity",
    "missing_documents": "Missing requirement",
    "no_coach_assigned": "No coach assigned",
    "stalled_stage":     "Stalled stage",
    "event_blocker":     "Event/timeline blocker",
    "overdue_followup":  "Overdue follow-up",
}

# Intervention mapping: (severity, trajectory) -> intervention type
INTERVENTION_MATRIX = {
    ("critical", "worsening"):  "blocker",
    ("critical", "stable"):     "escalate",
    ("critical", "improving"):  "review",
    ("high",     "worsening"):  "escalate",
    ("high",     "stable"):     "review",
    ("high",     "improving"):  "nudge",
    ("medium",   "worsening"):  "review",
    ("medium",   "stable"):     "nudge",
    ("medium",   "improving"):  "monitor",
    ("low",      "worsening"):  "nudge",
    ("low",      "stable"):     "monitor",
    ("low",      "improving"):  "monitor",
}


# ═══════════════════════════════════════════════════════════════
# ROLE-AWARE ACTION RECOMMENDATIONS
# ═══════════════════════════════════════════════════════════════

def _role_actions(intervention_type, primary_signal, school_name=None):
    """Return recommended actions per role based on intervention type."""

    school_ctx = f" for {school_name}" if school_name else ""

    ROLE_ACTIONS = {
        "blocker": {
            "escalation":        {"director": "Review escalation and assign owner", "coach": "Respond to escalation immediately", "family": "Contact your recruiting coordinator"},
            "missing_documents": {"director": f"Review blocker{school_ctx}", "coach": f"Request missing document{school_ctx}", "family": "Upload missing document"},
            "no_coach_assigned": {"director": "Assign coach immediately", "coach": None, "family": "Contact program director"},
            "_default":          {"director": "Review and resolve blocker", "coach": "Address critical issue", "family": "Check in with your coordinator"},
        },
        "escalate": {
            "escalation":        {"director": "Review escalation and determine next steps", "coach": "Re-engage and provide update", "family": "Respond to outreach"},
            "no_coach_assigned": {"director": "Assign coach and review outreach plan", "coach": None, "family": "Reach out to program director"},
            "no_activity":       {"director": f"Escalate re-engagement{school_ctx}", "coach": f"Re-engage school{school_ctx}", "family": "Respond to coach request"},
            "awaiting_reply":    {"director": "Review stalled conversation", "coach": f"Re-engage{school_ctx}", "family": "Respond to pending message"},
            "overdue_followup":  {"director": f"Review overdue school follow-ups{school_ctx}", "coach": f"Send overdue follow-ups{school_ctx}", "family": "Check in with coach about school outreach"},
            "_default":          {"director": "Review and escalate", "coach": "Take immediate action", "family": "Check in with your team"},
        },
        "review": {
            "missing_documents": {"director": f"Review requirement status{school_ctx}", "coach": f"Follow up on documents{school_ctx}", "family": "Check document status"},
            "stalled_stage":     {"director": f"Review stalled pipeline{school_ctx}", "coach": f"Assess next move{school_ctx}", "family": "Ask about recruiting status"},
            "overdue_followup":  {"director": f"Review overdue follow-ups{school_ctx}", "coach": f"Prioritize overdue school contacts{school_ctx}", "family": "Ask about school communication status"},
            "_default":          {"director": "Review current status", "coach": "Provide status update", "family": "Check in with your coordinator"},
        },
        "nudge": {
            "awaiting_reply":    {"director": "Approve suggested follow-up", "coach": f"Send follow-up{school_ctx}", "family": "Check in with athlete"},
            "no_activity":       {"director": "Approve suggested nudge", "coach": f"Send check-in{school_ctx}", "family": "Check in with athlete"},
            "follow_up":         {"director": "Approve follow-up", "coach": f"Send follow-up message{school_ctx}", "family": "Encourage athlete to respond"},
            "_default":          {"director": "Approve suggested nudge", "coach": "Send follow-up", "family": "Check in with athlete"},
        },
        "monitor": {
            "_default":          {"director": "No action needed — monitoring", "coach": "Keep monitoring", "family": None},
        },
    }

    bucket = ROLE_ACTIONS.get(intervention_type, ROLE_ACTIONS["monitor"])
    actions = bucket.get(primary_signal, bucket.get("_default", {}))

    # Filter out None values
    return {k: v for k, v in actions.items() if v is not None}


# ═══════════════════════════════════════════════════════════════
# WHY NOW EXPLANATIONS
# ═══════════════════════════════════════════════════════════════

def _why_now(primary_signal, secondary_signals, severity, trajectory, best_stage, school_name, days_inactive, compound_desc):
    """Generate a concise one-sentence urgency explanation.

    CRITICAL RULE: whyNow must never contradict the trajectory.
    - If trajectory=improving, acknowledge the recent action but note residual risk.
    - If trajectory=worsening, emphasise deterioration.
    - If trajectory=stable, state current risk plainly.
    """

    stage_ctx = f"{best_stage}-stage" if best_stage else ""
    school_ctx = school_name or "this school"

    # ── Improving: always acknowledge the positive signal first ──
    if trajectory == "improving":
        base = _why_now_improving(primary_signal, secondary_signals, stage_ctx, school_ctx, days_inactive, severity)
        if base:
            return base

    # ── Compound-risk driven why-now ──
    if compound_desc:
        return compound_desc

    # ── Signal-specific (stable / worsening) ──
    if primary_signal == "escalation":
        if trajectory == "worsening":
            return f"Unresolved escalation — engagement may slip further."
        return f"Escalated issue awaiting review."

    if primary_signal == "no_coach_assigned":
        if "no_activity" in secondary_signals:
            return f"No coach and no recent activity — athlete is drifting."
        return f"Without a coach, this athlete can't get guided support."

    if primary_signal == "missing_documents":
        if best_stage in ("Offer", "Campus Visit", "Visit", "Visit Scheduled"):
            return f"Missing requirement could block {stage_ctx} progress."
        return f"Missing requirement may delay next steps."

    if primary_signal == "no_activity":
        if trajectory == "worsening" and days_inactive and days_inactive > 21:
            return f"No activity in {days_inactive} days and getting worse."
        if best_stage in ("Offer", "Campus Visit", "Visit", "In Conversation", "Engaged"):
            return f"Relationship with {school_ctx} is at risk of going cold."
        if days_inactive and days_inactive > 21:
            return f"No activity in {days_inactive} days — momentum is fading."
        return f"Inactivity may cause momentum to drop."

    if primary_signal == "awaiting_reply":
        if days_inactive and days_inactive > 10:
            return f"Reply is overdue — conversation with {school_ctx} may go cold."
        return f"Pending reply — delay reduces response likelihood."

    if primary_signal == "follow_up":
        return f"Follow-up delay may reduce response likelihood."

    if primary_signal == "stalled_stage":
        return f"No movement at {stage_ctx} — relationship may be cooling."

    if primary_signal == "event_blocker":
        return f"Upcoming event requires prep to avoid a missed opportunity."

    if primary_signal == "overdue_followup":
        if "no_activity" in secondary_signals:
            return f"Overdue school follow-ups compounded by inactivity — schools may lose interest."
        if trajectory == "worsening":
            return f"Overdue follow-ups and situation getting worse — act before schools disengage."
        return f"School follow-ups are past due — delays risk cooling relationships."

    # Fallback
    if severity == "critical":
        return f"Multiple signals suggest this needs attention now."
    if trajectory == "worsening":
        return f"Situation is trending the wrong way — act soon."
    return f"Worth checking in to keep things on track."


def _why_now_improving(primary, secondary, stage_ctx, school_ctx, days_inactive, severity):
    """Generate whyNow text that acknowledges recent positive action
    while making clear the underlying risk is not resolved."""

    if primary == "escalation":
        if "no_activity" in secondary:
            return f"Recent action taken, but long inactivity means risk remains."
        return f"Recent action taken on escalation — monitor for resolution."

    if primary == "no_activity":
        if days_inactive and days_inactive > 14:
            return f"Recent follow-up sent after {days_inactive} days of silence — still at risk."
        return f"Recent action taken, but momentum remains low."

    if primary == "awaiting_reply":
        return f"Follow-up sent to {school_ctx} — awaiting response."

    if primary == "missing_documents":
        return f"Progress on requirements, but not yet complete."

    if primary == "stalled_stage":
        return f"Recent movement, but {stage_ctx} pipeline was stalled."

    if primary == "no_coach_assigned":
        return f"Assignment in progress — athlete still needs a coach."

    if primary == "follow_up":
        return f"Follow-up was sent recently — watch for response."

    # Generic improving fallback
    if severity in ("critical", "high"):
        return f"Recent action taken, but underlying risk is still serious."
    return f"Trending in the right direction — keep monitoring."


# ═══════════════════════════════════════════════════════════════
# TRAJECTORY INFERENCE
# ═══════════════════════════════════════════════════════════════

def infer_trajectory(issue_keys, days_inactive, recent_actions, stage_entered_days_ago, issue_age_days):
    """Infer trajectory from recent signal patterns.

    Returns: "improving" | "stable" | "worsening"

    Rules (ordered by priority):
    - Recent action taken (autopilot, message) in last 3 days → improving
    - Stage recently entered (< 5 days) → improving
    - Long-standing issues (>14d) with no action → worsening
    - Multiple compound issues → worsening
    - Days inactive > 21 → worsening
    - Overdue follow-up + no activity → worsening
    - Otherwise → stable
    """
    has_recent_action = recent_actions > 0

    # Improving signals
    if has_recent_action:
        return "improving"
    if stage_entered_days_ago is not None and stage_entered_days_ago < 5:
        return "improving"

    # Worsening signals
    compound_count = len(issue_keys)
    if compound_count >= 3:
        return "worsening"
    if days_inactive is not None and days_inactive > 21:
        return "worsening"
    if issue_age_days is not None and issue_age_days > 14 and compound_count >= 2:
        return "worsening"
    if "no_activity" in issue_keys and "awaiting_reply" in issue_keys:
        return "worsening"
    if "no_activity" in issue_keys and "follow_up" in issue_keys:
        return "worsening"
    if "no_coach_assigned" in issue_keys and "no_activity" in issue_keys:
        return "worsening"

    return "stable"


# ═══════════════════════════════════════════════════════════════
# CONFIDENCE
# ═══════════════════════════════════════════════════════════════

def compute_confidence(issue_keys):
    """Return overall confidence based on signal mix.

    - Any explicit blocker (missing doc, no coach, escalation) → high
    - Mix of medium-confidence signals → medium
    - Single weak signal → low
    """
    has_high = any(CONFIDENCE_MAP.get(k) == "high" for k in issue_keys)
    has_medium = any(CONFIDENCE_MAP.get(k) == "medium" for k in issue_keys)

    if has_high:
        return "high"
    if has_medium:
        if len(issue_keys) >= 2:
            return "high"
        return "medium"
    return "low"


# ═══════════════════════════════════════════════════════════════
# CORE SCORING
# ═══════════════════════════════════════════════════════════════

def compute_risk_score(issue_keys, best_stage=None, days_inactive=None, issue_age_days=None):
    """Compute a 0-100 risk score with stage-aware weighting and compound interactions.

    Steps:
    1. Sum base scores for all signals
    2. Apply stage multiplier (highest stage)
    3. Apply compound interaction multipliers
    4. Clamp to 0-100
    """
    if not issue_keys:
        return 0, None

    # Step 1: Base score = highest signal score + diminishing adds
    sorted_scores = sorted(
        [SIGNAL_BASE_SCORE.get(k, 25) for k in issue_keys],
        reverse=True,
    )
    base = sorted_scores[0]
    for i, s in enumerate(sorted_scores[1:], 1):
        # Diminishing returns: each additional signal adds 30% of its base
        base += s * 0.3

    # Step 2: Stage multiplier
    stage_mult = STAGE_MULTIPLIER.get(best_stage, 1.0) if best_stage else 1.0
    score = base * stage_mult

    # Step 3: Compound interaction multipliers
    issue_set = set(issue_keys)
    best_compound_mult = 1.0
    best_compound_desc = None
    for rule_signals, mult, desc in COMPOUND_RULES:
        if rule_signals.issubset(issue_set) and mult > best_compound_mult:
            best_compound_mult = mult
            best_compound_desc = desc
    score *= best_compound_mult

    # Step 4: Time decay boost (older issues score slightly higher)
    if days_inactive and days_inactive > 14:
        time_boost = min(1.15, 1.0 + (days_inactive - 14) * 0.005)
        score *= time_boost

    # Clamp
    score = max(0, min(100, round(score)))

    return score, best_compound_desc


# ═══════════════════════════════════════════════════════════════
# EXPLANATION SHORT
# ═══════════════════════════════════════════════════════════════

def _explanation_short(issue_keys, severity, school_name, best_stage):
    """Brief summary of what's happening."""
    labels = [SIGNAL_LABELS.get(k, k) for k in issue_keys]
    joined = " · ".join(labels)

    if school_name and best_stage:
        return f"{joined} — {school_name} ({best_stage})"
    if school_name:
        return f"{joined} — {school_name}"
    if best_stage:
        return f"{joined} ({best_stage})"
    return joined


# ═══════════════════════════════════════════════════════════════
# PUBLIC API: evaluate_risk
# ═══════════════════════════════════════════════════════════════

def evaluate_risk(
    issue_keys,
    best_stage=None,
    school_name=None,
    days_inactive=None,
    issue_age_days=None,
    recent_actions_count=0,
    stage_entered_days_ago=None,
):
    """Evaluate risk for an athlete (or athlete-school pair).

    Parameters:
    -----------
    issue_keys : list[str]
        Raw issue keys: "escalation", "no_activity", etc.
    best_stage : str, optional
        Highest recruiting stage for this athlete (or specific school).
    school_name : str, optional
        School context for explanations.
    days_inactive : int, optional
        Days since last activity.
    issue_age_days : int, optional
        Days since the oldest issue was first detected.
    recent_actions_count : int
        Number of autopilot/manual actions in last 7 days.
    stage_entered_days_ago : int, optional
        Days since the most recent stage transition.

    Returns:
    --------
    dict with all Risk Engine v3 fields.
    """
    if not issue_keys:
        return {
            "riskScore": 0,
            "severity": "low",
            "trajectory": "stable",
            "confidence": "low",
            "interventionType": "monitor",
            "primaryRisk": None,
            "secondaryRisks": [],
            "riskSignals": [],
            "explanationShort": "No active risk signals",
            "whyNow": "No action needed.",
            "recommendedActionByRole": {},
        }

    # Deduplicate and sort by base severity
    unique_keys = list(dict.fromkeys(issue_keys))  # preserve order, dedup
    sorted_keys = sorted(unique_keys, key=lambda k: SIGNAL_BASE_SCORE.get(k, 0), reverse=True)

    primary = sorted_keys[0]
    secondary = sorted_keys[1:]

    # Score
    risk_score, compound_desc = compute_risk_score(sorted_keys, best_stage, days_inactive, issue_age_days)

    # Severity
    severity = _severity_band(risk_score)

    # Trajectory
    trajectory = infer_trajectory(
        set(sorted_keys), days_inactive, recent_actions_count,
        stage_entered_days_ago, issue_age_days,
    )

    # Confidence
    confidence = compute_confidence(sorted_keys)

    # Intervention
    intervention = INTERVENTION_MATRIX.get((severity, trajectory), "monitor")

    # Signals (human-readable)
    risk_signals = [SIGNAL_LABELS.get(k, k) for k in sorted_keys]

    # Explanation
    explanation = _explanation_short(sorted_keys, severity, school_name, best_stage)

    # Why now
    why_now = _why_now(primary, set(secondary), severity, trajectory, best_stage, school_name, days_inactive, compound_desc)

    # Role actions
    actions = _role_actions(intervention, primary, school_name)

    return {
        "riskScore": risk_score,
        "severity": severity,
        "trajectory": trajectory,
        "confidence": confidence,
        "interventionType": intervention,
        "primaryRisk": SIGNAL_LABELS.get(primary, primary),
        "secondaryRisks": [SIGNAL_LABELS.get(k, k) for k in secondary],
        "riskSignals": risk_signals,
        "explanationShort": explanation,
        "whyNow": why_now,
        "recommendedActionByRole": actions,
    }
