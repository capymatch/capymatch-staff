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
- Coach activation panel with status labels + profile completeness
- Nudge coach (check-in emails with reason presets, 24h cooldown)

### Forgot Password (2026-03-07)
- Secure reset flow: hashed tokens, 1-hour expiry, no email enumeration

### Coach Self-Service Profile (2026-03-07)
- /profile page via avatar dropdown: name, contact method, phone, availability, bio
- Completeness tracking (Incomplete/Basic/Complete), director visibility in activation + roster

### Coach Quick Notes (2026-03-07)
- Inline quick note on Mission Control athlete cards (compact pen icon)
- Full note input section in Support Pod above timeline
- Category pills: Recruiting, Event, Parent, Follow-up, Other
- Notes attributed to coach (created_by, created_by_name), appear in athlete timeline
- Counts as engagement activity for onboarding log_activity auto-detection
- Max 300 chars, keyboard shortcuts (Cmd+Enter save, Escape dismiss)
- Stored in athlete_notes collection with category field
- API: POST /api/athletes/{id}/notes, GET /api/athletes/{id}/timeline

### Documentation
- pages.html, gallery.html

## Key Credentials
- Director: director@capymatch.com / director123
- Coach Williams: coach.williams@capymatch.com / coach123
- Coach Garcia: coach.garcia@capymatch.com / coach123

## DB Schema
- **users**: {id, email, password_hash, name, role, team, onboarding, profile, last_active, created_at}
- **athletes**: {id, fullName, gradYear, position, team, primary_coach_id, ...}
- **athlete_notes**: {id, athlete_id, author, created_by, created_by_name, text, tag, category, created_at}
- **invites**: {id, email, name, team, token, status, accepted_user_id, assignment_reviewed, ...}
- **nudges**: {id, coach_id, reason, subject, message, delivery_status, last_error, sent_at}
- **password_resets**: {id, email, token_hash, expires_at, used, created_at}

## Upcoming Tasks
- P2: Platform Integrations (calendars, messaging)
- P2: Smart Match Build (/app/SMART_MATCH_CONCEPT.md)
- P2: Unified Platform Merge (/app/MERGE_ASSESSMENT_PLAN.md)
