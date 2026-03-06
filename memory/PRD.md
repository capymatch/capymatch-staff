# CapyMatch — Recruiting Operating System

## Problem Statement
Build a recruiting operating system for clubs, coaches, families, and athletes. The system actively coordinates support, surfaces priorities, identifies blockers, and helps users know what to do next.

## Architecture
- **Backend:** FastAPI (Python), MongoDB, modular APIRouter architecture
- **Frontend:** React, Shadcn/UI, Tailwind CSS
- **Database:** MongoDB — 10 persisted collections. Only `schools` (static) and `interventions` (computed) remain in-memory.
- **Core Loop:** Triage (MC) → Preview (Peek) → Treatment (Pod) → Capture (Event) → Promotion (Advocacy) → Oversight (Program)

### Backend Structure (Post-Refactor)
```
backend/
  server.py              # ~105 lines — app creation, router registration, startup/shutdown
  db_client.py           # Shared MongoDB connection
  models.py              # All Pydantic request/response schemas
  database.py            # Seed-if-empty and load functions
  services/
    startup.py           # Seed → load → recompute pipeline
  routers/
    mission_control.py   # 6 endpoints: /mission-control/*
    athletes.py          # 6 endpoints: /athletes/* + quick actions + timeline
    support_pods.py      # 4 endpoints: /support-pods/*
    events.py            # 13 endpoints: /events/* + /schools
    advocacy.py          # 12 endpoints: /advocacy/*
    program.py           # 1 endpoint: /program/intelligence
    admin.py             # 1 endpoint: /admin/status
    debug.py             # 3 endpoints: /debug/*
  decision_engine.py     # 7 intervention categories
  support_pod.py         # Pod data & health
  event_engine.py        # Event logic
  advocacy_engine.py     # Recommendation logic
  program_engine.py      # 5 intelligence sections
  mock_data.py           # Data generation (used for initial seed only)
```

## What's Been Implemented

### V1 — Mission Control + Support Pod (Complete)
- Mission Control command surface: priority alerts, athletes needing attention, momentum feed, events, snapshot
- Decision Engine: 7 detection categories
- Peek Panel, Support Pod with 5 blocks, Pod Health, real-time polling

### V2 — Event Mode (Complete)
- Event Home, Prep, Live Event Mode, Post-Event Summary
- Routing: event notes → Support Pod actions + timeline

### V2 — Advocacy Mode (Complete)
- Advocacy Home, Recommendation Builder/Detail, Relationship Detail
- Full lifecycle: draft → send → respond → follow-up → close

### V2.5 — Program Intelligence (Complete)
- 5 decision sections: Program Health, Readiness, Event Effectiveness, Advocacy Outcomes, Support Load

### Persistence Phase 1 (Complete)
- Collections: `event_notes`, `recommendations`
- Seed-if-empty + dual-write architecture

### Persistence Phase 2 (Complete)
- Collections: `athletes`, `events`
- Time-relative fields recomputed on load
- All derived data recomputed from persisted state

### Trust Cues & Admin Status (Complete)
- Action-level "Saved" / "Synced" toasts
- Internal admin page at /admin

### Server Refactoring (Complete, Mar 2026)
- server.py: 1214 lines → 105 lines
- 8 router modules, each with clear domain ownership
- services/startup.py encapsulates seed/load/recompute
- models.py centralizes Pydantic schemas
- db_client.py provides shared MongoDB connection
- 46 total API endpoints across 8 routers
- 100% test pass rate (40/40 backend, all frontend)

## Persistence Summary

### Persisted (MongoDB) — 10 Collections
| Collection | Phase | Description |
|---|---|---|
| athletes | P2 | Athlete profiles, daysSinceActivity recomputed |
| events | P2 | Event records, daysAway recomputed |
| event_notes | P1 | Courtside notes, interest levels |
| recommendations | P1 | Full lifecycle with response history |
| pod_actions | P0 | Support Pod action items |
| athlete_notes | P0 | Athlete timeline entries |
| assignments | P0 | Owner assignments |
| messages | P0 | Quick messages |
| pod_resolutions | P0 | Issue resolution records |
| pod_action_events | P0 | Action audit log |

### In-Memory Only
| Object | Why |
|---|---|
| schools | Static (10 entries) |
| interventions | Recomputed from persisted data |

### Startup Order
`athletes → events → event_notes → recommendations → recompute derived data`

## Backlog

### P1 — Upcoming
- Historical trending for Program Intelligence
- Coach-specific views in Program Intelligence
- Real athlete CRUD (create/edit/delete athletes via UI)

### P2 — Future
- V3: AI/Intelligence Layer (enhanced Decision Engine, predictive analytics)
- AI-suggested fit reasons, auto-generated intros
- Multi-coach support, role-based access
- Platform integrations (calendar, messaging)
