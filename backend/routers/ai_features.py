"""AI-powered features: email drafting, next-step, journey summary, assistant, outreach analysis, highlight advice, coach watch.

Mirrors the original capymatch ai.py routes.
All endpoints use the Emergent LLM key with Claude Sonnet.
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta
from typing import Optional
import os
import uuid
import json
import logging
log = logging.getLogger(__name__)

from dotenv import load_dotenv
load_dotenv()

from auth_middleware import get_current_user_dep, decode_token
from db_client import db
from emergentintegrations.llm.chat import LlmChat, UserMessage
from routers.athlete_dashboard import _compute_coach_watch

logger = logging.getLogger(__name__)

router = APIRouter()

LLM_MODEL_PROVIDER = "anthropic"
LLM_MODEL_NAME = "claude-sonnet-4-5-20250929"

# ── Coach Watch context builder (shared across AI endpoints) ──

async def _build_coach_watch_context(tenant_id: str, program_id: str):
    """Compute Coach Watch and build a context dict for LLM injection."""
    import asyncio
    program = await db.programs.find_one({"program_id": program_id, "tenant_id": tenant_id}, {"_id": 0})
    if not program:
        return None, None

    interactions, email_tracking = await asyncio.gather(
        db.interactions.find({"tenant_id": tenant_id, "program_id": program_id}, {"_id": 0}).to_list(500),
        db.email_tracking.find({"program_id": program_id}, {"_id": 0}).to_list(500),
    )

    cw = _compute_coach_watch(program, interactions, email_tracking)

    # Build human-readable signal list
    signal_strings = []
    meta = cw.get("meta", {})
    if meta.get("hasReply"):
        signal_strings.append("coach replied")
    if meta.get("totalOpens", 0) > 0:
        signal_strings.append(f"opened {meta['totalOpens']}×")
    if meta.get("totalClicks", 0) > 0:
        signal_strings.append(f"clicked {meta['totalClicks']}×")
    if meta.get("hasVisit"):
        signal_strings.append("campus visit")
    if meta.get("hasOffer"):
        signal_strings.append("offer received")
    days = meta.get("daysSinceActivity")
    if days is not None:
        signal_strings.append(f"last activity {days}d ago")
    if meta.get("outreachCount", 0) > 0 and not meta.get("hasReply"):
        signal_strings.append("no reply yet")

    return cw, signal_strings


def _coach_watch_prompt_block(cw: dict, signal_strings: list) -> str:
    """Build a prompt block injecting Coach Watch as source of truth."""
    return f"""
COACH WATCH (SOURCE OF TRUTH — do not contradict):
- State: {cw['state']}
- Headline: {cw['headline']}
- Recommended Action: {cw['recommendedAction']}
- Confidence: {cw['confidenceLevel']}
- Interest Level: {cw['interestLevel']}
- Trend: {cw['trend']}
- Signals: {', '.join(signal_strings) if signal_strings else 'none'}

CONSTRAINT: Your recommendation must ALIGN with the Coach Watch assessment above. Explain and personalize the recommendation — do NOT override or contradict it."""


# ── Helpers ──

def _get_api_key():
    return os.environ.get("EMERGENT_LLM_KEY")


def _get_user_info(request: Request):
    auth_header = request.headers.get("authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(401, "Not authenticated")
    payload = decode_token(auth_header[7:])
    return payload["sub"], payload.get("role", "athlete")


async def _get_tenant_id(user_id: str):
    athlete = await db.athletes.find_one({"user_id": user_id}, {"_id": 0, "tenant_id": 1})
    if not athlete or not athlete.get("tenant_id"):
        raise HTTPException(404, "No athlete profile found")
    return athlete["tenant_id"]


async def _get_athlete_profile(tenant_id: str):
    """Fetch athlete profile data from the athletes collection."""
    athlete = await db.athletes.find_one({"tenant_id": tenant_id}, {"_id": 0})
    if not athlete:
        return None
    # Merge recruiting_profile sub-doc into top-level for backward compat
    rp = athlete.get("recruiting_profile") or {}
    profile = {**athlete}
    profile.setdefault("athlete_name", athlete.get("full_name", ""))
    profile.setdefault("club_team", athlete.get("team", ""))
    for k in ("gpa", "sat_score", "act_score", "division", "regions", "priorities"):
        if not profile.get(k) and rp.get(k):
            profile[k] = rp[k]
    return profile


async def _parse_llm_json(response_text):
    import re
    text = str(response_text).strip()
    # Try to extract JSON from code fences
    match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', text, re.DOTALL)
    if match:
        text = match.group(1)
    elif text.startswith("```"):
        parts = text.split("```")
        for part in parts:
            part = part.strip().lstrip("json").strip()
            if part.startswith("{"):
                text = part
                break
    # Find the JSON object
    brace_start = text.find("{")
    brace_end = text.rfind("}")
    if brace_start != -1 and brace_end != -1:
        text = text[brace_start:brace_end + 1]
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # LLMs sometimes produce unescaped quotes (e.g. 5'10" inside strings).
        # Try regex extraction of subject/body as fallback.
        subj_match = re.search(r'"subject"\s*:\s*"((?:[^"\\]|\\.)*)"', text)
        body_match = re.search(r'"body"\s*:\s*"((?:[^"\\]|\\.)*)"', text)
        if not body_match:
            # Greedy fallback: body is typically the last long value
            body_match = re.search(r'"body"\s*:\s*"(.*)"', text, re.DOTALL)
        if subj_match or body_match:
            return {
                "subject": subj_match.group(1) if subj_match else "",
                "body": (body_match.group(1) if body_match else "").replace("\\n", "\n").replace('\\"', '"'),
            }
        raise


# ─────────────────────────────────────────────────────────────
# 0. Auto-Insight (Coach Watch + AI explanation, cached)
# ─────────────────────────────────────────────────────────────

INSIGHT_CACHE_TTL_SECONDS = 2 * 60 * 60  # 2 hour fallback


class AutoInsightRequest(BaseModel):
    program_id: str


@router.post("/ai/auto-insight")
async def auto_insight(data: AutoInsightRequest, request: Request):
    """Return Coach Watch state + AI explanation. Cached per athlete+school."""
    user_id, _ = _get_user_info(request)
    tenant_id = await _get_tenant_id(user_id)

    # Check cache first
    now = datetime.now(timezone.utc)
    cache_key = {"tenant_id": tenant_id, "program_id": data.program_id}
    cached = await db.ai_insight_cache.find_one(cache_key, {"_id": 0})
    if cached and cached.get("created_at"):
        try:
            cached_dt = datetime.fromisoformat(str(cached["created_at"]).replace("Z", "+00:00"))
            if cached_dt.tzinfo is None:
                cached_dt = cached_dt.replace(tzinfo=timezone.utc)
            if (now - cached_dt).total_seconds() < INSIGHT_CACHE_TTL_SECONDS:
                return cached["payload"]
        except Exception as e:  # noqa: E722
            log.warning("Handled exception (silenced): %s", e)
            pass

    # Compute Coach Watch
    cw, signal_strings = await _build_coach_watch_context(tenant_id, data.program_id)
    if not cw:
        raise HTTPException(404, "Program not found")

    program = await db.programs.find_one({"program_id": data.program_id, "tenant_id": tenant_id}, {"_id": 0})

    # Build recommended_action_text (human-friendly version)
    action_text = cw.get("recommendedAction", "Review your next steps.")

    # Call LLM for the explanation layer
    system_message = """You are explaining a pre-determined recommendation for a student-athlete's college recruiting journey.

