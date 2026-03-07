"""AI service — GPT-5.2 powered intelligence for CapyMatch."""

import os
import uuid
import asyncio
import logging
from datetime import datetime, timezone
from emergentintegrations.llm.chat import LlmChat, UserMessage
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent.parent / ".env")

log = logging.getLogger(__name__)

API_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

LLM_TIMEOUT_SECONDS = 45
LLM_MAX_RETRIES = 1


def _build_chat(system_message: str) -> LlmChat:
    return LlmChat(
        api_key=API_KEY,
        session_id=str(uuid.uuid4()),
        system_message=system_message,
    ).with_model("openai", "gpt-5.2")


async def _send_with_retry(chat: LlmChat, message: UserMessage) -> str:
    """Send a message to the LLM with timeout and retry."""
    last_error = None
    for attempt in range(1 + LLM_MAX_RETRIES):
        try:
            result = await asyncio.wait_for(
                chat.send_message(message),
                timeout=LLM_TIMEOUT_SECONDS,
            )
            if result and result.strip():
                return result
            raise ValueError("Empty response from LLM")
        except asyncio.TimeoutError:
            last_error = "LLM request timed out"
            log.warning(f"LLM timeout on attempt {attempt + 1}")
        except Exception as e:
            last_error = str(e)
            log.warning(f"LLM error on attempt {attempt + 1}: {e}")
        if attempt < LLM_MAX_RETRIES:
            await asyncio.sleep(1)
    raise RuntimeError(f"AI generation failed after {1 + LLM_MAX_RETRIES} attempts: {last_error}")


async def generate_program_narrative(data: dict, view_mode: str = "program") -> str:
    """Generate a 2-3 sentence narrative for Program Intelligence."""
    scope = "the full program" if view_mode != "coach" else f"your athletes ({data.get('athlete_count', 0)} total)"

    prompt = f"""You are an assistant for a recruiting program director/coach.
Analyze this data and write a 2-3 sentence briefing about {scope}.
Focus on: what changed, what matters most, and what to watch.
Be specific with numbers. Be direct. No filler.

Data:
- Athletes: {data.get('athlete_count', 0)}
- Events: {data.get('event_count', 0)}
- Recommendations: {data.get('recommendation_count', 0)}
- Program Health: {data.get('program_health', {})}
- Support Load: {data.get('support_load', {})}
- Advocacy Outcomes: {data.get('advocacy_outcomes', {})}
- Trends: {data.get('trends', [])}
- Readiness: {data.get('readiness', {})}"""

    chat = _build_chat("You are a concise recruiting intelligence analyst. Write brief, data-driven briefings. No markdown formatting. No bullet points. Just clear prose sentences.")
    return await _send_with_retry(chat, UserMessage(text=prompt))


async def generate_event_recap(event: dict, notes: list) -> str:
    """Generate a structured event recap from captured notes."""
    notes_text = "\n".join([
        f"- Athlete: {n.get('athlete_name', 'Unknown')}, School: {n.get('school_name', 'N/A')}, "
        f"Interest: {n.get('interest_level', 'N/A')}, Follow-up: {n.get('needs_follow_up', False)}, "
        f"Note: {n.get('note', '')}"
        for n in notes
    ])

    prompt = f"""Summarize this recruiting event into a brief, actionable recap.

Event: {event.get('name', 'Unknown Event')} at {event.get('location', 'Unknown')}
Total notes captured: {len(notes)}

Notes:
{notes_text}

Write 3-4 sentences covering:
1. Key takeaway (standout athletes or strong interest signals)
2. Schools showing most interest
3. Priority follow-ups needed
Be specific with names and details from the notes."""

    chat = _build_chat("You are a recruiting event analyst. Write concise, actionable event recaps. No markdown. No bullet points. Clear prose with specific names and details.")
    return await _send_with_retry(chat, UserMessage(text=prompt))


async def generate_advocacy_draft(athlete: dict, school: dict, event_notes: list, existing_context: str = "") -> str:
    """Generate a recommendation fit summary and intro draft."""
    notes_text = "\n".join([
        f"- Event: {n.get('event_name', 'N/A')}, Note: {n.get('note', '')}, Interest: {n.get('interest_level', 'N/A')}"
        for n in event_notes
    ]) if event_notes else "No event notes available."

    prompt = f"""Draft a recommendation introduction for a college coach.

Athlete: {athlete.get('name', 'Unknown')}
Position: {athlete.get('position', 'N/A')}
Grad Year: {athlete.get('grad_year', 'N/A')}
Club: {athlete.get('club', 'N/A')}

Target School: {school.get('name', 'Unknown')}
Division: {school.get('division', 'N/A')}

Event observations:
{notes_text}

{f'Additional context: {existing_context}' if existing_context else ''}

Write a 3-4 sentence recommendation that:
1. Explains why this athlete fits this specific program
2. References specific observations or strengths
3. Sounds authentic and personal, not templated
4. Is ready for the coach to review and personalize before sending"""

    chat = _build_chat("You are an experienced recruiting coach writing recommendations to college coaches. Write authentic, specific, personalized introductions. No generic praise. Reference concrete observations. No markdown formatting.")
    return await _send_with_retry(chat, UserMessage(text=prompt))


async def generate_daily_briefing(data: dict, user_name: str) -> str:
    """Generate prioritized daily action suggestions for Mission Control."""
    alerts_text = "\n".join([
        f"- {a.get('title', 'Alert')}: {a.get('description', '')} (urgency: {a.get('urgency', 'N/A')}, athlete: {a.get('athlete_name', 'N/A')})"
        for a in data.get("alerts", [])[:8]
    ])

    events_text = "\n".join([
        f"- {e.get('name', 'Event')} in {e.get('daysAway', '?')} days, {len(e.get('athlete_ids', []))} athletes"
        for e in data.get("events", [])[:5]
    ])

    attention_text = "\n".join([
        f"- {a.get('athlete_name', 'Unknown')}: {a.get('title', '')} ({a.get('description', '')})"
        for a in data.get("attention", [])[:6]
    ])

    prompt = f"""Generate 2-3 prioritized actions for {user_name}'s day.

Current alerts:
{alerts_text or 'No active alerts.'}

Upcoming events:
{events_text or 'No upcoming events.'}

Athletes needing attention:
{attention_text or 'No athletes flagged.'}

Program snapshot: {data.get('snapshot', {})}

Write 2-3 specific, actionable priorities with brief reasoning.
Format each as: "(N) Action — Reason"
Be specific with names. Focus on time-sensitive items first."""

    chat = _build_chat("You are a recruiting operations assistant. Write crisp, prioritized daily action lists. Each action should be specific and time-aware. No markdown. Use format: (1) Action — Reason.")
    return await _send_with_retry(chat, UserMessage(text=prompt))
