"""CapyMatch API — main application entry point.

Slim orchestrator: creates the FastAPI app, registers routers,
and runs the startup pipeline. All route logic lives in /routers/.
"""

from fastapi import FastAPI, APIRouter
from starlette.middleware.cors import CORSMiddleware
import os
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
from routers.athlete_profile import router as athlete_profile_router

# Create the main app
app = FastAPI()

# Parent router with /api prefix — all sub-routers inherit this
api_router = APIRouter(prefix="/api")


# ── Startup ──

@app.on_event("startup")
async def startup():
    await run_startup(db)


@app.on_event("shutdown")
async def shutdown():
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
