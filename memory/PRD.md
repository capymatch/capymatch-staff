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

### Production Readiness Item #2: Data Architecture Refactor (Mar 23, 2026)
- **Problem**: `athlete_store.py` used a single-process in-memory cache (`_CACHE`) that prevented horizontal scaling (multiple backend pods = stale data) and caused data desync between roles.
- **Fix**: Complete rewrite of `athlete_store.py`:
  - `get_all()` and `get_by_id()` now query MongoDB directly (always fresh)
  - Derived data (interventions, signals, alerts) uses TTL-cached pattern (30s auto-refresh)
  - `recompute_derived_data()` simplified to force-invalidate derived cache after writes
  - All ~25+ consumer files updated: sync functions converted to async, all callers now use `await`
  - Affected files: `program_engine.py`, `event_engine.py`, `support_pod.py`, `advocacy_engine.py`, and all routers
- **MongoDB Indexes Added**: 
  - `athletes`: id (unique), tenant_id, primary_coach_id, user_id
  - `programs`: program_id (unique), athlete_id, tenant_id, compound (athlete_id + recruiting_status)
  - `interactions`: athlete_id, program_id, compound (athlete_id + created_at), tenant_id
  - `users`: id (unique), email (unique), org_id
  - `support_messages`: thread_id, compound (thread_id + created_at), tenant_id
  - `notifications`: compound (user_id + read), tenant_id
  - `refresh_tokens`: TTL index on expires_at (auto-expiring), user_id
- **Testing**: 100% pass rate (iteration_239) — 19/19 backend tests + all 3 frontend roles verified

### Production Readiness Item #1: Authentication & Security Hardening (Mar 23, 2026)
- **Refresh tokens**: Short-lived access tokens (1h) + long-lived refresh tokens (7d) with rotation
- **Rate limiting**: IP-based — login (10/min), register (5/min), upload (20/min)
- **CORS**: Configurable via `CORS_ORIGINS` env var
- **Input sanitization**: bleach HTML stripping for XSS prevention
- **File upload validation**: Magic byte header checks + extension whitelist

### P0 Cache Staleness Fix (Mar 23, 2026)
- Added `await recompute_derived_data()` to ALL write endpoints
- 100% pass rate (iteration_237)

### File Upload in Messages (Mar 23, 2026)
- `POST /api/files/upload` (10MB max), download endpoint, attachment bubbles in messages
- 16/16 backend + frontend tests pass (iteration_238)

### Pipeline & Journey UI Refinements (Mar 23, 2026)
- Pipeline summary, hero cards, vertical stage rail, "Why this matters" panel redesign

### SchoolPod.js Refactor (Mar 23, 2026)
- 1070-line monolith → 441-line main + 9 extracted components

### Coach Watch V2 — Unified Intelligence Card (Mar 22, 2026)
- `POST /api/ai/auto-insight` — Coach Watch state + LLM insight
- Per-athlete cached with 2hr TTL

### Previous Work
- Event Signal in Journey Timeline, Coach Photo Upload, Notification Redirect Fix, Preview Public Profile Fix
- Breakdown Drawer, Live Event Capture V2, Event Summary, SchoolPod mobile, Event Signal routing

## Production Readiness Checklist Status
1. **Auth & Security** — DONE
2. **Data Architecture** — DONE
3. **Environment & Config** — TODO: Remove hardcoded URLs, enforce HTTPS, secure secrets
4. **Error Handling** — TODO: Global frontend error boundary, structured backend errors, Sentry
5. **Performance** — TODO: API pagination, frontend bundle splitting

## Prioritized Backlog

### P1 — Upcoming
- Environment & Config hardening
- Error Handling improvements
- Performance (pagination, bundle splitting)
- CSV Import Tool for bulk school/coach data
- Bulk Approve Mode in Director Inbox

### P2 — Future
- Parent/Family Experience
- AI-Powered Coach Summary
- Club Billing (Stripe)
- Multi-Agent Intelligence Pipeline

## Key API Endpoints
- `POST /api/auth/login` / `POST /api/auth/refresh` / `POST /api/auth/logout`
- `GET /api/mission-control` — Role-based dashboard data
- `GET /api/athletes` — All athletes (direct MongoDB query)
- `GET /api/program/intelligence` — Program health analytics (async)
- `GET /api/events` — Events list (async)
- `POST /api/ai/auto-insight` — Coach Watch + AI insight (cached)
- `POST /api/files/upload` — File upload with validation

## Key Files
- `/app/backend/services/athlete_store.py` — Data access layer (async, DB-direct)
- `/app/backend/services/startup.py` — Indexes + data seeding
- `/app/backend/program_engine.py` — Program intelligence (async)
- `/app/backend/event_engine.py` — Event engine (async)
- `/app/backend/support_pod.py` — Support pod helpers (async)
- `/app/backend/routers/mission_control.py` — Mission control dashboard

## Test Credentials
- **Athlete**: emma.chen@athlete.capymatch.com / athlete123
- **Coach**: coach.williams@capymatch.com / coach123
- **Director**: director@capymatch.com / director123

## 3rd Party Integrations
- OpenAI/Claude via Emergent LLM Key
- Stripe (Payments) — requires User API Key