- DO NOT generate a new strategy
- DO NOT contradict the recommended_action
- Your role is to:
  1. Explain why this recommendation makes sense given the signals
  2. Add light personalization
  3. Keep it to 1-2 sentences

If confidence is low:
- Use softer language ("you may want to", "consider")

If confidence is high:
- Be direct ("follow up now", "wait 2 days")

Return ONLY valid JSON:
{"insight": "1-2 sentence explanation", "urgency": "high|medium|low"}"""

    cw_block = _coach_watch_prompt_block(cw, signal_strings)
    user_prompt = f"""{cw_block}

School: {program.get('university_name', 'Unknown')}
Explain to the athlete WHY the recommended action ("{action_text}") is the right move right now.
Return ONLY valid JSON."""

    ai_data = {"insight": "", "urgency": "medium"}
    try:
        api_key = _get_api_key()
        if api_key:
            chat = LlmChat(
                api_key=api_key,
                session_id=f"insight_{uuid.uuid4().hex[:8]}",
                system_message=system_message,
            ).with_model(LLM_MODEL_PROVIDER, LLM_MODEL_NAME)
            response = await chat.send_message(UserMessage(text=user_prompt))
            ai_data = await _parse_llm_json(response)
    except Exception as e:
        logger.warning(f"Auto-insight LLM failed (non-fatal): {e}")
        ai_data = {"insight": cw.get("summary", ""), "urgency": "medium"}

    # Map confidence to urgency fallback
    if not ai_data.get("urgency"):
        conf = cw.get("confidenceLevel", "low")
        ai_data["urgency"] = "high" if conf == "high" else "medium" if conf == "medium" else "low"

    payload = {
        "state": cw["state"],
        "headline": cw["headline"],
        "recommended_action": cw["state"],
        "recommended_action_text": action_text,
        "confidence": cw.get("confidenceLevel", "low"),
        "ai": {
            "insight": ai_data.get("insight", ""),
            "urgency": ai_data.get("urgency", "medium"),
        },
        "signals": signal_strings[:5],
    }

    # Cache the result
    await db.ai_insight_cache.update_one(
        cache_key,
        {"$set": {"payload": payload, "created_at": now.isoformat(), **cache_key}},
        upsert=True,
    )

    return payload


async def invalidate_insight_cache(tenant_id: str, program_id: str):
    """Call this whenever a new email, reply, open, or click event occurs."""
    await db.ai_insight_cache.delete_many({"tenant_id": tenant_id, "program_id": program_id})


# ─────────────────────────────────────────────────────────────
# 1. AI Draft Email
# ─────────────────────────────────────────────────────────────

class DraftEmailRequest(BaseModel):
    program_id: str
    email_type: str = "intro"
    custom_instructions: str = ""


@router.post("/ai/draft-email")
async def draft_email(data: DraftEmailRequest, request: Request):
    user_id, _ = _get_user_info(request)
    tenant_id = await _get_tenant_id(user_id)

    # Enforce AI draft limit
    from subscriptions import enforce_ai_limit
    ai_check = await enforce_ai_limit(tenant_id)
    if not ai_check["allowed"]:
        raise HTTPException(403, detail={
            "type": "subscription_limit",
            "message": ai_check.get("message", "AI draft limit reached."),
            "current": ai_check["current"],
            "limit": ai_check["limit"],
            "upgrade_to": ai_check.get("upgrade_to"),
        })

    profile = await _get_athlete_profile(tenant_id)
    if not profile:
        raise HTTPException(400, "Please set up your athlete profile first")

    program = await db.programs.find_one({"program_id": data.program_id, "tenant_id": tenant_id}, {"_id": 0})
    if not program:
        raise HTTPException(404, "Program not found")

    coaches = await db.college_coaches.find({"tenant_id": tenant_id, "program_id": data.program_id}, {"_id": 0}).to_list(10)
    head_coach = next((c for c in coaches if c.get("role") == "Head Coach"), coaches[0] if coaches else None)

    interactions = await db.interactions.find(
        {"tenant_id": tenant_id, "program_id": data.program_id}, {"_id": 0}
    ).sort("date_time", -1).to_list(5)

    athlete_info = f"""
