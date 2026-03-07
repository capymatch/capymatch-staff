# CapyMatch — Product Requirements Document

## Original Problem Statement
Build CapyMatch, a "recruiting operating system" for clubs, coaches, families, and athletes. The vision is to create a system that actively coordinates support, surfaces priorities, and helps users know what to do next, moving beyond a traditional CRM.

## Core Modes
- **Mission Control:** Command surface showing priority alerts and athletes needing attention
- **Support Pod:** Dedicated "treatment" environment for an athlete
- **Event Mode:** Capture live recruiting moments and manage follow-up
- **Advocacy Mode:** Coach-backed promotion and relationship tracking
- **Program Intelligence:** Strategic overview with historical trending and role-based views
- **Decision Engine:** Backend logic analyzing data to generate and rank interventions

## Tech Stack
- **Backend:** FastAPI (Python), MongoDB (motor async driver)
- **Frontend:** React, Tailwind CSS, Shadcn/UI
- **Auth:** JWT-based (PyJWT, bcrypt/passlib)
- **Architecture:** Service-oriented backend with APIRouter modules

## What's Been Implemented

### Phase 1-2: Core Features & Persistence
- All 5 operating modes (Mission Control, Support Pod, Event, Advocacy, Program Intelligence)
- Decision Engine with intervention detection and ranking
- Full MongoDB persistence for athletes, events, event_notes, recommendations
- Seed-if-empty strategy for initial data population
- Backend refactored from monolithic server.py to modular routers/

### Phase 3: Program Intelligence Enhancements
- Historical trending via snapshot-based system (program_snapshots collection)
- Coach-specific views with filtered data

### Phase 4: Real Authentication (2026-03-06)
- JWT-based auth system (login, register, /me endpoints)
- 3 seeded user accounts (1 Director, 2 Coaches)
- Frontend AuthContext with token management (localStorage)
- Login page with Sign In / Create Account tabs and demo account quick-fill
- Role-based UI: Directors see view switcher; Coaches see own filtered view
- Header displays authenticated user name, role badge, and logout button

### Phase 5: Full Route Protection + Invite Coach (2026-03-07)
- **All API routes now require JWT auth** — mission-control, events, advocacy, athletes, support-pods, schools
- **Director-only routes** — admin/status and debug/interventions return 403 for coaches
- **Invite Coach system:**
  - Directors create invites (email, name, optional team) via POST /api/invites
  - One-time signup tokens (secrets.token_urlsafe, 7-day expiry)
  - Invite statuses: pending → accepted / expired / cancelled
  - Public validation endpoint: GET /api/invites/validate/{token}
  - Public acceptance endpoint: POST /api/invites/accept/{token}
  - Frontend: /invites page (director-only) with invite form, pending list, copy-link, cancel
  - Frontend: /invite/:token page for invited coaches to complete account setup
  - "Invite" button in header visible only to directors

## Default Credentials
- Director: director@capymatch.com / director123
- Coach Williams: coach.williams@capymatch.com / coach123
- Coach Garcia: coach.garcia@capymatch.com / coach123

## Key DB Collections
- `users`: {id, email, password_hash, name, role, team, invited_by, created_at}
- `invites`: {id, email, name, team, role, token, status, invited_by, invited_by_name, created_at, expires_at, accepted_at}
- `athletes`: {id, name, grad_year, club, position, owner}
- `events`: {id, name, location, start_date, end_date, attendees, checklist}
- `event_notes`: {event_id, athlete_id, created_by, note, interest_level, needs_follow_up}
- `recommendations`: {athlete_id, school, coach_name, created_by, status, status_history}
- `program_snapshots`: {captured_at, metrics}

## Architecture
```
/app/backend/
├── server.py              # FastAPI app entry point
├── auth_middleware.py      # JWT creation/validation + Depends()
├── db_client.py           # MongoDB connection
├── models.py              # All Pydantic models
├── routers/
│   ├── auth.py            # Login, register, me
│   ├── invites.py         # Director invite coach system
│   ├── mission_control.py # Protected
│   ├── events.py          # Protected
│   ├── advocacy.py        # Protected
│   ├── athletes.py        # Protected
│   ├── support_pods.py    # Protected
│   ├── program.py         # Protected
│   ├── admin.py           # Director-only
│   └── debug.py           # Director-only
├── services/
│   ├── startup.py         # Seed + load pipeline (incl. user seeding)
│   └── snapshots.py
├── decision_engine.py
├── program_engine.py
├── advocacy_engine.py
├── event_engine.py
├── support_pod.py
└── mock_data.py
```

## Prioritized Backlog

### P0 (Completed)
- [x] Real JWT Authentication
- [x] Protect all API routes with auth middleware
- [x] Invite Coach flow (director-only)

### P1 — Next Up
- [ ] Deeper AI/Intelligence Layer (V3): cross-object analysis, predictive analytics
- [ ] Consolidate Pydantic models into central models.py

### P2 — Future
- [ ] Forgot Password / password reset flow
- [ ] Platform Integrations (calendars, messaging)
- [ ] Full permission model (role-based access control per endpoint)
- [ ] User management admin panel
- [ ] Email notifications for invites (currently link-based only)
