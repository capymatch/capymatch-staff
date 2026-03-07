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
- Coach onboarding checklist (5 steps)
- Coach activation panel with status labels
- Nudge coach (check-in emails with reason presets, 24h cooldown)

### Forgot Password (2026-03-07)
- Secure reset flow: hashed tokens, 1-hour expiry, no email enumeration
- ForgotPasswordPage → ResetPasswordPage → redirect to login

### Coach Self-Service Profile (2026-03-07)
- `/profile` page accessible via avatar dropdown in header
- Editable: name, preferred contact method (email/phone/text/slack), phone (optional), availability, bio (500 max)
- Read-only: team (system-managed)
- Initial-based avatar (no upload for V1)
- Completeness: Incomplete (name only), Basic (name + 2 fields), Complete (name + contact + availability + bio)
- Director visibility: completeness badge in activation panel, contact/availability in roster groups
- API: GET /api/profile, PUT /api/profile, GET /api/profile/{coach_id} (director-only)

### Documentation
- pages.html, gallery.html

## Key Credentials
- Director: director@capymatch.com / director123
- Coach Williams: coach.williams@capymatch.com / coach123
- Coach Garcia: coach.garcia@capymatch.com / coach123

## DB Schema
- **users**: {id, email, password_hash, name, role, team, onboarding, profile: {phone, contact_method, availability, bio, avatar_url, updated_at}, last_active, created_at}
- **athletes**: {id, fullName, gradYear, position, team, primary_coach_id, ...}
- **invites**: {id, email, name, team, token, status, accepted_user_id, assignment_reviewed, ...}
- **nudges**: {id, coach_id, reason, subject, message, delivery_status, last_error, sent_at}
- **password_resets**: {id, email, token_hash, expires_at, used, created_at}

## Code Architecture
```
/app/backend/routers/
  auth.py           # Login, register, forgot/reset password
  profile.py        # Coach self-service profile + completeness
  roster.py         # Roster + Activation + Nudge
  onboarding.py     # Coach onboarding checklist
  invites.py, ai.py, intelligence.py
/app/frontend/src/pages/
  ProfilePage.js         # Coach profile form
  ForgotPasswordPage.js  # Password reset request
  ResetPasswordPage.js   # Set new password
/app/frontend/src/components/
  CoachActivationPanel.js  # Includes profile completeness column
  mission-control/Header.js # Avatar dropdown with Profile link
```

## Upcoming Tasks
- P2: Platform Integrations (calendars, messaging)
- P2: Smart Match Build (/app/SMART_MATCH_CONCEPT.md)
- P2: Unified Platform Merge (/app/MERGE_ASSESSMENT_PLAN.md)
