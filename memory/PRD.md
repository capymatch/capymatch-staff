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
- All 5 operating modes
- Decision Engine with intervention detection and ranking
- Full MongoDB persistence for athletes, events, event_notes, recommendations
- Backend refactored from monolithic server.py to modular routers/

### Phase 3: Program Intelligence Enhancements
- Historical trending via snapshot-based system
- Coach-specific views with filtered data

### Phase 4: Real Authentication (2026-03-06)
- JWT-based auth system (login, register, /me)
- 3 seeded user accounts (1 Director, 2 Coaches)
- Frontend AuthContext with token management
- Login page with demo account quick-fill
- Role-based UI on Program Intelligence

### Phase 5: Route Protection + Invite Coach (2026-03-07)
- All API routes require JWT auth (401 without token)
- Director-only routes: admin, debug, invites (403 for coaches)
- Invite Coach: director creates invites, coaches accept via token link
- Invite statuses: pending / accepted / expired / cancelled

### Phase 6: Stabilization + RBAC Review (2026-03-07)
- **Models consolidated:** All Pydantic models in central models.py, zero duplicates
- **Hardcoded names removed:** All 18 instances of "Coach Martinez" in routers replaced with `current_user["name"]`
- **Director self-registration blocked:** POST /api/auth/register rejects role="director" with 403
- **Frontend updated:** Registration form shows coach-only with explanation message

## RBAC Permission Matrix
| Route | Director | Coach | Unauthenticated |
|---|---|---|---|
| POST /api/auth/login | ✅ | ✅ | ✅ (public) |
| POST /api/auth/register | N/A (coach-only) | ✅ | ✅ (public) |
| GET/POST/DELETE /api/invites | ✅ | ❌ 403 | ❌ 401 |
| GET/POST /api/invites/validate,accept/{token} | ✅ | ✅ | ✅ (public) |
| GET /api/mission-control | ✅ | ✅ | ❌ 401 |
| GET/POST /api/events/* | ✅ | ✅ | ❌ 401 |
| GET/POST /api/advocacy/* | ✅ | ✅ | ❌ 401 |
| GET/POST /api/athletes/* | ✅ | ✅ | ❌ 401 |
| GET/POST /api/support-pods/* | ✅ | ✅ | ❌ 401 |
| GET /api/program/intelligence | ✅ (full + filter) | ✅ (auto-filtered) | ❌ 401 |
| GET /api/admin/status | ✅ | ❌ 403 | ❌ 401 |
| GET /api/debug/* | ✅ | ❌ 403 | ❌ 401 |

## Known RBAC Decisions (documented, not gaps)
- **No data ownership enforcement:** Coaches can access all athletes, not just "their own." Acceptable at current team size; becomes P1 with multi-team support.
- **Engine files retain "Coach Martinez":** The mock data seed and computed intervention data still reference the original seed coach. This is correct — it's historical seed data, not runtime user-facing fields.
- **Advocacy creation is role-agnostic:** Both directors and coaches can create/send/close recommendations. Correct for the operational model.

## Default Credentials
- Director: director@capymatch.com / director123
- Coach Williams: coach.williams@capymatch.com / coach123
- Coach Garcia: coach.garcia@capymatch.com / coach123

## Key DB Collections
- `users`: {id, email, password_hash, name, role, team, invited_by, created_at}
- `invites`: {id, email, name, team, role, token, status, invited_by, invited_by_name, created_at, expires_at, accepted_at}
- `athletes`, `events`, `event_notes`, `recommendations`, `program_snapshots`

## Prioritized Backlog

### P0 (Completed)
- [x] Real JWT Authentication
- [x] Protect all API routes
- [x] Invite Coach flow
- [x] Model consolidation + RBAC stabilization

### P1 — Next Up
- [ ] Invite email delivery (SendGrid/Resend integration)
- [ ] Deeper AI/Intelligence Layer (V3)

### P2 — Future
- [ ] Forgot Password flow
- [ ] Data ownership enforcement (coach sees only their athletes)
- [ ] Platform integrations (calendars, messaging)
- [ ] User management admin panel
