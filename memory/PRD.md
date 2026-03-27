# CapyMatch — Product Requirements Document

## Original Problem Statement
CapyMatch is a full-stack athlete management platform (React + FastAPI + MongoDB) for student-athletes and their families to manage college recruiting.

## Architecture
- **Frontend**: React (CRA), Tailwind CSS, Shadcn/UI
- **Backend**: FastAPI, MongoDB Atlas
- **AI**: OpenAI GPT-4o / Claude via Emergent LLM Key
- **Deployment**: Railway (backend), Vercel (frontend)

## Design System — Color Rules
- **Brand accent**: Warm Ochre `#8B3F1F` for text accents and borders
- **CTA buttons**: Orange `#ff5a1f` (login, primary actions)
- **Active states** (filters, chips, tabs): `text-gray-900 bg-gray-100 border-gray-300`
- **Tags** (D1, D2, D3): `bg-gray-100 text-gray-600`
- **School logos (fallback)**: Neutral gray gradient `#64748b -> #94a3b8`
- **Card borders**: `border-gray-100`, hover: `border-gray-200`
- **Apply/Compare buttons**: Dark slate `#1e293b`

## Completed Work
- Login page redesign (premium aesthetic, grid background)
- Pipeline/Priority page, Journey page, hero card, progress rail
- TopBar + Pipeline header unified styling
- Schools Page Full Redesign (premium layout, ochre accents)
- Schools Page Green Reduction (Mar 2026): Neutralized all non-CTA green usage
- Login page role selector removed, defaulting to "athlete"
- **Google OAuth Integration (Mar 2026)**: Redirect-based flow. Custom "Continue with Google" button always visible. Backend handles OAuth URL generation + code exchange.
- **Production Integrity Audit Phase 1 (Mar 2026)**: System Map complete. Deliverable at `/app/docs/AUDIT_PHASE1_SYSTEM_MAP.md`
- **P0 Fix: Mock Data Removal (Mar 2026)**: Removed all `mock_data` imports from `athlete_store.py` and `mission_control.py`. Replaced with real DB queries (`_fetch_real_events`, `_build_real_momentum_signals`, `_build_real_program_snapshot`). Signals now come from real `interactions` and `program_stage_history` collections.
- **P0 Fix: Decision Engine Determinism (Mar 2026)**: Removed all `random.random()` from `decision_engine.py`. All 7 intervention detectors now use deterministic, data-driven conditions. Same input always produces same output. Verified with 13 automated tests (100% pass rate).
- **P1 Fix: Mock Data Removal from Events/Intelligence/Digest (Mar 2026)**: Rewrote `event_engine.py` to load from `db.events` + `db.university_knowledge_base` at startup. Removed mock_data from `intelligence.py`, `events.py`, `digest.py`. 1057 schools now from real DB.
- **Refactor Sprint 1: Attention SSOT (Mar 2026)**: Created `services/attention.py` as canonical per-program attention service. `athlete_dashboard.py` enriches programs with backend-computed attention. `PipelinePage.js` no longer calls `computeAttention.js` — consumes backend attention field directly. Verified with 12 backend + 4 frontend tests (100% pass rate).

## Google OAuth Setup (Production)
The Google button is always visible. The OAuth flow is backend-driven:
- **Railway (backend)**: Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- **Vercel (frontend)**: No Google env vars needed
- **Google Console**: Add production frontend URL as authorized redirect URI
- Flow: Button click -> GET /api/auth/google/url -> redirect to Google -> callback -> POST /api/auth/google with code

