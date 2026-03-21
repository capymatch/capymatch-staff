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
    owner_role: Optional[str] = None
    due_date: Optional[str] = None
    source_category: Optional[str] = None
    notes: Optional[str] = None

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
    signal_type: Optional[str] = None

class EventSignalCreate(BaseModel):
    athlete_id: str
    school_id: Optional[str] = None
    school_name: Optional[str] = None
    interest_level: str = "none"
    signal_type: str
    note_text: str
    send_to_athlete: bool = False

class EventAddSchool(BaseModel):
    athlete_id: str
    school_id: str
    school_name: str

class EventNoteUpdate(BaseModel):
    interest_level: Optional[str] = None
    note_text: Optional[str] = None
    follow_ups: Optional[List[str]] = None
    school_id: Optional[str] = None
    school_name: Optional[str] = None

class EventCreate(BaseModel):
    name: str = Field(..., min_length=1)
    type: str
    date: str
    location: str = Field(..., min_length=1)
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
    attachments: Optional[List[dict]] = []

class RecommendationUpdate(BaseModel):
    college_coach_name: Optional[str] = None
    fit_reasons: Optional[List[str]] = None
    fit_note: Optional[str] = None
    supporting_event_notes: Optional[List[str]] = None
    intro_message: Optional[str] = None
    desired_next_step: Optional[str] = None
    school_id: Optional[str] = None
    school_name: Optional[str] = None
    attachments: Optional[List[dict]] = None

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
    role: str = "club_coach"  # "club_coach", "athlete", or "parent" — director cannot self-register

class UserLogin(BaseModel):
    email: str
    password: str

class UserOut(BaseModel):
    id: str
    email: str
    name: str
    role: str
    org_id: Optional[str] = None
    created_at: str = ""
    athlete_id: Optional[str] = None
    photo_url: Optional[str] = ""

class TokenResponse(BaseModel):
    token: str
    user: UserOut
    claimed_athlete_id: Optional[str] = None

class MeResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    org_id: Optional[str] = None
    athlete_id: Optional[str] = None
    photo_url: Optional[str] = ""


# ── Athlete Self / Dashboard ──

class AthleteHeader(BaseModel):
    id: str
    first_name: str = ""
    last_name: str = ""
    full_name: str = ""
    email: str = ""
    phone: str = ""
    grad_year: Optional[int] = None
    position: str = ""
    team: str = ""
    height: str = ""
    weight: str = ""
    gpa: str = ""
    high_school: str = ""
    hudl_url: str = ""
    video_link: str = ""
    photo_url: str = ""
    bio: str = ""
    recruiting_stage: str = ""
    momentum_score: Optional[int] = None
    momentum_trend: str = ""
    school_targets: int = 0
    active_interest: int = 0
    last_activity: str = ""

class AthleteClaimResponse(BaseModel):
    claimed: bool
    athlete: Optional[AthleteHeader] = None
    coach: Optional[dict] = None

class DashboardProfile(BaseModel):
    first_name: str = ""
    last_name: str = ""
    full_name: str = ""
    position: str = ""
    team: str = ""
    grad_year: Optional[int] = None


# ── Subscription ──

class UsageLimits(BaseModel):
    schools: int = 0
    schools_limit: int = 5
    schools_remaining: int = 5
    unlimited: bool = False
    ai_drafts_used: int = 0
    ai_drafts_limit: int = 0
    ai_drafts_remaining: int = 0

class SubscriptionLimits(BaseModel):
    max_schools: int = 5
    ai_drafts_per_month: int = 0
    gmail_integration: bool = False
    analytics: bool = False
    recruiting_insights: bool = False
    public_profile: bool = False
    follow_up_reminders: bool = False
    auto_reply_detection: bool = False
    weekly_digest: bool = False

class SubscriptionResponse(BaseModel):
    tier: str = "basic"
    label: str = "Starter"
    price: float = 0
    features: List[str] = []
    limits: SubscriptionLimits = SubscriptionLimits()
    usage: UsageLimits = UsageLimits()


# ── Settings ──

class PreferencesOut(BaseModel):
    followup_reminders: bool = True
    email_notifications: bool = True
    theme: str = "dark"
    inbound_scan: bool = False

class SettingsResponse(BaseModel):
    name: str = ""
    email: str = ""
    preferences: PreferencesOut = PreferencesOut()


# ── Connected Experiences ──

class PipelineHeader(BaseModel):
    id: str
    name: str = "Unknown"
    grad_year: Optional[int] = None
    position: Optional[str] = None
    team: Optional[str] = None
    momentum_score: int = 0
    momentum_trend: str = "stable"
    recruiting_stage: str = "exploring"
    days_since_activity: int = 0
    photo_url: str = ""
    primary_coach_id: Optional[str] = None

class PipelineSummary(BaseModel):
    total_schools: int = 0
    response_rate: int = 0
    active_conversations: int = 0
    overdue_followups: int = 0
    waiting_on_reply: int = 0

class StageCount(BaseModel):
    stage: str
    label: str
    count: int = 0

class SchoolEntry(BaseModel):
    program_id: str
    university_name: str = ""
    logo_url: str = ""
    division: str = ""
    conference: str = ""
    primary_coach: str = ""
    reply_status: str = ""
    board_group: str = ""
    follow_up_days: Optional[int] = None
    next_action: str = ""
    next_action_due: str = ""
    priority: str = ""
    pulse: str = ""
    risks: List[str] = []
    updated_at: str = ""

class SchoolGroup(BaseModel):
    stage: str
    label: str
    schools: List[SchoolEntry] = []

class ActivityEntry(BaseModel):
    type: str = ""
    university_name: str = ""
    notes: str = ""
    outcome: str = ""
    date: str = ""

class PipelineResponse(BaseModel):
    header: PipelineHeader
    summary: PipelineSummary
    stage_distribution: List[StageCount] = []
    schools: List[SchoolGroup] = []
    recent_activity: List[ActivityEntry] = []
    momentum_assessment: str = "steady"


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



# ── Program Metrics ──

class ProgramMetricsResponse(BaseModel):
    model_config = ConfigDict(extra="allow")
    program_id: str
    tenant_id: str
    athlete_id: str = ""
    org_id: Optional[str] = None
    university_name: str = ""
    reply_rate: Optional[float] = None
    median_response_time_hours: Optional[float] = None
    meaningful_interaction_count: int = 0
    days_since_last_engagement: Optional[int] = None
    unanswered_coach_questions: int = 0
    last_meaningful_engagement_at: Optional[str] = None
    last_meaningful_engagement_type: Optional[str] = None
    days_since_last_meaningful_engagement: Optional[int] = None
    engagement_freshness_label: str = "no_recent_engagement"
    overdue_followups: int = 0
    stage_velocity: Optional[float] = None
    stage_stalled_days: Optional[int] = None
    engagement_trend: str = "insufficient_data"
    pipeline_health_state: str = "at_risk"
    program_age_days: Optional[int] = None
    invite_count: int = 0
    info_request_count: int = 0
    coach_flag_count: int = 0
    director_action_count: int = 0
    data_confidence: str = "LOW"
    computed_at: str = ""

class RecomputeAllResponse(BaseModel):
    computed: int
    errors: int
    total: int
