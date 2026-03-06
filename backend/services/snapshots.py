"""Program Intelligence — snapshot capture and trend computation.

Captures a daily snapshot of key metrics and computes directional
trends by comparing current state to previous snapshots.
"""

import logging
from datetime import datetime, timezone, timedelta

log = logging.getLogger(__name__)


async def capture_snapshot_if_needed(db, current_metrics):
    """Capture a snapshot if none exists for today. Returns True if captured."""
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    existing = await db.program_snapshots.find_one(
        {"captured_at": {"$gte": today_start.isoformat()}},
        {"_id": 0}
    )
    if existing:
        return False

    snapshot = {
        "captured_at": datetime.now(timezone.utc).isoformat(),
        **current_metrics,
    }
    await db.program_snapshots.insert_one(snapshot)
    log.info("Captured daily program snapshot")
    return True


def extract_snapshot_metrics(program_data):
    """Extract the 5 trend-relevant metrics from a full program intelligence response."""
    ph = program_data.get("program_health", {})
    pod = ph.get("pod_health", {})
    issues = ph.get("open_issues", {})

    ao = program_data.get("advocacy_outcomes", {})
    pipeline = ao.get("pipeline", {})

    ee = program_data.get("event_effectiveness", {})
    past = ee.get("past_events", [])
    total_notes_needing = sum(e.get("follow_ups_identified", 0) for e in past)
    total_completed = sum(e.get("follow_ups_completed", 0) for e in past)
    completion_pct = round((total_completed / max(total_notes_needing, 1)) * 100) if total_notes_needing > 0 else 0

    sl = program_data.get("support_load", {})
    total_overdue = sum(o.get("overdue", 0) for o in sl.get("by_owner", []))

    return {
        "pod_health": {
            "healthy": pod.get("healthy", 0),
            "needs_attention": pod.get("needs_attention", 0),
            "at_risk": pod.get("at_risk", 0),
        },
        "open_issues": {
            "total": ph.get("intervention_total", 0),
            "blockers": issues.get("blockers", 0),
            "momentum_drops": issues.get("momentum_drops", 0),
            "event_follow_ups": issues.get("event_follow_ups", 0),
        },
        "overdue_actions": total_overdue,
        "advocacy_pipeline": {
            "total": pipeline.get("total", 0),
            "draft": pipeline.get("draft", 0),
            "sent": pipeline.get("sent", 0),
            "awaiting": pipeline.get("awaiting_reply", 0),
            "warm": pipeline.get("warm_response", 0),
            "closed": pipeline.get("closed", 0),
        },
        "event_follow_up": {
            "total_needing": total_notes_needing,
            "completed": total_completed,
            "completion_pct": completion_pct,
        },
    }


async def get_previous_snapshot(db):
    """Get the most recent snapshot before today."""
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    cursor = db.program_snapshots.find(
        {"captured_at": {"$lt": today_start.isoformat()}},
        {"_id": 0}
    ).sort("captured_at", -1).limit(1)

    results = await cursor.to_list(1)
    return results[0] if results else None


def compute_trends(current, previous):
    """Compare current metrics to previous snapshot and generate trend signals."""
    if not previous:
        return _baseline_trends(current)

    trends = []

    # 1. Pod Health — healthy count going up is good
    curr_h = current["pod_health"]["healthy"]
    prev_h = previous["pod_health"]["healthy"]
    curr_r = current["pod_health"]["at_risk"]
    prev_r = previous["pod_health"]["at_risk"]
    delta_h = curr_h - prev_h
    delta_r = curr_r - prev_r
    trends.append(_trend(
        key="pod_health",
        label="Pod Health",
        current=curr_h,
        suffix="healthy",
        delta=delta_h,
        good_direction="up",
        interpretation=_interp_pod_health(delta_h, delta_r, curr_h, curr_r),
    ))

    # 2. Open Issues — total going down is good
    curr_i = current["open_issues"]["total"]
    prev_i = previous["open_issues"]["total"]
    delta_i = curr_i - prev_i
    curr_b = current["open_issues"]["blockers"]
    prev_b = previous["open_issues"]["blockers"]
    trends.append(_trend(
        key="open_issues",
        label="Open Issues",
        current=curr_i,
        suffix="issues",
        delta=delta_i,
        good_direction="down",
        interpretation=_interp_issues(delta_i, curr_b - prev_b, curr_i),
    ))

    # 3. Overdue Actions — going down is good
    curr_o = current["overdue_actions"]
    prev_o = previous["overdue_actions"]
    delta_o = curr_o - prev_o
    trends.append(_trend(
        key="overdue_actions",
        label="Overdue Actions",
        current=curr_o,
        suffix="overdue",
        delta=delta_o,
        good_direction="down",
        interpretation=_interp_overdue(delta_o, curr_o),
    ))

    # 4. Advocacy — warm responses going up is good
    curr_w = current["advocacy_pipeline"]["warm"]
    prev_w = previous["advocacy_pipeline"]["warm"]
    curr_t = current["advocacy_pipeline"]["total"]
    delta_w = curr_w - prev_w
    trends.append(_trend(
        key="advocacy_outcomes",
        label="Advocacy Pipeline",
        current=curr_w,
        suffix="warm responses",
        delta=delta_w,
        good_direction="up",
        interpretation=_interp_advocacy(delta_w, curr_w, curr_t),
    ))

    # 5. Follow-up completion — pct going up is good
    curr_p = current["event_follow_up"]["completion_pct"]
    prev_p = previous["event_follow_up"]["completion_pct"]
    delta_p = curr_p - prev_p
    trends.append(_trend(
        key="follow_up_completion",
        label="Follow-up Completion",
        current=curr_p,
        suffix="%",
        delta=delta_p,
        good_direction="up",
        interpretation=_interp_followup(delta_p, curr_p),
    ))

    return trends


