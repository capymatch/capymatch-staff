"""Momentum Recap — Post-event analysis and priority generation.

Computes momentum shifts from structured data, then uses AI only for narrative summary.
Feeds results back into the Hero Card priority system.
"""

from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone, timedelta
import os
import json
import logging

from auth_middleware import get_current_user_dep
from db_client import db
from emergentintegrations.llm.chat import LlmChat, UserMessage

logger = logging.getLogger(__name__)
router = APIRouter()

LLM_MODEL_PROVIDER = "anthropic"
LLM_MODEL_NAME = "claude-sonnet-4-5-20250929"

STAGE_ORDER = ["added", "outreach", "in_conversation", "campus_visit", "offer", "committed"]
STAGE_LABELS = {
    "added": "Added", "outreach": "Outreach", "in_conversation": "In Conversation",
    "campus_visit": "Campus Visit", "offer": "Offer", "committed": "Committed",
}


def _stage_rank(stage):
    try:
        return STAGE_ORDER.index(stage)
    except ValueError:
        return 0


def _classify_momentum(program, interactions_in_period, interactions_before, now):
    """Classify a program's momentum based on structured data only."""
    name = program.get("university_name", "Unknown")
    prog_id = program.get("program_id", "")
    reply_status = program.get("reply_status", "No Reply")
    recruiting_status = program.get("recruiting_status", "Not Contacted")

    ix_count = len(interactions_in_period)
    ix_before = len(interactions_before)
    has_coach_reply = any(ix.get("type") == "coach_reply" for ix in interactions_in_period)
    has_visit = any(ix.get("type") == "Campus Visit" for ix in interactions_in_period)

    # Determine current stage from recruiting_status mapping
    status_to_stage = {
        "Not Contacted": "added", "Initial Contact": "outreach",
        "Contacted": "outreach", "Interested": "in_conversation",
        "Applied": "in_conversation", "Camp Attended": "campus_visit",
        "Campus Visit": "campus_visit", "Offer Received": "offer", "Committed": "committed",
    }
    current_stage = status_to_stage.get(recruiting_status, "added")

    # Days since last interaction (check in-period first, then before-period)
    days_since = None
    last_interaction_list = interactions_in_period if interactions_in_period else interactions_before
    if last_interaction_list:
        last_dt_str = last_interaction_list[0].get("date_time", "")
        try:
            last_dt = datetime.fromisoformat(last_dt_str.replace("Z", "+00:00"))
            days_since = (now - last_dt).days
        except Exception:
            pass

    # Build reasons
    changes = []
    reason = ""

    # Heated Up conditions
    heated = False
    if has_coach_reply:
        heated = True
        changes.append("Coach replied")
    if has_visit:
        heated = True
        changes.append("Campus visit completed")
    if ix_count >= 2 and ix_count > ix_before:
        heated = True
        changes.append(f"{ix_count} new touchpoints")
    if reply_status in ("Reply Received", "In Conversation") and ix_count > 0:
        heated = True
        if "Coach replied" not in changes:
            changes.append("Active dialogue")

    # Cooling Off conditions
    cooling = False
    if ix_count == 0 and ix_before > 0:
        cooling = True
        changes.append("No activity this period")
    if days_since is not None and days_since > 7:
        cooling = True
        changes.append(f"Last contact {days_since} days ago")
    if reply_status == "No Reply" and ix_count > 0 and not has_coach_reply:
        cooling = True
        changes.append("No coach response yet")

    # Classification
    if heated and not cooling:
        category = "heated_up"
        reason = " · ".join(changes) if changes else "Increased engagement"
        why = "Momentum is building — stay responsive"
    elif cooling and not heated:
        category = "cooling_off"
        reason = " · ".join(changes) if changes else "Activity dropped"
        why = "At risk of losing momentum — re-engage soon"
    else:
        category = "holding_steady"
        reason = " · ".join(changes) if changes else "Consistent activity"
        why = "Pipeline stable — maintain cadence"

    # Action guidance for momentum shift cards — contextual, varied
    if heated and not cooling:
        if has_coach_reply:
            action_guidance = "Respond within 24 hours"
        elif has_visit:
            action_guidance = "Keep the conversation active this week"
        elif current_stage == "added":
            action_guidance = "Send your first follow-up within 48 hours"
        else:
            action_guidance = "Follow up within 48 hours"
    elif cooling and not heated:
        action_guidance = "Re-engage this week" if (days_since and days_since > 7) else "Send a follow-up soon"
    else:
        action_guidance = "Maintain your current cadence"

    return {
        "program_id": prog_id,
        "school_name": name,
        "category": category,
        "what_changed": reason,
        "why_it_matters": why,
        "action_guidance": action_guidance,
        "current_stage": current_stage,
        "stage_label": STAGE_LABELS.get(current_stage, current_stage),
        "interactions_count": ix_count,
        "has_coach_reply": has_coach_reply,
        "reply_status": reply_status,
        "days_since_last": days_since,
    }