Athlete Name: {profile.get('athlete_name', '')}
Position: {profile.get('position', '')}
Graduation Year: {profile.get('grad_year', '')}
Height: {profile.get('height', '')}
High School: {profile.get('high_school', '')}
Club Team: {profile.get('club_team', '')}
GPA: {profile.get('gpa', '')}
City/State: {profile.get('city', '')}, {profile.get('state', '')}
Video Link: {profile.get('video_link', '')}
Jersey Number: {profile.get('jersey_number', '')}
"""
    physical = []
    for k, label in [("weight", "Weight"), ("handed", "Handedness"), ("standing_reach", "Standing Reach"), ("approach_touch", "Approach Touch"), ("block_touch", "Block Touch")]:
        if profile.get(k):
            physical.append(f"{label}: {profile[k]}")
    if physical:
        athlete_info += "Physical Stats: " + ", ".join(physical) + "\n"

    school_info = f"""
University: {program.get('university_name', '')}
Division: {program.get('division', '')}
Conference: {program.get('conference', '')}
Coach Name: {head_coach.get('coach_name', 'Coach') if head_coach else 'Coach'}
Coach Email: {head_coach.get('email', '') if head_coach else ''}
Current Status: {program.get('recruiting_status', '')}
"""
    if interactions:
        school_info += "\nRecent Interaction History:\n"
        for ix in interactions[:3]:
            school_info += f"- {ix.get('type', '')} on {ix.get('date_time', '')[:10]}: {ix.get('outcome', '')}\n"

    email_prompts = {
        "intro": "Write an initial outreach email from the athlete to a college coach.\nTone: confident, enthusiastic, and respectful.\nInclude: brief self-introduction, key athletic stats, highlight video link, reason for interest in THIS program, polite closing.\nDo not use 'Dear Coach.' Keep under 150 words.",
        "follow_up": "Write a concise follow-up email. The athlete previously sent an introduction with no response yet.\nTone: polite, confident. Include: brief reference to earlier message, restatement of interest, one small new detail, professional closing.\nKeep short and direct.",
        "thank_you": "Write a thank-you email after attending a camp, clinic, or campus visit.\nTone: appreciative and genuine. Include: thanks, one specific detail from the experience, reaffirming interest, clean closing.\nUnder 120 words.",
        "interest_update": "Write an interest update email sharing new achievements or upcoming events.\nInclude: 1-2 meaningful updates, why they matter, where coach can watch, restatement of interest.\nKeep focused and readable.",
    }

    prompt_instruction = email_prompts.get(data.email_type, email_prompts["intro"])

    system_message = """You are ghostwriting on behalf of a high school athlete.
CRITICAL: Use EXACT values provided. Do NOT make up stats. If a field is empty, skip it.
Writing style: short, clear, casual but respectful, use contractions, sound like a real teenager.
Rules: No "Dear Coach", under 150 words, mention one specific detail about the school, include video link naturally if provided, sign off with athlete's actual name.
Return response as JSON with "subject" and "body" fields only."""

    user_prompt = f"""{prompt_instruction}

USE THIS EXACT ATHLETE DATA:
{athlete_info}
{school_info}

{f"Additional instructions: {data.custom_instructions}" if data.custom_instructions else ""}

