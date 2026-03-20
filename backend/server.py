"""CapyMatch API — main application entry point.

Slim orchestrator: creates the FastAPI app, registers routers,
runs the startup pipeline, and manages background tasks.
"""

from fastapi import FastAPI, APIRouter
from starlette.middleware.cors import CORSMiddleware
import os
import asyncio
import logging
from datetime import datetime, timezone
from typing import List
from pydantic import BaseModel

from db_client import db, client
from models import StatusCheck, StatusCheckCreate
from services.startup import run_startup

# Routers
from routers.mission_control import router as mission_control_router
from routers.athletes import router as athletes_router
from routers.support_pods import router as support_pods_router
from routers.events import router as events_router
from routers.advocacy import router as advocacy_router
from routers.program import router as program_router
from routers.admin import router as admin_router
from routers.debug import router as debug_router
from routers.auth import router as auth_router
from routers.invites import router as invites_router
from routers.intelligence import router as intelligence_router
from routers.roster import router as roster_router
from routers.onboarding import router as onboarding_router
from routers.profile import router as profile_router
from routers.digest import router as digest_router
from routers.athlete_self import router as athlete_self_router
from routers.athlete_dashboard import router as athlete_dashboard_router
from routers.support_messages import router as support_messages_router
from routers.athlete_profile import router as athlete_profile_router
from routers.athlete_knowledge import router as athlete_knowledge_router
from routers.athlete_onboarding import router as athlete_onboarding_router
from routers.athlete_gmail import router as athlete_gmail_router
from routers.athlete_gmail_intelligence import router as athlete_gmail_intel_router
from routers.athlete_settings import router as athlete_settings_router
from routers.school_pod import router as school_pod_router
from routers.team import router as team_router
from routers.admin_kb_jobs import router as admin_kb_jobs_router
from routers.ai_features import router as ai_features_router
from routers.momentum_recap import router as momentum_recap_router
from routers.subscription import router as subscription_router
from routers.notifications import router as notifications_router
from routers.athlete_tasks import router as athlete_tasks_router
from routers.program_notes import router as program_notes_router
from routers.stripe_checkout import router as stripe_checkout_router
from routers.connected import router as connected_router
from routers.coach_flags import router as coach_flags_router
from routers.smart_match import router as smart_match_router
from routers.coach_scraper import router as coach_scraper_router
from routers.college_scorecard import router as college_scorecard_router
from routers.admin_universities import router as admin_universities_router
from routers.admin_integrations import router as admin_integrations_router
from routers.admin_dashboard import router as admin_dashboard_router
from routers.organizations import router as organizations_router
from routers.director_actions import router as director_actions_router
from routers.director_inbox import router as director_inbox_router
from routers.autopilot import router as autopilot_router
from routers.coach_inbox import router as coach_inbox_router
from routers.admin_user_management import router as admin_user_mgmt_router
from routers.program_metrics import router as program_metrics_router
from routers.public_profile import router as public_profile_router
from routers.youtube_feed import router as youtube_feed_router

logger = logging.getLogger(__name__)

# Create the main app
app = FastAPI()

# Parent router with /api prefix — all sub-routers inherit this
api_router = APIRouter(prefix="/api")

# ── Background Tasks ──

coach_watch_task = None