def _trend(key, label, current, suffix, delta, good_direction, interpretation):
    if delta == 0:
        direction = "stable"
    elif (delta > 0 and good_direction == "up") or (delta < 0 and good_direction == "down"):
        direction = "improving"
    else:
        direction = "declining"

    return {
        "key": key,
        "label": label,
        "current": current,
        "suffix": suffix,
        "delta": delta,
        "direction": direction,
        "interpretation": interpretation,
    }


def _baseline_trends(current):
    """Return baseline trends when no prior snapshot exists."""
    return [
        {"key": "pod_health", "label": "Pod Health", "current": current["pod_health"]["healthy"], "suffix": "healthy", "delta": 0, "direction": "baseline", "interpretation": "Baseline established — tracking starts now"},
        {"key": "open_issues", "label": "Open Issues", "current": current["open_issues"]["total"], "suffix": "issues", "delta": 0, "direction": "baseline", "interpretation": "Baseline established — tracking starts now"},
        {"key": "overdue_actions", "label": "Overdue Actions", "current": current["overdue_actions"], "suffix": "overdue", "delta": 0, "direction": "baseline", "interpretation": "Baseline established — tracking starts now"},
        {"key": "advocacy_outcomes", "label": "Advocacy Pipeline", "current": current["advocacy_pipeline"]["warm"], "suffix": "warm responses", "delta": 0, "direction": "baseline", "interpretation": "Baseline established — tracking starts now"},
        {"key": "follow_up_completion", "label": "Follow-up Completion", "current": current["event_follow_up"]["completion_pct"], "suffix": "%", "delta": 0, "direction": "baseline", "interpretation": "Baseline established — tracking starts now"},
    ]


# ── Interpretation generators ──

def _interp_pod_health(delta_h, delta_r, curr_h, curr_r):
    if delta_h > 0 and delta_r <= 0:
        return f"{abs(delta_h)} more healthy pods since last check"
    if delta_h < 0:
        return f"{abs(delta_h)} fewer healthy pods — review at-risk athletes"
    if delta_r > 0:
        return f"{abs(delta_r)} more at-risk pods — intervention needed"
    return f"Holding steady at {curr_h} healthy"


def _interp_issues(delta_i, delta_b, curr_i):
    if delta_i < 0:
        parts = [f"{abs(delta_i)} fewer issues"]
        if delta_b < 0:
            parts.append(f"including {abs(delta_b)} blockers resolved")
        return " — ".join(parts)
    if delta_i > 0:
        return f"{delta_i} new issues surfaced — review priority alerts"
    return f"Holding at {curr_i} open issues"


def _interp_overdue(delta, current):
    if delta < 0:
        return f"Cleared {abs(delta)} overdue actions"
    if delta > 0:
        return f"{delta} more actions slipped past due — assign or escalate"
    if current == 0:
        return "All actions on schedule"
    return f"{current} overdue — monitor closely"


def _interp_advocacy(delta_w, curr_w, curr_t):
    if delta_w > 0:
        return f"{delta_w} new warm responses — momentum building"
    if delta_w < 0:
        return f"Warm response count down by {abs(delta_w)}"
    rate = round((curr_w / max(curr_t, 1)) * 100)
    return f"{curr_w} warm of {curr_t} total ({rate}% conversion)"


def _interp_followup(delta, current):
    if delta > 0:
        return f"Up {delta}pts — follow-through improving"
    if delta < 0:
        return f"Down {abs(delta)}pts — check unrouted notes"
    return f"Stable at {current}% completion"


async def seed_historical_snapshots(db, current_metrics):
    """Seed 3 historical snapshots for demo experience if collection is empty."""
    count = await db.program_snapshots.count_documents({})
    if count > 0:
        log.info(f"program_snapshots already has {count} docs — skipping seed")
        return False

    now = datetime.now(timezone.utc)

    # Generate slightly worse historical values to show improvement trend
    snapshots = []
    for days_ago, degradation in [(7, 0.3), (3, 0.15), (1, 0.05)]:
        snap = _degrade_metrics(current_metrics, degradation)
        snap["captured_at"] = (now - timedelta(days=days_ago)).isoformat()
        snapshots.append(snap)

    if snapshots:
        await db.program_snapshots.insert_many(snapshots)
        log.info(f"Seeded {len(snapshots)} historical program snapshots")
    return True


def _degrade_metrics(metrics, factor):
    """Create a slightly worse version of metrics for historical seeding."""
    import copy
    m = copy.deepcopy(metrics)

    # Fewer healthy, more at-risk
    shift = max(1, int(m["pod_health"]["healthy"] * factor))
    m["pod_health"]["healthy"] = max(0, m["pod_health"]["healthy"] - shift)
    m["pod_health"]["at_risk"] = m["pod_health"]["at_risk"] + shift

    # More open issues
    bump = max(1, int(m["open_issues"]["total"] * factor))
    m["open_issues"]["total"] += bump
    m["open_issues"]["blockers"] += max(1, bump // 2)

    # More overdue
    m["overdue_actions"] += max(1, int(3 * factor * 10))

    # Fewer warm responses
    warm_drop = max(1, int(m["advocacy_pipeline"]["warm"] * factor))
    m["advocacy_pipeline"]["warm"] = max(0, m["advocacy_pipeline"]["warm"] - warm_drop)

    # Lower follow-up completion
    m["event_follow_up"]["completion_pct"] = max(0, m["event_follow_up"]["completion_pct"] - int(factor * 30))

    return m
