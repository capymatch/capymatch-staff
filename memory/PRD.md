# CapyMatch - Athlete Pipeline Management Platform

## Original Problem Statement
Build and iteratively refine an athlete pipeline management application focused on a "Director Mission Control" screen. The application helps directors manage athlete recruiting pipelines with intelligent prioritization, auto-nudges, and one-click action execution.

## Core Requirements
1. **Unified Director Inbox**: Aggregated, prioritized feed of critical signals (escalations, advocacy, roster issues, inactivity)
2. **Action-Oriented UI**: Guide directors to the most critical issue with clear, immediate suggested actions
3. **High Signal, Low Noise**: Minimal, clean, scannable interface
4. **Contextual Actions**: Actions tied to relevant athlete + school context
5. **Progressive Disclosure**: High-level summary with details on interaction

## Architecture
- **Frontend**: React + Tailwind + Shadcn/UI
- **Backend**: FastAPI + MongoDB
- **Key Libraries**: @hello-pangea/dnd (drag-drop), sonner (toasts), lucide-react (icons)

## What's Been Implemented

### Kanban Board
- Redesigned from scratch with colored headers, drag-and-drop animations (tilt effect, ghost placeholder)
- Mobile responsiveness fixes for PipelineHero and SwipeableCard

### Director Mission Control (Phases 1-5)
- **Phase 1**: GET /api/director-inbox endpoint + initial DirectorInbox component
- **Phase 2**: Layout refactor - inbox-dominant design, compressed hero/KPI strip, collapsible sections
- **Phase 3**: "Top Priority Right Now" card with client-side scoring + "Why this matters" explanations
- **Phase 4**: Autopilot nudges, Approve & Send buttons, POST /api/autopilot/execute endpoint, Compose Modal
- **Phase 5**: School context parsing, athlete aggregation (dedup by athlete_id), contextual row labels

### P0 Fix (March 19, 2026) - Inbox Row Link Behavior
- **Fixed**: Suggested action link (e.g., "Check in about University of Michigan →") now opens the Compose Modal
- **Fixed**: Right-aligned CTA changed to "Open Pod →" for simple navigation to athlete pod
- **Fixed**: "Assign coach" items navigate to /roster instead of opening modal
- **Testing**: 7/7 frontend tests passed (iteration_196.json)

## Key API Endpoints
- `GET /api/director-inbox` - Aggregated inbox items
- `POST /api/autopilot/execute` - Execute one-click approval actions
- `PUT /api/athlete/programs/{program_id}` - Update program stage (Kanban)

## DB Collections Used
- `director_actions`, `advocacy_recommendations`, `athletes`, `support_threads`, `support_messages`, `autopilot_log`

## Test Credentials
- **Director**: clara.morgan@director.capymatch.com / director123
- **Athlete**: emma.chen@athlete.capymatch.com / athlete123

## Backlog (Prioritized)

### P1 - Upcoming
- CSV Import Tool: Bulk importing school/coach data
- Bulk Approve mode for Director Inbox
- Refactor DirectorInbox.js into smaller components (TopPriorityCard.js, InboxRow.js, ComposeModal.js)

### P2 - Future
- Parent/Family Experience
- AI-Powered Coach Summary
- Club Billing (Stripe)
- Multi-Agent Intelligence Pipeline
- Kanban Keyboard Shortcuts