async def coach_watch_weekly_scan():
    """Background task: weekly Coach Watch scan for all Premium tenants."""
    from routers.ai_features import _search_coaching_news, _parse_llm_json
    from services.notifications import create_notification
    from subscriptions import get_user_subscription
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    import json
    import uuid as _uuid

    while True:
        try:
            await asyncio.sleep(604800)  # 7 days

            premium_tenants = await db.tenants.find({"plan": "premium"}, {"_id": 0}).to_list(500)
            logger.info(f"Coach Watch: scanning {len(premium_tenants)} premium tenants")

            for tenant in premium_tenants:
                tenant_id = tenant["tenant_id"]
                try:
                    programs = await db.programs.find(
                        {"tenant_id": tenant_id},
                        {"_id": 0, "university_name": 1},
                    ).to_list(100)
                    if not programs:
                        continue

                    school_names = list(set(p["university_name"] for p in programs))
                    news_results = await _search_coaching_news(school_names)

                    news_ctx = ""
                    for school, articles in news_results.items():
                        if articles:
                            news_ctx += f"\n## {school}\n"
                            for a in articles:
                                news_ctx += f"- {a['title']} ({a['date']})\n  {a['body'][:200]}\n"
                        else:
                            news_ctx += f"\n## {school}\nNo recent news found.\n"

                    api_key = os.environ.get("EMERGENT_LLM_KEY")
                    chat = LlmChat(
                        api_key=api_key,
                        session_id=f"cw_auto_{_uuid.uuid4().hex[:8]}",
                        system_message="You are a volleyball recruiting analyst. Analyze news for coaching changes. Return ONLY valid JSON.",
                    ).with_model("anthropic", "claude-sonnet-4-5-20250929")

                    prompt = f"""Analyze these news articles about volleyball coaching staff. For EACH school with noteworthy changes, return a JSON array entry.
{news_ctx}
Return JSON array: [{{"university_name":"","severity":"red|yellow|green","headline":"","summary":"","coach_name":"","change_type":"departure|new_hire|extension|staff_change|stable","recommendation":""}}]
If no changes found, return []"""

                    response = await chat.send_message(UserMessage(text=prompt))
                    response_text = response.text if hasattr(response, "text") else str(response)
                    response_text = response_text.strip()
                    if response_text.startswith("```"):
                        response_text = response_text.split("\n", 1)[1].rsplit("```", 1)[0].strip()

                    alerts = json.loads(response_text)
                    if not isinstance(alerts, list):
                        alerts = []

                    now = datetime.now(timezone.utc).isoformat()
                    await db.coach_watch_alerts.delete_many({"tenant_id": tenant_id})

                    if alerts:
                        for alert in alerts:
                            alert["alert_id"] = f"cw_{_uuid.uuid4().hex[:12]}"
                            alert["tenant_id"] = tenant_id
                            alert["created_at"] = now
                            alert["read"] = False
                        await db.coach_watch_alerts.insert_many(alerts)

                        # Notify for red/yellow alerts
                        athlete = await db.athletes.find_one({"tenant_id": tenant_id}, {"_id": 0, "user_id": 1})
                        if athlete:
                            for alert in alerts:
                                if alert.get("severity") in ("red", "yellow"):
                                    await create_notification(
                                        tenant_id,
                                        athlete["user_id"],
                                        "coach_watch",
                                        f"Coach Watch: {alert['university_name']}",
                                        alert.get("headline", "Coaching update detected"),
                                        "",
                                    )

                    logger.info(f"Coach Watch: {tenant_id} - {len(alerts)} alerts found")
                except Exception as e:
                    logger.error(f"Coach Watch scan error for {tenant_id}: {e}")
                    continue

        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Coach Watch background task error: {e}")
            await asyncio.sleep(3600)  # Retry in 1 hour on error


# ── Startup ──

@app.on_event("startup")
async def startup():
    global coach_watch_task
    await run_startup(db)
    coach_watch_task = asyncio.create_task(coach_watch_weekly_scan())
    logger.info("Coach Watch background task started (7-day interval)")


@app.on_event("shutdown")
async def shutdown():
    global coach_watch_task
    if coach_watch_task:
        coach_watch_task.cancel()
        try:
            await coach_watch_task
        except asyncio.CancelledError:
            pass
    client.close()


# ── Root + Status (kept here — too small for their own router) ──

@api_router.get("/")
async def root():
    return {"message": "CapyMatch Mission Control API"}


@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    _ = await db.status_checks.insert_one(doc)
    return status_obj


@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    return status_checks


# ── Register all routers ──

api_router.include_router(mission_control_router)
api_router.include_router(athletes_router)
api_router.include_router(support_pods_router)
api_router.include_router(support_messages_router)
api_router.include_router(events_router)
api_router.include_router(advocacy_router)
api_router.include_router(program_router)
api_router.include_router(admin_router)
api_router.include_router(debug_router)
api_router.include_router(auth_router)
api_router.include_router(invites_router)
api_router.include_router(intelligence_router)
api_router.include_router(roster_router)
api_router.include_router(onboarding_router)
api_router.include_router(profile_router)
api_router.include_router(digest_router)
api_router.include_router(athlete_self_router)
api_router.include_router(athlete_dashboard_router)
api_router.include_router(athlete_profile_router)
api_router.include_router(athlete_knowledge_router)
api_router.include_router(athlete_onboarding_router)
api_router.include_router(athlete_gmail_router)
api_router.include_router(athlete_gmail_intel_router)
api_router.include_router(athlete_settings_router)
api_router.include_router(admin_kb_jobs_router)
api_router.include_router(ai_features_router)
api_router.include_router(subscription_router)
api_router.include_router(notifications_router)
api_router.include_router(athlete_tasks_router)
api_router.include_router(program_notes_router)
api_router.include_router(stripe_checkout_router)
api_router.include_router(connected_router)
api_router.include_router(coach_flags_router)
api_router.include_router(smart_match_router)
api_router.include_router(coach_scraper_router)
api_router.include_router(college_scorecard_router)
api_router.include_router(admin_universities_router)
api_router.include_router(admin_integrations_router)
api_router.include_router(admin_dashboard_router)
api_router.include_router(organizations_router)
api_router.include_router(director_actions_router)
api_router.include_router(director_inbox_router)
api_router.include_router(autopilot_router)
api_router.include_router(coach_inbox_router)
api_router.include_router(admin_user_mgmt_router)
api_router.include_router(program_metrics_router)
api_router.include_router(public_profile_router)
api_router.include_router(team_router)
api_router.include_router(school_pod_router)
api_router.include_router(momentum_recap_router)
api_router.include_router(youtube_feed_router)

app.include_router(api_router)


# ── CORS ──

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Logging ──

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
# force reload
