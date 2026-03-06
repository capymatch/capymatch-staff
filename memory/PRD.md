# CapyMatch — Recruiting Operating System

## Problem Statement
Build a recruiting operating system for clubs, coaches, families, and athletes. The system actively coordinates support, surfaces priorities, identifies blockers, and helps users know what to do next.

## Architecture
- **Backend:** FastAPI (Python), in-memory mock data, MongoDB for actions/timeline
- **Frontend:** React, Shadcn/UI, Tailwind CSS
- **Core Loop:** Triage (MC) → Preview (Peek) → Treatment (Pod) → Capture (Event) → Promotion (Advocacy) → Oversight (Program)

## What's Been Implemented

### V1 — Mission Control + Support Pod (Complete)
- Mission Control command surface: priority alerts, athletes needing attention, momentum feed, events, snapshot
- Decision Engine: 7 detection categories (momentum_drop, blocker, deadline_proximity, engagement_drop, ownership_gap, readiness_issue, event_follow_up)
- Peek Panel: slide-over preview with Quick Actions (Log Note, Assign, Message)
- Support Pod: 5 blocks (Active Issue, Snapshot, Pod Members, Next Actions, Timeline)
- Pod Health indicator, real-time polling (30s)

### V2 — Event Mode (Complete)
- Event Home, Event Prep, Live Event Mode, Post-Event Summary
- Routing: event notes → Support Pod actions + timeline

### V2 — Advocacy Mode (Complete)
- Advocacy Home, Recommendation Builder, Recommendation Detail, Relationship Detail
- Full lifecycle: draft → send → respond → follow-up → close
- Routing: warm responses create Support Pod actions + timeline

### V2.5 — Program Intelligence (Complete, Feb 2026)
- Single scrollable oversight page with 5 decision sections:
  1. Program Health: pod health distribution, issues by type, risk cluster callout
  2. Team/Grad Year Readiness: per-cohort breakdown, on-track %, stalled athletes
  3. Event Effectiveness: follow-up completion rates, downstream impact chain
  4. Advocacy Outcomes: pipeline, response rates, aging recommendations, school activity
  5. Support Load: per-owner load bars, overload detection, imbalance warnings
- All 4 navigation modes now active (Mission Control, Events, Advocacy, Program)

## Specs
- `/app/SUPPORT_POD_SPEC.md`
- `/app/EVENT_MODE_SPEC.md` (with Signal Routing Matrix)
- `/app/ADVOCACY_MODE_SPEC.md`
- `/app/PROGRAM_INTELLIGENCE_SPEC.md`
- `/app/PERSISTENCE_PLAN.md`

## Backlog

### P0 — Next
- Persistence Phase 1: event notes + recommendations + response history to MongoDB

### P1 — Upcoming
- Historical trending for Program Intelligence (requires persistence)
- Coach-specific views in Program Intelligence

### P2 — Future
- V3: AI/Intelligence Layer
- Full database migration (athletes, events)
- AI-suggested fit reasons, auto-generated intros
- Event-to-event comparison, multi-coach support

## Key Files
- `backend/server.py` — All API endpoints
- `backend/decision_engine.py` — 7 intervention categories
- `backend/support_pod.py` — Pod data & health
- `backend/event_engine.py` — Event CRUD, prep, live capture, summary, routing
- `backend/advocacy_engine.py` — Recommendations, relationships, event context
- `backend/program_engine.py` — 5 intelligence sections computed from all data sources
- `backend/mock_data.py` — Athletes, events, schools
- `frontend/src/pages/` — MissionControl, SupportPod, EventHome, EventPrep, LiveEvent, EventSummary, AdvocacyHome, RecommendationBuilder, RecommendationDetail, RelationshipDetail, ProgramIntelligence
