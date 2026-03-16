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
- **Bug Fix: 999 Days Fallback**
  - Early-stage schools (Prospect, Not Contacted, Added) no longer show engagement-based alerts
  - The 999-day fallback is clamped and never surfaces in UI
  - Contact health shows "Not yet contacted — school just added to pipeline" for early stages
  - Frontend guards against displaying days >= 999
- **Dashboard-to-School-Pod Alert Consistency**
  - Added async `_enrich_roster_with_school_alerts()` in mission_control.py
  - Dashboard now queries `programs`, `program_metrics`, and `pod_action_events` per athlete
  - School-level alerts (at_risk, cooling_off, needs_attention) surface on dashboard roster
  - New `school_alert` category auto-promotes athletes without existing categories
  - Frontend RosterSection shows "N schools need attention" in red for affected athletes
  - SupportPod filter includes cooling_off and needs_follow_up states in "needs attention" count
  - 15/15 backend tests passed, all frontend verified
- **Pipeline-Based Momentum Model (replaces activity-based)**
  - Momentum now reflects RECRUITING PROGRESS via stage weights (Prospect=10, Contact=20, Visit=70, Offer=90, Committed=100)
  - Uses highest stage across all schools + breadth bonus (up to +10 for multiple advanced schools)
  - `detect_momentum_drop()` now only triggers when pipeline_momentum < 30 AND days inactive >= 14
  - Auto-resolves stale momentum_drop pod_issues when pipeline momentum >= 50
  - Dashboard shows pipeline_best_stage and momentum/100 for each athlete
  - 9/9 backend tests passed, all frontend verified (iteration 143)
- **Unified Status Model: Journey State + Attention Status**
  - Separated athlete status into two independent dimensions:
    - Journey State: recruiting progress (Committed, Offer Received, Visiting Schools, Building Interest, Reaching Out, Getting Started)
    - Attention Status: most urgent action needed (Blocker, Urgent Follow-up, At Risk, Needs Review, All Clear)
  - All signals from 3 sources (decision engine, school health, pod issues) collected, normalized, scored by urgency
  - Configurable weights: severity=40%, time_sensitivity=30%, opportunity_cost=20%, pipeline_impact=10%
  - Blockers always outrank follow-ups at equal time sensitivity
  - Secondary signals shown as "+N more issues" expandable
  - 16/16 backend + 100% frontend tests passed (iteration 144)
  - Key files: `unified_status.py`, `mission_control.py`, `RosterSection.js`

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
