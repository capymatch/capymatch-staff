# Persistence Plan — CapyMatch Data Durability

**Version:** 1.0
**Status:** PLANNING
**Database:** MongoDB (already connected via `MONGO_URL`)

---

## Current State

All application data is generated in-memory on backend startup. User-created data (event notes, recommendations, pod actions, timeline entries) is stored in two places:

1. **In-memory Python structures** — event notes live on `UPCOMING_EVENTS[n].capturedNotes`, recommendations live in `advocacy_engine.RECOMMENDATIONS`. These reset on every backend restart.

2. **MongoDB collections (partial)** — pod actions (`pod_actions`), athlete notes/timeline (`athlete_notes`). These survive restarts but are supplementary. The Support Pod reads from both in-memory mock data and MongoDB.

**Result:** A coach can capture 20 event notes, build 5 recommendations, and log a dozen responses — all gone on the next deploy or restart. The workflow is real; the durability is not.

---

## Priority Objects for Persistence

Ranked by **pain of data loss** (how much user effort is destroyed if this resets):

### P0 — Critical (User-Created, High Effort)

| Object | Current Storage | Why Critical | Collection |
|--------|----------------|--------------|------------|
| **Recommendations** | `advocacy_engine.RECOMMENDATIONS` (in-memory list) | Each recommendation represents 5-10 minutes of coach thought — fit reasons, intro message, relationship context. Losing these destroys trust. | `recommendations` |
| **Event Notes** | `event.capturedNotes[]` (in-memory on event objects) | Courtside captures are unrepeatable moments. If the backend restarts mid-event, all notes are gone. | `event_notes` |
| **Response History** | Nested in `RECOMMENDATIONS[n].response_history` | Tracks the full lifecycle of school engagement. Losing this erases institutional memory. | Embedded in `recommendations` |

### P1 — Important (User-Created, Moderate Effort)

| Object | Current Storage | Why Important | Collection |
|--------|----------------|---------------|------------|
| **Pod Actions** | MongoDB `pod_actions` ✓ | Already persisted. Includes actions from events, advocacy, and manual creation. | `pod_actions` (existing) |
| **Timeline Entries** | MongoDB `athlete_notes` ✓ | Already persisted. Includes event notes, advocacy events, and manual notes. | `athlete_notes` (existing) |
| **Event Checklist State** | `event.checklist[]` (in-memory) | Prep work completed by coach. Less painful to redo than notes, but still annoying. | `event_checklists` or embedded in `events` |

### P2 — Valuable (Derived, Can Be Recomputed)

| Object | Current Storage | Why Valuable | Persistence Strategy |
|--------|----------------|--------------|---------------------|
| **Events** | `UPCOMING_EVENTS` (in-memory, generated on startup) | Event metadata (name, date, location, rosters) is mock-generated. When real events are created by users, these need persistence. | `events` |
| **Relationship History** | Aggregated from recommendations + event notes | Computed from P0 objects. If recommendations and event notes are persisted, relationships can be recomputed. | **No separate collection** — aggregate on read |
| **Intervention State** | `ALL_INTERVENTIONS` (recomputed on startup) | Decision Engine runs on every request against athlete data. Interventions are stateless computations. | **No persistence needed** — recompute |
| **Athletes** | `ATHLETES` (mock-generated on startup) | Currently mock data. When replaced with real athlete intake, needs its own collection. | `athletes` (future) |

---

## Migration Strategy

### Phase 1: Persist User-Created Data (Minimum Viable Durability)

**Goal:** Event notes and recommendations survive restarts. This is the highest-pain data loss.

**Changes:**

1. **`event_notes` collection**
   - On `POST /api/events/:eventId/notes`: write to MongoDB AND in-memory
   - On `GET /api/events/:eventId/notes`: read from MongoDB, not in-memory
   - On `PATCH /api/events/:eventId/notes/:noteId`: update in MongoDB
   - On backend startup: event `capturedNotes` are no longer seeded in mock_data (or seeded ONLY if collection is empty, for demo purposes)

   Schema:
   ```json
   {
     "_id": ObjectId,
     "id": "uuid",
     "event_id": "event_0",
     "athlete_id": "athlete_5",
     "athlete_name": "Olivia Anderson",
     "school_id": "stanford",
     "school_name": "Stanford",
     "interest_level": "hot",
     "note_text": "Stanford coach pulled her aside",
     "follow_ups": ["schedule_call"],
     "captured_by": "Coach Martinez",
     "captured_at": "2026-02-01T15:22:00Z",
     "routed_to_pod": false,
     "routed_to_mc": false,
     "advocacy_candidate": true
   }
   ```

