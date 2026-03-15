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
- **ProductiveRecruit scraper removed** — Cleaned up code after confirming ToS prohibits scraping
- **Subscription bug fix** — SubscriptionProvider depends on auth token, re-fetches on login/logout
- **Roster athlete photos** — photo_url in backend response + img display in frontend
- **Add Team feature** — Global "Add Team" button. Modal: name, age group, coach
- **Add Athlete to Team** — Two-tab modal: autocomplete search existing athletes / invite new by email

### Session 5 — Advocacy Overhaul (2026-03-15)
- **Pre-fill from context** — Athlete + school auto-populated from URL params. Works from SchoolPod, pipeline, events
- **Athlete recruiting context card** — Name, position, grad year, team, pipeline status, last contact, momentum, targets
- **Enhanced AI Draft** — Sends fit_reasons, fit_note, highlight_video to LLM for contextual drafts
- **Attachments support** — Highlight reel, athlete profile, video clip URL attachments
- **Outcome tracking** — Tabs: Draft → Sent → Waiting Response → Warm → Closed
- **School autocomplete search** — Searches from 1,057 schools instead of fixed dropdown

### Session 5 — Contextual Advocacy Integration (2026-03-15)
- **Advocate button in SchoolPod** — Hero action button, pre-fills athlete + school
- **Advocate button in Pipeline (SupportPod)** — Appears on hover per school row, pre-fills context
- **Advocate button in Event Debrief** — Per-note action alongside "Send to Athlete" and "In Pod"
- **Relationship History section** — Shows previous advocacy recs + event interactions in the builder
- **Backend: previous_advocacy in context** — GET /advocacy/athlete-context returns prior advocacy attempts with status/date/fit summary

### Session 6 (2026-03-15)
- **Social Spotlight page** — Copied from capymatch repo and integrated. YouTube feed + Twitter links for pipeline schools. Gated behind premium subscription. Backend: `/api/social-spotlight/feed`, `/api/social-spotlight/feed/refresh`, `/api/social-spotlight/social-links`. Requires `YOUTUBE_API_KEY` env var for live data.

---

## Backlog

### P0 — Immediate
- **YouTube API Key** — Configure `YOUTUBE_API_KEY` env var for Social Spotlight live data
- **CSV Import Tool** — For manually gathered school/coach data from university sites

### P1 — Upcoming
- **College Scorecard API** — Integrated but needs user's API key from api.data.gov
- **Parent/Family Experience** — Dedicated UI for parents/helpers
- **AI-Powered Coach Summary** — LLM-generated recruiting pitches from athlete data

### P2 — Future
- **Club Billing** — Stripe subscription billing for organizations
- **Multi-Agent Intelligence Pipeline** — Roster Stability, Scholarship, NIL Readiness agents
- **CSV Import Tool** — For manually gathered school/coach data from university sites
