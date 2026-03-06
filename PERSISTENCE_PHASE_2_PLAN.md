# Persistence Phase 2 — Athletes & Events

## Summary
Phase 2 migrates the two remaining core objects — **athletes** and **events** — from in-memory mock data to MongoDB. This makes the entire core data model durable and prepares the platform for multi-session state, real athlete profiles, and historical intelligence.

---

## Migration Order: Athletes FIRST, then Events

### Why athletes first
- **Zero write paths.** Athletes are read-only in the current system. No mutations, no state transitions, no lifecycle. This makes the migration purely a read-path swap — the safest possible change.
- **25 objects, flat structure.** Each athlete is a self-contained document with no nested mutable state.
- **High dependency.** Every module reads athletes: `event_engine`, `advocacy_engine`, `support_pod`, `program_engine`. Getting athletes stable in MongoDB unblocks everything.

### Why events second
- **Has a write path.** `POST /api/events` creates new events in-memory. Persisting this requires write-through to MongoDB.
- **Nested complexity.** Events have `capturedNotes` which are already persisted separately in the `event_notes` collection (Phase 1). The event document in MongoDB should NOT contain `capturedNotes` — it should reference them via `event_id`. The in-memory merge logic (load event + join notes from `event_notes`) must be correct.
- **Checklist state.** Events have `checklist` objects that are currently in-memory. These are low-value (prep checklists reset on restart) but need a decision: persist or accept reset.

---

## Step 1: Athletes Collection

### Schema
```
athletes collection:
{
  id: String (e.g. "athlete_0"),          // unique ID, indexed
  fullName: String,
  gradYear: Number,
  sport: String,
  position: String,
  club: String,
  gpa: Number,
  test_score: Number,
  state: String,
  highlight_url: String,
  status: String ("active_recruit", "committed", etc.),
  contactResponsiveness: String ("high", "medium", "low"),
  lastContactDate: String (ISO datetime),
  nextDeadline: String (ISO datetime),
  deadlineType: String,
  recruitingPhase: String,
  topSchools: [String],
  podHealth: { status, score, activeIssues, memberCount },
  recentMomentum: { trend, signals, weeklyScore },
  ownershipClarity: { primary, gaps, coverage },
  readiness: { academic, athletic, mental, social },
  weeklyScores: [Number],
  flags: [String]
}
```

### Read paths to update
| Module | Function | Current access pattern |
|--------|----------|----------------------|
| `server.py` | `GET /api/athletes` | `return ATHLETES` |
| `server.py` | `GET /api/athletes/{id}` | `next(a for a in ATHLETES if a["id"] == id)` |
| `event_engine.py` | `get_event_prep()` | `[a for a in ATHLETES if a["id"] in event.athlete_ids]` |
| `event_engine.py` | `capture_note()` | `next(a for a in ATHLETES if a["id"] == data["athlete_id"])` |
| `advocacy_engine.py` | `list_recommendations()` | iterates ATHLETES for snapshots |
| `advocacy_engine.py` | `create_recommendation()` | `next(a for a in ATHLETES if ...)` |
| `advocacy_engine.py` | `get_school_relationship()` | iterates ATHLETES for snapshots |
| `advocacy_engine.py` | `get_event_context()` | `next(a for a in ATHLETES if ...)` |
| `support_pod.py` | `get_athlete()` | `next(a for a in ATHLETES if ...)` |
| `program_engine.py` | `compute_program_health()` | iterates all ATHLETES |
| `program_engine.py` | `compute_grad_year_readiness()` | groups ATHLETES by gradYear |
| `program_engine.py` | `compute_support_load()` | iterates ATHLETES |

### Write paths
**None.** Athletes are read-only in the current system.

### Implementation strategy
1. Seed `athletes` collection if empty from `mock_data.ATHLETES`
2. On startup, load from MongoDB into `ATHLETES` list (same pattern as Phase 1)
3. All existing code continues reading from in-memory `ATHLETES` — no engine changes needed
4. API read endpoints (`GET /api/athletes`, `GET /api/athletes/{id}`) can optionally read from DB directly

### Risk: LOW
- No write paths = no dual-write complexity
- Seed-if-empty is proven (Phase 1)
- In-memory sync on startup is proven (Phase 1)

---

## Step 2: Events Collection

