"""Pydantic models for all API request/response schemas."""

from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone
import uuid


# ── Core ──

class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str


# ── Quick Actions (Peek Panel) ──

class NoteCreate(BaseModel):
    text: str
    tag: Optional[str] = None
    category: Optional[str] = None

class AssignCreate(BaseModel):
    new_owner: str
    reason: Optional[str] = None
    intervention_category: Optional[str] = None

class MessageCreate(BaseModel):
    recipient: str
    text: str


# ── Support Pod ──

class ActionCreate(BaseModel):
    title: str
    owner: str
    due_date: Optional[str] = None
    source_category: Optional[str] = None

class ActionUpdate(BaseModel):
    status: Optional[str] = None
    owner: Optional[str] = None

class ResolveIssue(BaseModel):
    category: str
    resolution_note: Optional[str] = None


# ── Event Mode ──

class EventNoteCreate(BaseModel):
    athlete_id: str
    school_id: Optional[str] = None
    school_name: Optional[str] = None
    interest_level: Optional[str] = "none"
    note_text: Optional[str] = ""
    follow_ups: Optional[List[str]] = []

class EventNoteUpdate(BaseModel):
    interest_level: Optional[str] = None
    note_text: Optional[str] = None
    follow_ups: Optional[List[str]] = None
    school_id: Optional[str] = None
    school_name: Optional[str] = None

class EventCreate(BaseModel):
    name: str
    type: str
    date: str
    location: str
    expectedSchools: Optional[int] = 0

class EventAthleteAdd(BaseModel):
    athlete_id: str


# ── Advocacy Mode ──

class RecommendationCreate(BaseModel):
    athlete_id: str
    school_id: Optional[str] = ""
    school_name: Optional[str] = ""
    college_coach_name: Optional[str] = ""
    fit_reasons: Optional[List[str]] = []
    fit_note: Optional[str] = ""
    supporting_event_notes: Optional[List[str]] = []
    intro_message: Optional[str] = ""
    desired_next_step: Optional[str] = ""

class RecommendationUpdate(BaseModel):
    college_coach_name: Optional[str] = None
    fit_reasons: Optional[List[str]] = None
    fit_note: Optional[str] = None
    supporting_event_notes: Optional[List[str]] = None
    intro_message: Optional[str] = None
    desired_next_step: Optional[str] = None
    school_id: Optional[str] = None
    school_name: Optional[str] = None

class ResponseLog(BaseModel):
    response_note: str
    response_type: Optional[str] = "warm"

class CloseRequest(BaseModel):
    reason: Optional[str] = "no_response"


# ── Auth ──

class UserCreate(BaseModel):
    email: str
    password: str
    name: str
    role: str = "coach"  # "coach", "athlete", or "parent" — director cannot self-register

class UserLogin(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    token: str
    user: dict
    claimed_athlete_id: str | None = None


# ── Invites ──

class InviteCreate(BaseModel):
    email: str
    name: str
    team: Optional[str] = None

class InviteAccept(BaseModel):
    password: str
    name: Optional[str] = None


# ── Roster / Reassignment ──

class ReassignRequest(BaseModel):
    new_coach_id: str
    reason: Optional[str] = None

class UnassignRequest(BaseModel):
    reason: Optional[str] = "manually_unassigned"
