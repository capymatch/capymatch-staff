from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List
import uuid
from datetime import datetime, timezone
from mock_data import (
    ATHLETES,
    PRIORITY_ALERTS,
    MOMENTUM_SIGNALS,
    UPCOMING_EVENTS,
    ATHLETES_NEEDING_ATTENTION,
    PROGRAM_SNAPSHOT,
)


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")  # Ignore MongoDB's _id field
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "CapyMatch Mission Control API"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    # Exclude MongoDB's _id field from the query results
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    # Convert ISO string timestamps back to datetime objects
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks

# Mission Control endpoints
@api_router.get("/mission-control")
async def get_mission_control_data():
    """Get all Mission Control data"""
    return {
        "priorityAlerts": PRIORITY_ALERTS,
        "recentChanges": MOMENTUM_SIGNALS,
        "athletesNeedingAttention": ATHLETES_NEEDING_ATTENTION,
        "upcomingEvents": UPCOMING_EVENTS,
        "programSnapshot": PROGRAM_SNAPSHOT,
    }

@api_router.get("/mission-control/alerts")
async def get_priority_alerts():
    """Get priority alerts only"""
    return PRIORITY_ALERTS

@api_router.get("/mission-control/signals")
async def get_momentum_signals():
    """Get momentum signals (what changed today)"""
    return MOMENTUM_SIGNALS

@api_router.get("/mission-control/athletes")
async def get_athletes_attention():
    """Get athletes needing attention"""
    return ATHLETES_NEEDING_ATTENTION

@api_router.get("/mission-control/events")
async def get_upcoming_events():
    """Get upcoming events"""
    return UPCOMING_EVENTS

@api_router.get("/mission-control/snapshot")
async def get_program_snapshot():
    """Get program snapshot"""
    return PROGRAM_SNAPSHOT

@api_router.get("/athletes")
async def get_all_athletes():
    """Get all athletes"""
    return ATHLETES

@api_router.get("/athletes/{athlete_id}")
async def get_athlete(athlete_id: str):
    """Get single athlete by ID"""
    athlete = next((a for a in ATHLETES if a["id"] == athlete_id), None)
    if not athlete:
        return {"error": "Athlete not found"}
    return athlete

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