Return ONLY valid JSON: {{"subject": "email subject line", "body": "email body text"}}"""

    try:
        api_key = _get_api_key()
        chat = LlmChat(api_key=api_key, session_id=f"draft_{uuid.uuid4().hex[:8]}", system_message=system_message).with_model(LLM_MODEL_PROVIDER, LLM_MODEL_NAME)
        response = await chat.send_message(UserMessage(text=user_prompt))
        result = await _parse_llm_json(response)

        # Track AI usage
        await db.ai_usage.insert_one({
            "tenant_id": tenant_id,
            "type": "draft_email",
            "email_type": data.email_type,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

        return {
            "subject": result.get("subject", ""),
            "body": result.get("body", ""),
            "email_type": data.email_type,
            "coach_name": head_coach.get("coach_name", "") if head_coach else "",
            "coach_email": head_coach.get("email", "") if head_coach else "",
        }
    except json.JSONDecodeError:
        return {
            "subject": f"Introduction - {profile.get('athlete_name', '')} | Class of {profile.get('grad_year', '')}",
            "body": response if isinstance(response, str) else str(response),
            "email_type": data.email_type,
            "coach_name": head_coach.get("coach_name", "") if head_coach else "",
            "coach_email": head_coach.get("email", "") if head_coach else "",
        }
    except Exception as e:
        logger.error(f"AI draft error: {e}")
        raise HTTPException(500, f"Failed to generate email draft: {str(e)}")


# ─────────────────────────────────────────────────────────────
# 2. AI Next Step
# ─────────────────────────────────────────────────────────────

class NextStepRequest(BaseModel):
    program_id: str


@router.post("/ai/next-step")
async def ai_next_step(data: NextStepRequest, request: Request):
    user_id, _ = _get_user_info(request)
    tenant_id = await _get_tenant_id(user_id)

    program = await db.programs.find_one({"program_id": data.program_id, "tenant_id": tenant_id}, {"_id": 0})
    if not program:
        raise HTTPException(404, "Program not found")

    profile = await _get_athlete_profile(tenant_id)
    if not profile:
        raise HTTPException(400, "Please set up your athlete profile first")

    interactions = await db.interactions.find(
        {"tenant_id": tenant_id, "program_id": data.program_id}, {"_id": 0}
    ).sort("date_time", -1).to_list(50)

    # Compute Coach Watch context
    cw, cw_signals = await _build_coach_watch_context(tenant_id, data.program_id)
    cw_block = _coach_watch_prompt_block(cw, cw_signals) if cw else ""

    # Sprint 3 SSOT: use canonical pipeline_stage for prompt context
    from services.stage_engine import compute_pipeline_stage
    _pipeline_stage = compute_pipeline_stage(program)
    _stage_labels = {"added": "Targeting", "outreach": "Contacted", "in_conversation": "Engaged",
                     "campus_visit": "Evaluating", "offer": "Offer", "committed": "Closed", "archived": "Archived"}
    stage = _stage_labels.get(_pipeline_stage, "Targeting")
    reply_to_response = {"No Reply": "no response", "Awaiting Reply": "no response", "Reply Received": "responded", "In Conversation": "asked for info"}
    coach_response = reply_to_response.get(program.get("reply_status", "No Reply"), "no response")

    last_contact_date, last_contact_method, days_since = "N/A", "N/A", "N/A"
    if interactions:
        last = interactions[0]
        last_contact_date = last.get("date_time", "")[:10] if last.get("date_time") else "N/A"
        type_map = {"Phone Call": "call", "Video Call": "call", "Campus Visit": "visit", "Camp Meeting": "camp"}
        last_contact_method = type_map.get(last.get("type", ""), "email")
        if last.get("date_time"):
            try:
                last_dt = datetime.fromisoformat(last["date_time"].replace("Z", "+00:00"))
                days_since = (datetime.now(timezone.utc) - last_dt).days
            except Exception as e:  # noqa: E722
                log.warning("Handled exception (handled): %s", e)
                days_since = "unknown"

    division = program.get("division", "")

    system_message = """You are an AI recruiting assistant for a college-bound student-athlete.
Recommend the single most important "Next Step" for a specific college program.
Your recommendation must ALIGN with the Coach Watch assessment provided. Explain and personalize, do not override.
Return ONLY valid JSON:
{"next_step": "one clear sentence", "reasoning": "1-2 sentence explanation", "urgency": "high|medium|low", "action_type": "email|call|visit|camp|highlight|academic|wait"}"""

    user_prompt = f"""Student: {profile.get('grad_year', 'N/A')} grad, {profile.get('position', 'N/A')}, GPA {profile.get('gpa', 'N/A')}
School: {program.get('university_name', 'N/A')}, {division}, Stage: {stage}
Last Contact: {last_contact_date} via {last_contact_method}, Coach: {coach_response}, Days since: {days_since}
{cw_block}
Return ONLY valid JSON."""

    try:
        api_key = _get_api_key()
        chat = LlmChat(api_key=api_key, session_id=f"nextstep_{uuid.uuid4().hex[:8]}", system_message=system_message).with_model(LLM_MODEL_PROVIDER, LLM_MODEL_NAME)
        response = await chat.send_message(UserMessage(text=user_prompt))
        result = await _parse_llm_json(response)
        return {**result, "program_id": data.program_id, "university_name": program.get("university_name", "")}
    except json.JSONDecodeError:
        return {"next_step": response[:300] if isinstance(response, str) else "Follow up with the coaching staff.", "reasoning": "AI recommendation.", "urgency": "medium", "action_type": "email", "program_id": data.program_id, "university_name": program.get("university_name", "")}
    except Exception as e:
        logger.error(f"AI next step error: {e}")
        raise HTTPException(500, f"Failed to generate next step: {str(e)}")


# ─────────────────────────────────────────────────────────────
# 3. AI Journey Summary
# ─────────────────────────────────────────────────────────────

class JourneySummaryRequest(BaseModel):
    program_id: str


@router.post("/ai/journey-summary")
async def generate_journey_summary(data: JourneySummaryRequest, request: Request):
    user_id, _ = _get_user_info(request)
    tenant_id = await _get_tenant_id(user_id)

    program = await db.programs.find_one({"program_id": data.program_id, "tenant_id": tenant_id}, {"_id": 0})
    if not program:
        raise HTTPException(404, "Program not found")

    profile = await _get_athlete_profile(tenant_id)
    coaches = await db.college_coaches.find({"tenant_id": tenant_id, "program_id": data.program_id}, {"_id": 0}).to_list(10)
    head_coach = next((c for c in coaches if c.get("role") == "Head Coach"), coaches[0] if coaches else None)
    interactions = await db.interactions.find({"tenant_id": tenant_id, "program_id": data.program_id}, {"_id": 0}).sort("date_time", -1).to_list(50)

    # Compute Coach Watch context
    cw, cw_signals = await _build_coach_watch_context(tenant_id, data.program_id)
    cw_block = _coach_watch_prompt_block(cw, cw_signals) if cw else ""

    context = f"""Program: {program.get('university_name', '')}, {program.get('division', '')}, {program.get('conference', '')}
