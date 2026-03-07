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

## Completed Features

### Core Platform
- JWT-based auth, Mission Control, Athlete profiles, Decision Engine, Support Pod, Event Mode, Advocacy Mode, Program Intelligence

### AI Layer V1 & V2
- 8 AI features with confidence indicators

### Coach Management
- Invite system with team-aware suggestions
- Roster management with reassignment/audit trail
- Coach onboarding checklist (5 steps, auto-completion, personalization)
- Coach activation panel (status: Pending/Activating/Active/Needs Support)
- Nudge coach (supportive check-in emails with reason presets, 24h cooldown)

### Forgot Password (2026-03-07)
- "Forgot password?" link on login page → /forgot-password
- Secure flow: email → hashed token stored → email with reset link → /reset-password?token=xxx
- Security: no email enumeration (generic response), SHA-256 hashed tokens, 1-hour expiry, single-use, older tokens invalidated
- Frontend: ForgotPasswordPage (email form → success state), ResetPasswordPage (new password + confirm → success → redirect)
- Backend: POST /api/auth/forgot-password, POST /api/auth/reset-password
- Storage: password_resets collection {id, email, token_hash, expires_at, used, created_at}

### Documentation
- pages.html, gallery.html

## Key Credentials
- Director: director@capymatch.com / director123
- Coach Williams: coach.williams@capymatch.com / coach123
- Coach Garcia: coach.garcia@capymatch.com / coach123

## DB Schema
- **users**: {id, email, password_hash, name, role, team, onboarding, last_active, created_at}
- **athletes**: {id, fullName, gradYear, position, team, primary_coach_id, ...}
- **invites**: {id, email, name, team, token, status, accepted_user_id, assignment_reviewed, ...}
- **nudges**: {id, coach_id, coach_email, reason, subject, message, delivery_status, last_error, sent_at}
- **password_resets**: {id, email, token_hash, expires_at, used, created_at}

## Code Architecture
```
/app/backend/routers/
  auth.py           # Login, register, forgot-password, reset-password
  roster.py         # Roster + Activation + Nudge
  onboarding.py     # Coach onboarding checklist
  invites.py, ai.py, intelligence.py
/app/frontend/src/pages/
  LoginPage.js            # Updated: forgot password link
  ForgotPasswordPage.js   # NEW
  ResetPasswordPage.js    # NEW
  MissionControl.js, RosterPage.js, etc.
```

## Upcoming Tasks
- P1: Coach Self-Service Profile (lightweight V1 — name, avatar, contact, availability, bio, team)
- P2: Platform Integrations (calendars, messaging)
- P2: Smart Match Build (/app/SMART_MATCH_CONCEPT.md)
- P2: Unified Platform Merge (/app/MERGE_ASSESSMENT_PLAN.md)
