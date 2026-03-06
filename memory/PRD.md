# CapyMatch — Recruiting Operating System

## Problem Statement
Build a recruiting operating system for clubs, coaches, families, and athletes. The system actively coordinates support, surfaces priorities, identifies blockers, and helps users know what to do next.

## Architecture
- **Backend:** FastAPI (Python), in-memory mock data (no DB persistence yet), MongoDB for quick actions/pod actions/timeline
- **Frontend:** React, Shadcn/UI, Tailwind CSS
- **Core Loop:** Triage (Mission Control) -> Preview (Peek Panel) -> Treatment (Support Pod) -> Capture (Event Mode)

## What's Been Implemented

### V1 — Mission Control + Support Pod (Complete)
- **Mission Control (Command Surface):** Priority alerts, athletes needing attention, momentum feed, upcoming events, program snapshot. Refined UI with operational feel.
- **Decision Engine:** Backend module analyzing mock data to generate/rank interventions (blockers, momentum drops, deadlines, engagement, ownership, readiness).
- **Peek Panel:** Slide-over preview from Mission Control cards showing intervention details.
- **Quick Actions:** Log Note, Assign, Message — inline forms within Peek Panel with backend persistence.
- **Support Pod (Treatment Environment):** 5 core blocks — Active Issue Banner, Athlete Snapshot, Pod Members, Next Actions, Treatment Timeline.
- **Pod Health Indicator:** Calculated status (Healthy/Needs Attention/At Risk) displayed on Mission Control cards and Support Pod header.
- **Real-Time Polling:** Auto-refresh every 30s on Support Pod with live indicator and manual refresh button.

### V2 — Event Mode (Complete, Feb 2026)
- **Event Home (/events):** Event list with urgency indicators (red/yellow/green), timing groups (today/this week/later), past events tab, type filter.
- **Event Prep (/events/:id/prep):** Athletes attending with prep status, target schools with overlap counts, prep checklist with toggle, blockers section, links to Support Pod.
- **Live Event Mode (/events/:id/live):** Dark theme courtside capture. Athlete/school chip selectors, interest levels (Hot/Warm/Cool/None), quick note text, follow-up checkboxes. Under-10-second capture. Recent notes feed.
- **Post-Event Summary (/events/:id/summary):** Event stats, hottest interest ranked, follow-up actions, schools seen with interaction counts, all notes view.
- **Routing Logic:** Route to Pod (single + bulk) creates Support Pod action items and athlete timeline entries. Signal routing matrix defined in spec.
- **Navigation:** Header nav now functional with Mission Control and Events modes linked.

## Specs
- `/app/SUPPORT_POD_SPEC.md` — Support Pod implementation spec
- `/app/EVENT_MODE_SPEC.md` — Event Mode implementation spec with Signal Routing Matrix

## Backlog

### P1 — Upcoming
- V2 continued: Advocacy Mode (new operating mode — spec TBD)
- Event follow-up as Decision Engine intervention category (stale follow-ups surface in MC)

### P2 — Future
- V2.5: Program Intelligence
- V3: AI/Intelligence Layer, deeper platform integration
- Database migration (mock data -> persistent MongoDB)
- Event-to-event comparison
- Multi-coach support

## Key Files
- `backend/server.py` — All API endpoints
- `backend/decision_engine.py` — Intervention scoring
- `backend/support_pod.py` — Pod data & health logic
- `backend/event_engine.py` — Event Mode data aggregation, prep, live capture, summary, routing
- `backend/mock_data.py` — All mock data (athletes, events with rosters/schools/checklists/past notes)
- `frontend/src/pages/MissionControl.js` — Command surface
- `frontend/src/pages/SupportPod.js` — Treatment environment
- `frontend/src/pages/EventHome.js` — Event list
- `frontend/src/pages/EventPrep.js` — Pre-event planning
- `frontend/src/pages/LiveEvent.js` — Courtside capture
- `frontend/src/pages/EventSummary.js` — Post-event debrief
- `frontend/src/components/mission-control/Header.js` — Top nav with mode switching