def _generate_priorities(momentum_items):
    """Generate priority reset from momentum data. No AI involved."""
    heated = [m for m in momentum_items if m["category"] == "heated_up"]
    cooling = [m for m in momentum_items if m["category"] == "cooling_off"]
    steady = [m for m in momentum_items if m["category"] == "holding_steady"]

    priorities = []

    # Top Priority: most urgent cooling item, or heated item needing follow-up
    if cooling:
        top = cooling[0]
        days = top.get("days_since_last")
        reason = f"No activity for {days} days — re-engage within 24–48 hours" if days else "Re-engage within 24–48 hours"
        priorities.append({
            "rank": "top",
            "school_name": top["school_name"],
            "program_id": top["program_id"],
            "action": f"Re-engage {top['school_name']}",
            "reason": reason,
            "urgency_note": "This is your most important action right now",
        })
    elif heated:
        top = heated[0]
        priorities.append({
            "rank": "top",
            "school_name": top["school_name"],
            "program_id": top["program_id"],
            "action": f"Follow up with {top['school_name']} while hot",
            "reason": "Momentum is building — capitalize on it",
            "urgency_note": "This is your most important action right now",
        })

    # Secondary: next 2 actionable items — with contextual variation
    remaining = [m for m in momentum_items if not priorities or m["program_id"] != priorities[0]["program_id"]]
    # Prefer heated items first, then cooling
    secondary_pool = sorted(remaining, key=lambda m: (
        0 if m["category"] == "heated_up" else 1 if m["category"] == "cooling_off" else 2
    ))
    _sec_variants_heated = [
        lambda name, m: (f"Follow up with {name}", "Keep the conversation active this week") if "Campus visit" in m.get("what_changed", "") else None,
        lambda name, m: (f"Keep pushing {name}", "Respond within 48 hours") if m.get("has_coach_reply") else None,
        lambda name, m: (f"Follow up with {name}", "Keep the conversation active this week"),
        lambda name, m: (f"Send your first follow-up to {name}", "Make a strong first impression"),
    ]
    _sec_variants_cooling = [
        lambda name, m: (f"Check in with {name}", "Send a message this week"),
    ]
    _sec_variants_steady = [
        lambda name, m: (f"Maintain contact with {name}", "Don't let it slip"),
    ]
    sec_idx = 0
    for item in secondary_pool[:2]:
        name = item["school_name"]
        action, reason = None, None
        if item["category"] == "heated_up":
            for v in _sec_variants_heated:
                result = v(name, item)
                if result:
                    action, reason = result
                    break
            # Alternate phrasing for second heated item
            if sec_idx == 1 and action and action.startswith("Follow up"):
                action = f"Keep pushing {name}"
                reason = "Send your next follow-up within 48 hours"
        elif item["category"] == "cooling_off":
            action, reason = _sec_variants_cooling[0](name, item)
        else:
            action, reason = _sec_variants_steady[0](name, item)
        priorities.append({
            "rank": "secondary",
            "school_name": name,
            "program_id": item["program_id"],
            "action": action,
            "reason": reason,
        })
        sec_idx += 1

    # Watch Item: steady item most at risk of cooling
    watch_pool = [m for m in steady if m["program_id"] not in {p["program_id"] for p in priorities}]
    if not watch_pool:
        watch_pool = [m for m in remaining if m["program_id"] not in {p["program_id"] for p in priorities}]
    if watch_pool:
        watch = watch_pool[0]
        priorities.append({
            "rank": "watch",
            "school_name": watch["school_name"],
            "program_id": watch["program_id"],
            "action": f"Monitor {watch['school_name']}",
            "reason": "Check in within the next few days to maintain momentum",
        })

    # Backfill: ensure every school appears — any remaining get "watch" rank
    included_ids = {p["program_id"] for p in priorities}
    for item in momentum_items:
        if item["program_id"] not in included_ids:
            cat = item["category"]
            if cat == "heated_up":
                action = f"Follow up with {item['school_name']}"
                reason = "Keep the momentum going"
            elif cat == "cooling_off":
                days = item.get("days_since_last")
                action = f"Check in with {item['school_name']}"
                reason = f"No activity in {days} days" if days else "Re-engage soon"
            else:
                action = f"Monitor {item['school_name']}"
                reason = "Maintain your current cadence"
            priorities.append({
                "rank": "watch",
                "school_name": item["school_name"],
                "program_id": item["program_id"],
                "action": action,
                "reason": reason,
            })

    return priorities