2. **`recommendations` collection**
   - On `POST /api/advocacy/recommendations`: write to MongoDB AND in-memory
   - On all status transitions (send, respond, follow-up, close): update MongoDB
   - On `GET /api/advocacy/recommendations`: read from MongoDB
   - On backend startup: seed demo recommendations ONLY if collection is empty

   Schema:
   ```json
   {
     "_id": ObjectId,
     "id": "rec_uuid",
     "athlete_id": "athlete_5",
     "athlete_name": "Olivia Anderson",
     "school_id": "ucla",
     "school_name": "UCLA",
     "college_coach_name": "Coach Williams",
     "status": "awaiting_reply",
     "fit_reasons": ["athletic_ability", "academic_fit"],
     "fit_note": "...",
     "fit_summary": "...",
     "supporting_event_notes": ["note_id_1"],
     "intro_message": "...",
     "desired_next_step": "schedule_call",
     "created_by": "Coach Martinez",
     "created_at": "2026-02-06T...",
     "sent_at": "2026-02-06T...",
     "response_status": null,
     "response_note": null,
     "response_at": null,
     "follow_up_count": 1,
     "last_follow_up_at": "2026-02-08T...",
     "closed_at": null,
     "closed_reason": null,
     "response_history": [
       {"type": "sent", "date": "...", "text": "..."},
       {"type": "follow_up", "date": "...", "text": "..."}
     ]
   }
   ```

3. **`event_checklists` — embed in events collection or separate**
   - Lower priority than notes and recommendations
   - Can be Phase 1.5

### Phase 2: Persist Event Metadata

**Goal:** User-created events (via `POST /api/events`) survive restarts.

Mock-generated events continue to be generated on startup for demo. User-created events are stored in `events` collection and merged into the event list.

### Phase 3: Persist Athletes (Future)

**Goal:** Replace mock athlete generation with real athlete intake.

This is a larger migration that changes the core data model. Not recommended until the product workflow is stable.

---

## Read Path Changes

Currently, many read paths go through in-memory structures (e.g., `event_engine.get_event_notes()` reads from `event.capturedNotes[]`). After Phase 1:

| Read Path | Current Source | After Phase 1 |
|-----------|---------------|---------------|
| Event notes list | `event.capturedNotes` (in-memory) | MongoDB `event_notes` collection |
| Event summary | Aggregated from `event.capturedNotes` | Aggregated from MongoDB `event_notes` |
| Recommendation list | `advocacy_engine.RECOMMENDATIONS` (in-memory) | MongoDB `recommendations` collection |
| Recommendation detail | In-memory lookup | MongoDB lookup |
| Relationship memory | Aggregated from recommendations + event notes | Both read from MongoDB |
| Decision Engine event_follow_up | Reads `event.capturedNotes` | Must read from MongoDB `event_notes` |
| Pod actions | MongoDB `pod_actions` ✓ | No change |
| Athlete timeline | MongoDB `athlete_notes` ✓ | No change |

### Key Constraint
The Decision Engine currently loops over `UPCOMING_EVENTS[n].capturedNotes` to detect stale follow-ups. After persistence, it will need to query `event_notes` collection instead. This is the most complex read path change.

---

## Seeding Strategy

For demo/development purposes, seed data should be inserted on startup ONLY if collections are empty:

```python
async def seed_if_empty(db):
    if await db.event_notes.count_documents({}) == 0:
        # Insert past event notes from mock_data
        ...
    if await db.recommendations.count_documents({}) == 0:
        # Insert seed recommendations from advocacy_engine
        ...
```

This preserves user data across restarts while ensuring first-launch demo experience.

---

## Effort Estimate

| Phase | Scope | Effort |
|-------|-------|--------|
| Phase 1: Event Notes + Recommendations | 2 new collections, modify 8-10 API endpoints, update read paths in event_engine.py and advocacy_engine.py | Medium (1 session) |
| Phase 2: Event Metadata | 1 new collection, merge logic for mock + persisted events | Small |
| Phase 3: Athletes | Full data model redesign, intake workflow | Large (separate project) |

---

## What NOT to Persist

| Object | Reason |
|--------|--------|
| Interventions | Computed by Decision Engine on every request. Stateless. |
| Pod Health | Computed from interventions. Stateless. |
| Program Intelligence metrics | Computed from all other data. Stateless. |
| Momentum signals | Mock-generated. Eventually replaced by real activity tracking. |
| Athlete data | Mock-generated. Phase 3 concern. |

---

## Risk Notes

1. **Dual-source reads:** During Phase 1, some data comes from MongoDB and some from in-memory mocks. This creates a hybrid read path that must be carefully managed.

2. **Decision Engine dependency:** The `event_follow_up` detector reads `capturedNotes` from in-memory events. After persistence, this needs to query MongoDB, which changes the detector from sync to async — or the notes must be loaded into memory on startup.

3. **Demo seeding:** If seed data is not idempotent, restarts can create duplicates. Use `count_documents({}) == 0` check.

4. **ObjectId serialization:** All MongoDB reads must exclude `_id` or convert to string. This is an existing pattern in the codebase.

---

**This plan is designed to be executed incrementally. Phase 1 can be built in a single session without breaking existing functionality.**
