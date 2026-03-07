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
- **Director:** Full access, manages coaches, athletes, invites, roster, activation monitoring, nudge
- **Coach:** Sees only assigned athletes, onboarding checklist, AI features

## Completed Features

### Core Platform
- JWT-based auth (director/coach roles)
- Mission Control, Athlete profiles, Decision Engine, Support Pod, Event Mode, Advocacy Mode, Program Intelligence

### AI Layer V1 & V2
- 8 AI features with confidence indicators

### Coach Invite System
- Invite creation, token-based acceptance, resend/cancel, delivery tracking
- Team-aware invite suggestions (2026-03-07)

### Roster Management
- Director-only roster page, reassignment, unassignment, audit trail, route protection

### Coach Onboarding Checklist (2026-03-07)
- 5-step non-blocking checklist on Mission Control (coach-only)
- Auto-completion, progress tracking, dismiss, personalization
- API: GET /api/onboarding/status, POST /api/onboarding/complete-step, POST /api/onboarding/dismiss

### Coach Activation Panel (2026-03-07)
- Director-only panel on Roster page
- Status per coach: Pending, Activating, Active, Needs Support
- Signals: invite status, onboarding progress, athlete count, last active, last nudge
- Auto-expands when coaches need support, sorted by urgency
- API: GET /api/roster/activation

### Nudge Coach (2026-03-07)
- Director sends supportive check-in email to coaches needing support
- Reason presets: Onboarding incomplete, No recent activity, Needs help getting started, Custom
- Prefilled editable subject + message, personalized with names
- 24-hour cooldown per coach, delivery status tracking
- Nudge history stored in `nudges` collection with delivery_status, last_error
- Last nudge timestamp shown in activation panel
- API: POST /api/roster/nudge, GET /api/roster/nudge-history/{coach_id}

### Documentation
- pages.html and gallery.html

## Key Credentials
- Director: director@capymatch.com / director123
- Coach Williams: coach.williams@capymatch.com / coach123
- Coach Garcia: coach.garcia@capymatch.com / coach123

## DB Schema (Key Collections)
- **users**: {id, email, password_hash, name, role, team, onboarding, last_active, created_at}
- **athletes**: {id, fullName, gradYear, position, team, primary_coach_id, ...}
- **invites**: {id, email, name, team, token, status, accepted_user_id, assignment_reviewed, ...}
- **nudges**: {id, coach_id, coach_email, coach_name, sent_by, sent_by_name, reason, reason_label, subject, message, delivery_status, last_error, sent_at}
- **reassignment_log**: {id, athlete_id, type, from_coach_id, to_coach_id, reason, ...}

## Code Architecture
```
/app/backend/routers/
  roster.py         # Roster + Activation + Nudge endpoints
  onboarding.py     # Coach onboarding checklist API
  invites.py, auth.py, ai.py, intelligence.py
/app/frontend/src/components/
  CoachActivationPanel.js   # Activation panel + NudgeModal
  OnboardingChecklist.js    # Coach onboarding UI
/app/frontend/src/pages/
  RosterPage.js      # Renders CoachActivationPanel
  MissionControl.js  # Renders OnboardingChecklist
```

## Upcoming Tasks (Prioritized Backlog)
- P1: Forgot Password Flow (secure password reset via Resend email)
- P2: Platform Integrations (calendars, messaging)
- P2: Smart Match Build (concept at /app/SMART_MATCH_CONCEPT.md)
- P2: Unified Platform Merge (plan at /app/MERGE_ASSESSMENT_PLAN.md)
