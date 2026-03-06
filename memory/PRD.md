# CapyMatch — Recruiting Operating System

## Problem Statement
Build a recruiting operating system for clubs, coaches, families, and athletes. The system actively coordinates support, surfaces priorities, identifies blockers, and helps users know what to do next.

## Architecture
- **Backend:** FastAPI (Python), MongoDB, modular APIRouter architecture
- **Frontend:** React, Shadcn/UI, Tailwind CSS
- **Database:** MongoDB — 11 persisted collections. Only `schools` (static) and `interventions` (computed) remain in-memory.
- **Core Loop:** Triage (MC) → Preview (Peek) → Treatment (Pod) → Capture (Event) → Promotion (Advocacy) → Oversight (Program)

### Backend Structure
```
backend/
  server.py              # ~105 lines — app creation, router registration, startup/shutdown
  db_client.py           # Shared MongoDB connection
  models.py              # All Pydantic request/response schemas
  database.py            # Seed-if-empty and load functions
  services/
    startup.py           # Seed → load → recompute pipeline
    snapshots.py         # Daily metric snapshots + trend computation
  routers/
    mission_control.py   # 6 endpoints
    athletes.py          # 6 endpoints
    support_pods.py      # 4 endpoints
    events.py            # 13 endpoints + /schools
    advocacy.py          # 12 endpoints
    program.py           # 1 endpoint (intelligence + trends)
    admin.py             # 1 endpoint
    debug.py             # 3 endpoints
  decision_engine.py, support_pod.py, event_engine.py,
  advocacy_engine.py, program_engine.py, mock_data.py
```

## What's Been Implemented

### V1 — Mission Control + Support Pod (Complete)
### V2 — Event Mode (Complete)
### V2 — Advocacy Mode (Complete)
### V2.5 — Program Intelligence (Complete)

### Persistence Phase 1 + 2 (Complete)
- 11 MongoDB collections, seed-if-empty, dual-write, explicit startup ordering
- Athletes + events durable, time-relative fields recomputed

### Server Refactoring (Complete)
- server.py: 1214 → 105 lines, 8 router modules

### Historical Trending (Complete, Mar 2026)
- "What's Changing" section in Program Intelligence with 5 trend cards:
  1. Pod Health (healthy count, delta)
  2. Open Issues (total, delta, blocker context)
  3. Overdue Actions (count, delta)
  4. Advocacy Pipeline (warm responses, delta)
  5. Follow-up Completion (%, delta)
- Daily snapshots stored in `program_snapshots` collection (rate-limited to 1/day)
- 3 historical snapshots seeded for demo (7, 3, 1 days ago with degraded values)
- Each trend: current value, delta, direction (improving/declining/stable/baseline), interpretation
- Trust cues: "Saved" / "Synced" toasts, internal admin at /admin

## Persistence Summary — 11 Collections
| Collection | Phase | Description |
|---|---|---|
| athletes | P2 | Profiles, daysSinceActivity recomputed |
| events | P2 | Records, daysAway recomputed |
| event_notes | P1 | Courtside notes + follow-ups |
| recommendations | P1 | Full lifecycle + response history |
| program_snapshots | P2 | Daily trending snapshots |
| pod_actions | P0 | Pod action items |
| athlete_notes | P0 | Timeline entries |
| assignments | P0 | Owner assignments |
| messages | P0 | Quick messages |
| pod_resolutions | P0 | Issue resolutions |
| pod_action_events | P0 | Action audit log |

## Backlog

### P1 — Next
- Coach-specific views for Program Intelligence
- Real athlete CRUD (create/edit/delete via UI)

### P2 — Future
- V3: AI/Intelligence Layer
- Multi-coach support, role-based access
- Platform integrations (calendar, messaging)
