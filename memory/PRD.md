# CapyMatch — Product Requirements Document

## Problem Statement
CapyMatch is a full-stack recruiting platform for women's volleyball. It connects athletes, coaches, directors, and parents to streamline the college recruiting journey.

## Core Users
- **Athletes** — Track their recruiting pipeline, communicate with coaches, manage their profile
- **Club Coaches** — Manage assigned athletes, track recruiting progress, send tasks/messages, advocate to college programs
- **Club Directors** — Oversee all athletes and coaches, manage roster/teams, run events, admin operations
- **Parents/Family** — (Planned) Support athletes in the recruiting process
- **Platform Admins** — Manage organizations, integrations, and knowledge base

## Credentials
- Admin: douglas@capymatch.com / demo2026
- Director: director@capymatch.com / director123
- Coach: coach.williams@capymatch.com / coach123
- Athlete: emma.chen@athlete.capymatch.com / athlete123

## Architecture
- **Frontend:** React (CRA) + Tailwind CSS + Shadcn/UI | Port 3000
- **Backend:** FastAPI + Motor (async MongoDB) | Port 8001
- **Database:** MongoDB (test_database)
- **Payments:** Stripe (test key)
- **Email:** Resend

---

## Completed Features

### Sessions 1-7 (Previous)
- Full authentication system (JWT)
- Athlete pipeline (school targets, recruiting stages)
- Messaging module (coach-athlete communication)
- Coach-to-athlete task management
- Event management (live events, signal logging)
- Subscription tiers (basic, pro, premium)
- Admin panel (user management)
- Knowledge base (1,057 schools)
- Admin Organization Management (CRUD + members with roles)
- Live Event workflow overhaul
- Social Spotlight scaffolding (UI + routing)
- School Pod Overhaul (two-column layout, relationship tracker, sliding notes panel)
- Widespread z-index + layout fixes

### Session 8 (2026-03-16)
- **P0 FIX: Unified Health Signal Logic**
  - Refactored `classify_school_health()` to accept `actual_days_since_contact` and `playbook_complete` parameters
  - List endpoint now queries `pod_action_events` and `playbook_progress` for real-time contact days per school
  - Detail endpoint computes health AFTER signal suppression, ensuring hero card matches badge
  - Added `hero_status` field to detail API response — single source of truth for frontend
  - Frontend `SchoolPod.js` now uses backend-provided `hero_status` instead of independently computing
  - Added `cooling_off` and `needs_follow_up` health states to both backend and frontend
  - 23/23 backend tests passed, all frontend UI verifications passed
  - Key files: `school_pod.py`, `SchoolPod.js`, `SupportPod.js`

---

## Backlog

### P0 — Immediate
- **YouTube API Key** — Configure `YOUTUBE_API_KEY` env var for Social Spotlight live data (feature scaffolded but non-functional)

### P1 — Upcoming
- **CSV Import Tool** — For manually gathered school/coach data from university sites
- **College Scorecard API** — Integrated but needs user's API key from api.data.gov
- **Parent/Family Experience** — Dedicated UI for parents/helpers

### P2 — Future
- **AI-Powered Coach Summary** — LLM-generated recruiting pitches from athlete data
- **Club Billing** — Stripe subscription billing for organizations
- **Multi-Agent Intelligence Pipeline** — Roster Stability, Scholarship, NIL Readiness agents
