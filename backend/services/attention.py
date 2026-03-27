"""
Canonical Attention Service — Single Source of Truth for per-program attention/urgency.

Replaces frontend computeAttention.js scoring. The frontend should consume
these fields directly without re-computation.

Inputs:
    - top_action (from top_action_engine.py) — canonical per-school action
    - program_metrics (from program_metrics.py) — canonical engagement health
    - program state — due dates, signals, stage, board_group

Output shape matches what PipelinePage components expect:
    attentionScore, tier, heroEligible, urgency, momentum,
    primaryAction, reason, reasonShort, ctaLabel, riskContext, flags
"""

from datetime import datetime, timezone
import logging

log = logging.getLogger(__name__)


def compute_program_attention(
    program: dict,
    top_action: dict | None = None,
    metrics: dict | None = None,
) -> dict:
    """Compute canonical attention for a single program.

    This is the SSOT for attention/urgency/priority — no other system
    should independently score these dimensions.
    """
    score = 0
    flags = []

    signals = program.get("signals") or {}
    days_since = signals.get("days_since_last_activity") or signals.get("days_since_activity") or 99

    # ── 1. Top Action Priority (0-100 pts) ────────────────────────────
    ta_priority = 8
    if top_action:
        ta_priority = top_action.get("priority", 8)
        ta_score = max(0, (8 - ta_priority)) * 14  # P1=98, P2=84, ... P8=0
        score += ta_score
        if ta_priority <= 1:
            flags.append("coachFlag")
        if ta_priority <= 2:
            flags.append("escalation")

    # ── 2. Due Date Urgency (0-80 pts) ────────────────────────────────
    due = program.get("next_action_due")
    if due:
        try:
            due_str = str(due).replace("Z", "+00:00")
            due_dt = datetime.fromisoformat(due_str)
            if due_dt.tzinfo is None:
                due_dt = due_dt.replace(tzinfo=timezone.utc)
            now = datetime.now(timezone.utc)
            days_until = (due_dt - now).days
            if days_until < 0:
                score += 80
                flags.append("overdue")
            elif days_until <= 1:
                score += 60
                flags.append("dueSoon")
            elif days_until <= 3:
                score += 40
            elif days_until <= 7:
                score += 20
        except (ValueError, TypeError):
            pass

    # ── 3. Activity Recency (0-40 pts) ────────────────────────────────
    if days_since > 14:
        score += 40
    elif days_since > 7:
        score += 25
    elif days_since > 3:
        score += 10

    # ── 4. Stage Weight (0-15 pts) ────────────────────────────────────
    stage = program.get("journey_stage") or program.get("recruiting_status", "added")
    stage_pts = {
        "committed": 0, "Committed": 0,
        "offer": 15, "Offer": 15,
        "campus_visit": 12, "Campus Visit": 12, "Visit Scheduled": 12,
        "in_conversation": 8, "In Conversation": 8, "Interested": 8,
        "outreach": 4, "Contacted": 4,
        "added": 0, "Not Contacted": 0,
    }
    score += stage_pts.get(stage, 0)

    # ── 5. Coach Engagement Signals (0-60 pts) ────────────────────────
    if signals.get("has_coach_reply"):
        score += 30
        flags.append("coachReply")
    if signals.get("has_campus_visit"):
        score += 30

    # ── 6. Metrics-Derived Health (0-30 pts) ──────────────────────────
    if metrics:
        health = metrics.get("pipeline_health_state", "active")
        health_pts = {
            "at_risk": 30,
            "cooling_off": 20,
            "needs_follow_up": 15,
            "active": 5,
            "strong_momentum": 0,
            "still_early": 0,
            "awaiting_reply": 10,
        }
        score += health_pts.get(health, 0)

    # ── Classify tier ─────────────────────────────────────────────────
    hard_flags = {"overdue", "dueSoon", "coachFlag", "escalation"}
    has_hard = bool(set(flags) & hard_flags)

    if score >= 80 or has_hard:
        tier = "high"
    elif score >= 40:
        tier = "medium"
    else:
        tier = "low"

    # ── Classify urgency ──────────────────────────────────────────────
    if "overdue" in flags or "escalation" in flags:
        urgency = "critical"
    elif "dueSoon" in flags or score >= 60:
        urgency = "soon"
    else:
        urgency = "monitor"

    # ── Classify momentum ─────────────────────────────────────────────
    if metrics:
        health = metrics.get("pipeline_health_state", "active")
        momentum_map = {
            "at_risk": "cooling", "cooling_off": "cooling",
            "needs_follow_up": "cooling", "awaiting_reply": "steady",
            "active": "steady", "strong_momentum": "building",
            "still_early": "steady",
        }
        momentum = momentum_map.get(health, "steady")
    else:
        if days_since >= 7:
            momentum = "cooling"
        elif days_since >= 3:
            momentum = "steady"
        else:
            momentum = "building"

    # ── Build action text from top_action (canonical) ─────────────────
    if top_action:
        primary_action = top_action.get("action", "Review this school")
        cta_label = top_action.get("cta_label", "Review")
        reason = top_action.get("reason", "")
    elif "overdue" in flags:
        primary_action = "Follow up — action is overdue"
        cta_label = "Follow Up"
        reason = "Next action was due and hasn't been completed"
    elif program.get("board_group") == "needs_outreach":
        primary_action = "Send your first message to this school"
        cta_label = "Start Outreach"
        reason = "No outreach has been sent yet"
    else:
        primary_action = "Review this school"
        cta_label = "Review"
        reason = ""

    # ── Hero eligibility ──────────────────────────────────────────────
    hero_eligible = tier == "high" or score >= 80

    # ── Risk context ──────────────────────────────────────────────────
    risk_context = None
    if "overdue" in flags:
        risk_context = "Action overdue — follow up needed"
    elif days_since > 14:
        risk_context = f"No activity in {days_since} days"
    elif "escalation" in flags:
        risk_context = "Escalation from support team"

    # ── Build hero reason ─────────────────────────────────────────────
    hero_reason = ""
    if "coachFlag" in flags:
        hero_reason = "Coach flagged this school for attention"
    elif "overdue" in flags:
        hero_reason = "Overdue follow-up needs action"
    elif "coachReply" in flags and score >= 60:
        hero_reason = "Coach responded — momentum is building"
    elif score >= 80:
        hero_reason = "High priority based on current activity"

    return {
        "programId": program.get("program_id", ""),
        "universityName": program.get("university_name", ""),
        "attentionScore": score,
        "tier": tier,
        "attentionLevel": tier,  # Alias for frontend KanbanBoard/PipelineHero compatibility
        "heroEligible": hero_eligible,
        "urgency": urgency,
        "momentum": momentum,
        "primaryAction": primary_action,
        "reason": reason,
        "reasonShort": reason[:80] if reason else "",
        "heroReason": hero_reason,
        "ctaLabel": cta_label,
        "riskContext": risk_context,
        "flags": flags,
        "prioritySource": "live",
        "recapRank": None,
        "owner": (top_action.get("owner", "athlete") if top_action else "athlete"),
    }


def compute_all_program_attention(
    programs: list,
    top_actions_map: dict,
    metrics_map: dict,
) -> list:
    """Compute attention for all active programs, sorted by score desc.

    Args:
        programs: list of program dicts from athlete_dashboard
        top_actions_map: {program_id: top_action_dict} from top_action_engine
        metrics_map: {program_id: metrics_dict} from program_metrics
    """
    results = []
    for p in programs:
        if not p.get("is_active", True):
            continue
        pid = p.get("program_id", "")
        attn = compute_program_attention(
            program=p,
            top_action=top_actions_map.get(pid),
            metrics=metrics_map.get(pid),
        )
        results.append(attn)

    results.sort(key=lambda x: x["attentionScore"], reverse=True)
    return results
