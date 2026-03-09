# CapyMatch — Product Requirements Document

## Original Problem Statement
Unify two separate applications (`capymatch-staff` for coaches/directors and `capymatch` for athletes/parents) into a single platform with shared backend, data model, and authentication. Provides role-based experiences for Directors, Coaches, Athletes, and Parents.

## Architecture
- **Backend:** FastAPI (Python), MongoDB (Motor async driver)
- **Frontend:** React, Tailwind CSS, Shadcn/UI
- **Auth:** JWT-based, role-based routing
- **Theme:** Dark theme (`#0f1219` bg, `#1a8a80` accent)

## What's Been Implemented

### Phase 1 — Core Platform (DONE)
- Unified auth (JWT, multi-role: director, coach, athlete, parent)
- Role-based routing & navigation
- Director/Coach mission control dashboard
- Athlete onboarding quiz

### Phase 2 — Athlete Pipeline (DONE)
- Pipeline page (list-based view of recruiting programs)
- Journey page (detailed program view with timeline, automations, signals)

### Phase 3 — Settings & Gmail Integration (DONE)
- Settings page (profile, privacy, password, data management)
- Google OAuth flow for Gmail
- 4-stage Gmail import (scan, match, review, add schools)

### Phase 4 — Dashboard (DONE)
- Complete athlete dashboard with dynamic widgets
- Today's Actions, School Spotlight, Recent Activity
- Stats overview (schools tracked, replies, etc.)

### Phase 5 — Knowledge Base Upgrade (DONE - March 2026)
- Imported 953 universities from BSON dump (replacing 21 static schools)
- Rich data: scorecard (939), logos (852), coaches (891), social links (862)
- Match scoring algorithm (division, region, priorities, academic fit)
- Smart bucket filters (Dream Schools D1, Strong Match 80%+, etc.)
- Slide-in filter panel (division, region, conference)
- Top #1 Match banner with match score + reasons
- School detail page with match ring, key stats, coaching staff, financials, diversity
- Add-to-board flow (seeds coaches into pipeline)
- Admin scraper job management (scrape_school_data, enrich_scorecard, scrape_social, scrape_diversity)
- Domain alias collection (2,534 aliases)
- Legacy backward-compatible routes maintained

## Key Collections
- `university_knowledge_base` — 953 schools with full data
- `school_domain_aliases` — 2,534 domain aliases
- `programs` — Athlete pipeline programs
- `athletes`, `athlete_profiles` — Athlete data & preferences
- `college_coaches` — Seeded when adding school to board
- `integrations` — OAuth credentials (Gmail)

## Key API Endpoints
- `GET /api/knowledge-base` — Paginated school list with filters
- `GET /api/knowledge-base/school/{domain}` — School detail + match score
- `POST /api/knowledge-base/add-to-board` — Add to pipeline
- `GET /api/suggested-schools` — Match-ranked suggestions (top 20)
- `GET /api/admin/kb-jobs` — Scraper job status
- `POST /api/admin/kb-jobs/{job_name}/run` — Trigger scraper

## Credentials
- Director: `director@capymatch.com` / `director123`
- Athlete: `emma.chen@athlete.capymatch.com` / `password123`

## Backlog

### P1 — Upcoming
- AI-powered email drafting from Journey page
- Inbox page (email threads when Gmail connected)

### P2 — Future
- Normalize camelCase → snake_case in DB fields
- Connected Experiences (Director ↔ Athlete visibility)
- Stripe subscriptions & engagement analytics
- Smart Match AI
- Parent/Family experience
