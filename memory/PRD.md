# CapyMatch — Recruiting Operating System

## Problem Statement
Build a recruiting operating system for clubs, coaches, families, and athletes. The system actively coordinates support, surfaces priorities, identifies blockers, and helps users know what to do next.

## Architecture
- **Backend:** FastAPI (Python), MongoDB for persistence, in-memory mock data for athletes/events
- **Frontend:** React, Shadcn/UI, Tailwind CSS
- **Database:** MongoDB (event_notes, recommendations, pod_actions, athlete_notes, assignments, messages, pod_resolutions, pod_action_events)
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

### V2.5 — Program Intelligence (Complete)
- Single scrollable oversight page with 5 decision sections:
  1. Program Health: pod health distribution, issues by type, risk cluster callout
  2. Team/Grad Year Readiness: per-cohort breakdown, on-track %, stalled athletes
  3. Event Effectiveness: follow-up completion rates, downstream impact chain
  4. Advocacy Outcomes: pipeline, response rates, aging recommendations, school activity
  5. Support Load: per-owner load bars, overload detection, imbalance warnings

### Persistence Phase 1 (Complete, Mar 2026)
- MongoDB collections: `event_notes`, `recommendations`
- Seed-if-empty strategy: mock data seeded on first run, preserves user data on restarts
- Dual-write architecture: all mutations write to MongoDB AND update in-memory structures
- Engine modules (decision_engine, program_engine) read from synced in-memory data
- API reads: event notes list and recommendation detail read directly from MongoDB
- Full recommendation lifecycle persisted: draft → sent → awaiting_reply → warm_response → follow_up_needed → closed
- Response history embedded in recommendations collection
- Event note routing (routed_to_pod flag) persisted

### Trust Cues & Admin Status (Complete, Mar 2026)
- Action-level trust cues: "Saved" / "Synced" toast messages on all write operations
- Inline "Saved" indicator with check icon on LiveEvent note feed (3s animation)
- Internal admin status page at /admin (hidden, not in coach navigation)
- GET /api/admin/status: persistence phase, collection counts, seed strategy, limitations

## Key Files
- `backend/server.py` — All API endpoints, startup seed/load, admin status
- `backend/database.py` — Seed-if-empty and load functions
- `backend/decision_engine.py` — 7 intervention categories
- `backend/support_pod.py` — Pod data & health
- `backend/event_engine.py` — Event CRUD, prep, live capture, summary, routing
- `backend/advocacy_engine.py` — Recommendations, relationships, event context
- `backend/program_engine.py` — 5 intelligence sections
- `backend/mock_data.py` — Athletes, events, schools (still in-memory)

## Specs & Plans
- `/app/SUPPORT_POD_SPEC.md`
- `/app/EVENT_MODE_SPEC.md`
- `/app/ADVOCACY_MODE_SPEC.md`
- `/app/PROGRAM_INTELLIGENCE_SPEC.md`
- `/app/PERSISTENCE_PLAN.md` (Phase 1 — complete)
- `/app/PERSISTENCE_PHASE_2_PLAN.md` (Phase 2 — planning complete)

## Backlog

### P0 — Next
- Persistence Phase 2: Migrate athletes (Step 1) then events (Step 2) to MongoDB
  - Athletes: read-only, zero writes, LOW risk
  - Events: has write path + capturedNotes merge, MEDIUM risk
  - Startup ordering: athletes → events → event_notes → interventions

### P1 — Upcoming
- Server refactoring: Split server.py into APIRouter modules
- Historical trending for Program Intelligence (requires persistence)
- Coach-specific views in Program Intelligence

### P2 — Future
- V3: AI/Intelligence Layer (enhanced Decision Engine, predictive analytics)
- AI-suggested fit reasons, auto-generated intros
- Event-to-event comparison, multi-coach support
- Platform integrations (calendar, messaging)
