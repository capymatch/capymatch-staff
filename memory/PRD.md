# CapyMatch — Product Requirements Document

## Problem Statement
CapyMatch is a full-stack recruiting platform for women's volleyball. It connects athletes, coaches, directors, and parents to streamline the college recruiting journey.

## Core Users
- **Athletes** — Track their recruiting pipeline, communicate with coaches, manage their profile
- **Club Coaches** — Manage assigned athletes, track recruiting progress, send tasks/messages
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

### Session 1-3 (Previous)
- Full authentication system (JWT)
- Athlete pipeline (school targets, recruiting stages)
- Messaging module (coach-athlete communication)
- Coach-to-athlete task management
- Event management (live events, signal logging)
- Subscription tiers (basic, pro, premium)
- Admin panel (user management)
- Knowledge base (1,057 schools)

### Session 4 (2026-03-14)
- Admin Organization Management (CRUD + members with roles)
- Live Event workflow overhaul (note required, plan limit checks)
- 104 missing schools restored (953 → 1,057)
- Mobile layout fixes (z-index, button spacing)
- School Pod hero card fixes (email/escalate buttons)

### Session 5 (2026-03-15)
- **ProductiveRecruit scraper removed** — Cleaned up non-functional code after confirming ToS prohibits scraping
- **Subscription bug fix** — SubscriptionProvider now depends on auth token from useAuth(), re-fetches on login/logout. Added missing `limits` field to SubscriptionResponse model
- **Roster athlete photos** — Added photo_url to backend roster response and img display in frontend
- **Add Team feature** — Global "Add Team" button in roster header. Modal with team name, age group, coach assignment. Creates entry in club_teams collection
- **Add Athlete to Team** — "Add Athlete" button inside each team card. Two-tab modal: (1) Autocomplete search for existing athletes, (2) Invite new athlete by email with temp password

---

## Backlog

### P1 — Upcoming
- **College Scorecard API** — Integrated but needs user's API key from api.data.gov
- **Parent/Family Experience** — Dedicated UI for parents/helpers
- **AI-Powered Coach Summary** — LLM-generated recruiting pitches from athlete data

### P2 — Future
- **Club Billing** — Stripe subscription billing for organizations
- **Multi-Agent Intelligence Pipeline** — Roster Stability, Scholarship, NIL Readiness agents
- **CSV Import Tool** — For manually gathered school/coach data from university sites
