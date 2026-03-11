"""School Insight Agent — "Why This School / Why Not" intelligence card.

Produces strengths, concerns, and unknowns with cited evidence.
Uses LLM only when confidence >= MEDIUM (40%+ fields available).
Returns a deterministic fallback otherwise.
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
LLM_TIMEOUT = 45


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
            log.warning(f"School insight LLM attempt {attempt+1} failed: {e}")
            if attempt == 0:
                await asyncio.sleep(1)
    return ""


def _deterministic_fallback(payload: dict) -> dict:
    """Return a basic card when data is too limited for LLM analysis."""
    school = payload.get("school", {})
    uni = school.get("university_name", "this school")
    unknowns = payload.get("meta", {}).get("known_unknowns", [])

    return {
        "card_type": "school_insight",
        "university_name": uni,
        "confidence": payload["meta"]["confidence"],
        "confidence_pct": payload["meta"]["confidence_pct"],
        "generated_by": "deterministic",
        "summary": f"We don't have enough data yet to analyze {uni} in depth. As you add interactions and update your profile, this analysis will become more detailed.",
        "strengths": [],
        "concerns": [],
        "unknowns": unknowns[:5],
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


def _build_prompt(payload: dict) -> str:
    """Build the LLM prompt from the payload."""
    school = payload.get("school", {})
    athlete = payload.get("athlete", {})
    engagement = payload.get("engagement", {})
    meta = payload.get("meta", {})

    # Extract values from source-wrapped fields
    def val(obj, key, default="not available"):
        f = obj.get(key)
        if isinstance(f, dict) and "value" in f:
            return f["value"]
        return f if f is not None else default

    # Build scorecard summary
    sc = school.get("scorecard", {})
    sc_lines = []
    for k, v in sc.items():
        sv = v.get("value") if isinstance(v, dict) else v
        if sv is not None:
            label = k.replace("_", " ").title()
            sc_lines.append(f"  - {label}: {sv}")
    scorecard_text = "\n".join(sc_lines) if sc_lines else "  No scorecard data available"

    # Athlete test scores
    ts = athlete.get("test_scores", {})
    ts_text = ""
    if isinstance(ts, dict):
        for k, v in ts.items():
            sv = v.get("value") if isinstance(v, dict) else v
            if sv:
                ts_text += f"  - {k.upper()}: {sv}\n"
    if not ts_text:
        ts_text = "  No test scores on file"

    unknowns_text = "\n".join(f"  - {u}" for u in meta.get("known_unknowns", []))

    return f"""Analyze this school as a recruiting fit for this volleyball athlete.

SCHOOL: {school.get("university_name", "Unknown")}
Division: {val(school, "division")}
Conference: {val(school, "conference")}
Region: {val(school, "region")}
Scholarship Type: {val(school, "scholarship_type")}
Academic Scorecard:
{scorecard_text}

ATHLETE:
Name: {athlete.get("full_name", "Unknown")}
Position: {val(athlete, "position")}
Graduation Year: {val(athlete, "grad_year")}
GPA: {val(athlete, "gpa")}
Test Scores:
{ts_text}
Priorities: {val(athlete, "priorities")}
Academic Interests: {val(athlete, "academic_interests")}
Preferred Regions: {val(athlete, "preferred_regions")}

ENGAGEMENT:
Recruiting Status: {engagement.get("recruiting_status", "not set")}
Journey Stage: {engagement.get("journey_stage", "not set")}
Priority: {engagement.get("priority", "not set")}
Interactions: {engagement.get("interaction_count", 0)}
Days Since Last Interaction: {engagement.get("days_since_last_interaction", "unknown")}

DATA GAPS (things we don't know):
{unknowns_text or "  None identified"}

Data confidence: {meta.get("confidence", "LOW")} ({meta.get("confidence_pct", 0)}% of fields available)

OUTPUT FORMAT — respond with ONLY valid JSON, no markdown:
{{
  "summary": "1-2 sentence overview of the fit",
  "strengths": [
    {{"point": "specific strength", "evidence": "data that supports this"}}
  ],
  "concerns": [
    {{"point": "specific concern", "evidence": "data that supports this"}}
  ]
}}

RULES:
- Include 2-4 strengths and 1-3 concerns
- Every point MUST cite specific data from above (numbers, names, facts)
- Never invent data that isn't provided above
- If a data point is "not available", do NOT reference it as a strength or concern
- Use parent-safe language — no alarmist phrasing, no absolutes
- Be honest and balanced — families deserve accurate assessments
- Do not reference dollar amounts for scholarships or financial aid"""


async def analyze(payload: dict) -> dict:
    """Run the School Insight agent on a payload.

    Returns the intelligence card dict.
    """
    meta = payload.get("meta", {})
    school = payload.get("school", {})
    uni = school.get("university_name", "Unknown")

    # Deterministic fallback for LOW confidence
    if meta.get("confidence") == "LOW":
        return _deterministic_fallback(payload)

    prompt = _build_prompt(payload)

    system = (
        "You are a college volleyball recruiting analyst helping families evaluate schools. "
        "You produce balanced, evidence-based assessments. Every claim must cite specific data. "
        "Never invent facts. Use parent-safe language. Output only valid JSON."
    )

    chat = _build_chat(system)
    raw = await _send(chat, UserMessage(text=prompt))

    if not raw:
        return _deterministic_fallback(payload)

    # Parse JSON from LLM response
    try:
        # Strip markdown code fences if present
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()
            if cleaned.startswith("json"):
                cleaned = cleaned[4:].strip()
        result = json.loads(cleaned)
    except json.JSONDecodeError:
        log.warning(f"School insight: failed to parse LLM JSON for {uni}")
        return _deterministic_fallback(payload)

    return {
        "card_type": "school_insight",
        "university_name": uni,
        "confidence": meta["confidence"],
        "confidence_pct": meta["confidence_pct"],
        "generated_by": "llm",
        "summary": result.get("summary", ""),
        "strengths": result.get("strengths", []),
        "concerns": result.get("concerns", []),
        "unknowns": meta.get("known_unknowns", []),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