## Production Integrity Audit Status
- **Phase 1 — System Map**: DONE. Deliverable: `/app/docs/AUDIT_PHASE1_SYSTEM_MAP.md`
- **Phase 1 P0 Fixes**: DONE. Mock data removed from athlete_store + mission_control. Decision engine made deterministic.
- **Phase 2 — API Inventory**: DONE. Deliverable: `/app/docs/AUDIT_PHASE2_API_INVENTORY.md`
- **Phase 3 — Source of Truth Audit**: DONE. Deliverable: `/app/docs/AUDIT_PHASE3_SOURCE_OF_TRUTH.md`
- **P1 Mock Data Fixes**: DONE. event_engine.py, events.py, intelligence.py, digest.py all fixed.
- **Refactor Sprint 1 — Attention SSOT**: DONE. `services/attention.py` is canonical. Frontend consumes backend attention.
- **Refactor Sprint 2 — Interaction Signals SSOT**: DONE. `services/program_metrics.py` is canonical owner. `_compute_signals_from_interactions` and `_batch_signals` removed from `athlete_dashboard.py`. All views consume `extract_signals(metrics)`. Verified with 24 backend + 7 frontend tests (100% pass rate).
- **Refactor Sprint 3 — Stage/Progress Consolidation**: DONE. `services/stage_engine.py` is canonical owner for `pipeline_stage`, `board_group`, and `journey_rail`. 2-field model enforced: `recruiting_status` (user-set) + `pipeline_stage` (system-derived). `journey_stage` writes stopped. DB normalized (24 programs). Auto-corrections on write flows. Verified with 17 backend + all frontend tests (100% pass).
- **P0 — journey_stage Full Removal**: DONE. Field removed from all DB documents, all backend/frontend code.
- **P1 — Mock Data Cleanup**: DONE. `support_pod.py`, `advocacy_engine.py`, `program_engine.py`, `routers/admin.py` — all mock imports replaced with DB queries. Only `startup.py` (seeding) retains mock_data.
- **Priority Engine v2**: DONE. `services/priority_engine.py` is canonical owner for all priority/attention/urgency. Output contract: priority_score, priority_band, attention_status, urgency, momentum, opportunity_tier, stale_flag, blocker_flag, overdue_flag, hero_eligible, primary_action, why_this_is_priority. Backward-compatible aliases maintained. 23 backend + all frontend tests passed.
- **P0 — Login bcrypt/passlib Fix (Mar 2026)**: Replaced `passlib.hash.bcrypt` with direct `bcrypt` library calls across `auth.py`, `invites.py`, `startup.py`, `org_foundation.py`. Root cause: `passlib==1.7.4` incompatible with `bcrypt>=4.0.0`.
- **School Detail Page Redesign (Mar 2026)**: Transformed from data-heavy dashboard to premium Apple/Notion-style decision-focused experience. New sections: Hero (large name, subtle metadata, AI summary, match ring, "Add to Pipeline" CTA), "Why This School" (fit analysis callout), "Quick Snapshot" (merged stats grid), "Opportunity & Risk" (insight-focused), simplified Coaching Staff (list layout), compact Program Details. All tests passed.
- **School Detail Page Enhancements (Mar 2026)**: Added decision guidance layer: Hero decision summary, "Recommended Next Step" with contextual CTAs, Quick Snapshot micro interpretation labels, improved coaching staff hover states, increased section spacing.
- **School Detail Page Editorial Refactor (Mar 2026)**: Transformed from boxed dashboard UI to flowing editorial content layout. Removed ALL cards, containers, backgrounds, shadows. Large lightweight title (3.5rem font-light), underline-only CTAs, label-aligned "Why This School" bullets, inline italic next step, pure text stat grid, simple coaching staff list (Name — Role — Email), subtle h-px dividers, generous whitespace (mb-20), warm ochre (#8B3F1F) accent. 100% test pass rate.
- **Phase 7 — Test Implementation**: COMPLETE (90+ tests across 7 test files)

### Known Remaining mock_data Imports (acceptable — seeding only)
- `services/startup.py` — mock_data (for seeding on first boot — acceptable)
- All production routers/services are clean

## Pending Issues
- P0: Update Vercel REACT_APP_BACKEND_URL to `https://capymatch-staff-production.up.railway.app`

## Bug Fixes
- **P0 — Login bcrypt/passlib Fix (Mar 2026)**: Replaced `passlib.hash.bcrypt` with direct `bcrypt` library calls across `auth.py`, `invites.py`, `startup.py`, `org_foundation.py`. Root cause: `passlib==1.7.4` incompatible with `bcrypt>=4.0.0` (removed `__about__` attribute). Login verified working end-to-end.

## Upcoming Tasks (P0/P1)
- CSV Import Tool for bulk school/coach data
- Bulk Approve Mode in Director Inbox

## Future Tasks (P2)
- Parent/Family Experience
- AI-Powered Coach Summary
- Multi-Agent Intelligence Pipeline
- Remove mock_data from ALL remaining files (events, digest, intelligence, admin, etc.)

## Demo Accounts
- Athlete: emma.chen@athlete.capymatch.com / athlete123
- Coach: coach.williams@capymatch.com / coach123
- Director: director@capymatch.com / director123

## Key API Endpoints
- `POST /api/auth/login` — Email/password login
- `POST /api/auth/register` — Registration
- `GET /api/auth/google/url` — Google OAuth redirect URL
- `POST /api/auth/google` — Google OAuth code exchange
- `GET /api/mission-control` — Coach/Director dashboard (now deterministic, real data)
- `GET /api/mission-control/snapshot` — Program snapshot (real counts)
- `GET /api/mission-control/events` — Events (from DB)
- `GET /api/mission-control/signals` — Momentum signals (from real interactions)
- `GET /api/athlete/programs` — Athlete program list
- `GET /api/internal/programs/top-actions` — Top actions per school

## 3rd Party Integrations
- OpenAI GPT-4o / Claude — Emergent LLM Key
- Stripe (Payments) — User API Key
- Resend (Email) — Configured
- Google OAuth — User Client ID/Secret (Railway backend only)

## Test Files
- `/app/backend/tests/test_determinism_no_mock.py` — 13 tests covering determinism + no-mock-data verification
- `/app/backend/tests/test_attention_regression.py` — 20 tests for Sprint 1 Attention SSOT regression
- `/app/backend/tests/test_sprint2_signals_ssot.py` — 24 tests for Sprint 2 Interaction Signals SSOT
- `/app/backend/tests/test_sprint3_stage_consolidation.py` — 17 tests for Sprint 3 Stage/Progress SSOT