Status: {program.get('recruiting_status', 'Not Contacted')}, Reply: {program.get('reply_status', 'No Reply')}, Priority: {program.get('priority', 'Medium')}
Coach: {head_coach.get('coach_name', 'Unknown') if head_coach else 'No coach added'}"""

    if interactions:
        context += "\nHistory:\n"
        for ix in interactions[:10]:
            context += f"- {ix.get('date_time', '')[:10]}: {ix.get('type', '')} - {ix.get('outcome', '')}\n"

    athlete_name = profile.get('athlete_name', 'The athlete') if profile else 'The athlete'

    system_message = """Summarize a recruiting journey. Your summary must align with the Coach Watch assessment provided.
Do not contradict the Coach Watch recommended action.
Return ONLY valid JSON:
{"relationship_summary": "2-3 sentences", "key_highlights": ["highlight 1", "highlight 2"], "suggested_action": "specific next step", "action_type": "email|call|wait|event|other"}"""

    try:
        api_key = _get_api_key()
        chat = LlmChat(api_key=api_key, session_id=f"journey_{uuid.uuid4().hex[:8]}", system_message=system_message).with_model(LLM_MODEL_PROVIDER, LLM_MODEL_NAME)
        response = await chat.send_message(UserMessage(text=f"Analyze:\n{context}\n{cw_block}\nWhat should {athlete_name} do next? Return ONLY valid JSON."))
        result = await _parse_llm_json(response)
        return {**result, "program_id": data.program_id, "university_name": program.get("university_name", ""), "coach_name": head_coach.get("coach_name", "") if head_coach else ""}
    except json.JSONDecodeError:
        return {"relationship_summary": "Unable to generate summary.", "key_highlights": [], "suggested_action": "Review your interactions.", "action_type": "other"}
    except Exception as e:
        logger.error(f"Journey summary error: {e}")
        raise HTTPException(500, f"Failed to generate summary: {str(e)}")


# ─────────────────────────────────────────────────────────────
# 4. AI Assistant (Conversational)
# ─────────────────────────────────────────────────────────────

@router.post("/ai/assistant")
async def ai_assistant(request: Request):
    user_id, _ = _get_user_info(request)
    tenant_id = await _get_tenant_id(user_id)

    body = await request.json()
    message = body.get("message", "").strip()
    session_id = body.get("session_id", f"asst_{uuid.uuid4().hex[:8]}")
    if not message:
        raise HTTPException(400, "Message is required")

    profile = await db.athlete_profiles.find_one({"tenant_id": tenant_id}, {"_id": 0}) or {}
    programs = await db.programs.find({"tenant_id": tenant_id}, {"_id": 0}).to_list(30)
    interactions = await db.interactions.find({"tenant_id": tenant_id}, {"_id": 0}).sort("date_time", -1).to_list(20)

    history = await db.ai_conversations.find({"session_id": session_id, "tenant_id": tenant_id}, {"_id": 0}).sort("created_at", 1).to_list(20)

    school_list = ", ".join([f"{p.get('university_name', '')} ({p.get('recruiting_status', '')})" for p in programs[:15]])
    recent_activity = "\n".join([f"- {i.get('type', '')} with {i.get('university_name', '')} on {i.get('date_time', '')}: {i.get('outcome', '')}" for i in interactions[:10]])

    system_message = f"""You are an expert volleyball recruiting advisor.
