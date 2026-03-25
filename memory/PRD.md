# CapyMatch — Product Requirements Document

## Original Problem Statement
CapyMatch is a React + FastAPI + MongoDB athlete pipeline management tool for college-bound student-athletes. The platform helps athletes manage their recruiting pipeline, track coach engagement, and make data-driven decisions about which schools to pursue.

## Core Architecture
- **Frontend**: React (CRA) + TailwindCSS + Shadcn/UI
- **Backend**: FastAPI + MongoDB (Motor async driver)
- **AI**: Claude Sonnet via Emergent LLM Key
- **Auth**: JWT-based custom authentication (access + refresh tokens)
- **Data Layer**: Direct MongoDB queries (no in-memory cache) + TTL-cached derived data

## What's Been Implemented

### Coaching Stability Feature (Mar 25, 2026)
- **Backend**: New `/api/coaching-stability/{program_id}` endpoint that returns coach job stability for a university
- **Backend**: `/api/coaching-stability/{program_id}/refresh` to force re-scan
- **AI Pipeline**: Uses DuckDuckGo web search to find coaching news + Claude Sonnet (Emergent LLM Key) to analyze results
- **Caching**: Results cached in `coach_watch_alerts` MongoDB collection for 7 days
- **Frontend**: Coaching Stability card in Journey page right sidebar showing:
  - Color-coded badge: green (Stable/Extended), yellow (New Hire/Staff Change), red (Departed)
  - Headline, summary, and recommendation text
  - Refresh button for on-demand re-scan
  - Inline mini-badge on each coach contact card
- **Background Job**: Weekly automated scan (`coach_watch_weekly_scan`) in `server.py` for premium tenants
- **Testing**: 100% pass rate (16/16 backend, all frontend tests passed)

### UI Refactor — Pipeline Hero Carousel Arrows (Mar 25, 2026)
- Moved carousel navigation arrows from top bar to absolute-positioned top-right of hero card

### Bug Fix — "Mark Done" Now Logs to Journey Timeline (Mar 25, 2026)
- Fixed: clicking "Mark done" inserts completion event into `interactions` collection

### Journey Card → Email Modal Integration (Mar 25, 2026)
- Connected hero card's "Send to coach" CTA to email modal with pre-filled subject, body, and recipient

### UI Refactor — Event Prep Header Dark Theme (Mar 24, 2026)
- Applied premium dark theme to EventPrep header

### UI Refactor — Mission Control, Sidebar, Billing (Mar 24, 2026)
- Reskinned Mission Control, Sidebar, Club Billing to premium dark theme

### Bug Fix — Flickering Momentum Status (Mar 24, 2026)
- Implemented multi-layer cache for stable momentum metrics

### Stripe Subscription Billing (Mar 24, 2026)
- Full subscription lifecycle: checkout, webhooks, cancel/reactivate, billing portal
- 5 pricing tiers with monthly/annual toggle

### Club Billing V2 — Entitlement Refactor (Mar 24, 2026)
- 3 entitlement types with `PlanContext` and `PlanGate` components

### Production Readiness (Mar 23, 2026)
- Auth, security, data architecture, environment config, error handling, performance

## Prioritized Backlog

### P0 — Upcoming
- School Knowledge Base Migration: Migrate school data to production DB
- Real Email Delivery Integration: Connect SendGrid/Resend/Gmail for actual email sending

### P1 — Upcoming
- CSV Import Tool for bulk school/coach data
- Bulk Approve Mode in Director Inbox

### P2 — Future
- Parent/Family Experience
- AI-Powered Coach Summary
- Multi-Agent Intelligence Pipeline
- V2 page-level route gating
- Usage-based/metered billing for AI features

## Key API Endpoints
- `POST /api/auth/login` / `POST /api/auth/refresh` / `POST /api/auth/logout`
- `GET /api/mission-control` — Role-based dashboard
- `GET /api/coaching-stability/{program_id}` — Coaching stability data
- `POST /api/coaching-stability/{program_id}/refresh` — Force re-scan
- `GET /api/ai/coach-watch/alerts` — All coach watch alerts
- `POST /api/ai/coach-watch/scan` — Manual full pipeline scan
- `GET /api/club-plans` — List all 5 club plans
- `POST /api/stripe/checkout` — Create Stripe checkout session

## Test Credentials
- **Athlete**: emma.chen@athlete.capymatch.com / athlete123
- **Coach**: coach.williams@capymatch.com / coach123
- **Director**: director@capymatch.com / director123

## 3rd Party Integrations
- OpenAI/Claude via Emergent LLM Key
- DuckDuckGo Search (for coaching news)
- Stripe (Payments) — requires User API Key

## Known Issues
- None currently. `libmagic` backend crash permanently resolved.
