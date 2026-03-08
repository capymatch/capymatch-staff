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
    """Generate a leadership-level program brief for the Director's Mission Control."""
    alerts_text = "\n".join([
        f"- {a.get('athlete_name', 'Unknown')}: {a.get('title', '')} (urgency: {a.get('urgency', 'N/A')})"
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

    snapshot = data.get('snapshot', {})

    prompt = f"""Summarize the most important program-level signals for the Director.

Current alerts:
{alerts_text or 'No active alerts.'}

Upcoming events:
{events_text or 'No upcoming events.'}

Athletes needing attention:
{attention_text or 'No athletes flagged.'}

Program snapshot: {snapshot}

Rules:
- Maximum 4 sentences
- No task instructions or step-by-step actions
- Focus on signals and context
- Highlight risks first
- Mention positive progress if relevant
- Mention upcoming events if they create pressure

Structure:
Sentence 1: top risk or change in program health
Sentence 2: additional risk or attention area
Sentence 3: positive progress or recruiting momentum
Sentence 4: event readiness or operational context"""

    chat = _build_chat(
        "You are the Director's recruiting operations assistant. "
        "Write concise leadership briefings that summarize program state. "
        "Never write task lists, action items, or step-by-step instructions. "
        "Write calm, strategic, observational prose. "
        "No markdown formatting. No bullet points. No numbering. Just clear sentences."
    )
    return await _send_with_retry(chat, UserMessage(text=prompt))


# ── AI V2 Functions ──────────────────────────────────────────────────────────


async def generate_suggested_actions(data: dict, user_name: str, scope: str = "program") -> str:
    """V2: Generate structured next-action suggestions for Mission Control."""
    alerts_text = "\n".join([
        f"- {a.get('title', 'Alert')}: {a.get('description', '')} (urgency: {a.get('urgency', 'N/A')}, athlete: {a.get('athlete_name', 'N/A')})"
        for a in data.get("alerts", [])[:10]
    ])
    events_text = "\n".join([
        f"- {e.get('name', 'Event')} in {e.get('daysAway', '?')} days, {len(e.get('athlete_ids', []))} athletes attending"
        for e in data.get("events", [])[:6]
    ])
    attention_text = "\n".join([
        f"- {a.get('athlete_name', 'Unknown')}: {a.get('title', '')} — {a.get('description', '')}"
        for a in data.get("attention", [])[:8]
    ])
    recs_text = "\n".join([
        f"- {r.get('athlete_name', '?')} → {r.get('school_name', '?')}: status={r.get('status', '?')}, days_since_sent={r.get('days_since_sent', '?')}"
        for r in data.get("aging_recs", [])[:6]
    ])

    prompt = f"""Generate 3-5 specific next actions for {user_name} ({scope} scope).

Current alerts:
{alerts_text or 'None.'}

Upcoming events:
{events_text or 'None.'}

Athletes needing attention:
{attention_text or 'None.'}

Aging recommendations:
{recs_text or 'None.'}

Snapshot: {data.get('snapshot', {})}

For each action, output EXACTLY this format (one per line):
ACTION: [specific action to take]
WHY: [1-sentence reasoning]
EVIDENCE: [specific data point or name that justifies this]
OWNER: [who should do it — use {user_name} or specific coach name]
PRIORITY: [high/medium/low]
CATEGORY: [advocacy/event_prep/athlete_support/admin]
---

Be specific with athlete names, school names, and dates. Every suggestion must trace to evidence."""

    chat = _build_chat("You are a recruiting operations analyst. Generate structured, evidence-based action suggestions. Every action must include WHY and EVIDENCE. No vague advice. Be specific with names and data.")
    return await _send_with_retry(chat, UserMessage(text=prompt))


async def generate_pod_actions(athlete: dict, interventions: list, actions: list, timeline_count: int, events: list) -> str:
    """V2: Generate structured next actions for a specific athlete's Support Pod."""
    interventions_text = "\n".join([
        f"- {i.get('title', '?')}: severity={i.get('severity', '?')}, status={i.get('status', '?')}, days_open={i.get('days_open', '?')}"
        for i in interventions[:5]
    ])
    actions_text = "\n".join([
        f"- {a.get('title', '?')}: status={a.get('status', '?')}, owner={a.get('owner', '?')}, priority={a.get('priority', '?')}"
        for a in actions[:8]
    ])
    events_text = "\n".join([
        f"- {e.get('name', '?')} in {e.get('days_away', '?')} days"
        for e in events[:4]
    ])

    prompt = f"""Generate 2-4 specific next actions for this athlete's support pod.

Athlete: {athlete.get('fullName', athlete.get('name', 'Unknown'))}
Position: {athlete.get('position', 'N/A')}
Grad Year: {athlete.get('gradYear', 'N/A')}
Health: {athlete.get('overallHealth', 'N/A')}
Days since activity: {athlete.get('daysSinceActivity', 'N/A')}
Timeline events: {timeline_count}

Active interventions:
{interventions_text or 'None.'}

Current open actions:
{actions_text or 'None.'}

Upcoming events:
{events_text or 'None.'}

For each action, output EXACTLY this format (one per line):
ACTION: [specific action]
WHY: [1-sentence reasoning]
EVIDENCE: [specific data that justifies this]
OWNER: [who should do it]
PRIORITY: [high/medium/low]
---

Focus on what's most urgent for THIS athlete. Reference specific interventions, action statuses, or timeline gaps."""

    chat = _build_chat("You are a recruiting support coordinator. Generate specific, evidence-based actions for an athlete's support pod. Every action must include WHY and EVIDENCE. Reference concrete data.")
    return await _send_with_retry(chat, UserMessage(text=prompt))


async def generate_pod_brief(athlete: dict, interventions: list, pod_health: dict, actions: list, timeline_count: int) -> str:
    """V2: Generate a brief summary for the top of a Support Pod page."""
    interventions_text = "\n".join([
        f"- {i.get('title', '?')}: severity={i.get('severity', '?')}, status={i.get('status', '?')}"
        for i in interventions[:5]
    ])
    actions_text = "\n".join([
        f"- {a.get('title', '?')}: status={a.get('status', '?')}"
        for a in actions[:6]
    ])

    prompt = f"""Write a 2-3 sentence support pod brief for this athlete.

Athlete: {athlete.get('fullName', athlete.get('name', 'Unknown'))}
Position: {athlete.get('position', 'N/A')}
Grad Year: {athlete.get('gradYear', 'N/A')}
Overall Health: {athlete.get('overallHealth', 'N/A')}
Days Since Activity: {athlete.get('daysSinceActivity', 'N/A')}
Pod Health Score: {pod_health.get('score', 'N/A')} ({pod_health.get('label', 'N/A')})
Timeline Events: {timeline_count}

Interventions:
{interventions_text or 'None active.'}

Open Actions:
{actions_text or 'None.'}

After the brief, on a new line output exactly:
STATUS_SIGNAL: [needs_attention|stable|improving]

Then output key facts, each on its own line:
FACT: [label] | [value] | [flag or null]

Include 2-4 key facts (e.g., days since contact, open actions count, active issues).
The brief should highlight what matters most right now for this athlete."""

    chat = _build_chat("You are a recruiting support analyst. Write concise athlete status briefs. No markdown. Be direct about what needs attention.")
    return await _send_with_retry(chat, UserMessage(text=prompt))


async def generate_program_insights(data: dict) -> str:
    """V2: Generate strategic program-level insights for directors."""
    prompt = f"""Analyze this recruiting program data and generate strategic insights.

Program Health: {data.get('program_health', {})}
Readiness: {data.get('readiness', {})}
Event Effectiveness: {data.get('event_effectiveness', {})}
Advocacy Outcomes: {data.get('advocacy_outcomes', {})}
Support Load: {data.get('support_load', {})}
Trends: {data.get('trends', [])}
Athlete Count: {data.get('athlete_count', 0)}
Event Count: {data.get('event_count', 0)}
Recommendation Count: {data.get('recommendation_count', 0)}

First, write a 3-4 sentence strategic narrative overview.

Then output 2-4 specific insights. For each insight, use EXACTLY this format:
INSIGHT: [specific finding]
WHY: [why this matters]
EVIDENCE: [specific data points — names, numbers, dates]
RECOMMENDATION: [what to do about it]
SEVERITY: [high/medium/low]
---

Focus on patterns, risks, and opportunities a director would miss without AI analysis. Be specific with numbers."""

    chat = _build_chat("You are a strategic recruiting program analyst. Generate data-driven insights for program directors. Every insight must include specific evidence and an actionable recommendation. No vague observations.")
    return await _send_with_retry(chat, UserMessage(text=prompt))


async def generate_event_followups(event: dict, notes: list, existing_followups: list) -> str:
    """V2: Generate structured follow-up suggestions after an event."""
    notes_text = "\n".join([
        f"- Athlete: {n.get('athlete_name', '?')}, School: {n.get('school_name', 'N/A')}, "
        f"Interest: {n.get('interest_level', 'N/A')}, Follow-up: {n.get('needs_follow_up', False)}, "
        f"Note: {n.get('note', '')}"
        for n in notes
    ])
    existing_text = "\n".join([
        f"- {f.get('description', '?')} (status: {f.get('status', '?')})"
        for f in existing_followups[:10]
    ])

    prompt = f"""Based on this event's notes, suggest specific follow-up actions.

Event: {event.get('name', 'Unknown')} at {event.get('location', 'Unknown')}
Notes captured: {len(notes)}

Notes:
{notes_text}

Already-created follow-ups:
{existing_text or 'None created yet.'}

Generate 2-5 follow-up suggestions. For each, use EXACTLY this format:
ACTION: [specific follow-up action]
WHY: [why this matters based on the event data]
EVIDENCE: [quote or reference specific note content]
ATHLETE: [athlete name from notes]
PRIORITY: [high/medium/low]
---

Focus on: hot interest signals needing immediate action, mutual interest to develop, and opportunities that might be missed. Do not duplicate existing follow-ups."""

    chat = _build_chat("You are a recruiting event follow-up specialist. Generate specific, evidence-based follow-up actions from event notes. Every suggestion must reference concrete observations. No generic advice.")
    return await _send_with_retry(chat, UserMessage(text=prompt))
