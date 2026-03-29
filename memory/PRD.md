# CapyMatch — Product Requirements Document

## Original Problem Statement
CapyMatch is a production full-stack athlete management platform connecting athletes, coaches, and directors in the college recruiting process. The platform features pipeline/journey tracking, mission control dashboards, advocacy, support pods, and AI-powered insights.

## Core Architecture
- **Frontend**: React + Tailwind + Shadcn UI
- **Backend**: FastAPI + MongoDB
- **AI**: OpenAI GPT-4o / Claude via Emergent LLM Key
- **Payments**: Stripe
- **Email**: Resend
- **Auth**: JWT + Google OAuth

## Key Design Principles
- **Strict SSOT Architecture**: Backend services are sole arbiters of application state
- **Performance First**: Skeleton loaders, parallelized queries, batched lookups, lean payloads
- **Canonical Urgency**: `compute_urgency_class` in `stage_engine.py` is the single source of truth for urgency classification

## What's Been Implemented

### Core Platform (Pre-existing)
- Athlete Pipeline & Journey pages with full CRUD
- Mission Control dashboards for Coach and Director roles
- Support Pod system for athlete-level detail views
- Advocacy/Recommendations engine
- Risk Engine v3 with severity, trajectory, confidence scoring
- Coach Inbox and Director Inbox with risk-enriched signals
- Autopilot actions and nudge system
- Club billing with Stripe integration
- Event management and prep

### Recent Optimizations (Completed)
- Pipeline Hero Card mobile readability improvements
- Hero Card signals clarity (signal-format.js)
- Pipeline visual balance adjustments
- Sitewide action language standardization (school-specific CTAs)
- ResizeObserver error suppression
- P0 Performance: stripped base64 photo_url, parallelized Journey queries, batched Top-Actions, MongoDB indexes, skeleton loaders
- Mobile layout fix for Journey page
- Canonical urgency SSOT: `compute_urgency_class` in `stage_engine.py`

### Bug Fix: Coach/Director Inbox Overdue Mismatch (March 29, 2026)
- **Problem**: Coach dashboard showed mild "Follow up now" for Sophia Garcia while Support Pod showed "BLOCKER - 2 Overdue Actions" with 3 at-risk schools
- **Root Cause**: Coach Inbox and Director Inbox endpoints only checked 4 signal sources (escalations, advocacy, missing docs, inactivity) but missed school-level overdue follow-ups from programs collection
- **Fix**: Added Section 5 to both `/api/coach-inbox` and `/api/director-inbox` — queries programs with overdue `next_action_due` dates and surfaces them as `overdue_followup` issue entries with school names
- **Risk Engine**: Added `overdue_followup` to SIGNAL_BASE_SCORE (55), SIGNAL_LABELS, CONFIDENCE_MAP, COMPOUND_RULES (overdue+no_activity=1.45x), and ROLE_ACTIONS
- **Frontend**: Added "Overdue follow-up" → "Act now" (red) to CoachInbox SIGNAL_CTA and COACH_CTA_CONFIG; added school-level issue dots display in UpNextRow
- **Status**: VERIFIED — 100% test pass rate (19/19 backend, all frontend)

## Prioritized Backlog

### P1 (Next Up)
- CSV Import Tool: Bulk import for school/coach data
- Bulk Approve Mode: Director Inbox multi-select and bulk approve

### P2 (Future)
- Parent/Family Experience
- AI-Powered Coach Summary
- Multi-Agent Intelligence Pipeline

## Key API Endpoints
- `GET /api/coach-inbox` — Risk-enriched coach inbox (now includes overdue follow-ups)
- `GET /api/director-inbox` — Risk-enriched director inbox (now includes overdue follow-ups)
- `GET /api/athlete/programs` — Returns canonical `urgency_class`
- `GET /api/athlete/profile` — Excludes base64 photo_url by default
- `GET /api/athlete/programs/{program_id}/journey` — Parallelized queries
- `GET /api/support-pods/{athlete_id}` — Full status intelligence

## Key Files
- `/app/backend/services/stage_engine.py` — Canonical SSOT logic (compute_urgency_class)
- `/app/backend/risk_engine.py` — Risk Engine v3 (scoring, interventions, signals)
- `/app/backend/routers/coach_inbox.py` — Coach inbox with 5 signal sources
- `/app/backend/routers/director_inbox.py` — Director inbox with 5 signal sources
- `/app/frontend/src/components/mission-control/CoachInbox.js` — Coach inbox UI
- `/app/frontend/src/components/mission-control/TopPriorityCard.js` — Director top priority card
