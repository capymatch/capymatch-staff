# CapyMatch - Athlete Pipeline Management Platform

## Original Problem Statement
Build and iteratively refine an athlete pipeline management application focused on a "Director Mission Control" screen. The application helps directors manage athlete recruiting pipelines with intelligent prioritization, auto-nudges, and one-click action execution.

## Core Requirements
1. **Unified Director Inbox**: Aggregated, prioritized feed of critical signals
2. **Action-Oriented UI**: Guide directors to the most critical issue with clear suggested actions
3. **High Signal, Low Noise**: Minimal, clean, scannable interface
4. **Contextual Actions**: Actions tied to relevant athlete + school context
5. **Progressive Disclosure**: High-level summary with details on interaction

## Architecture
- **Frontend**: React + Tailwind + Shadcn/UI
- **Backend**: FastAPI + MongoDB
- **Key Libraries**: @hello-pangea/dnd, sonner, lucide-react

## What's Been Implemented

### Kanban Board
- Redesigned with colored headers, drag-and-drop animations, mobile responsiveness

### Director Mission Control (Phases 1-5)
- Phase 1: GET /api/director-inbox + DirectorInbox component
- Phase 2: Layout refactor — inbox-dominant, compressed hero
- Phase 3: "Top Priority Right Now" card with scoring + explanations
- Phase 4: Autopilot nudges, Approve & Send, POST /api/autopilot/execute, Compose Modal
- Phase 5: School context parsing, athlete aggregation, contextual row labels

### P0 Fix (March 19, 2026)
- Suggested action link opens Compose Modal, "Open Pod →" navigates to pod

### Risk Engine v3 (March 19, 2026)
- **New module**: `/app/backend/risk_engine.py`
- **Severity scoring** (0-100) with stage-aware weighting (Offer=1.5x, Added=0.8x)
- **Compound risk interactions**: escalation+no_activity, missing_docs+deadline, etc.
- **Trajectory inference**: improving/stable/worsening from recent patterns
- **Confidence classification**: high/medium/low based on signal explicitness
- **Intervention types**: monitor/nudge/review/escalate/blocker
- **"Why Now" explanations**: concise urgency sentences
- **Role-aware actions**: director/coach/family specific recommendations
- **Backward compatible**: All legacy fields preserved, new fields additive
- **Testing**: 25/25 backend tests passed, frontend unaffected

## Key API Endpoints
- `GET /api/director-inbox` — Enriched with v3 risk fields
- `POST /api/autopilot/execute` — Execute one-click approval actions
- `PUT /api/athlete/programs/{program_id}` — Update program stage

## Key Files
- `/app/backend/risk_engine.py` — Risk Engine v3 core
- `/app/backend/routers/director_inbox.py` — Inbox with v3 integration
- `/app/backend/routers/autopilot.py` — Autopilot actions
- `/app/frontend/src/components/mission-control/DirectorInbox.js` — Frontend inbox
- `/app/frontend/src/components/mission-control/DirectorView.js` — Mission Control page

## DB Collections
- `director_actions`, `advocacy_recommendations`, `athletes`, `programs`
- `support_threads`, `support_messages`, `autopilot_log`

## Test Credentials
- **Director**: director@capymatch.com / director123
- **Athlete**: emma.chen@athlete.capymatch.com / athlete123

## Backlog (Prioritized)

### P1 - Upcoming
- CSV Import Tool: Bulk importing school/coach data
- Bulk Approve mode for Director Inbox
- Refactor DirectorInbox.js into smaller components
- Surface v3 risk fields in UI (severity badges, trajectory indicators, whyNow text)

### P2 - Future
- Parent/Family Experience
- AI-Powered Coach Summary
- Club Billing (Stripe)
- Multi-Agent Intelligence Pipeline
- Kanban Keyboard Shortcuts