def _build_recap_hero(momentum_items):
    """Build the hero headline — personal, names the school."""
    heated_items = [m for m in momentum_items if m["category"] == "heated_up"]
    cooling_items = [m for m in momentum_items if m["category"] == "cooling_off"]
    heated = len(heated_items)
    cooling = len(cooling_items)

    if cooling and heated:
        school = cooling_items[0]["school_name"]
        return f"Your pipeline is improving, but {school} requires immediate attention."
    elif cooling:
        school = cooling_items[0]["school_name"]
        return f"{school} requires your immediate attention."
    elif heated:
        return f"Strong momentum — {heated} school{'s' if heated > 1 else ''} heating up in your pipeline."
    else:
        return "Your pipeline is holding steady this period."


def _compute_biggest_shift(momentum_items):
    """Identify the single biggest momentum change — short, conversational."""
    cooling = [m for m in momentum_items if m["category"] == "cooling_off"]
    if cooling:
        worst = max(cooling, key=lambda m: m.get("days_since_last") or 0)
        days = worst.get("days_since_last")
        name = worst["school_name"]
        if days:
            return f"{name} has gone quiet ({days} days)"
        return f"{name} has gone quiet"

    heated = [m for m in momentum_items if m["category"] == "heated_up"]
    if heated:
        best = heated[0]
        if "Campus visit" in best.get("what_changed", ""):
            return f"{best['school_name']} surged after your visit"
        if best.get("has_coach_reply"):
            return f"{best['school_name']} heated up — coach replied"
        return f"{best['school_name']} gained momentum"

    return None


def _build_insight_bullets(momentum_items):
    """Generate coaching-focused actionable insights — not status descriptions."""
    bullets = []
    heated = [m for m in momentum_items if m["category"] == "heated_up"]
    cooling = [m for m in momentum_items if m["category"] == "cooling_off"]
    total = len(momentum_items)

    # Coaching insight 1: Pattern observation
    if len(heated) >= 2:
        bullets.append(f"{len(heated)} of {total} schools are gaining momentum — your outreach is working")
    elif heated:
        h = heated[0]
        if h.get("has_coach_reply"):
            bullets.append(f"{h['school_name']} coach replied — respond within 24 hours to keep this alive")
        elif "Campus visit" in h.get("what_changed", ""):
            bullets.append(f"Your {h['school_name']} visit made an impact — send a thank-you note this week")
        else:
            bullets.append(f"{h['school_name']} is responding to your outreach — keep the cadence going")

    # Coaching insight 2: Risk mitigation
    if cooling:
        c = cooling[0]
        days = c.get("days_since_last")
        if days and days > 7:
            bullets.append(f"{c['school_name']} has been quiet for {days} days — try a different approach or channel")
        else:
            bullets.append(f"Don't let {c['school_name']} go cold — a quick check-in can restart the conversation")

    # Coaching insight 3: Strategic observation
    if len(heated) > len(cooling):
        bullets.append("Your pipeline is trending positive — focus on quality conversations over volume")
    elif len(cooling) > len(heated):
        bullets.append("A few schools need attention — prioritize re-engagement this week")
    elif len(momentum_items) > 0:
        bullets.append("Steady progress across your pipeline — consistency is your advantage right now")

    return bullets[:3]


