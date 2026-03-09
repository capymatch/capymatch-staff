# CapyMatch — Product Requirements Document

## Original Problem Statement
Unify two separate applications (`capymatch-staff` for coaches/directors and `capymatch` for athletes/parents) into a single platform with shared backend, data model, and authentication. Provides role-based experiences for Directors, Coaches, Athletes, and Parents.

## Architecture
- **Backend:** FastAPI (Python), MongoDB (Motor async driver)
- **Frontend:** React, Tailwind CSS, Shadcn/UI
- **Auth:** JWT-based, role-based routing
- **AI:** Claude Sonnet 4.5 via Emergent LLM key (emergentintegrations library)
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
- 953 universities from BSON dump with rich data (scorecard, logos, coaches, social)
- Match scoring algorithm (division, region, priorities, academic fit)
- Smart bucket filters, filter panel, Top Match banner
- Admin scraper job management (4 background scrapers)

### Phase 6 — AI Features (DONE - March 2026)
- **AI Draft Email** — LLM-generated recruiting emails (intro/follow-up/thank-you/interest-update) with athlete profile + program context
- **AI Next Step** — Smart next action recommendation per program (urgency, action type, reasoning)
- **AI Journey Summary** — Relationship summary + highlights + suggested action for each program
- **AI Assistant** — Conversational recruiting advisor with multi-turn chat, session history, quick suggestions
- **AI Outreach Analysis** — Score ring, stats dashboard, AI-generated strengths/improvements/next-steps
- **AI Highlight Reel Advisor** — Video structure, must-include skills, technical tips, coach perspective, distribution tips
- **AI Coach Watch** — Scan coaching staff stability for pipeline schools, severity alerts (red/yellow/green)
- **AI School Insight** — Source-aware school fit analysis with strengths, concerns, unknowns (24hr cache)
- **Inbox Page** — Gmail-connected email client with thread view, compose, reply, AI draft, coach badge detection
- **AI FAB Button** — Floating action button on all athlete pages to open AI Assistant drawer
- **EmailComposer AI Draft** — Email type selector (4 types) + custom instructions + one-click AI draft in Journey page

## Key Collections
- `university_knowledge_base` — 953 schools
- `school_domain_aliases` — 2,534 aliases
- `programs` — Athlete pipeline programs
- `athletes`, `athlete_profiles` — Athlete data & preferences
- `college_coaches` — Coaching staff
- `interactions` — Recruiting interactions timeline
- `ai_conversations` — AI Assistant chat history
- `ai_school_insights` — Cached school insights (24hr TTL)
- `coach_watch_alerts` — Coaching staff change alerts
- `integrations` — OAuth credentials (Gmail)

## Key API Endpoints
### Knowledge Base
- `GET /api/knowledge-base` — Paginated school list with filters
- `GET /api/knowledge-base/school/{domain}` — School detail + match score
- `POST /api/knowledge-base/add-to-board` — Add to pipeline
- `GET /api/suggested-schools` — Match-ranked suggestions

### AI Features
- `POST /api/ai/draft-email` — Generate recruiting email
- `POST /api/ai/next-step` — AI next action recommendation
- `POST /api/ai/journey-summary` — Journey relationship summary
- `POST /api/ai/assistant` — Conversational advisor
- `GET /api/ai/outreach-analysis` — Outreach effectiveness analysis
- `POST /api/ai/highlight-advice` — Highlight reel recommendations
- `POST /api/ai/coach-watch/scan` — Coaching staff scan
- `POST /api/ai/school-insight/{program_id}` — School fit analysis

### Gmail/Inbox
- `GET /api/athlete/gmail/emails` — List recruiting emails
- `GET /api/athlete/gmail/threads/{thread_id}` — Thread view
- `POST /api/athlete/gmail/reply` — Reply to email
- `POST /api/athlete/gmail/check-replies` — Auto-detect coach replies

## Credentials
- Director: `director@capymatch.com` / `director123`
- Athlete: `emma.chen@athlete.capymatch.com` / `password123`

## Backlog

### P2 — Future
- Normalize camelCase -> snake_case in DB fields
- Connected Experiences (Director <-> Athlete visibility)
- Stripe subscriptions & engagement analytics
- Smart Match AI (advanced matching algorithm)
- Parent/Family experience
- Coach Watch scheduled auto-scanning
