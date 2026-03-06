# CapyMatch — Recruiting Operating System

## Problem Statement
Build a recruiting operating system for clubs, coaches, families, and athletes. The system actively coordinates support, surfaces priorities, identifies blockers, and helps users know what to do next.

## Architecture
- **Backend:** FastAPI (Python), in-memory mock data, MongoDB for actions/timeline
- **Frontend:** React, Shadcn/UI, Tailwind CSS
- **Core Loop:** Triage (MC) → Preview (Peek) → Treatment (Pod) → Capture (Event) → Promotion (Advocacy)

## What's Been Implemented

### V1 — Mission Control + Support Pod (Complete)
- Mission Control command surface: priority alerts, athletes needing attention, momentum feed, events, snapshot
- Decision Engine: 7 detection categories (momentum_drop, blocker, deadline_proximity, engagement_drop, ownership_gap, readiness_issue, **event_follow_up**)
- Peek Panel: slide-over preview with Quick Actions (Log Note, Assign, Message)
- Support Pod: 5 blocks (Active Issue, Snapshot, Pod Members, Next Actions, Timeline)
- Pod Health indicator, real-time polling (30s)

### V2 — Event Mode (Complete, Feb 2026)
- Event Home: urgency-grouped list, timing sections, type filter
- Event Prep: athletes with prep status, schools with overlap, checklist with toggle, blockers
- Live Event Mode: dark courtside capture, chip selectors, interest levels, 10-second logging
- Post-Event Summary: stats, hottest interest, follow-up actions, schools seen, routing to pods

### V2 — Advocacy Mode (Complete, Feb 2026)
- Advocacy Home: recommendations grouped by Needs Attention / Drafts / Recently Sent / Closed, status tabs with counts
- Recommendation Builder: athlete + school selection, 6 fit reason chips, event context auto-populated, intro message, desired next step, Save Draft / Send
- Recommendation Detail: full summary, response tracking (status progression dots), Log Response / Follow-up / Close actions, response history timeline, relationship summary
- Relationship Detail: school memory with warmth badge, aggregate stats (interactions, athletes introduced, response rate), athletes introduced list, interaction timeline

### Decision Engine Update (Feb 2026)
- **event_follow_up** detection: stale Hot notes (>48h) surface as critical in MC Priority Alerts, stale Warm notes (>72h) surface as high priority

## Specs
- `/app/SUPPORT_POD_SPEC.md`
- `/app/EVENT_MODE_SPEC.md` (with Signal Routing Matrix)
- `/app/ADVOCACY_MODE_SPEC.md`

## Backlog

### P1 — Upcoming
- V2.5: Program Intelligence
- Advocacy → Support Pod routing (warm responses create pod actions — backend done, needs UI confirmation)

### P2 — Future
- V3: AI/Intelligence Layer
- Database migration (mock data → persistent MongoDB)
- Event-to-event comparison
- Multi-coach support
- AI-suggested fit reasons, auto-generated intros
- Recommendation templates, batch recommendations

## Key Files
- `backend/server.py` — All API endpoints
- `backend/decision_engine.py` — 7 intervention categories including event_follow_up
- `backend/support_pod.py` — Pod data & health
- `backend/event_engine.py` — Event CRUD, prep, live capture, summary, routing
- `backend/advocacy_engine.py` — Recommendations, relationships, event context
- `backend/mock_data.py` — Athletes, events with rosters/schools/checklists/past notes
- `frontend/src/pages/` — MissionControl, SupportPod, EventHome, EventPrep, LiveEvent, EventSummary, AdvocacyHome, RecommendationBuilder, RecommendationDetail, RelationshipDetail
