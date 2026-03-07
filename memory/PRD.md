# CapyMatch — Product Requirements Document

## Original Problem Statement
Build CapyMatch, a "recruiting operating system" for clubs, coaches, families, and athletes. The system actively coordinates support, surfaces priorities, and helps users know what to do next.

## Tech Stack
- **Backend:** FastAPI (Python), MongoDB (motor async driver)
- **Frontend:** React, Tailwind CSS, Shadcn/UI
- **Auth:** JWT-based (PyJWT, bcrypt/passlib)
- **Email:** Resend (transactional invite emails)
- **AI:** GPT 5.2 via emergentintegrations (Emergent LLM Key)

## What's Been Implemented

### Core Features (Phase 1-3)
- 5 operating modes: Mission Control, Support Pod, Event, Advocacy, Program Intelligence
- Decision Engine, historical trending, coach-specific views
- Full MongoDB persistence

### Auth & Security (Phase 4-6)
- JWT auth (login, register, /me), 3 seeded accounts
- All routes protected, director-only admin/debug/invites
- RBAC stabilization, hardcoded names replaced with current_user
- Director self-registration blocked

### Invite Email Delivery (Phase 7)
- Resend integration with delivery tracking (sent/failed/pending)
- Resend endpoint, copy-link fallback, resend count

### Per-Coach Data Ownership (Phase 8 — 2026-03-07)
- **primary_coach_id** field added to athletes
- 25 athletes split: 13 to Coach Williams (odd), 12 to Coach Garcia (even)
- **Ownership service** (`services/ownership.py`): cached coach-to-athlete mapping
- Filtered views across all modes (Mission Control, Events, Advocacy, Support Pods)
- Directors see everything; coaches see only their athletes

### AI/Intelligence Layer V1 (Phase 9 — 2026-03-07)
- **Program Briefing:** AI-generated 2-3 sentence narrative on /program page
- **Mission Control Briefing:** Prioritized daily actions on /mission-control
- **Event Recap:** AI summary of captured event notes on /events/{id}/summary
- **Advocacy Assistant:** "Draft with AI" button on /advocacy/new that generates intro messages
- All 4 features respect role-based access and data ownership boundaries
- Backend: `/api/ai/program-narrative`, `/api/ai/briefing`, `/api/ai/event-recap/{event_id}`, `/api/ai/advocacy-draft/{athlete_id}/{school_id}`

### AI V1 Stabilization (Phase 9.1 — 2026-03-07)
- Backend: 45s timeout + 1 retry on all LLM calls (`_send_with_retry` in `services/ai.py`)
- Backend: 503 error responses when AI fails (all 4 endpoints in `routers/intelligence.py`)
- Frontend: 50s axios timeout on all AI calls
- Frontend: Differentiated error messages (timeout, 503, 400, 403, 401)
- Frontend: "Try Again" button on error state in AiBriefing component
- Resolved: intermittent coach briefing timeout issue

### Data Ownership Refinement (Phase 10 — 2026-03-07)
- **Roster page** (`/roster`): director-only view of all athletes grouped by coach
- **Reassignment API** (`POST /api/athletes/{id}/reassign`): move athlete between coaches with audit log
- **Unassign API** (`POST /api/athletes/{id}/unassign`): remove coach with reason label
- **Reassignment history** (`GET /api/athletes/{id}/reassignment-history`): structured for timeline display
- **Unassigned visibility**: directors see unassigned athletes with reason labels (newly_created, coach_left, manually_unassigned, imported_without_owner)
- **Open actions warning**: on reassignment, warns about work still owned by previous coach
- **Ownership rules**: immediate ownership change, open actions stay with previous coach, director always confirms
- New collection: `reassignment_log`

### AI/Intelligence Layer V2 (Phase 11 — 2026-03-07)
- **Suggested Next Actions** (`POST /api/ai/suggested-actions`): structured actions with WHY/EVIDENCE/OWNER/PRIORITY on Mission Control
- **Pod Actions** (`POST /api/ai/pod-actions/{athlete_id}`): AI-suggested actions scoped to a single athlete on Support Pod
- **Pod Brief** (`POST /api/ai/pod-brief/{athlete_id}`): 2-3 sentence status brief with signal and key facts at top of Support Pod
- **Program Insights** (`POST /api/ai/program-insights`): strategic narrative + structured insights with severity for directors only
- **Event Follow-Ups** (`POST /api/ai/event-followups/{event_id}`): follow-up suggestions from event notes with evidence
- All features: on-demand, WHY + EVIDENCE + OWNER + CTA, no black-box, no auto-send
- All features respect role-based scope (coach=owned athletes, director=full program)

## Ownership Model V1
```
Athlete.primary_coach_id -> Users.id

Director: sees all athletes, all data, global view
Coach: sees only athletes where primary_coach_id == coach's user.id
```

## Default Credentials
- Director: director@capymatch.com / director123
- Coach Williams: coach.williams@capymatch.com / coach123
- Coach Garcia: coach.garcia@capymatch.com / coach123

## Environment Variables
```
MONGO_URL, DB_NAME, JWT_SECRET, RESEND_API_KEY, RESEND_FROM_EMAIL, CORS_ORIGINS, EMERGENT_LLM_KEY
```

## Prioritized Backlog

### Completed
- [x] Core modes + persistence
- [x] JWT auth + route protection + RBAC
- [x] Invite Coach + email delivery
- [x] Per-coach data ownership boundaries
- [x] AI/Intelligence Layer V1 (all 4 features)
- [x] AI V1 Stabilization (timeout/retry, error handling, coach briefing fix)
- [x] Data Ownership Refinement (roster, reassignment, unassign, audit log)
- [x] AI/Intelligence Layer V2 (suggested actions, pod brief, program insights, event follow-ups)

### P1 — Next Up
- [ ] Team-aware invite suggestions (optional bulk assignment prompt after invite accepted)
- [ ] Smart Match (concept note at /app/SMART_MATCH_CONCEPT.md)

### P2 — Future
- [ ] Forgot Password flow
- [ ] Platform Integrations (calendars, messaging)
- [ ] Multi-coach support (secondary coach field)
- [ ] Coach-to-athlete reassignment UI
- [ ] Verify Resend domain for production
- [ ] Merge assessment with main CapyMatch app (see /app/MERGE_ASSESSMENT_PLAN.md)