async def _generate_ai_summary(momentum_items, priorities, recap_hero, period_label):
    """Use AI ONLY for narrative — all data is pre-computed."""
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        return "AI summary unavailable — configure your LLM key."

    structured_data = json.dumps({
        "period": period_label,
        "hero_summary": recap_hero,
        "momentum": [
            {"school": m["school_name"], "category": m["category"],
             "what_changed": m["what_changed"], "stage": m["stage_label"]}
            for m in momentum_items
        ],
        "priorities": [
            {"rank": p["rank"], "school": p["school_name"], "action": p["action"]}
            for p in priorities
        ],
    }, indent=2)

    system_message = """You are a recruiting strategy assistant for a student-athlete.
Write a 2-3 sentence narrative summary explaining the cause and effect of recent pipeline changes.
Rules:
- Use ONLY the structured data provided. Do NOT invent or infer any new data.
- Reference specific school names and what happened.
- Tone: calm, strategic, insightful.
- Do NOT use bullet points or lists. Write flowing prose.
- Keep it under 60 words."""

    try:
        chat = LlmChat(
            api_key=api_key,
            session_id=f"recap_{datetime.now().strftime('%Y%m%d%H%M%S')}",
            system_message=system_message,
        ).with_model(LLM_MODEL_PROVIDER, LLM_MODEL_NAME)
        response = await chat.send_message(UserMessage(
            text=f"Generate a brief narrative summary from this data:\n{structured_data}"
        ))
        return str(response).strip().strip('"').strip("'")
    except Exception as e:
        logger.error(f"AI recap summary failed: {e}")
        return recap_hero  # Fallback to the structured hero sentence


@router.get("/athlete/momentum-recap")
async def get_momentum_recap(current_user: dict = get_current_user_dep()):
    """Return cached recap if fresh, otherwise recompute."""
    if current_user["role"] not in ("athlete", "parent"):
        raise HTTPException(403, "Only athletes can access recaps")

    athlete = await db.athletes.find_one(
        {"user_id": current_user["id"]}, {"_id": 0, "tenant_id": 1}
    )
    if not athlete:
        raise HTTPException(404, "Athlete not found")
    tenant_id = athlete["tenant_id"]

    now = datetime.now(timezone.utc)

    # Determine recap window: last event or fallback to 7 days
    events = await db.events.find(
        {"status": "past"},
        {"_id": 0, "event_id": 1, "name": 1, "date": 1}
    ).sort("date", -1).to_list(10)

    period_start = now - timedelta(days=7)
    period_label = "Last 7 days"
    event_name = None

    for evt in events:
        evt_date_str = evt.get("date", "")
        try:
            evt_date = datetime.fromisoformat(str(evt_date_str).replace("Z", "+00:00"))
            if evt_date <= now:
                period_start = evt_date
                event_name = evt.get("name", "Recent Event")
                period_label = f"Since {event_name}"
                break
        except Exception:
            continue

    # Check cache: return stored recap if same period and < 1 hour old
    cached = await db.momentum_recaps.find_one(
        {"tenant_id": tenant_id}, {"_id": 0}
    )
    if cached and cached.get("full_response"):
        cached_period = cached.get("period_start", "")
        cached_at = cached.get("created_at", "")
        try:
            cached_time = datetime.fromisoformat(cached_at.replace("Z", "+00:00"))
            age_minutes = (now - cached_time).total_seconds() / 60
            # Fresh if same period and under 60 minutes old
            if cached_period == period_start.isoformat() and age_minutes < 60:
                return cached["full_response"]
        except Exception:
            pass

    # Cache miss — recompute
    return await _compute_and_cache_recap(tenant_id, now, period_start, period_label, event_name)