### Schema
```
events collection:
{
  id: String (e.g. "event_0"),            // unique ID, indexed
  name: String,
  date: String (ISO datetime),
  daysAway: Number,                       // computed, can be re-derived
  location: String,
  type: String ("showcase", "tournament", etc.),
  athlete_ids: [String],                  // references athletes collection
  schools_present: [String],
  prep_notes: String,
  status: String ("upcoming", "live", "past"),
  checklist: {                            // Phase 2 decision: persist or skip
    film_uploaded: Boolean,
    roster_confirmed: Boolean,
    travel_booked: Boolean,
    academic_cleared: Boolean,
    coach_notes_prepared: Boolean
  }
}
```

**Note:** `capturedNotes` is NOT stored in the events collection. Event notes are in the `event_notes` collection (Phase 1). The in-memory merge happens at load time.

### Read paths to update
| Module | Function | Current access pattern |
|--------|----------|----------------------|
| `server.py` | `GET /api/events/home` | `get_all_events()` → iterates UPCOMING_EVENTS |
| `server.py` | Mission Control | `UPCOMING_EVENTS` directly |
| `event_engine.py` | `get_event()` | `next(e for e in UPCOMING_EVENTS if e["id"] == id)` |
| `event_engine.py` | `get_all_events()` | iterates UPCOMING_EVENTS |
| `event_engine.py` | `get_event_prep()` | `get_event()` + roster |
| `event_engine.py` | `get_event_summary()` | `get_event()` + capturedNotes |
| `advocacy_engine.py` | `get_event_context()` | iterates UPCOMING_EVENTS |
| `advocacy_engine.py` | `get_school_relationship()` | iterates UPCOMING_EVENTS |
| `support_pod.py` | `get_upcoming_events()` | filters UPCOMING_EVENTS by daysAway |
| `program_engine.py` | `compute_event_effectiveness()` | iterates UPCOMING_EVENTS |

### Write paths
| Endpoint | What happens |
|----------|-------------|
| `POST /api/events` | Appends new event to `UPCOMING_EVENTS` |
| `PATCH /api/events/{id}/checklist` | Updates checklist booleans |

### Implementation strategy
1. Seed `events` collection if empty from `mock_data.UPCOMING_EVENTS` (excluding `capturedNotes`)
2. On startup:
   a. Load events from MongoDB into `UPCOMING_EVENTS`
   b. Merge `capturedNotes` from `event_notes` collection into in-memory events (already done in Phase 1)
3. On `POST /api/events`: write to MongoDB AND append to in-memory
4. On checklist updates: write to MongoDB AND update in-memory
5. Persist `daysAway` on load but also re-derive it (it's relative to current date)

### Risk: MEDIUM
- Write path exists (event creation) — needs dual-write
- `capturedNotes` merge at startup is already working (Phase 1) but adds an ordering dependency: events must load before notes
- `daysAway` is a computed field — needs re-derivation on load
- Checklist persistence is optional (low user-value since prep checklists are ephemeral)

---

## Risks if Athletes and Events are Migrated Separately

### Acceptable risks (migrate separately)
- **Foreign key consistency:** Event `athlete_ids` references athlete IDs. If athletes are persisted first, the IDs are stable. If events are persisted first, they reference in-memory athlete IDs that reset — but the IDs are deterministic from mock_data, so they match.
- **Program Intelligence aggregation:** Reads from both ATHLETES and UPCOMING_EVENTS. Both are in-memory regardless of persistence source. No issue.

### Risks that require attention
- **Startup ordering:** If both are persisted, the startup sequence matters:
  1. Load athletes from DB
  2. Load events from DB
  3. Merge event notes from DB into events (Phase 1 logic)
  4. Compute interventions (Decision Engine)
  The dependency chain is: athletes → events → event_notes → interventions. This must be sequential in the startup handler.

- **Event-athlete ID alignment:** Mock data generates deterministic IDs (`athlete_0`, `event_0`). If the user creates real athletes later, we need a migration path. But for Phase 2, this is not a concern.

---

## Recommendation

**Step 1: Athletes** — implement in a single pass, zero risk, immediate value (durable athlete profiles)
**Step 2: Events** — implement after athletes are stable, moderate complexity from write path + notes merge
**Skip for now:** Schools (static, 10 entries, no user value in persisting), Interventions (computed, stateless)

### Expected outcome
After Phase 2, the only non-persistent objects will be:
- Schools (static data, low priority)
- Interventions (computed on startup, no persistence needed)
- Decision Engine state (derived, stateless)

All user-generated and user-visible core data will be durable.
