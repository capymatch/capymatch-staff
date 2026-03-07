# CapyMatch — Product Requirements Document

## Original Problem Statement
Build CapyMatch, a "recruiting operating system" for clubs, coaches, families, and athletes. The system actively coordinates support, surfaces priorities, and helps users know what to do next.

## Core Architecture
- **Backend:** FastAPI (Python), Motor (async MongoDB)
- **Frontend:** React, Tailwind CSS, Shadcn/UI
- **Database:** MongoDB
- **AI:** emergentintegrations (GPT 5.2)
- **Auth:** JWT with passlib (director + coach roles)
- **Email:** Resend API

## User Roles
- **Director:** Full access, manages coaches, athletes, invites, roster
- **Coach:** Sees only assigned athletes, can use AI features for their athletes

## Completed Features

### Core Platform
- JWT-based auth (director/coach roles)
- Mission Control dashboard with priority alerts, momentum signals
- Athlete profiles with recruiting stages, momentum scores
- Decision Engine with intervention detection and ranking
- Support Pod with action management
- Event Mode with notes, schools, follow-ups
- Advocacy Mode with recommendations, intro messages
- Program Intelligence with metrics, trending

### AI Layer V1
- Mission Control Briefing, Support Pod Insights, Program Intelligence Analysis, Advocacy Assistant

### AI Layer V2
- Suggested Next Actions, Support Pod Brief, Program Strategic Insights, Event Follow-Up Suggestions
- AI Confidence Indicators on all V2 features

### Coach Invite System
- Director-only invite creation with email delivery (Resend)
- Token-based invite acceptance flow
- Resend, cancel, copy-link functionality, delivery tracking

### Team-Aware Invite Suggestions (Completed 2026-03-07)
- Suggestion banner on Invites page for newly accepted coaches with team context
- Bulk-assign or dismiss unassigned athletes from the team

### Roster Management
- Director-only roster page with coach-athlete grouping
- Reassignment, unassignment with audit trail

### Coach Onboarding Checklist (Completed 2026-03-07)
- Lightweight, non-blocking checklist on Mission Control (coach-only)
- 5 steps: Explore Mission Control, Meet your roster, Open Support Pod, Check Events, Log a note/action
- Auto-completion: Mission Control on first visit, log_activity from DB detection
- Tracking: Support Pod visit completes meet_roster + support_pod, Events page completes events
- Personalization: Shows "Awaiting athlete assignments" if no athletes assigned
- Progress bar, "Take me to the next step" CTA, "Dismiss for now" option
- Success state with auto-hide when all steps completed
- State stored in users.onboarding: {completed_steps, dismissed, started_at, completed_at}
- Backend: GET /api/onboarding/status, POST /api/onboarding/complete-step, POST /api/onboarding/dismiss

### Documentation
- Auto-generated pages.html and gallery.html

## Key Credentials
- Director: director@capymatch.com / director123
- Coach Williams: coach.williams@capymatch.com / coach123
- Coach Garcia: coach.garcia@capymatch.com / coach123

## DB Schema (Key Collections)
- **users**: {id, email, password_hash, name, role, team, invited_by, onboarding: {...}, created_at}
- **athletes**: {id, fullName, gradYear, position, team, primary_coach_id, unassigned_reason, ...}
- **invites**: {id, email, name, team, token, status, delivery_status, accepted_user_id, assignment_reviewed, ...}
- **reassignment_log**: {id, athlete_id, type, from_coach_id, to_coach_id, reason, ...}

## Code Architecture
```
/app/backend/routers/
  onboarding.py    # NEW: Coach onboarding checklist API
  invites.py, roster.py, auth.py, ai.py, intelligence.py, etc.
/app/frontend/src/components/
  OnboardingChecklist.js  # NEW: Checklist UI component
  ai/, mission-control/, support-pod/
/app/frontend/src/pages/
  MissionControl.js  # Updated: renders OnboardingChecklist
  SupportPod.js      # Updated: tracks meet_roster + support_pod steps
  EventHome.js       # Updated: tracks events step
```

## Upcoming Tasks (Prioritized Backlog)
- P1: Forgot Password Flow (secure password reset via Resend email)
- P2: Platform Integrations (calendars, messaging)
- P2: Smart Match Build (AI school-athlete pairing — concept at /app/SMART_MATCH_CONCEPT.md)
- P2: Unified Platform Merge (plan at /app/MERGE_ASSESSMENT_PLAN.md)
