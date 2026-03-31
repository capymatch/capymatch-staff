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

### UI Final Polish Pass: Contextual Labels, Signal Language, CTA Strength (March 29, 2026)
- **Contextual labels**: "Across 3 schools" → "Across 3 at-risk schools" / "Across 3 stalled schools" / "Across 3 pending conversations" based on dominant signal
- **Signal-specific language**: "Momentum dropping" → "Follow-ups missed" / "No recent replies" / "No coach, no activity" based on actual signals
- **Bullet lists standardized**: All cards (top, up-next, director) use bullet format with max 3 + "+N more" overflow
- **CTAs strengthened**: "Fix overdue (3)" / "Fix requirement" / "Re-engage now" / "Resolve escalation". Eliminated all "Resolve blocker", "Review blocker", "View details"
- **Tighter spacing**: School list → divider → CTA now feels like one cohesive action unit
- **Status**: VERIFIED — 100% frontend test pass (14/14 features, iteration_284)

### UI/UX Refinement v2: Count Consistency, Dedup, CTA, Hierarchy (March 29, 2026)
- **Count Mismatch (CRITICAL)**: Fixed using Option A — "{X} overdue actions" headline with "Send follow-ups ({X})" CTA using identical deduped count. No mismatches anywhere.
- **School Dedup**: Added `dedupeSchools()` normalizer that merges "Clemson"/"Clemson University" into one entry (keeps longer official name)
- **CTA Consistency**: Critical card = full-width solid red button; Secondary cards = right-aligned subtle text+arrow. Removed "Resolve blocker" and "View details"
- **Color Reduction**: Red reserved for overdue counts, CRITICAL/BLOCKER labels, CTA buttons only. Bullet dots and school names use neutral gray
- **Text Compression**: Merged trend+explanation into single line: "↘ Worsening · Momentum dropping"
- **Target School Hierarchy**: Name → "1 overdue" (PRIMARY, bold red) → "At Risk · In Conversation · 9d ago" (SECONDARY, muted)
- **Attention CTA**: "Review overdue actions" replaces passive "View Details"
- **Status**: VERIFIED — 100% frontend test pass (14/14 features, iteration_283)

### UI/UX Refinement: Mission Control, Target Schools, Attention Section (March 29, 2026)
- **Mission Control Cards**: New strict hierarchy — Name > "{N} schools overdue" headline > Trend > Short explanation (max 8 words, no dashes) > School bullet list > Contextual CTA ("Send follow-ups (3)"). Removed "Across X schools", verbose paragraphs, "Resolve blocker"
- **Target School Cards**: School Name — Status inline, Stage · activity below, overdue badge dominant on right. Removed duplicate "need attention" badge from header
- **Attention/Blocker Section**: BLOCKER badge + bold headline + actionable 1-line subtext ("Follow-ups required to maintain momentum"). Secondary signals collapsed into expandable "N more signals"
- **Applied to**: CoachInbox.js, TopPriorityCard.js, InboxRow.js, inbox-utils.js, StatusIntelligence.js, SupportPod.js
- **Status**: VERIFIED — 100% frontend test pass (12/12 features)

### Bug Fix: Support Pod "Overdue Actions" Count Mismatch (March 29, 2026)
- **Problem**: Support Pod ATTENTION section showed "2 Overdue Actions" but TARGET SCHOOLS listed 3 schools each with "1 overdue" (Arizona State, U of Arizona, San Diego State)
- **Root Cause**: `evaluate_issues()` in `pod_issues.py` only counted overdue **pod actions** (task items) but missed programs with overdue `next_action_due` dates that had no corresponding pod action (San Diego State had an overdue program follow-up but no pod action task)
- **Fix**: Updated `evaluate_issues()` to also query programs with overdue `next_action_due` dates and merge them into the overdue count, deduplicating by `program_id` so pod actions aren't double-counted
- **Status**: VERIFIED — ATTENTION now correctly shows "3 Overdue Actions" matching the 3 at-risk schools
- **Problem**: Coach dashboard showed mild "Follow up now" for Sophia Garcia while Support Pod showed "BLOCKER - 2 Overdue Actions" with 3 at-risk schools
- **Root Cause**: Coach Inbox and Director Inbox endpoints only checked 4 signal sources (escalations, advocacy, missing docs, inactivity) but missed school-level overdue follow-ups from programs collection
- **Fix**: Added Section 5 to both `/api/coach-inbox` and `/api/director-inbox` — queries programs with overdue `next_action_due` dates and surfaces them as `overdue_followup` issue entries with school names
- **Risk Engine**: Added `overdue_followup` to SIGNAL_BASE_SCORE (55), SIGNAL_LABELS, CONFIDENCE_MAP, COMPOUND_RULES (overdue+no_activity=1.45x), and ROLE_ACTIONS
- **Frontend**: Added "Overdue follow-up" → "Act now" (red) to CoachInbox SIGNAL_CTA and COACH_CTA_CONFIG; added school-level issue dots display in UpNextRow
- **Status**: VERIFIED — 100% test pass rate (19/19 backend, all frontend)

## Prioritized Backlog

### Pipeline Performance Fix (March 31, 2026)
- **P0 "Stuck Loading" Regression**: Verified resolved — Pipeline page (`/pipeline`) renders correctly in both Priority and Kanban views
- **Backend**: Batched `compute_all_top_actions()`, GZip middleware, Cache-Control headers all working (API response ~185ms)
- **Frontend**: SWR `sessionStorage` caching in `PipelinePage.js` functioning correctly — stale data served instantly while revalidating
- **Status**: VERIFIED — Both views render, no console errors

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
