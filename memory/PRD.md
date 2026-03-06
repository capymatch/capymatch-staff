# CapyMatch — Product Requirements Document

## Original Problem Statement
Build a "recruiting operating system" for clubs, coaches, families, and athletes. The product is structured around 5 operating modes:
1. **Mission Control** — Command center for coaches to see which athletes need help
2. **Support Pod** — Collaborative space for an athlete's support network
3. **Event Mode** — Live recruiting workflow for tournaments and events
4. **Advocacy Mode** — Coach-to-college promotion tool
5. **Program Intelligence** — Strategic layer for club directors

## Architecture
- **Backend:** FastAPI (Python) — Decision Engine + Quick Actions API
- **Frontend:** React + Tailwind + Shadcn/UI
- **Database:** MongoDB (quick actions persist), mock data for interventions
- **Key Concept:** Decision Engine detects interventions across 6 categories, scores them, and surfaces prioritized alerts with full explainability

## What's Been Implemented

### Phase 1: Documentation (COMPLETE)
- Full product spec suite: PRODUCT_ARCHITECTURE, USER_ROLES, SYSTEM_ENTITIES, SCREEN_MAP, MISSION_CONTROL_SPEC, UX_PRINCIPLES, MVP_RECOMMENDATION, CATEGORY_POSITIONING, DECISION_ENGINE_SPEC

### Phase 2: Mission Control Prototype (COMPLETE)
- Decision Engine with 6 balanced intervention categories
- Mission Control UI: Priority Alerts, What Changed Today, Athletes Needing Attention, Events, Program Snapshot

### Phase 3: Decision Engine Tuning (COMPLETE — Feb 2026)
- Fixed momentum_drop over-firing (36% → 14%), ownership_gap from 0% → 14%
- Deterministic athlete archetypes for consistent data

### Peek Panel (COMPLETE — Feb 2026)
- Right-side slide-over panel for intervention preview
- Shows: why surfaced, what changed, recommended action, owner, context, next steps
- Dismiss via X, Escape, or backdrop click

### Quick Actions (COMPLETE — Feb 2026)
- **Log Note:** Inline textarea + optional tag pills (Check-in, Follow-up, Update, Concern, Positive). Saves to MongoDB athlete timeline. Success toast.
- **Assign:** Owner reassignment with selectable list (filters out current owner) + optional reason. Persists in MongoDB. Success toast.
- **Message:** Recipient pill selection → reveals textarea. Sends to MongoDB. Success toast.
- All actions transform the peek panel footer inline (no extra modals/dialogs)
- Escape closes form first, then panel — proper layered dismissal
- Backend: POST /api/athletes/{id}/notes, /assign, /messages + GET /timeline

### API Endpoints
- `GET /api/mission-control` — curated dashboard data
- `GET /api/debug/interventions` — Decision Engine debug output
- `GET /api/athletes` / `GET /api/athletes/{id}` — athlete data
- `POST /api/athletes/{id}/notes` — log note to timeline
- `POST /api/athletes/{id}/assign` — reassign intervention owner
- `POST /api/athletes/{id}/messages` — send quick message
- `GET /api/athletes/{id}/timeline` — all actions for an athlete

## Prioritized Backlog

### P0 (Next)
- Finalize Support Pod Specification (expand SUPPORT_POD_SPEC_DRAFT.md)

### P1
- Implement Backend for Support Pod (API endpoints, logic)
- Implement Frontend for Support Pod (React components, routing)
- Refine Mission Control UI (address "generic dashboard" risks)

### P2
- Event Mode & Advocacy Mode (V2)
- Program Intelligence (V2.5)

### P3
- AI/Intelligence Layer integration
- Real-time updates (WebSockets)
- Replace mock intervention data with real database layer
