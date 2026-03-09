# CapyMatch — Product Requirements Document

## Original Problem Statement
Build CapyMatch, a "recruiting operating system" for clubs, coaches, families, and athletes. Unify two separate applications (capymatch-staff for directors/coaches and capymatch for athletes/parents) into a single platform with role-based experiences.

## Core Architecture
- **Backend:** FastAPI (Python), Motor (async MongoDB)
- **Frontend:** React, Tailwind CSS, Shadcn/UI
- **Database:** MongoDB
- **AI:** emergentintegrations (GPT 5.2)
- **Auth:** JWT with passlib (director, coach, athlete, parent roles)
- **Email:** Resend API

## Completed Features

### Core Platform
- JWT-based auth, Mission Control, Athlete profiles, Decision Engine, Support Pod, Event Mode, Advocacy Mode, Program Intelligence

### AI Layer V1 & V2
- 8 AI features with confidence indicators

### Coach Management
- Invite system, Roster management, Onboarding checklist, Activation panel, Nudge coach

### Auth & Profile
- Forgot Password flow, Coach Self-Service Profile, Quick Notes, Weekly Digest

### Left Sidebar Layout (2026-03-08)
- Sidebar with CapyMatch logo, role-based nav, auto-detected page titles
- All pages wrapped in AppLayout

### Director Mission Control — Leadership Command Surface (2026-03-08)
**Page structure:** Overview > AI Brief > Recruiting Signals > Needs Attention > Coach Health > Events > Activity

### Coach Mission Control (2026-03-08)
- Today's Actions (AI hero), My Roster, Upcoming Events, Recent Activity

### Mobile Responsiveness (2026-03-08)
- Sidebar, TopBar, AppLayout, Director Hero KPIs, Recruiting Signals, Coach Health, Roster — all mobile responsive

### Roster Page — Intelligence Surface (2026-03-08)
- Three view modes: Team View, Coach View, Age Group View
- Bulk Actions: Assign Coach, Move Team, Send Reminder — 100% tested

### Bulk Actions — COMPLETE (2026-02-13)
- Backend: 3 endpoints, Frontend: Checkbox selection + BulkActionBar + modals
- E2E tested: 100% backend (15/15), 100% frontend (12/12)

---

## Unified Platform — Phase 1 COMPLETE (2026-03-09)

### Step 1.1 — Canonical Athletes Collection (2026-02-13)
- Created `services/athlete_store.py` — single data access layer
- Migrated all 13 backend files from mock_data to athlete_store
- E2E tested: 19/19 backend, frontend verified

### Step 1.2 — Organizations & org_id Foundation (2026-02-13)
- Created `organizations` collection with default org
- Backfilled `org_id` on all 25 athletes and 8 users

### Step 1.3 — Auth Model Expansion (2026-02-13)
- Extended auth to support 4 roles: director, coach, athlete, parent
- JWT carries org_id, public registration endpoint

### Step 1.4 — Athlete Claim Flow (2026-02-13)
- Claim by exact email match during athlete registration
- Generates tenant_id, links user_id, updates org_id

### Step 1.5 — Role-Based Routing (2026-03-09)
- Director/Coach → /mission-control with staff sidebar
- Athlete/Parent → /board with athlete sidebar (Dashboard, Pipeline, Schools, Calendar, Inbox, Profile, Analytics, Settings)
- ProtectedRoute guards with role-based redirects
- Registration form with role selector (Athlete, Parent, Coach)
- AI Features section visible only for staff
- **Tested: 12/12 backend, 9/9 frontend — 100% pass (iteration_48)**

### Step 1.6 — Athlete Placeholder Dashboard (2026-03-09)
- Built personalized welcome dashboard at /board
- Backend: GET /api/athlete/me returns athlete's profile + coach info
- Claimed athletes see: welcome header, recruiting snapshot (momentum, stage, targets, interest), profile info, coach info, quick links
- Unclaimed athletes see: message to contact coach/director
- 403 for director/coach roles
- **Tested: 9/9 backend, 4/4 frontend — 100% pass (iteration_49)**

---

## Key Credentials
- Director: director@capymatch.com / director123
- Coach Williams: coach.williams@capymatch.com / coach123
- Coach Garcia: coach.garcia@capymatch.com / coach123
- Claimed Athlete: emma.chen@athlete.capymatch.com / password123
- Unclaimed Athlete: aria.brooks@example.com / password123

## Upcoming Tasks
- P0: **Phase 2 — Athlete Dashboard Migration**
  - Full athlete dashboard with recruiting stats and follow-up reminders
  - Self-managed profile editor (athlete edits own profile fields)
  - Public Profile page (/s/:id)
  - School Knowledge Base (search D1/D2/D3 programs)
  - Settings page
- P1: **Phase 3 — Pipeline & Communication**
  - Recruiting Pipeline/Board (Kanban)
  - Gmail integration, AI email drafts
  - Calendar
- P2: **Phase 4 — Connected Experiences**
  - Cross-role visibility (director sees athlete pipeline)
  - Shared event calendars
  - Cross-role notifications
- P2: **Phase 5 — Advanced Features & Parent Experience**
  - Stripe subscriptions
  - Engagement analytics
  - Smart Match AI
  - Parent/family experience

## Refactoring Backlog
- Extract modal components from RosterPage.js
- Normalize camelCase→snake_case field names (Phase 2)
- Events and schools still use mock data (addressed in Phase 4)

## Key Files
- `/app/UNIFICATION_PLAN.md` — Master architecture plan
- `/app/backend/database/athlete_store.py` — Central athlete data access
- `/app/backend/routers/auth.py` — Registration, login, claim flow
- `/app/backend/routers/athlete_self.py` — Athlete self-service endpoint
- `/app/frontend/src/pages/AthleteDashboard.js` — Athlete welcome dashboard
- `/app/frontend/src/App.js` — Role-based routing
- `/app/frontend/src/components/layout/Sidebar.js` — Role-based navigation
