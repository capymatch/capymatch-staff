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
    updated_str = program.get("updated_at", "")

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

    # Days since last interaction
    days_since = None
    if interactions_in_period:
        last_dt_str = interactions_in_period[0].get("date_time", "")
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

    return {
        "program_id": prog_id,
        "school_name": name,
        "category": category,
        "what_changed": reason,
        "why_it_matters": why,
        "current_stage": current_stage,
        "stage_label": STAGE_LABELS.get(current_stage, current_stage),
        "interactions_count": ix_count,
        "has_coach_reply": has_coach_reply,
        "reply_status": reply_status,
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
        priorities.append({
            "rank": "top",
            "school_name": top["school_name"],
            "program_id": top["program_id"],
            "action": f"Re-engage with {top['school_name']}",
            "reason": top["why_it_matters"],
        })
    elif heated:
        top = heated[0]
        priorities.append({
            "rank": "top",
            "school_name": top["school_name"],
            "program_id": top["program_id"],
            "action": f"Follow up with {top['school_name']} while hot",
            "reason": "Momentum is building — capitalize on it",
        })

    # Secondary: next 2 actionable items
    remaining = [m for m in momentum_items if not priorities or m["program_id"] != priorities[0]["program_id"]]
    # Prefer heated items first, then cooling
    secondary_pool = sorted(remaining, key=lambda m: (
        0 if m["category"] == "heated_up" else 1 if m["category"] == "cooling_off" else 2
    ))
    for item in secondary_pool[:2]:
        action = (
            f"Keep pushing {item['school_name']}" if item["category"] == "heated_up"
            else f"Check in with {item['school_name']}" if item["category"] == "cooling_off"
            else f"Maintain contact with {item['school_name']}"
        )
        priorities.append({
            "rank": "secondary",
            "school_name": item["school_name"],
            "program_id": item["program_id"],
            "action": action,
            "reason": item["what_changed"],
        })

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
            "reason": "Could cool off without attention",
        })

    return priorities


def _build_recap_hero(momentum_items):
    """Build the hero summary sentence from structured data."""
    heated = len([m for m in momentum_items if m["category"] == "heated_up"])
    cooling = len([m for m in momentum_items if m["category"] == "cooling_off"])
    steady = len([m for m in momentum_items if m["category"] == "holding_steady"])

    parts = []
    if heated:
        parts.append(f"gained momentum with {heated} school{'s' if heated > 1 else ''}")
    if cooling:
        parts.append(f"{cooling} program{'s' if cooling > 1 else ''} need{'s' if cooling == 1 else ''} re-engagement")
    if steady:
        parts.append(f"{steady} holding steady")

    if not parts:
        return "No significant pipeline changes this period."

    sentence = "You " + parts[0]
    if len(parts) > 1:
        sentence += ", " + ", ".join(parts[1:])
    return sentence + "."


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
    """Compute post-event momentum recap with priority reset."""
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

        # Split into period vs before
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

    # Sort: heated first, then cooling, then steady
    order = {"heated_up": 0, "cooling_off": 1, "holding_steady": 2}
    momentum_items.sort(key=lambda m: order.get(m["category"], 3))

    # Generate structured outputs
    recap_hero = _build_recap_hero(momentum_items)
    priorities = _generate_priorities(momentum_items)

    # AI narrative (structured data only)
    ai_summary = await _generate_ai_summary(
        momentum_items, priorities, recap_hero, period_label
    )

    # Store recap for Hero Card integration
    recap_doc = {
        "tenant_id": tenant_id,
        "created_at": now.isoformat(),
        "period_start": period_start.isoformat(),
        "period_label": period_label,
        "event_name": event_name,
        "priorities": priorities,
    }
    await db.momentum_recaps.replace_one(
        {"tenant_id": tenant_id}, recap_doc, upsert=True
    )

    return {
        "recap_hero": recap_hero,
        "period_label": period_label,
        "event_name": event_name,
        "period_start": period_start.isoformat(),
        "momentum": {
            "heated_up": [m for m in momentum_items if m["category"] == "heated_up"],
            "holding_steady": [m for m in momentum_items if m["category"] == "holding_steady"],
            "cooling_off": [m for m in momentum_items if m["category"] == "cooling_off"],
        },
        "priorities": priorities,
        "ai_summary": ai_summary,
    }
