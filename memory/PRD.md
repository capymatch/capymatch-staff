# CapyMatch — Product Requirements Document

## Original Problem Statement
Build a "recruiting operating system" for clubs, coaches, families, and athletes. The product is structured around 5 operating modes:
1. **Mission Control** — Command center for coaches to see which athletes need help
2. **Support Pod** — Collaborative space for an athlete's support network
3. **Event Mode** — Live recruiting workflow for tournaments and events
4. **Advocacy Mode** — Coach-to-college promotion tool
5. **Program Intelligence** — Strategic layer for club directors

## Architecture
- **Backend:** FastAPI (Python) — serves mock data via Decision Engine
- **Frontend:** React + Tailwind + Shadcn/UI
- **Database:** None (all data mocked in-memory via `mock_data.py`)
- **Key Concept:** Decision Engine detects interventions across 6 categories, scores them, and surfaces prioritized alerts

## What's Been Implemented

### Phase 1: Documentation (COMPLETE)
- PRODUCT_ARCHITECTURE.md, USER_ROLES.md, SYSTEM_ENTITIES.md
- SCREEN_MAP.md, MISSION_CONTROL_SPEC.md, UX_PRINCIPLES.md
- MVP_RECOMMENDATION.md, CATEGORY_POSITIONING.md, DECISION_ENGINE_SPEC.md

### Phase 2: Mission Control Prototype (COMPLETE)
- Decision Engine with 6 intervention categories (momentum_drop, blocker, deadline_proximity, engagement_drop, ownership_gap, readiness_issue)
- Balanced intervention distribution (verified: no single category > 28%)
- Explainability on every intervention (why_this_surfaced, what_changed, recommended_action, owner)
- Mission Control UI: Priority Alerts, What Changed Today, Athletes Needing Attention, Events, Program Snapshot
- Full backend API: /api/mission-control, /api/debug/interventions, /api/athletes

### Phase 3: Decision Engine Tuning (COMPLETE — Feb 2026)
- Fixed momentum_drop over-firing (36% → 14%)
- Fixed ownership_gap at 0% (→ 14%)
- Created deterministic athlete archetypes for consistent, testable data
- All 6 categories now balanced and represented
- Frontend updated to properly render Decision Engine output with full explainability

## Prioritized Backlog

### P0 (Next)
- Finalize Support Pod Specification (expand SUPPORT_POD_SPEC_DRAFT.md)

### P1
- Implement Backend for Support Pod (API endpoints, logic)
- Implement Frontend for Support Pod (React components)
- Refine Mission Control UI (address "generic dashboard" concerns)

### P2
- Event Mode & Advocacy Mode (V2)
- Program Intelligence (V2.5)

### P3
- AI/Intelligence Layer integration
- Real-time updates (WebSockets)
- Persistent database layer
