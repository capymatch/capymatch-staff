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

### Quick Actions (COMPLETE — Feb 2026)
- Log Note, Assign, Message — inline forms in peek panel footer
- Backend: POST /api/athletes/{id}/notes, /assign, /messages + GET /timeline
- All persist to MongoDB

### Support Pod Specification (COMPLETE — Feb 2026)
- Full implementation-ready spec: SUPPORT_POD_SPEC.md
- 5 core blocks: Active Issue Banner, Athlete Snapshot, Pod Members + Ownership, Next Actions, Treatment Timeline
- API contracts, data models, component structure defined
- Route: /support-pods/:athleteId?context=:category

## Prioritized Backlog

### P0 (Next)
- Implement Support Pod backend (GET /api/support-pods/:athleteId, POST actions, PATCH actions, POST resolve)
- Implement Support Pod frontend (5 blocks + routing from Peek Panel)

### P1
- Wire "Open Support Pod" button in Peek Panel to navigate to Support Pod
- Refine Mission Control UI (address "generic dashboard" risks)
- Pod health indicator connected to Mission Control

### P2
- Event Mode & Advocacy Mode (V2)
- Program Intelligence (V2.5)

### P3
- Real pod member management (invite by email)
- AI/Intelligence Layer integration
- Real-time updates (WebSockets)
- Replace mock intervention data with real database layer