ATHLETE: {profile.get('athlete_name', 'Unknown')}, {profile.get('position', '')}, Grad {profile.get('grad_year', '')}, GPA {profile.get('gpa', '')}, {profile.get('state', '')}
PIPELINE ({len(programs)} schools): {school_list or "No schools yet"}
RECENT ACTIVITY: {recent_activity or "None"}
Give specific, actionable advice. Keep answers concise (2-4 paragraphs). Be encouraging but realistic."""

    try:
        api_key = _get_api_key()
        chat = LlmChat(api_key=api_key, session_id=session_id, system_message=system_message).with_model(LLM_MODEL_PROVIDER, LLM_MODEL_NAME)

        # Feed history as context
        combined_history = ""
        for h in history[-6:]:
            role = "User" if h.get("role") == "user" else "Assistant"
            combined_history += f"{role}: {h['content']}\n\n"

        full_prompt = f"{combined_history}User: {message}" if combined_history else message
        response = await chat.send_message(UserMessage(text=full_prompt))
        response_text = response if isinstance(response, str) else str(response)

        now = datetime.now(timezone.utc).isoformat()
        await db.ai_conversations.insert_one({"session_id": session_id, "tenant_id": tenant_id, "role": "user", "content": message, "created_at": now})
        await db.ai_conversations.insert_one({"session_id": session_id, "tenant_id": tenant_id, "role": "assistant", "content": response_text, "created_at": now})

        return {"response": response_text, "session_id": session_id}
    except Exception as e:
        logger.error(f"AI Assistant error: {e}")
        raise HTTPException(500, f"Assistant error: {str(e)}")


@router.get("/ai/assistant/history")
async def get_assistant_history(session_id: str, request: Request):
    user_id, _ = _get_user_info(request)
    tenant_id = await _get_tenant_id(user_id)
    messages = await db.ai_conversations.find({"session_id": session_id, "tenant_id": tenant_id}, {"_id": 0}).sort("created_at", 1).to_list(50)
    return {"messages": messages, "session_id": session_id}


@router.get("/ai/assistant/sessions")
async def get_assistant_sessions(request: Request):
    user_id, _ = _get_user_info(request)
    tenant_id = await _get_tenant_id(user_id)
    pipeline = [
        {"$match": {"tenant_id": tenant_id}},
        {"$sort": {"created_at": -1}},
        {"$group": {"_id": "$session_id", "last_message": {"$first": "$content"}, "last_at": {"$first": "$created_at"}, "count": {"$sum": 1}}},
        {"$sort": {"last_at": -1}},
        {"$limit": 10},
    ]
    sessions = await db.ai_conversations.aggregate(pipeline).to_list(10)
    return {"sessions": [{"session_id": s["_id"], "preview": s["last_message"][:80], "last_at": s["last_at"], "messages": s["count"]} for s in sessions]}


# ─────────────────────────────────────────────────────────────
# 5. Outreach Analysis
# ─────────────────────────────────────────────────────────────

@router.get("/ai/outreach-analysis")
async def outreach_analysis(request: Request):
    user_id, _ = _get_user_info(request)
    tenant_id = await _get_tenant_id(user_id)

    programs = await db.programs.find({"tenant_id": tenant_id}, {"_id": 0}).to_list(100)
    interactions = await db.interactions.find({"tenant_id": tenant_id}, {"_id": 0}).to_list(500)
    profile = await db.athlete_profiles.find_one({"tenant_id": tenant_id}, {"_id": 0}) or {}

    if not programs:
        return {"analysis": None, "message": "Add schools to your pipeline first."}

    total = len(interactions)
    by_type, by_outcome, by_school = {}, {}, {}
    replied_schools = set()
    for i in interactions:
        by_type[i.get("type", "Other")] = by_type.get(i.get("type", "Other"), 0) + 1
        by_outcome[i.get("outcome", "No Response")] = by_outcome.get(i.get("outcome", "No Response"), 0) + 1
        school = i.get("university_name", "Unknown")
        by_school[school] = by_school.get(school, 0) + 1
        if i.get("outcome") in ("Positive Response", "Reply Received"):
            replied_schools.add(school)

    response_rate = len(replied_schools) / len(programs) * 100 if programs else 0
    by_division = {}
    for p in programs:
        d = p.get("division", "Unknown")
        if d not in by_division:
            by_division[d] = {"total": 0, "replied": 0}
        by_division[d]["total"] += 1
        if p.get("reply_status") not in ("No Reply", "", None):
            by_division[d]["replied"] += 1

    stats_ctx = f"Total schools: {len(programs)}, Interactions: {total}, Replied: {len(replied_schools)}, Rate: {response_rate:.0f}%\nBY TYPE: {json.dumps(by_type)}\nBY DIVISION: {json.dumps(by_division)}"

    try:
        api_key = _get_api_key()
        chat = LlmChat(api_key=api_key, session_id=f"outreach_{uuid.uuid4().hex[:8]}", system_message="Analyze recruiting outreach data. Return ONLY valid JSON.").with_model(LLM_MODEL_PROVIDER, LLM_MODEL_NAME)
        prompt = f"""{stats_ctx}\nReturn JSON: {{"overall_score": <1-100>, "score_label": "Excellent|Good|Needs Work|Getting Started", "summary": "2-3 sentences", "strengths": ["str1","str2"], "improvements": ["imp1","imp2","imp3"], "division_insights": "insights", "next_steps": ["step1","step2","step3"]}}"""
        response = await chat.send_message(UserMessage(text=prompt))
        ai_insights = await _parse_llm_json(response)

        return {"analysis": {"ai_insights": ai_insights, "stats": {"total_schools": len(programs), "total_interactions": total, "replied_schools": len(replied_schools), "response_rate": round(response_rate, 1), "by_type": by_type, "by_outcome": by_outcome, "by_division": by_division, "top_schools": dict(sorted(by_school.items(), key=lambda x: -x[1])[:5])}}}
    except Exception as e:
        logger.error(f"Outreach analysis error: {e}")
        return {"analysis": {"ai_insights": None, "stats": {"total_schools": len(programs), "total_interactions": total, "replied_schools": len(replied_schools), "response_rate": round(response_rate, 1), "by_type": by_type, "by_division": by_division}}}


# ─────────────────────────────────────────────────────────────
# 6. Highlight Reel Advice
# ─────────────────────────────────────────────────────────────

@router.post("/ai/highlight-advice")
async def highlight_reel_advice(request: Request):
    user_id, _ = _get_user_info(request)
    tenant_id = await _get_tenant_id(user_id)

    body = await request.json()
    question = body.get("question", "")

    profile = await db.athlete_profiles.find_one({"tenant_id": tenant_id}, {"_id": 0}) or {}
    programs = await db.programs.find({"tenant_id": tenant_id}, {"_id": 0}).to_list(30)
    divisions = list(set(p.get("division", "") for p in programs if p.get("division")))

    ctx = f"Athlete: {profile.get('athlete_name', 'Unknown')}, {profile.get('position', 'Unknown')}, {profile.get('height', '')}, Grad {profile.get('grad_year', '')}, Targeting: {', '.join(divisions) if divisions else 'Not specified'}"

    try:
        api_key = _get_api_key()
        chat = LlmChat(api_key=api_key, session_id=f"highlight_{uuid.uuid4().hex[:8]}", system_message="Expert volleyball recruiting video consultant. Return ONLY valid JSON.").with_model(LLM_MODEL_PROVIDER, LLM_MODEL_NAME)
        prompt = f"""{ctx}\n{f"Question: {question}" if question else "Provide comprehensive highlight reel recommendations."}\nReturn JSON: {{"video_length": "length", "structure": [{{"section": "name", "duration": "time", "description": "what"}}], "must_include_skills": ["skill1"], "avoid": ["avoid1"], "technical_tips": ["tip1"], "position_specific": "advice", "coach_perspective": "what coaches look for", "distribution_tips": ["tip1"]}}"""
        response = await chat.send_message(UserMessage(text=prompt))
        advice = await _parse_llm_json(response)
        return {"advice": advice}
    except Exception as e:
        logger.error(f"Highlight advice error: {e}")
        return {"advice": {"error": "Unable to generate advice. Please try again."}}


# ─────────────────────────────────────────────────────────────
# 7. Coach Watch (Premium) — with real web search
# ─────────────────────────────────────────────────────────────

async def _search_coaching_news(school_names: list) -> dict:
    """Search for volleyball coaching news using DuckDuckGo."""
    from duckduckgo_search import DDGS
    import asyncio

    results = {}
    ddgs = DDGS()

    def _search(school):
        try:
            articles = ddgs.news(f'"{school}" volleyball head coach', max_results=5)
            return school, [
                {"title": a.get("title", ""), "url": a.get("url", ""), "date": a.get("date", ""), "body": a.get("body", "")}
                for a in articles
            ]
        except Exception as e:
            logger.warning(f"Coach watch search failed for {school}: {e}")
            return school, []

    loop = asyncio.get_event_loop()
    for school in school_names:
        name, articles = await loop.run_in_executor(None, _search, school)
        results[name] = articles

    return results


@router.post("/ai/coach-watch/scan")
async def coach_watch_scan(request: Request):
    """Scan for coaching changes at schools in user's pipeline. Premium only."""
    user_id, _ = _get_user_info(request)
    tenant_id = await _get_tenant_id(user_id)

    # Enforce premium
    from subscriptions import get_user_subscription
    subscription = await get_user_subscription(tenant_id)
    if not subscription.get("auto_reply_detection"):
        raise HTTPException(403, "Coach Watch requires a Premium plan.")

    programs = await db.programs.find({"tenant_id": tenant_id}, {"_id": 0, "university_name": 1}).to_list(100)
    if not programs:
        return {"alerts": [], "message": "Add schools to your pipeline first."}

    school_names = list(set(p["university_name"] for p in programs))

    # Search for real news
    news_results = await _search_coaching_news(school_names)

    # Build context for AI
    news_ctx = ""
    for school, articles in news_results.items():
        if articles:
            news_ctx += f"\n## {school}\n"
            for a in articles:
                news_ctx += f"- {a['title']} ({a['date']})\n  {a['body'][:200]}\n"
        else:
            news_ctx += f"\n## {school}\nNo recent news found.\n"

    try:
        api_key = _get_api_key()
        chat = LlmChat(
            api_key=api_key,
            session_id=f"coachwatch_{uuid.uuid4().hex[:8]}",
            system_message="You are a volleyball recruiting analyst specializing in coaching staff changes. Analyze news articles and identify coaching changes, contract updates, and staff stability. Return ONLY valid JSON.",
        ).with_model(LLM_MODEL_PROVIDER, LLM_MODEL_NAME)

        prompt = f"""Analyze these recent news articles about volleyball coaching staff at these universities.
For EACH school, determine:
- Is there a coaching change (departure, new hire, firing)?
- Is there a contract update (extension, expiration)?
- Is the coaching situation stable?

NEWS ARTICLES:
{news_ctx}

Return a JSON array. One entry per school. ONLY include schools where something noteworthy was found (changes, extensions, new hires, departures). Skip schools with no news or no relevant coaching updates.

[
  {{
    "university_name": "School Name",
    "severity": "red|yellow|green",
    "headline": "Short alert headline",
    "summary": "2-3 sentence summary of the situation",
    "coach_name": "Coach name involved",
    "change_type": "departure|new_hire|extension|contract_update|staff_change|stable",
    "recommendation": "What this means for a recruit targeting this school"
  }}
]

Severity guide:
- red: Head coach departed/fired, or new head coach hired (major disruption)
- yellow: Assistant changes, contract negotiations, rumors, new coach in early tenure (year 1-2)
- green: Contract extension, long-tenured stable coach (positive signal)

If NO schools have noteworthy coaching news, return an empty array: []"""

        response = await chat.send_message(UserMessage(text=prompt))
        alerts = await _parse_llm_json(response)
        if not isinstance(alerts, list):
            alerts = []

        now = datetime.now(timezone.utc).isoformat()
        await db.coach_watch_alerts.delete_many({"tenant_id": tenant_id})

        from services.notifications import create_notification

        for alert in alerts:
            alert["alert_id"] = f"cw_{uuid.uuid4().hex[:12]}"
            alert["tenant_id"] = tenant_id
            alert["created_at"] = now
            alert["read"] = False
            await db.coach_watch_alerts.insert_one(alert)
            alert.pop("_id", None)

            # Create notification for red/yellow alerts
            if alert.get("severity") in ("red", "yellow"):
                # Find user_id for the tenant
                athlete = await db.athletes.find_one({"tenant_id": tenant_id}, {"_id": 0, "user_id": 1})
                if athlete:
                    await create_notification(
                        tenant_id,
                        athlete["user_id"],
                        "coach_watch",
                        f"Coach Watch: {alert['university_name']}",
                        alert.get("headline", "Coaching update detected"),
                        "",
                    )

        return {"alerts": alerts, "scanned_at": now, "schools_scanned": len(school_names)}

    except json.JSONDecodeError:
        return {"alerts": [], "error": "Failed to parse AI response"}
    except Exception as e:
        logger.error(f"Coach watch error: {e}")
        return {"alerts": [], "error": f"Scan failed: {str(e)}"}


