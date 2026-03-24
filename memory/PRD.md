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

### Club Billing V2 — Entitlement Refactor (Mar 24, 2026)
- **New entitlement architecture**: 3 types — `access` (bool), `depth` (basic/detailed/advanced/full), `limit` (int, -1=unlimited). Replaced flat True/False map.
- **Backend**: `ClubPlan` enum, `E` (EntitlementKey) enum, `DEFAULT_ENTITLEMENTS` (Starter baseline), `PLAN_OVERRIDES` (per-plan deltas). Helpers: `has_feature()`, `get_feature_value()`, `get_plan_entitlements()`.
- **Core Director OS always visible**: Inbox, Outbox, Recruiting Signals, Coach Health, Escalations, Workflow Visibility — True on ALL plans including Starter.
- **Depth gating**: Starter gets basic signals/coach health, Growth gets detailed signals, Club Pro gets advanced signals + detailed coach health, Elite gets advanced everything + full AI.
- **Limit gating**: Starter gets 15 inbox/outbox items, Growth gets 100, Club Pro+ unlimited (-1).
- **Frontend**: Refactored `PlanContext` with `can()`, `hasDepth()`, `getDepth()`, `getLimit()`. New `PlanGate` with 3 modes (access/depth/limit). New `UpgradeNudge` component (inline + card variants).
- **DirectorView**: Inbox/Outbox/Signals/Coach Health shown on all plans. Depth props passed to components. Inline nudges on Starter ("See trends with Growth", "Unlock workload tracking with Club Pro").
- **Testing**: 100% pass rate (iteration_245) — 32 backend + frontend tests.

### Club Billing V1 — Plan-Based Access Tiers (Mar 24, 2026)
- **5 Club Plans**: Starter ($199, 25 athletes, 3 coaches), Growth ($329, 50, 6), Club Pro ($449, 75, 10), Elite ($699, 125, 20), Enterprise (custom, unlimited)
- **Backend**: `club_plans.py` defines 35 feature entitlements across all plans. `routers/club_plans.py` provides 5 API endpoints: list plans, get current, check feature, set plan, bulk entitlements. Plan data stored in `club_subscriptions` collection.
- **Frontend**: `PlanContext.js` hydrates entitlements on login, exposes `can(featureId)`. `PlanGate.js` wraps sections and shows `UpgradePrompt.js` when locked. `ClubBillingPage.js` shows plan cards, usage bars, and plan switching.
- **Director Mission Control gating**: Director Inbox (Growth+), Outbox (Growth+), AI Program Brief (Elite+), Coach Health (Club Pro+), Recruiting Signals (Growth+)
- **Strategy doc**: `/app/docs/CLUB_BILLING_STRATEGY.md` with packaging philosophy, feature matrix, gating rules, upgrade triggers, V1 rollout plan.
- **Testing**: 100% pass rate (iteration_244) — 27 backend + frontend tests.

### Production Readiness Item #6: Performance — Pagination & Code Splitting (Mar 23, 2026)
- **API Pagination**: Created `services/pagination.py` with `paginate_list()` (in-memory) and `paginate_query()` (MongoDB cursor) utilities. Added optional `?page=N&page_size=N` query params to 6 key endpoints: athletes, director-inbox, notifications, athlete timeline, athlete notes, support-messages inbox. All endpoints are fully backward-compatible — without params they return the original format.
- **Pagination envelope**: `{items/data, total, page, page_size, total_pages}`. Max page_size capped at 200.
- **Frontend Code Splitting**: Converted 45+ page imports in App.js from static to `React.lazy()` with `Suspense` wrapper. Only the login page is eagerly loaded; all other pages are lazy-loaded into separate chunks for faster initial load.
- **Testing**: 100% pass rate (iteration_243) — 18/18 backend pagination tests + frontend code splitting verified across all 3 roles.

### Production Readiness Item #5: Redis Shared Cache (Mar 23, 2026)
- **Redis-backed cache layer** (`services/cache.py`): Replaces process-local `_derived_cache` with Redis, shared across all workers. Structured keys (`cm:athletes:all`, `cm:athlete:{id}`, `cm:derived:{name}`). 30s TTL (configurable via `CACHE_TTL_SECONDS`).
- **Graceful DB fallback**: If Redis is unavailable, all reads fall through to MongoDB directly. App never crashes due to cache. Warning logged, not error.
- **Cross-worker invalidation**: `recompute_derived_data()` and `invalidate_athlete()` delete Redis keys, visible to all workers instantly.
- **Observability**: `/api/cache/stats` endpoint returns `{available, stats: {hits, misses, errors, hit_rate_pct}}`. 98.3% hit rate observed in testing.
- **Config**: `REDIS_URL`, `CACHE_ENABLED`, `CACHE_TTL_SECONDS` in `.env` and `config.py`.
- **Testing**: 100% pass rate (iteration_242) — 16/16 backend + frontend + graceful fallback verified.

