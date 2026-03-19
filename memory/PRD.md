# CapyMatch - Athlete Pipeline Management Platform

## Original Problem Statement
Build and iteratively refine an athlete pipeline management application with Director Mission Control, Coach Dashboard, and School Pods — all powered by a unified Risk Engine v3.

## Architecture
- **Frontend**: React + Tailwind + Shadcn/UI
- **Backend**: FastAPI + MongoDB
- **Key Libraries**: @hello-pangea/dnd, sonner, lucide-react

## What's Been Implemented

### Kanban Board
- Redesigned with colored headers, drag-and-drop animations, mobile responsiveness

### Director Mission Control (Phases 1-5)
- Aggregated inbox, Top Priority card, Autopilot nudges, Compose Modal, school context

### Risk Engine v3
- `/app/backend/risk_engine.py` — severity scoring, stage-aware weighting, compound risk, trajectory, intervention types, role-aware actions
- Director UI: severity labels, trajectory indicators, whyNow, intervention CTAs
- Coach Dashboard: Top Priority + unified Needs Attention (scoped to coach's athletes)
- School Pod Risk: contextual risk card in pod hero
- Coach Escalation: POST /api/coach/escalate creates flag visible in Director Inbox

### Coach Dashboard Unification (March 19, 2026)
- Removed duplicate "Needs Attention" section from RosterSection
- Single unified list driven by Risk Engine v3 (CoachInbox)
- Removed non-actionable journey chips (Visiting Schools, Offer Received)
- Blockers rendered as standard rows with severity=critical/high
- RosterSection simplified to "All Clear" + "Events Requiring Prep" only
- Testing: 100% pass rate (iteration_200)

## Key API Endpoints
- `GET /api/director-inbox` — Director-scoped risk inbox
- `GET /api/coach-inbox` — Coach-scoped risk inbox
- `GET /api/school-pod-risk/{program_id}` — School pod risk context
- `POST /api/coach/escalate` — Coach → Director escalation
- `POST /api/autopilot/execute` — One-click approval actions

## Key Files
- `/app/backend/risk_engine.py` — Risk Engine v3 core
- `/app/backend/routers/director_inbox.py`, `coach_inbox.py`, `school_pod.py`
- `/app/frontend/src/components/mission-control/DirectorInbox.js`, `CoachInbox.js`, `SchoolPodRisk.js`
- `/app/frontend/src/components/mission-control/CoachView.js`, `RosterSection.js`

## Test Credentials
- **Director**: director@capymatch.com / director123
- **Coach Williams**: coach.williams@capymatch.com / coach123

## Backlog (Prioritized)

### P1 - Upcoming
- CSV Import Tool: Bulk importing school/coach data
- Bulk Approve mode for Director Inbox
- Refactor DirectorInbox.js into smaller components

### P2 - Future
- Parent/Family Experience (family view of risk)
- AI-Powered Coach Summary
- Club Billing (Stripe)
- Multi-Agent Intelligence Pipeline
- Kanban Keyboard Shortcuts