@router.get("/ai/coach-watch/alerts")
async def get_coach_watch_alerts(request: Request):
    """Get stored coach watch alerts for user's pipeline. Premium only."""
    user_id, _ = _get_user_info(request)
    tenant_id = await _get_tenant_id(user_id)

    from subscriptions import get_user_subscription
    subscription = await get_user_subscription(tenant_id)
    if not subscription.get("auto_reply_detection"):
        raise HTTPException(403, "Coach Watch requires a Premium plan.")

    alerts = await db.coach_watch_alerts.find({"tenant_id": tenant_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"alerts": alerts}


@router.get("/ai/coach-watch/alert/{university_name}")
async def get_coach_watch_alert_for_school(university_name: str, request: Request):
    """Get coach watch alert for a specific school (used by Journey page)."""
    user_id, _ = _get_user_info(request)
    tenant_id = await _get_tenant_id(user_id)
    alert = await db.coach_watch_alerts.find_one({"tenant_id": tenant_id, "university_name": university_name}, {"_id": 0})
    return {"alert": alert}


# ─────────────────────────────────────────────────────────────
# 8. School Insight (Source-Aware)
# ─────────────────────────────────────────────────────────────

@router.post("/ai/school-insight/{program_id}")
async def get_school_insight(program_id: str, request: Request):
    user_id, _ = _get_user_info(request)
    tenant_id = await _get_tenant_id(user_id)

    cache_key = {"tenant_id": tenant_id, "program_id": program_id}
    cached = await db.ai_school_insights.find_one(cache_key, {"_id": 0})
    if cached:
        try:
            cache_dt = datetime.fromisoformat(cached.get("created_at", ""))
            if (datetime.now(timezone.utc) - cache_dt).total_seconds() / 3600 < 24:
                return cached.get("insight", cached)
        except Exception as e:  # noqa: E722
            log.warning("Handled exception (silenced): %s", e)
            pass

    program = await db.programs.find_one({"program_id": program_id, "tenant_id": tenant_id}, {"_id": 0})
    if not program:
        raise HTTPException(404, "Program not found")

    profile = await _get_athlete_profile(tenant_id)
    if not profile:
        raise HTTPException(400, "Complete your athlete profile first")

    uni_data = await db.university_knowledge_base.find_one({"university_name": program.get("university_name", "")}, {"_id": 0})
    scorecard = (uni_data or {}).get("scorecard", {}) or {}

    ctx = json.dumps({
        "school": {"name": program.get("university_name"), "division": program.get("division"), "conference": program.get("conference")},
        "academics": {"sat_avg": scorecard.get("sat_avg"), "admission_rate": scorecard.get("admission_rate"), "graduation_rate": scorecard.get("graduation_rate")},
        "athlete": {"gpa": profile.get("gpa"), "sat_score": profile.get("sat_score"), "position": profile.get("position"), "priorities": profile.get("priorities", [])},
    }, indent=2)

    system_message = """Source-aware recruiting analyst. Analyze school fit. Return JSON:
{"strengths": [{"text": "reason", "severity": "low", "evidence": "full|partial"}], "concerns": [{"text": "concern", "severity": "medium|high|low", "evidence": "full|partial"}], "unknowns": [{"text": "gap"}], "summary": "1-2 sentences", "status": "ok|insufficient_data", "data_quality": {"level": "High|Medium|Limited"}}
Exactly 3 strengths, 2-3 concerns. Be specific to THIS school."""

    try:
        api_key = _get_api_key()
        chat = LlmChat(api_key=api_key, session_id=f"insight_{uuid.uuid4().hex[:8]}", system_message=system_message).with_model(LLM_MODEL_PROVIDER, LLM_MODEL_NAME)
        response = await chat.send_message(UserMessage(text=f"Analyze:\n{ctx}\nReturn ONLY valid JSON."))
        insight = await _parse_llm_json(response)

        now_iso = datetime.now(timezone.utc).isoformat()
        result = {"insight": insight, "program_id": program_id, "university_name": program.get("university_name", ""), "generated_at": now_iso, "division": program.get("division", "")}
        await db.ai_school_insights.update_one(cache_key, {"$set": {**cache_key, "insight": result, "created_at": now_iso}}, upsert=True)
        return result
    except Exception as e:
        logger.error(f"School insight error: {e}")
        raise HTTPException(500, f"Failed to generate insight: {str(e)}")


@router.delete("/ai/school-insight/{program_id}/cache")
async def clear_school_insight_cache(program_id: str, request: Request):
    user_id, _ = _get_user_info(request)
    tenant_id = await _get_tenant_id(user_id)
    await db.ai_school_insights.delete_one({"tenant_id": tenant_id, "program_id": program_id})
    return {"cleared": True}
