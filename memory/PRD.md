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
- **Phase 4 — Duplicate Logic Detection**: NOT STARTED
- **Phase 5 — Cross-Page Consistency Testing**: NOT STARTED
- **Phase 6 — State Propagation Testing**: NOT STARTED
- **Phase 7 — Test Implementation**: PARTIALLY DONE (determinism tests at `/app/backend/tests/test_determinism_no_mock.py`)

### Known Remaining mock_data Imports (other files, lower priority)
- `routers/events.py` — UPCOMING_EVENTS, SCHOOLS
- `routers/digest.py` — UPCOMING_EVENTS
- `routers/intelligence.py` — mock_data
- `routers/admin.py` — SCHOOLS
- `program_engine.py` — UPCOMING_EVENTS
- `event_engine.py` — UPCOMING_EVENTS, SCHOOLS
- `support_pod.py` — UPCOMING_EVENTS
- `advocacy_engine.py` — UPCOMING_EVENTS, SCHOOLS
- `services/startup.py` — mock_data (for seeding — acceptable)

## Pending Issues
- P0: Update Vercel REACT_APP_BACKEND_URL to `https://capymatch-staff-production.up.railway.app`

## Upcoming Tasks (P1)
- Phase 2-7 of Production Integrity Audit
- CSV Import Tool for bulk school/coach data
- Bulk Approve Mode in Director Inbox
- School Detail Page Redesign with premium ochre aesthetic

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
