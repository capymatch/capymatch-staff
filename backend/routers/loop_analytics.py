"""Loop Analytics — lightweight event tracking for the Recap→Hero→Action→Reinforcement loop.

Stores raw events in `loop_analytics` collection.
Provides aggregation endpoint for outcome metrics.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import logging
log = logging.getLogger(__name__)

from auth_middleware import get_current_user_dep
from db_client import db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/analytics")


class AnalyticsEvent(BaseModel):
    event: str
    properties: dict = {}
    timestamp: Optional[str] = None


class EventBatch(BaseModel):
    events: List[AnalyticsEvent]


@router.post("/events")
async def ingest_events(batch: EventBatch, current_user: dict = get_current_user_dep()):
    """Batch ingest analytics events."""
    if not batch.events:
        return {"ingested": 0}

    now = datetime.now(timezone.utc).isoformat()
    docs = []
    for evt in batch.events:
        docs.append({
            "user_id": current_user["id"],
            "tenant_id": current_user.get("tenant_id", ""),
            "role": current_user.get("role", ""),
            "event": evt.event,
            "properties": evt.properties,
            "timestamp": evt.timestamp or now,
            "ingested_at": now,
        })

    if docs:
        await db.loop_analytics.insert_many(docs)

    return {"ingested": len(docs)}


@router.get("/loop-metrics")
async def get_loop_metrics(days: int = 30, current_user: dict = get_current_user_dep()):
    """Compute aggregated loop metrics from raw events."""
    if current_user["role"] not in ("athlete", "parent", "director", "admin"):
        raise HTTPException(403, "Not authorized")

    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    query = {"user_id": current_user["id"], "timestamp": {"$gte": cutoff}}
    events = await db.loop_analytics.find(query, {"_id": 0}).sort("timestamp", 1).to_list(5000)

    if not events:
        return {"total_events": 0, "metrics": {}}

    # Count by event type
    counts = {}
    for e in events:
        name = e["event"]
        counts[name] = counts.get(name, 0) + 1

    # ── Hero metrics ──
    hero_views = counts.get("hero_viewed", 0)
    hero_clicks = counts.get("hero_action_clicked", 0)
    why_expands = counts.get("hero_expanded_why", 0)

    # Priority source breakdown
    source_counts = {"live": 0, "recap": 0, "merged": 0}
    for e in events:
        if e["event"] == "hero_viewed":
            src = e["properties"].get("priority_source", "live")
            source_counts[src] = source_counts.get(src, 0) + 1

    # ── Time to first action after hero view ──
    # Find pairs: hero_viewed → next hero_action_clicked for same program
    hero_view_times = {}
    action_delays = []
    for e in events:
        pid = e["properties"].get("program_id", "")
        ts = e["timestamp"]
        if e["event"] == "hero_viewed" and pid:
            hero_view_times[pid] = ts
        elif e["event"] == "hero_action_clicked" and pid and pid in hero_view_times:
            try:
                viewed = datetime.fromisoformat(hero_view_times[pid].replace("Z", "+00:00"))
                acted = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                delay_sec = (acted - viewed).total_seconds()
                if 0 < delay_sec < 86400:  # within 24h
                    action_delays.append(delay_sec)
            except Exception as e:  # noqa: E722
                log.debug("Non-critical error (silenced): %s", e)
                pass

    avg_time_to_action = round(sum(action_delays) / len(action_delays), 1) if action_delays else None

    # ── Completion rates by source ──
    completions = {"live": 0, "recap": 0, "merged": 0}
    for e in events:
        if e["event"] == "reinforcement_shown":
            src = e["properties"].get("priority_source", "live")
            completions[src] = completions.get(src, 0) + 1

    # ── Why this? expand rate ──
    why_expand_rate = round(why_expands / hero_views * 100, 1) if hero_views > 0 else 0

    # ── Action rate after Why this? ──
    why_then_action = 0
    last_why_time = None
    for e in events:
        if e["event"] == "hero_expanded_why":
            last_why_time = e["timestamp"]
        elif e["event"] == "hero_action_clicked" and last_why_time:
            try:
                why_ts = datetime.fromisoformat(last_why_time.replace("Z", "+00:00"))
                act_ts = datetime.fromisoformat(e["timestamp"].replace("Z", "+00:00"))
                if (act_ts - why_ts).total_seconds() < 300:  # within 5 min
                    why_then_action += 1
            except Exception as e:  # noqa: E722
                log.debug("Non-critical error (silenced): %s", e)
                pass
            last_why_time = None

    return {
        "total_events": len(events),
        "period_days": days,
        "event_counts": counts,
        "metrics": {
            "hero_view_count": hero_views,
            "hero_click_rate": round(hero_clicks / hero_views * 100, 1) if hero_views else 0,
            "why_expand_rate": why_expand_rate,
            "actions_after_why_expand": why_then_action,
            "avg_time_to_action_seconds": avg_time_to_action,
            "priority_source_breakdown": source_counts,
            "completions_by_source": completions,
            "recap_teaser_views": counts.get("recap_teaser_viewed", 0),
            "recap_opens": counts.get("recap_opened", 0),
            "reinforcement_shown": counts.get("reinforcement_shown", 0),
        },
    }


def _compute_metrics_from_events(events):
    """Shared helper: compute loop metrics from a list of event dicts."""
    if not events:
        return {
            "total_events": 0,
            "event_counts": {},
            "funnel": {"hero_views": 0, "hero_clicks": 0, "reinforcements": 0,
                       "hero_click_rate": 0, "reinforcement_rate": 0},
            "sources": {"views": {"live": 0, "recap": 0, "merged": 0},
                        "completions": {"live": 0, "recap": 0, "merged": 0}},
            "trust": {"why_expands": 0, "why_expand_rate": 0,
                      "actions_after_why": 0, "action_after_why_rate": 0},
            "reinforcement": {"total_shown": 0, "avg_time_to_action": None,
                              "completions_by_source": {"live": 0, "recap": 0, "merged": 0}},
            "recap": {"teaser_views": 0, "opens": 0, "open_rate": 0},
            "unique_users": 0,
        }

    counts = {}
    user_ids = set()
    for e in events:
        counts[e["event"]] = counts.get(e["event"], 0) + 1
        user_ids.add(e.get("user_id", ""))

    hero_views = counts.get("hero_viewed", 0)
    hero_clicks = counts.get("hero_action_clicked", 0)
    why_expands = counts.get("hero_expanded_why", 0)
    reinforcements = counts.get("reinforcement_shown", 0)
    teaser_views = counts.get("recap_teaser_viewed", 0)
    recap_opens = counts.get("recap_opened", 0)

    # Source breakdown
    source_views = {"live": 0, "recap": 0, "merged": 0}
    source_completions = {"live": 0, "recap": 0, "merged": 0}
    for e in events:
        src = e["properties"].get("priority_source", "live")
        if e["event"] == "hero_viewed":
            source_views[src] = source_views.get(src, 0) + 1
        elif e["event"] == "reinforcement_shown":
            source_completions[src] = source_completions.get(src, 0) + 1

    # Time to action
    hero_view_times = {}
    action_delays = []
    for e in events:
        pid = e["properties"].get("program_id", "")
        ts = e["timestamp"]
        if e["event"] == "hero_viewed" and pid:
            hero_view_times[pid] = ts
        elif e["event"] == "hero_action_clicked" and pid and pid in hero_view_times:
            try:
                viewed = datetime.fromisoformat(hero_view_times[pid].replace("Z", "+00:00"))
                acted = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                delay = (acted - viewed).total_seconds()
                if 0 < delay < 86400:
                    action_delays.append(delay)
            except Exception as e:  # noqa: E722
                log.debug("Non-critical error (silenced): %s", e)
                pass

    avg_tta = round(sum(action_delays) / len(action_delays), 1) if action_delays else None

    # Why → Action
    why_then_action = 0
    last_why = None
    for e in events:
        if e["event"] == "hero_expanded_why":
            last_why = e["timestamp"]
        elif e["event"] == "hero_action_clicked" and last_why:
            try:
                wt = datetime.fromisoformat(last_why.replace("Z", "+00:00"))
                at = datetime.fromisoformat(e["timestamp"].replace("Z", "+00:00"))
                if (at - wt).total_seconds() < 300:
                    why_then_action += 1
            except Exception as e:  # noqa: E722
                log.debug("Non-critical error (silenced): %s", e)
                pass
            last_why = None

    return {
        "total_events": len(events),
        "event_counts": counts,
        "funnel": {
            "hero_views": hero_views,
            "hero_clicks": hero_clicks,
            "reinforcements": reinforcements,
            "hero_click_rate": round(hero_clicks / hero_views * 100, 1) if hero_views else 0,
            "reinforcement_rate": round(reinforcements / hero_views * 100, 1) if hero_views else 0,
        },
        "sources": {
            "views": source_views,
            "completions": source_completions,
        },
        "trust": {
            "why_expands": why_expands,
            "why_expand_rate": round(why_expands / hero_views * 100, 1) if hero_views else 0,
            "actions_after_why": why_then_action,
            "action_after_why_rate": round(why_then_action / why_expands * 100, 1) if why_expands else 0,
        },
        "reinforcement": {
            "total_shown": reinforcements,
            "avg_time_to_action": avg_tta,
            "completions_by_source": source_completions,
        },
        "recap": {
            "teaser_views": teaser_views,
            "opens": recap_opens,
            "open_rate": round(recap_opens / teaser_views * 100, 1) if teaser_views else 0,
        },
        "unique_users": len(user_ids),
    }


@router.get("/admin/loop-metrics")
async def get_admin_loop_metrics(days: int = 30, current_user: dict = get_current_user_dep()):
    """Admin-level aggregation across ALL users for the Loop Insights dashboard."""
    if current_user["role"] not in ("director", "platform_admin"):
        raise HTTPException(403, "Admin access required")

    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    query = {"timestamp": {"$gte": cutoff}}
    events = await db.loop_analytics.find(query, {"_id": 0}).sort("timestamp", 1).to_list(10000)

    metrics = _compute_metrics_from_events(events)
    metrics["period_days"] = days

    # Daily event trend (last N days)
    daily = {}
    for e in events:
        try:
            day = e["timestamp"][:10]
            daily[day] = daily.get(day, 0) + 1
        except Exception as e:  # noqa: E722
            log.debug("Non-critical error (silenced): %s", e)
            pass
    metrics["daily_trend"] = [{"date": d, "count": c} for d, c in sorted(daily.items())]

    return metrics
