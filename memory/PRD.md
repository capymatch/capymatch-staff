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

### UI Refactor — Pipeline Hero Carousel Arrows (Mar 25, 2026)
- Moved carousel navigation arrows (prev/next + counter) from the top bar row (alongside filter pills) to an absolute-positioned top-right corner of the hero card in `PipelineHero.js`
- Filter pills remain in the top bar; arrows float independently at the top right

### UI Refactor — Event Prep Header Dark Theme (Mar 24, 2026)
- **Header only**: Applied premium dark theme to the top hero header card of `EventPrep.js` (`#161921` bg, light text, red "Go Live" button). All other sections remain light theme.
- **Code cleanup**: Fixed ESLint `react-hooks/exhaustive-deps` warning in `ClubBillingPage.js` (wrapped `pollCheckoutStatus` in `useCallback`). Confirmed unused `UpgradePrompt.js` already deleted.

### UI Refactor — Mission Control, Sidebar, Billing (Mar 24, 2026)
- Reskinned Mission Control (TopPriorityCard, DirectorView, DirectorInbox) to premium dark theme
- Full color-system refinement: calm command center feel with red/orange/white hierarchy
- Sidebar restyled to dark theme
- Club Billing page complete UI/UX overhaul with value-based plan presentation
- Support Pods EscalationBanner dark theme
- Athlete photos added to TopPriorityCard and DirectorInbox

### Bug Fix — Flickering Momentum Status (Mar 24, 2026)
- Removed randomness from `mock_data.py`
- Implemented multi-layer cache: in-memory TTL + `computed_trends` MongoDB collection
- Momentum metrics now stable across refreshes and restarts

### Stripe Subscription Billing (Mar 24, 2026)
- Full subscription lifecycle: checkout, webhooks, cancel/reactivate, billing portal
- 5 pricing tiers: Starter, Growth, Club Pro, Elite, Enterprise
- Monthly/annual billing toggle with ~15% savings
- 100% test pass rate (iteration_246)

### Club Billing V2 — Entitlement Refactor (Mar 24, 2026)
- 3 entitlement types: access (bool), depth (basic/detailed/advanced/full), limit (int)
- Core Director OS always visible on all plans
- `PlanContext` with `can()`, `hasDepth()`, `getDepth()`, `getLimit()`
- `PlanGate` component with 3 modes; `UpgradeNudge` component

### Production Readiness (Mar 23, 2026)
1. **Auth & Security**: Refresh tokens, rate limiting, input sanitization, file upload validation
2. **Data Architecture**: Async DB-direct queries, MongoDB indexes, derived data TTL cache
3. **Environment & Config**: Centralized config, CORS lockdown, security headers, HTTPS redirect
4. **Error Handling**: Request ID middleware, global exception handlers, frontend ErrorBoundary
5. **Performance**: API pagination (6 endpoints), frontend code splitting (45+ lazy routes)

### Previous Work
- Redis shared cache, file upload in messages, pipeline & journey UI, SchoolPod refactor
- Coach Watch V2, event signal, notification redirect fix, live event capture, breakdown drawer

## Prioritized Backlog

### P1 — Upcoming
- CSV Import Tool for bulk school/coach data
- Bulk Approve Mode in Director Inbox
- V2 page-level route gating (Program Intelligence, Loop Insights)
- Usage metering (AI drafts, advocacy recs per plan)

### P2 — Future
- Parent/Family Experience
- AI-Powered Coach Summary
- Multi-Agent Intelligence Pipeline

## Key API Endpoints
- `POST /api/auth/login` / `POST /api/auth/refresh` / `POST /api/auth/logout`
- `GET /api/mission-control` — Role-based dashboard (cached)
- `GET /api/athletes` — All athletes (supports pagination)
- `GET /api/director-inbox` — Inbox items (supports pagination)
- `GET /api/events` — Events list
- `GET /api/events/{id}/prep` — Event preparation data
- `GET /api/club-plans` — List all 5 club plans
- `GET /api/stripe/billing-info` — Stripe billing information
- `POST /api/stripe/checkout` — Create Stripe checkout session

## Test Credentials
- **Athlete**: emma.chen@athlete.capymatch.com / athlete123
- **Coach**: coach.williams@capymatch.com / coach123
- **Director**: director@capymatch.com / director123

## 3rd Party Integrations
- OpenAI/Claude via Emergent LLM Key
- Stripe (Payments) — requires User API Key

## Known Issues
- **libmagic backend crash**: Recurring env issue. Fix: `sudo apt-get update && sudo apt-get install -y libmagic1 libmagic-mgc && sudo supervisorctl restart backend`
