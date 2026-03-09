# CapyMatch — Product Requirements Document

## Original Problem Statement
Unify `capymatch-staff` (director/coach) and `capymatch` (athlete/parent) into a single platform with shared auth, data model, and role-based experiences.

## Core Architecture
- **Backend:** FastAPI (Python), Motor (async MongoDB)
- **Frontend:** React, Tailwind CSS, Shadcn/UI
- **Database:** MongoDB
- **AI:** emergentintegrations (GPT 5.2 for staff)
- **Auth:** JWT with passlib (director, coach, athlete, parent roles)
- **Email:** Resend API

---

## Completed Work

### Unified Platform Foundation (Phase 1) — COMPLETE
- Steps 1.1–1.6: Canonical athletes, org scoping, auth expansion, claim flow, role-based routing

### Staff Features — COMPLETE
- Mission Control, Roster, Events, Advocacy, Program Intelligence, AI Layer, Coach Management, Weekly Digest

### Athlete App Audit — COMPLETE (2026-03-09)
- `/app/ATHLETE_APP_AUDIT.md` — Full audit: 19 pages, 28 route modules, 15+ collections
- `/app/ATHLETE_MIGRATION_PLAN.md` — 8-phase migration plan

### Phase A: Core Pipeline + Real Dashboard — COMPLETE (2026-03-09)

#### A.1 — Programs CRUD + Board Grouping
- **Backend**: `routers/athlete_dashboard.py` (rewritten, ~500 lines)
  - `GET/POST/PUT/DELETE /api/athlete/programs` with full CRUD
  - `GET /api/athlete/programs?grouped=true` — 5-stage funnel (overdue, needs_outreach, waiting_on_reply, in_conversation, archived)
  - Interaction signal computation: `_batch_signals()`, `_compute_signals_from_interactions()`
  - `categorize_program()` — board group assignment
- **Collections**: `programs` (tenant_id-scoped)
- **Tested: 21/21 backend, 6/6 frontend — 100% pass (iteration_50)**

#### A.1 — College Coaches CRUD
- `GET/POST/PUT/DELETE /api/athlete/college-coaches`
- Collection: `college_coaches` (explicitly named to avoid collision with club coaches)

#### A.1 — Interactions CRUD
- `GET/POST /api/athlete/interactions`
- `POST /api/athlete/programs/{id}/mark-replied`
- Auto-follow-up: interaction type → follow-up days (email=14d, camp=3d, visit=2d, etc.)
- Collection: `interactions` (tenant_id-scoped)

#### A.1 — Follow-ups
- `GET /api/athlete/follow-ups` — overdue programs with primary college coach enrichment
- `POST /api/athlete/follow-ups/{id}/mark-sent` — reschedule follow-up + log interaction

#### A.1 — Events CRUD
- `GET/POST/PUT/DELETE /api/athlete/events`
- Collection: `athlete_events` (named to avoid collision with staff events)

#### A.4 — Real Athlete Dashboard
- **Backend**: `GET /api/athlete/dashboard` — aggregated data in one call
  - Profile, stats (total_schools, response_rate, replied_count, awaiting_reply, follow_ups_due)
  - follow_ups_due, needs_first_outreach, spotlight, recent_activity, upcoming_events, club_coach
- **Frontend**: `pages/AthleteDashboard.js` (full rewrite, ~270 lines)
  - Greeting + Coach badge
  - Quick Pulse (4 stat cards)
  - Today's Actions (Follow-ups Due + Needs First Outreach)
  - School Spotlight (horizontal scroll cards with reply status + overdue indicator)
  - Recent Activity feed (interaction icons, time-ago formatting)
  - Upcoming Events (camp, tournament, meeting, visit cards)
  - Empty state for new athletes

#### Adapter Layer
- `get_athlete_tenant(current_user)` — JWT → tenant_id via athletes collection
- All athlete endpoints enforce `role in ("athlete", "parent")`, 403 for director/coach

#### Demo Data Seeder
- `seeders/seed_athlete_demo.py` — wired into registration claim flow
- Seeds 5 programs, 3 events, 4 interactions for newly claimed athletes

---

## Schema / Collections

| Collection | Scope | New/Existing | Phase |
|---|---|---|---|
| `programs` | tenant_id | New | A |
| `college_coaches` | tenant_id | New | A |
| `interactions` | tenant_id | New | A |
| `athlete_events` | tenant_id | New | A |
| `athletes` | org_id + tenant_id | Existing (extended) | 1 |
| `users` | — | Existing (extended) | 1 |
| `organizations` | — | Existing | 1 |

## Key Credentials
- Director: director@capymatch.com / director123
- Coach: coach.williams@capymatch.com / coach123
- Claimed Athlete: emma.chen@athlete.capymatch.com / password123

## Routes Added (Phase A)

| Method | Path | Purpose |
|---|---|---|
| GET | /api/athlete/programs | List programs (flat or grouped) |
| GET | /api/athlete/programs/:id | Get program with coaches + interactions |
| POST | /api/athlete/programs | Create program |
| PUT | /api/athlete/programs/:id | Update program |
| DELETE | /api/athlete/programs/:id | Delete program (cascade) |
| GET | /api/athlete/college-coaches | List college coaches |
| POST | /api/athlete/college-coaches | Create college coach |
| PUT | /api/athlete/college-coaches/:id | Update college coach |
| DELETE | /api/athlete/college-coaches/:id | Delete college coach |
| GET | /api/athlete/interactions | List interactions |
| POST | /api/athlete/interactions | Create interaction |
| POST | /api/athlete/programs/:id/mark-replied | Log coach reply |
| GET | /api/athlete/follow-ups | List overdue follow-ups |
| POST | /api/athlete/follow-ups/:id/mark-sent | Mark follow-up sent |
| GET | /api/athlete/events | List events |
| POST | /api/athlete/events | Create event |
| PUT | /api/athlete/events/:id | Update event |
| DELETE | /api/athlete/events/:id | Delete event |
| GET | /api/athlete/dashboard | Aggregated dashboard |
| GET | /api/athlete/me | Athlete profile (from Phase 1) |

## Upcoming Tasks (see ATHLETE_MIGRATION_PLAN.md)

### Phase B: Profile & Calendar
- B.1: Athlete Profile Editor (self-managed, writes to `athletes` collection)
- B.2: Public Profile Page (/s/:id)
- B.3: Calendar page (month/week views)

### Phase C: Knowledge Base
- C.1: University KB search + school detail pages
- C.2: School comparison

### Phase D-H: AI, Gmail, Notifications, Stripe, Layout

## Key Documents
- `/app/UNIFICATION_PLAN.md`
- `/app/ATHLETE_APP_AUDIT.md`
- `/app/ATHLETE_MIGRATION_PLAN.md`
- `/app/memory/PRD.md`
