# CapyMatch - Athlete Pipeline Management Platform

## Original Problem Statement
Build and iteratively refine an athlete pipeline management application focused on a "Director Mission Control" screen with intelligent risk evaluation, prioritization, and one-click action execution.

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
- `/app/backend/risk_engine.py` — deterministic risk scoring
- Severity scoring (0-100) with stage-aware weighting
- Compound risk interactions, trajectory inference, confidence classification
- Intervention types: monitor/nudge/review/escalate/blocker
- "Why Now" explanations, role-aware action recommendations
- Integrated into GET /api/director-inbox

### Risk Engine v3 UI Integration (March 19, 2026)
- **Top Priority Card**: Severity label (CRITICAL/HIGH PRIORITY), trajectory indicator (↗↘→), whyNow text, red-tinted card for critical severity
- **Inbox Rows**: Trajectory hints for non-stable items, intervention-based CTA behavior
- **CTA Logic**: monitor=no action, nudge=Approve & Send, review=Open Pod, escalate=highlight, blocker=warning
- **Hidden**: riskScore and confidence not exposed in UI
- Testing: 12/12 frontend tests passed

## Key Files
- `/app/backend/risk_engine.py` — Risk Engine v3 core
- `/app/backend/routers/director_inbox.py` — Inbox with v3 integration
- `/app/frontend/src/components/mission-control/DirectorInbox.js` — Frontend inbox + Top Priority + Compose Modal

## Test Credentials
- **Director**: director@capymatch.com / director123
- **Athlete**: emma.chen@athlete.capymatch.com / athlete123

## Backlog (Prioritized)

### P1 - Upcoming
- CSV Import Tool: Bulk importing school/coach data
- Bulk Approve mode for Director Inbox
- Refactor DirectorInbox.js into smaller components

### P2 - Future
- Parent/Family Experience
- AI-Powered Coach Summary
- Club Billing (Stripe)
- Multi-Agent Intelligence Pipeline
- Kanban Keyboard Shortcuts
