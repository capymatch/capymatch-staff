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
- Protected routes on /api/program/* endpoints
- Frontend AuthContext with token management (localStorage)
- Login page with Sign In / Create Account tabs and demo account quick-fill
- Role-based UI: Directors see view switcher on Program Intelligence; Coaches see their own filtered view automatically
- Header displays authenticated user name, role badge, and logout button
- All routes protected on frontend (redirect to /login if unauthenticated)

## Default Credentials
- Director: director@capymatch.com / director123
- Coach Williams: coach.williams@capymatch.com / coach123
- Coach Garcia: coach.garcia@capymatch.com / coach123

## Key DB Collections
- `users`: {id, email, password_hash, name, role, created_at}
- `athletes`: {id, name, grad_year, club, position, owner}
- `events`: {id, name, location, start_date, end_date, attendees, checklist}
- `event_notes`: {event_id, athlete_id, created_by, note, interest_level, needs_follow_up}
- `recommendations`: {athlete_id, school, coach_name, created_by, status, status_history}
- `program_snapshots`: {captured_at, metrics: {pod_health, open_issues, advocacy_outcomes, etc.}}

## Architecture
```
/app/backend/
├── server.py              # FastAPI app entry point
├── auth_middleware.py      # JWT creation/validation + Depends()
├── db_client.py           # MongoDB connection
├── models.py              # All Pydantic models
├── routers/               # API endpoints by feature
│   ├── auth.py            # Login, register, me
│   ├── mission_control.py
│   ├── events.py
│   ├── advocacy.py
│   ├── program.py         # Protected with auth
│   ├── athletes.py
│   ├── support_pods.py
│   ├── admin.py
│   └── debug.py
├── services/
│   ├── startup.py         # Seed + load pipeline
│   └── snapshots.py       # Historical trending
├── decision_engine.py
├── program_engine.py
├── advocacy_engine.py
├── event_engine.py
├── support_pod.py
└── mock_data.py           # Seed data source
```

## Prioritized Backlog

### P0 (Completed)
- [x] Real JWT Authentication

### P1 — Next Up
- [ ] Protect remaining API routes (/api/events, /api/advocacy, /api/mission-control) with auth
- [ ] Deeper AI/Intelligence Layer (V3): cross-object analysis, predictive analytics
- [ ] Consolidate Pydantic models into central models.py

### P2 — Future
- [ ] Platform Integrations (calendars, messaging)
- [ ] Full permission model (role-based access control per endpoint)
- [ ] User management admin panel
