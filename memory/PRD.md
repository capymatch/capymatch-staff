# CapyMatch — Recruiting Operating System

## Problem Statement
Build a recruiting operating system for clubs, coaches, families, and athletes. The system actively coordinates support, surfaces priorities, identifies blockers, and helps users know what to do next.

## Architecture
- **Backend:** FastAPI (Python), MongoDB for persistence
- **Frontend:** React, Shadcn/UI, Tailwind CSS
- **Database:** MongoDB — 10 persisted collections. Only `schools` (static) and `interventions` (computed) remain in-memory.
- **Core Loop:** Triage (MC) → Preview (Peek) → Treatment (Pod) → Capture (Event) → Promotion (Advocacy) → Oversight (Program)

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

### Persistence Phase 1 (Complete, Mar 2026)
- Collections: `event_notes`, `recommendations`
- Seed-if-empty + dual-write architecture
- Full recommendation lifecycle + response history persisted

### Persistence Phase 2 (Complete, Mar 2026)
- Collections: `athletes` (25 docs, read-only), `events` (7 seed docs, has write paths)
- Events stored WITHOUT capturedNotes (those in `event_notes` collection)
- Time-relative fields recomputed on load: `daysAway` from `date`, `daysSinceActivity` from `lastActivity`
- Explicit startup ordering: athletes → events → event_notes → recommendations → recompute derived data
- All derived data (interventions, alerts, signals, snapshot) recomputed from persisted state
- Event write paths persisted: POST new event, PATCH checklist toggle

### Trust Cues & Admin Status (Complete, Mar 2026)
- Action-level "Saved" / "Synced" toasts on all write operations
- Internal admin page at /admin showing Phase 2 status

## Persistence Summary

### Persisted (MongoDB) — 10 Collections
| Collection | Phase | Docs | Description |
|---|---|---|---|
| athletes | P2 | 25 | Athlete profiles, daysSinceActivity recomputed |
| events | P2 | 7+ | Event records, daysAway recomputed, capturedNotes in event_notes |
| event_notes | P1 | 5+ | Courtside notes, interest levels, follow-ups |
| recommendations | P1 | 5+ | Full lifecycle with response history |
| pod_actions | P0 | var | Support Pod action items |
| athlete_notes | P0 | var | Athlete timeline entries |
| assignments | P0 | var | Owner assignments |
| messages | P0 | var | Quick messages |
| pod_resolutions | P0 | var | Issue resolution records |
| pod_action_events | P0 | var | Action audit log |

### In-Memory Only — 2 Objects
| Object | Source | Why |
|---|---|---|
| schools | mock_data.py | Static (10 entries), low priority |
| interventions | decision_engine.py | Recomputed from persisted data on startup, stateless |

## Key Files
- `backend/server.py` — All API endpoints, startup seed/load/recompute
- `backend/database.py` — Seed-if-empty and load functions for all collections
- `backend/decision_engine.py` — 7 intervention categories (recomputed on startup)
- `backend/event_engine.py` — Event CRUD, prep, live capture, summary, routing
- `backend/advocacy_engine.py` — Recommendations, relationships
- `backend/program_engine.py` — 5 intelligence sections
- `backend/mock_data.py` — Data generation (used for initial seed only)

## Backlog

### P0 — Next
- Server refactoring: Split server.py into APIRouter modules (routers/events.py, routers/advocacy.py, etc.)

### P1 — Upcoming
- Historical trending for Program Intelligence
- Coach-specific views in Program Intelligence
- Real athlete CRUD (create/edit/delete athletes via UI)

### P2 — Future
- V3: AI/Intelligence Layer (enhanced Decision Engine, predictive analytics)
- AI-suggested fit reasons, auto-generated intros
- Multi-coach support, role-based access
- Platform integrations (calendar, messaging)