### Production Readiness Item #4: Error Handling (Mar 23, 2026)
- **Request ID middleware**: Every request gets a unique `X-Request-ID` (generated or forwarded). Attached to `request.state` and response header. Included in all error responses for tracing.
- **Global exception handlers**: 4 handlers — `HTTPException`, `StarletteHTTPException`, `RequestValidationError`, `Exception` catch-all. All return structured `{error: {code, message, request_id}}`. No stack traces exposed.
- **Error code mapping**: `401→UNAUTHORIZED`, `404→NOT_FOUND`, `422→VALIDATION_ERROR`, `429→RATE_LIMITED`, `500→INTERNAL_ERROR`.
- **Frontend ErrorBoundary**: Wraps entire app. Shows "Something went wrong" with Retry/Reload buttons. Captures error + component stack to console.
- **API error utility**: `parseApiError()` / `getErrorMessage()` handle structured, legacy, and network errors.
- **Silent exception fix**: 47 bare `except Exception:` blocks → `except Exception as e:` with `log.debug` for observability.
- **Testing**: 100% pass rate (iteration_241) — 23/23 backend + frontend verified.

### Production Readiness Item #3: Environment & Config Hardening (Mar 23, 2026)
- **Centralized config** (`config.py`): `APP_ENV`, `FRONTEND_URL`, `get_allowed_origins()`, `ENABLE_HTTPS_REDIRECT`, `ENABLE_SECURITY_HEADERS`. Loads `.env` via `dotenv`. Fails fast in production if `FRONTEND_URL` missing.
- **Hardcoded URLs removed**: `invites.py` fallback URL → `config.FRONTEND_URL`. `athlete_gmail.py` domain check → `config.FRONTEND_HOSTNAME`. `auth.py` reset URL → `config.FRONTEND_URL`.
- **CORS locked down**: No more `*` wildcard. Origins built from `FRONTEND_URL` + `ALLOWED_ORIGINS` + localhost in dev. `_parse_origins()` handles whitespace, duplicates, trailing slashes.
- **Security headers middleware**: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, CSP (with Google Fonts allowlist). HSTS only sent when request arrives over HTTPS (prevents localhost poisoning).
- **HTTPS redirect middleware**: Only redirects when `X-Forwarded-Proto` is explicitly "http" (never based on `request.url.scheme` alone — prevents infinite loops behind TLS-terminating proxies). Gated by `ENABLE_HTTPS_REDIRECT=true` + `APP_ENV=production`.
- **Config logging at startup**: Logs resolved config (no secrets) for ops visibility.
- **Testing**: 100% pass rate (iteration_240) — 16/16 backend + all 3 frontend roles verified. Additional manual verification of preflight OPTIONS, HSTS behavior, redirect safety, CSP completeness, and origin parsing edge cases.

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
3. **Environment & Config** — DONE
4. **Error Handling** — DONE
5. **Performance** — DONE: API pagination, frontend bundle splitting

## Prioritized Backlog

### P1 — Upcoming
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
- `GET /api/athletes` — All athletes (supports `?page=N&page_size=N`)
- `GET /api/director-inbox` — Inbox items (supports pagination)
- `GET /api/notifications` — Notifications (supports pagination)
- `GET /api/athletes/{id}/timeline` — Timeline (supports pagination)
- `GET /api/athletes/{id}/notes` — Notes (supports pagination)
- `GET /api/support-messages/inbox` — Message threads (supports pagination)
- `GET /api/club-plans` — List all 5 club plans with entitlements
- `GET /api/club-plans/current` — Current org plan + usage
- `GET /api/club-plans/entitlements` — Bulk entitlements for frontend hydration
- `GET /api/club-plans/check/{feature_id}` — Check single feature access
- `POST /api/club-plans/set` — Set org plan (director only)
- `GET /api/program/intelligence` — Program health analytics (async)
- `GET /api/events` — Events list (async)
- `POST /api/ai/auto-insight` — Coach Watch + AI insight (cached)
- `POST /api/files/upload` — File upload with validation

## Key Files
- `/app/backend/club_plans.py` — Plan definitions, 35 feature entitlements, gating functions
- `/app/backend/routers/club_plans.py` — 5 API endpoints for plan management
- `/app/backend/config.py` — Centralized environment config (CORS, security toggles, fail-fast)
- `/app/backend/middleware/security.py` — Rate limiting, security headers, HTTPS redirect
- `/app/backend/middleware/error_handling.py` — Request ID, structured error responses, global exception handlers
- `/app/backend/services/athlete_store.py` — Data access layer (async, DB-direct)
- `/app/backend/services/pagination.py` — Pagination utilities (in-memory + MongoDB cursor)
- `/app/frontend/src/PlanContext.js` — React context: can(featureId), getAccess(featureId)
- `/app/frontend/src/components/PlanGate.js` — Feature gating wrapper component
- `/app/frontend/src/components/UpgradePrompt.js` — Upgrade prompt UI
- `/app/frontend/src/pages/ClubBillingPage.js` — Plan selection and billing page
- `/app/docs/CLUB_BILLING_STRATEGY.md` — Full packaging strategy document

## Test Credentials
- **Athlete**: emma.chen@athlete.capymatch.com / athlete123
- **Coach**: coach.williams@capymatch.com / coach123
- **Director**: director@capymatch.com / director123

## 3rd Party Integrations
- OpenAI/Claude via Emergent LLM Key
- Stripe (Payments) — requires User API Key
