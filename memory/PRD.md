# CapyMatch - Athlete Pipeline Management Platform

## Original Problem Statement
Build and iteratively refine an athlete pipeline management application focused on a "Director Mission Control" screen with intelligent risk evaluation, prioritization, and one-click action execution. Extend risk intelligence to Coach Dashboard and School Pods with role-appropriate UI.

## Architecture
- **Frontend**: React + Tailwind + Shadcn/UI
- **Backend**: FastAPI + MongoDB
- **Key Libraries**: @hello-pangea/dnd, sonner, lucide-react

## What's Been Implemented

### Kanban Board
- Redesigned with colored headers, drag-and-drop animations, mobile responsiveness

### Director Mission Control (Phases 1-5)
- GET /api/director-inbox endpoint + DirectorInbox component
- Layout refactor — inbox-dominant, compressed hero
- "Top Priority Right Now" card with scoring + explanations
- Autopilot nudges, Approve & Send, POST /api/autopilot/execute, Compose Modal
- School context parsing, athlete aggregation, contextual row labels

### Risk Engine v3 (March 19, 2026)
- `/app/backend/risk_engine.py` — deterministic risk scoring engine
- Severity scoring (0-100) with stage-aware weighting
- Compound risk interactions, trajectory inference, confidence classification
- Intervention types: monitor/nudge/review/escalate/blocker
- "Why Now" explanations, role-aware action recommendations

### Risk Engine v3 — Director UI (March 19, 2026)
- Top Priority Card: severity label, trajectory indicator, whyNow, intervention-based CTA
- Inbox Rows: trajectory hints, intervention-based CTA behavior

### Risk Engine v3 — Coach Dashboard + School Pods (March 19, 2026)
- **Coach Dashboard** (`CoachInbox.js`):
  - Top Priority card (coach variant) with severity, trajectory, whyNow, coach-specific CTA
  - Needs Attention list scoped to coach's assigned athletes only
  - Filtered to coach-actionable interventions (no monitor items)
  - CTA mapping: nudge→Send follow-up, review→Open Pod, escalate→Request director help, blocker→Review blocker
- **Escalation Flow** (`POST /api/coach/escalate`):
  - Clicking "Request director help" opens confirm modal with athlete, school, risk, whyNow, optional note
  - Creates escalation/flag in director_actions collection
  - Visible in Director Inbox / Mission Control
- **School Pod Risk** (`SchoolPodRisk.js`):
  - Contextual risk card in pod hero: primaryRisk, severity, trajectory, whyNow, recommended next action
  - "Also watching" section with up to 2 secondary risks
  - Role-neutral endpoint supports future family/director views
- **Testing**: 21/21 tests passed (19 backend + all frontend verified)

## Key API Endpoints
- `GET /api/director-inbox` — Director-scoped risk inbox
- `GET /api/coach-inbox` — Coach-scoped risk inbox (filtered by ownership + actionable interventions)
- `GET /api/school-pod-risk/{program_id}` — Single athlete-school risk context
- `POST /api/coach/escalate` — Create escalation flag for director
- `POST /api/autopilot/execute` — Execute one-click approval actions
- `PUT /api/athlete/programs/{program_id}` — Update program stage

## Key Files
- `/app/backend/risk_engine.py` — Risk Engine v3 core
- `/app/backend/routers/director_inbox.py` — Director inbox with v3
- `/app/backend/routers/coach_inbox.py` — Coach inbox + escalation endpoint
- `/app/backend/routers/school_pod.py` — Includes school pod risk endpoint
- `/app/frontend/src/components/mission-control/DirectorInbox.js` — Director inbox UI
- `/app/frontend/src/components/mission-control/CoachInbox.js` — Coach inbox UI
- `/app/frontend/src/components/mission-control/SchoolPodRisk.js` — School pod risk UI
- `/app/frontend/src/components/mission-control/CoachView.js` — Coach dashboard
- `/app/frontend/src/pages/SchoolPod.js` — School pod page

## Test Credentials
- **Director**: director@capymatch.com / director123
- **Coach Williams**: coach.williams@capymatch.com / coach123
- **Coach Garcia**: coach.garcia@capymatch.com / coach123
- **Athlete**: emma.chen@athlete.capymatch.com / athlete123

## Backlog (Prioritized)

### P1 - Upcoming
- CSV Import Tool: Bulk importing school/coach data
- Bulk Approve mode for Director Inbox
- Refactor DirectorInbox.js into smaller components

### P2 - Future
- Parent/Family Experience (family view of school pod risk)
- AI-Powered Coach Summary
- Club Billing (Stripe)
- Multi-Agent Intelligence Pipeline
- Kanban Keyboard Shortcuts
