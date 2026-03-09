# CapyMatch — Product Requirements Document

## Original Problem Statement
Unify two separate applications — `capymatch-staff` (director/coach) and `capymatch` (athlete/parent) — into a single platform with shared auth, data model, and role-based experiences.

## Core Architecture
- **Backend:** FastAPI (Python), Motor (async MongoDB)
- **Frontend:** React, Tailwind CSS, Shadcn/UI
- **Database:** MongoDB
- **AI:** emergentintegrations (GPT 5.2 for staff), Claude Sonnet 4.5 (athlete — planned)
- **Auth:** JWT with passlib (director, coach, athlete, parent roles)
- **Email:** Resend API

## What's Been Implemented

### Unified Platform Foundation (Phase 1) — COMPLETE
- Step 1.1: Canonical athletes collection + athlete_store.py
- Step 1.2: Organizations & org_id backfilling
- Step 1.3: Auth model with 4 roles (director, coach, athlete, parent)
- Step 1.4: Athlete claim flow (email matching during registration)
- Step 1.5: Role-based routing (director/coach→/mission-control, athlete/parent→/board)
- Step 1.6: Placeholder athlete dashboard (to be replaced with real migration)

### Staff Features (fully functional)
- Mission Control (Director + Coach views)
- Roster Management + Bulk Actions
- Events, Advocacy, Program Intelligence
- AI Layer V1 & V2 (8 AI features)
- Coach Management (invite, onboard, nudge)
- Weekly Digest, Quick Notes

### Athlete App Audit — COMPLETE (2026-03-09)
- Full audit of `capymatch/capymatch` codebase: 19 pages, 28 route modules, 15+ collections
- Created `ATHLETE_APP_AUDIT.md` documenting all surfaces, routes, auth, collections, conflicts
- Created `ATHLETE_MIGRATION_PLAN.md` with 8-phase migration order + risk register

## Key Credentials
- Director: director@capymatch.com / director123
- Coach: coach.williams@capymatch.com / coach123
- Claimed Athlete: emma.chen@athlete.capymatch.com / password123

## Current Priority: Athlete Migration Phase A

### Phase A.1 — Programs CRUD + Board Grouping
- Port `programs.py` → `routers/athlete_programs.py`
- Collections: `programs`, `college_coaches`, `interactions`
- CRUD endpoints under `/api/athlete/programs`

### Phase A.4 — Real Dashboard
- Replace placeholder with ported Dashboard.js
- Sections: Greeting+Pulse, Today's Actions, School Spotlight, Activity Feed, Events

## Full Backlog (see ATHLETE_MIGRATION_PLAN.md for details)
- Phase A: Core Pipeline (Programs, Coaches, Interactions, Dashboard)
- Phase B: Profile & Calendar
- Phase C: Knowledge Base & School Search
- Phase D: AI Features (Claude email drafts, outreach analysis)
- Phase E: Gmail Integration
- Phase F: Notifications, Analytics, Settings
- Phase G: Billing (Stripe)
- Phase H: Layout Unification

## Key Documents
- `/app/UNIFICATION_PLAN.md` — Original unification architecture
- `/app/ATHLETE_APP_AUDIT.md` — Full audit of athlete app codebase
- `/app/ATHLETE_MIGRATION_PLAN.md` — Migration phases and order
- `/app/memory/PRD.md` — This file
