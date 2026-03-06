# CapyMatch — Product Requirements Document

## Original Problem Statement
Build a "recruiting operating system" for clubs, coaches, families, and athletes. 5 operating modes:
1. **Mission Control** — Triage. What needs help. Who's at risk.
2. **Support Pod** — Treatment. How to help. Resolve the issue.
3. **Event Mode** — Live recruiting workflow for tournaments/events.
4. **Advocacy Mode** — Coach-to-college promotion tool.
5. **Program Intelligence** — Strategic layer for club directors.

## Architecture
- **Backend:** FastAPI (Python) — Decision Engine + Support Pod + Quick Actions
- **Frontend:** React + Tailwind + Shadcn/UI
- **Database:** MongoDB (actions, notes, assignments, messages, resolutions persist)
- **Mock Data:** Athletes, interventions, pod members generated in-memory (mock_data.py, support_pod.py)

## What's Been Implemented

### Phase 1: Documentation (COMPLETE)
- Full spec suite: PRODUCT_ARCHITECTURE, USER_ROLES, SYSTEM_ENTITIES, SCREEN_MAP, MISSION_CONTROL_SPEC, UX_PRINCIPLES, MVP_RECOMMENDATION, CATEGORY_POSITIONING, DECISION_ENGINE_SPEC, SUPPORT_POD_SPEC

### Phase 2: Mission Control (COMPLETE)
- Decision Engine with 6 balanced intervention categories
- Mission Control UI: Priority Alerts, What Changed Today, Athletes Needing Attention, Events, Program Snapshot
- Peek Panel: right-side slide-over with full explainability + 3 quick actions (Log Note, Assign, Message)

### Phase 3: Decision Engine Tuning (COMPLETE — Feb 2026)
- Balanced intervention distribution across all 6 categories

### Phase 4: Support Pod (COMPLETE — Feb 2026)
**Backend:**
- `GET /api/support-pods/:athleteId` — full pod data (athlete, interventions, members, actions, timeline, health)
- `POST /api/support-pods/:athleteId/actions` — create action + log to timeline
- `PATCH /api/support-pods/:athleteId/actions/:actionId` — complete/reassign + log event
- `POST /api/support-pods/:athleteId/resolve` — resolve active issue + log to timeline
- `support_pod.py` module: pod member generation, suggested action generation, health calculation

**Frontend — 5 Blocks:**
1. **Active Issue Banner** — preserves MC context (why/what_changed/action/owner), Log Call, Send Message, Mark Resolved, Dismiss
2. **Athlete Snapshot** — momentum, stage, schools, blockers, readiness, upcoming events
3. **Pod Members + Ownership** — 3 members with roles, activity dots, task counts, PRIMARY badge, ownership summary
4. **Next Actions** — grouped by owner, checkboxes for completion, + Add form, reassign, overdue detection
5. **Treatment Timeline** — chronological entries (notes, assignments, messages, resolutions, action events) grouped by date with filter pills

**Routing:**
- MC → Peek Panel → "Open Support Pod" → `/support-pods/:athleteId?context=:category`
- Support Pod → "← Mission Control" → `/mission-control`
- Context param preserved to drive Active Issue Banner

### API Endpoints (All)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /api/mission-control | Dashboard data |
| GET | /api/athletes | All athletes |
| GET | /api/athletes/:id | Single athlete |
| POST | /api/athletes/:id/notes | Log note |
| POST | /api/athletes/:id/assign | Reassign owner |
| POST | /api/athletes/:id/messages | Send message |
| GET | /api/athletes/:id/timeline | Treatment history |
| GET | /api/support-pods/:id | Full pod data |
| POST | /api/support-pods/:id/actions | Create action |
| PATCH | /api/support-pods/:id/actions/:actionId | Complete/reassign action |
| POST | /api/support-pods/:id/resolve | Resolve issue |
| GET | /api/debug/interventions | Debug: all interventions |

### Phase 5: Pod Health Indicators (COMPLETE — Feb 2026)
- 3 states: green (Healthy), yellow (Needs Attention), red (At Risk)
- 5 explainable signals: activity recency, open issue count, blockers, ownership gaps, issue severity
- Shows on: Priority Alert cards (dot + label in owner row), Athlete cards (dot + label in meta row), Peek Panel (explanation below score)
- Purely derived from athlete + intervention data (no DB queries needed)
- Secondary to main intervention content — does not compete with why/what_changed/action/owner

## Prioritized Backlog

### P1 (Next)
- Refine Mission Control UI (address "generic dashboard" risks, make it feel more like an operating system)
- Pod health indicator connected to Mission Control athlete cards
- Real-time refresh / polling for Support Pod data

### P2
- Event Mode & Advocacy Mode (V2)
- Program Intelligence (V2.5)

### P3
- Real pod member management (invite by email, roles)
- AI/Intelligence Layer integration
- Real-time updates (WebSockets)
- Replace mock data with real database layer
