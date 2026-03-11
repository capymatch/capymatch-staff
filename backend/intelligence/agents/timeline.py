"""Timeline Agent — Recruiting Timeline intelligence card.

Labels the school's recruiting timeline and provides next-action guidance.
Fully deterministic when possible. Only uses LLM when rich interaction
history exists and could benefit from narrative analysis.
"""

import os
import json
import uuid
import asyncio
import logging
from datetime import datetime, timezone
from emergentintegrations.llm.chat import LlmChat, UserMessage
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent.parent.parent / ".env")

log = logging.getLogger(__name__)

API_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
LLM_TIMEOUT = 30


def _build_chat(system_msg: str) -> LlmChat:
    return LlmChat(
        api_key=API_KEY,
        session_id=str(uuid.uuid4()),
        system_message=system_msg,
    ).with_model("openai", "gpt-5.2")


async def _send(chat: LlmChat, msg: UserMessage) -> str:
    for attempt in range(2):
        try:
            result = await asyncio.wait_for(chat.send_message(msg), timeout=LLM_TIMEOUT)
            if result and result.strip():
                return result
        except Exception as e:
            log.warning(f"Timeline LLM attempt {attempt+1} failed: {e}")
            if attempt == 0:
                await asyncio.sleep(1)
    return ""


# ── Deterministic logic ─────────────────────────────────────────────────────

STATUS_TIMELINE_MAP = {
    "Committed": {"label": "Committed", "color": "green", "description": "Commitment made. Focus on maintaining the relationship."},
    "Offer Received": {"label": "Late Opportunities", "color": "green", "description": "An offer is on the table. Decision time is near."},
    "In Conversation": {"label": "Standard Timeline", "color": "blue", "description": "Active dialogue with coaches. Keep momentum."},
    "Contacted": {"label": "Standard Timeline", "color": "blue", "description": "Initial contact made. Follow up within 7-10 days if no reply."},
    "Waiting Reply": {"label": "Standard Timeline", "color": "amber", "description": "Awaiting coach response. Consider a follow-up if it's been more than 10 days."},
    "Needs Outreach": {"label": "Fills Early", "color": "teal", "description": "This school hasn't been contacted yet. Early outreach gets noticed."},
    "Researching": {"label": "Fills Early", "color": "teal", "description": "Still in the research phase. Reach out when ready."},
}

NEXT_ACTIONS = {
    "Committed": "Send a thank-you note to the coaching staff and keep your grades up.",
    "Offer Received": "Discuss the offer with your family and schedule an official visit if you haven't already.",
    "In Conversation": "Continue engaging. Ask about upcoming visit opportunities or ID camps.",
    "Contacted": "If you haven't heard back in 7-10 days, send a polite follow-up email.",
    "Waiting Reply": "Follow up with a brief update about recent stats or achievements.",
    "Needs Outreach": "Draft a personalized introduction email to the head or recruiting coach.",
    "Researching": "Review the program's roster, schedule, and academic requirements before reaching out.",
}


def _deterministic_card(payload: dict) -> dict:
    """Build timeline card using only deterministic rules."""
    engagement = payload.get("engagement", {})
    meta = payload.get("meta", {})
    school = payload.get("school", {})
    uni = school.get("university_name", "Unknown")

    status = engagement.get("recruiting_status", "")
    stage = engagement.get("journey_stage", "")
    ix_count = engagement.get("interaction_count", 0)
    days_since = engagement.get("days_since_last_interaction")

    # Determine timeline label
    timeline_info = STATUS_TIMELINE_MAP.get(status)
    if not timeline_info:
        # Fallback based on interaction count
        if ix_count == 0:
            timeline_info = {"label": "Unknown", "color": "gray", "description": "No recruiting activity recorded yet. Start by reaching out."}
        elif ix_count < 3:
            timeline_info = {"label": "Fills Early", "color": "teal", "description": "Early stages of engagement with this program."}
        else:
            timeline_info = {"label": "Standard Timeline", "color": "blue", "description": "Multiple interactions recorded."}

    # Determine next action
    next_action = NEXT_ACTIONS.get(status, "Review the school's program page and consider reaching out to the coaching staff.")

    # Add urgency context based on days since last interaction
    urgency = "normal"
    urgency_note = None
    if days_since is not None:
        if days_since > 21:
            urgency = "high"
            urgency_note = f"It's been {days_since} days since your last interaction. Consider re-engaging soon."
        elif days_since > 10:
            urgency = "medium"
            urgency_note = f"Last interaction was {days_since} days ago. A follow-up could help maintain momentum."

    return {
        "card_type": "timeline",
        "university_name": uni,
        "confidence": meta.get("confidence", "LOW"),
        "confidence_pct": meta.get("confidence_pct", 0),
        "generated_by": "deterministic",
        "timeline_label": timeline_info["label"],
        "timeline_color": timeline_info["color"],
        "timeline_description": timeline_info["description"],
        "next_action": next_action,
        "urgency": urgency,
        "urgency_note": urgency_note,
        "interaction_count": ix_count,
        "days_since_last": days_since,
        "recruiting_status": status or "Unknown",
        "unknowns": [u for u in meta.get("known_unknowns", []) if "interaction" in u.lower() or "status" in u.lower()],
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


async def analyze(payload: dict) -> dict:
    """Run the Timeline agent on a payload.

    Fully deterministic for most cases. Only invokes LLM when there are
    5+ interactions with meaningful data to produce a narrative summary.
    """
    engagement = payload.get("engagement", {})
    ix_count = engagement.get("interaction_count", 0)

    card = _deterministic_card(payload)

    # Only use LLM for rich interaction histories
    if ix_count >= 5 and payload.get("meta", {}).get("confidence") != "LOW":
        narrative = await _generate_narrative(payload)
        if narrative:
            card["narrative"] = narrative
            card["generated_by"] = "llm_enhanced"

    return card


async def _generate_narrative(payload: dict) -> str | None:
    """Generate a 2-sentence narrative summary of the recruiting timeline."""
    engagement = payload.get("engagement", {})
    school = payload.get("school", {})
    athlete = payload.get("athlete", {})

    prompt = f"""Summarize this recruiting timeline in 2 sentences.

School: {school.get("university_name", "Unknown")}
Athlete: {athlete.get("full_name", "Unknown")}
Status: {engagement.get("recruiting_status", "Unknown")}
Total Interactions: {engagement.get("interaction_count", 0)}
Last Interaction: {engagement.get("last_interaction", {})}
Days Since Last: {engagement.get("days_since_last_interaction", "unknown")}
Interaction Types: {engagement.get("interaction_types", [])}

Write 2 clear sentences: (1) where things stand, (2) what the momentum looks like.
Use parent-safe language. Be factual, not speculative. No markdown."""

    system = "You are a recruiting timeline analyst. Write brief, factual summaries. No speculation. Parent-safe language."
    chat = _build_chat(system)
    result = await _send(chat, UserMessage(text=prompt))
    return result.strip() if result else None