@router.post("/athlete/momentum-recap/refresh")
async def refresh_momentum_recap(current_user: dict = get_current_user_dep()):
    """Force-refresh the recap (bypasses cache)."""
    if current_user["role"] not in ("athlete", "parent"):
        raise HTTPException(403, "Only athletes can access recaps")

    athlete = await db.athletes.find_one(
        {"user_id": current_user["id"]}, {"_id": 0, "tenant_id": 1}
    )
    if not athlete:
        raise HTTPException(404, "Athlete not found")
    tenant_id = athlete["tenant_id"]

    now = datetime.now(timezone.utc)

    events = await db.events.find(
        {"status": "past"},
        {"_id": 0, "event_id": 1, "name": 1, "date": 1}
    ).sort("date", -1).to_list(10)

    period_start = now - timedelta(days=7)
    period_label = "Last 7 days"
    event_name = None

    for evt in events:
        evt_date_str = evt.get("date", "")
        try:
            evt_date = datetime.fromisoformat(str(evt_date_str).replace("Z", "+00:00"))
            if evt_date <= now:
                period_start = evt_date
                event_name = evt.get("name", "Recent Event")
                period_label = f"Since {event_name}"
                break
        except Exception:
            continue

    return await _compute_and_cache_recap(tenant_id, now, period_start, period_label, event_name)


async def _compute_and_cache_recap(tenant_id, now, period_start, period_label, event_name):
    """Full recap computation with AI summary — result is cached."""
    # Fetch programs
    programs = await db.programs.find(
        {"tenant_id": tenant_id}, {"_id": 0}
    ).to_list(50)

    if not programs:
        return {
            "recap_hero": "No programs in your pipeline yet.",
            "momentum": [], "priorities": [], "ai_summary": "",
            "period_label": period_label, "event_name": event_name,
            "period_start": period_start.isoformat(),
        }

    # Fetch all interactions
    all_interactions = await db.interactions.find(
        {"tenant_id": tenant_id}, {"_id": 0}
    ).sort("date_time", -1).to_list(500)

    # Classify each program
    momentum_items = []
    for prog in programs:
        pid = prog.get("program_id", "")
        prog_ixs = [ix for ix in all_interactions if ix.get("program_id") == pid]

        in_period = []
        before_period = []
        for ix in prog_ixs:
            dt_str = ix.get("date_time", "")
            try:
                dt = datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
                if dt >= period_start:
                    in_period.append(ix)
                else:
                    before_period.append(ix)
            except Exception:
                before_period.append(ix)

        item = _classify_momentum(prog, in_period, before_period, now)
        momentum_items.append(item)

    order = {"heated_up": 0, "cooling_off": 1, "holding_steady": 2}
    momentum_items.sort(key=lambda m: order.get(m["category"], 3))

    recap_hero = _build_recap_hero(momentum_items)
    biggest_shift = _compute_biggest_shift(momentum_items)
    priorities = _generate_priorities(momentum_items)
    ai_insights = _build_insight_bullets(momentum_items)

    # Join bullets as fallback ai_summary string for backward compat
    ai_summary = " ".join(f"• {b}" for b in ai_insights) if ai_insights else ""

    top_priority_pid = priorities[0]["program_id"] if priorities else None

    response = {
        "recap_hero": recap_hero,
        "biggest_shift": biggest_shift,
        "period_label": period_label,
        "event_name": event_name,
        "period_start": period_start.isoformat(),
        "created_at": now.isoformat(),
        "momentum": {
            "heated_up": [m for m in momentum_items if m["category"] == "heated_up"],
            "holding_steady": [m for m in momentum_items if m["category"] == "holding_steady"],
            "cooling_off": [m for m in momentum_items if m["category"] == "cooling_off"],
        },
        "priorities": priorities,
        "ai_summary": ai_summary,
        "ai_insights": ai_insights,
        "top_priority_program_id": top_priority_pid,
    }

    # Cache full response + priorities for Hero Card integration
    await db.momentum_recaps.replace_one(
        {"tenant_id": tenant_id},
        {
            "tenant_id": tenant_id,
            "created_at": now.isoformat(),
            "period_start": period_start.isoformat(),
            "period_label": period_label,
            "event_name": event_name,
            "priorities": priorities,
            "full_response": response,
        },
        upsert=True,
    )

    return response
