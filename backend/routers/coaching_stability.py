"""Coaching Stability — surfaces head coach job stability as a badge on the Journey page.

Uses cached coach_watch_alerts data from the weekly background scan.
Falls back to an on-demand single-school scan if no cached data exists.
"""

from fastapi import APIRouter, HTTPException, Request
from datetime import datetime, timezone
import os
import uuid
import json
import logging

from auth_middleware import decode_token
from db_client import db
from emergentintegrations.llm.chat import LlmChat, UserMessage

logger = logging.getLogger(__name__)

router = APIRouter()

STABILITY_CACHE_TTL_HOURS = 168  # 7 days


def _get_user_info(request: Request):
    auth_header = request.headers.get("authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(401, "Not authenticated")
    payload = decode_token(auth_header[7:])
    return payload["sub"], payload.get("role", "athlete")


async def _get_tenant_id(user_id: str):
    athlete = await db.athletes.find_one(
        {"user_id": user_id}, {"_id": 0, "tenant_id": 1}
    )
    if not athlete or not athlete.get("tenant_id"):
        raise HTTPException(404, "No athlete profile found")
    return athlete["tenant_id"]


async def _scan_single_school(university_name: str, tenant_id: str) -> dict:
    """Run an on-demand coaching stability scan for a single school."""
    from routers.ai_features import _search_coaching_news

    news_results = await _search_coaching_news([university_name])
    articles = news_results.get(university_name, [])

    news_ctx = f"## {university_name}\n"
    if articles:
        for a in articles:
            news_ctx += f"- {a['title']} ({a['date']})\n  {a['body'][:200]}\n"
    else:
        news_ctx += "No recent news found.\n"

    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        return _default_stable(university_name, tenant_id)

    chat = LlmChat(
        api_key=api_key,
        session_id=f"cs_{uuid.uuid4().hex[:8]}",
        system_message=(
            "You are a volleyball recruiting analyst. Analyze news for coaching "
            "staff changes. Return ONLY valid JSON."
        ),
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")

    prompt = f"""Analyze these news articles about the volleyball head coach at {university_name}.
Determine if the coaching situation is stable or if there are changes.

{news_ctx}

Return ONLY a JSON object (NOT an array):
{{
  "university_name": "{university_name}",
  "severity": "red|yellow|green",
  "headline": "Short status headline",
  "summary": "1-2 sentence summary",
  "coach_name": "Coach name if found, or empty string",
  "change_type": "departure|new_hire|extension|contract_update|staff_change|stable",
  "recommendation": "What this means for a recruit"
}}

Severity guide:
- red: Head coach departed/fired, or program in turmoil
- yellow: New hire (year 1-2), assistant changes, contract negotiations, rumors
- green: Stable coaching situation, contract extension, long-tenured coach"""

    try:
        response = await chat.send_message(UserMessage(text=prompt))
        response_text = response if isinstance(response, str) else str(response)
        response_text = response_text.strip()
        if response_text.startswith("```"):
            response_text = response_text.split("\n", 1)[1].rsplit("```", 1)[0].strip()

        brace_start = response_text.find("{")
        brace_end = response_text.rfind("}")
        if brace_start != -1 and brace_end != -1:
            response_text = response_text[brace_start : brace_end + 1]

        result = json.loads(response_text)
        if isinstance(result, list):
            result = result[0] if result else _default_stable(university_name, tenant_id)

        now = datetime.now(timezone.utc).isoformat()
        result["tenant_id"] = tenant_id
        result["alert_id"] = f"cs_{uuid.uuid4().hex[:12]}"
        result["created_at"] = now
        result["university_name"] = university_name

        # Upsert into coach_watch_alerts
        await db.coach_watch_alerts.update_one(
            {"tenant_id": tenant_id, "university_name": university_name},
            {"$set": result},
            upsert=True,
        )

        # Remove _id if present
        result.pop("_id", None)
        return result

    except Exception as e:
        logger.warning(f"On-demand coaching stability scan failed for {university_name}: {e}")
        return _default_stable(university_name, tenant_id)


def _default_stable(university_name: str, tenant_id: str) -> dict:
    """Return a default 'stable / no data' response."""
    return {
        "university_name": university_name,
        "severity": "green",
        "headline": "No coaching changes detected",
        "summary": "No recent news about coaching staff changes was found for this program.",
        "coach_name": "",
        "change_type": "stable",
        "recommendation": "The coaching situation appears stable. Continue building your relationship.",
        "tenant_id": tenant_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/coaching-stability/{program_id}")
async def get_coaching_stability(program_id: str, request: Request):
    """Get coaching stability status for a program. Returns cached data or scans on-demand."""
    user_id, _ = _get_user_info(request)
    tenant_id = await _get_tenant_id(user_id)

    program = await db.programs.find_one(
        {"program_id": program_id, "tenant_id": tenant_id},
        {"_id": 0, "university_name": 1},
    )
    if not program:
        raise HTTPException(404, "Program not found")

    university_name = program.get("university_name", "")
    if not university_name:
        raise HTTPException(400, "Program has no university name")

    # Check for cached data
    cached = await db.coach_watch_alerts.find_one(
        {"tenant_id": tenant_id, "university_name": university_name},
        {"_id": 0},
    )

    if cached and cached.get("created_at"):
        try:
            cached_dt = datetime.fromisoformat(
                str(cached["created_at"]).replace("Z", "+00:00")
            )
            if cached_dt.tzinfo is None:
                cached_dt = cached_dt.replace(tzinfo=timezone.utc)
            age_hours = (datetime.now(timezone.utc) - cached_dt).total_seconds() / 3600
            if age_hours < STABILITY_CACHE_TTL_HOURS:
                return {"stability": cached, "source": "cached"}
        except Exception:
            pass

    # No cached data — run on-demand scan
    result = await _scan_single_school(university_name, tenant_id)
    return {"stability": result, "source": "scanned"}


@router.post("/coaching-stability/{program_id}/refresh")
async def refresh_coaching_stability(program_id: str, request: Request):
    """Force-refresh coaching stability for a program."""
    user_id, _ = _get_user_info(request)
    tenant_id = await _get_tenant_id(user_id)

    program = await db.programs.find_one(
        {"program_id": program_id, "tenant_id": tenant_id},
        {"_id": 0, "university_name": 1},
    )
    if not program:
        raise HTTPException(404, "Program not found")

    university_name = program.get("university_name", "")
    if not university_name:
        raise HTTPException(400, "Program has no university name")

    result = await _scan_single_school(university_name, tenant_id)
    return {"stability": result, "source": "refreshed"}
