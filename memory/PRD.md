# CapyMatch — Recruiting Operating System

## Problem Statement
Build a recruiting operating system for clubs, coaches, families, and athletes. The system actively coordinates support, surfaces priorities, identifies blockers, and helps users know what to do next.

## Architecture
- **Backend:** FastAPI (Python), in-memory mock data (no DB persistence yet), MongoDB for quick actions
- **Frontend:** React, Shadcn/UI, Tailwind CSS
- **Core Loop:** Triage (Mission Control) -> Preview (Peek Panel) -> Treatment (Support Pod)

## What's Been Implemented

### V1 — Complete
- **Mission Control (Command Surface):** Priority alerts, athletes needing attention, momentum feed, upcoming events, program snapshot. Refined UI with operational feel.
- **Decision Engine:** Backend module analyzing mock data to generate/rank interventions (blockers, momentum drops, deadlines, engagement, ownership, readiness).
- **Peek Panel:** Slide-over preview from Mission Control cards showing intervention details.
- **Quick Actions:** Log Note, Assign, Message — inline forms within Peek Panel with backend persistence.
- **Support Pod (Treatment Environment):** 5 core blocks — Active Issue Banner, Athlete Snapshot, Pod Members, Next Actions, Treatment Timeline.
- **Pod Health Indicator:** Calculated status (Healthy/Needs Attention/At Risk) displayed on Mission Control cards and Support Pod header.
- **Real-Time Polling:** Auto-refresh every 30s on Support Pod with live indicator and manual refresh button (Feb 2026).

## In Progress

### P0 — Event Mode Spec
- `/app/EVENT_MODE_SPEC.md` — Full implementation-ready spec for Event Mode (V2)
- Status: SPEC WRITTEN, awaiting user approval before build

## Backlog

### P1 — Upcoming
- V2: Event Mode implementation (4 screens: Event Home, Prep, Live, Summary)
- V2: Advocacy Mode (TBD spec)

### P2 — Future
- V2.5: Program Intelligence
- V3: AI/Intelligence Layer, deeper platform integration
- Database migration (mock data -> persistent MongoDB)

## Key Files
- `backend/server.py` — API endpoints
- `backend/decision_engine.py` — Intervention scoring
- `backend/support_pod.py` — Pod data & health logic
- `backend/mock_data.py` — All mock data
- `frontend/src/pages/MissionControl.js` — Command surface
- `frontend/src/pages/SupportPod.js` — Treatment environment (with polling)
- `frontend/src/components/support-pod/PodHeader.js` — Live indicator
- `frontend/src/components/PeekPanel.js` — Slide-over preview
