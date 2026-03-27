# Migration Log — CapyMatch Production Integrity Audit

## Sprint 0: P0 Fixes (Completed)

### Mock Data Removal — athlete_store.py + mission_control.py
| Field | Value |
|---|---|
| **Metric Domain** | Events, Momentum Signals, Program Snapshot |
| **Old Owner(s)** | `mock_data.UPCOMING_EVENTS`, `mock_data.generate_momentum_signals()`, `mock_data.get_program_snapshot()` |
| **New Canonical Owner** | `athlete_store._fetch_real_events()`, `athlete_store._build_real_momentum_signals()`, `athlete_store._build_real_program_snapshot()` |
| **Files Updated** | `services/athlete_store.py`, `routers/mission_control.py` |
| **Routes Impacted** | `GET /api/mission-control`, `GET /api/mission-control/snapshot`, `GET /api/mission-control/events`, `GET /api/mission-control/signals` |
| **UI Surfaces** | Coach Dashboard (myRoster, events, signals), Director Dashboard (snapshot, events, signals) |
| **Tests Added** | `/app/backend/tests/test_determinism_no_mock.py` (13 tests) |

### Decision Engine Determinism
| Field | Value |
|---|---|
| **Metric Domain** | Interventions, Priority Alerts, Needing Attention |
| **Old Owner(s)** | `decision_engine.py` with `random.random()` in 4 detectors |
| **New Canonical Owner** | `decision_engine.py` with deterministic data-driven conditions |
| **Files Updated** | `decision_engine.py` |
| **Routes Impacted** | All mission control endpoints (via athlete_store._recompute_derived) |
| **Tests Added** | Determinism verified in test_determinism_no_mock.py |

---

## Sprint 1A: P1 Mock Data Removal (Completed)

### Events System — event_engine.py
| Field | Value |
|---|---|
| **Metric Domain** | Events data |
| **Old Owner(s)** | `mock_data.UPCOMING_EVENTS` (3 hardcoded events), `mock_data.SCHOOLS` (10 hardcoded schools) |
| **New Canonical Owner** | `db.events` collection, `db.university_knowledge_base` collection |
| **Files Updated** | `event_engine.py` (fully rewritten), `routers/events.py`, `server.py` (startup init) |
| **Routes Impacted** | `GET /api/events`, `GET /api/events/{id}`, `GET /api/events/schools/available`, all event sub-routes |
| **UI Surfaces** | Events page, Event prep view, School search in events |
| **Tests Added** | `/app/backend/tests/test_p1_mock_attention_ssot.py` |

### Intelligence/AI — intelligence.py
| Field | Value |
|---|---|
| **Metric Domain** | AI Briefing context (events + snapshot) |
| **Old Owner(s)** | `mock_data.UPCOMING_EVENTS`, `mock_data.get_program_snapshot()` |
| **New Canonical Owner** | `_fetch_real_events_for_intel()` (DB query), `_build_real_snapshot_for_intel()` (DB computation) |
| **Files Updated** | `routers/intelligence.py` |
| **Routes Impacted** | `POST /api/ai/briefing`, `POST /api/ai/suggested-actions`, `POST /api/ai/program-insights`, `GET /api/ai/coverage` |

### Digest — digest.py
| Field | Value |
|---|---|
| **Old Owner(s)** | `mock_data.UPCOMING_EVENTS` |
| **New Canonical Owner** | `db.events.find()` direct query |
| **Files Updated** | `routers/digest.py` |
| **Routes Impacted** | `POST /api/digest/generate` |

---

## Sprint 1B: Attention SSOT Unification (Completed)

### Per-Program Attention/Urgency/Priority
| Field | Value |
|---|---|
| **Metric Domain** | Attention score, tier, urgency, momentum, primaryAction, heroEligible |
| **Old Owner(s)** | `frontend/lib/computeAttention.js` (client-side scoring with 5 factors: coach signals, due dates, activity, stage, recap) |
| **New Canonical Owner** | `services/attention.py → compute_program_attention()` (backend, uses top_action_engine + program_metrics + program state) |
| **Files Updated** | `services/attention.py` (NEW), `routers/athlete_dashboard.py` (enrichment), `frontend/pages/athlete/PipelinePage.js` (consumption) |
| **Routes Impacted** | `GET /api/athlete/programs` (now includes `attention` field per program) |
| **UI Surfaces** | Pipeline Hero card, Priority Board, Kanban Board, Breakdown Drawer |
| **Frontend Change** | `computeAllAttention()` call removed. Frontend reads `program.attention` directly from backend. Sorting/filtering preserved. |
| **Tests Added** | 6 tests in test_p1_mock_attention_ssot.py (attention field structure, values, determinism) |

### Canonical Attention Input Sources
| Source | Purpose | Status |
|---|---|---|
| `services/top_action_engine.py` | Per-school action + priority (1-8 cascade) | Canonical, unchanged |
| `services/program_metrics.py` | Per-school health + engagement metrics | Canonical, unchanged |
| Program state | Due dates, journey_stage, signals, board_group | Read directly from DB |

---

## Sprint 2: Interaction Signals SSOT Unification (Completed)

### Canonical Interaction Signals
| Field | Value |
|---|---|
| **Metric Domain** | outreach_count, reply_count, has_coach_reply, days_since_activity, total_interactions, reply_rate, meaningful_interaction_count, engagement_freshness_label, engagement_trend, pipeline_health_state |
| **Old Owner(s)** | `athlete_dashboard._compute_signals_from_interactions()` (local computation per request, no caching), `athlete_dashboard._batch_signals()` (batch wrapper) |
| **New Canonical Owner** | `services/program_metrics.py → _compute_interaction_metrics()` (cached in `program_metrics` collection, recomputed on stale/missing) |
| **Files Updated** | `services/program_metrics.py` (added fields + `extract_signals()` + `batch_get_metrics()`), `routers/athlete_dashboard.py` (removed duplicate logic, delegated to `program_metrics`) |
| **Routes Impacted** | `GET /api/athlete/programs`, `GET /api/athlete/programs/{id}`, `GET /api/athlete/dashboard` |
| **UI Surfaces** | Pipeline (Hero, Kanban, Priority Board), Journey Page, Athlete Dashboard, School Intelligence Panel, Breakdown Drawer |
| **Frontend Change** | None — `program.signals` shape preserved. Frontend still reads `signals.outreach_count`, `signals.has_coach_reply`, etc. Same field names, now populated from canonical source. |
| **Backward Compat** | `extract_signals()` projects `program_metrics` into the old `signals` dict shape. No frontend changes needed. |
| **Invalidation** | `recompute_metrics()` called on `create_interaction`, `mark_as_replied`, `mark_follow_up_sent` to keep cache fresh. |

### Old → New Field Mapping
| Old Field (from `_compute_signals_from_interactions`) | New Canonical Field (from `program_metrics`) | Notes |
|---|---|---|
| `outreach_count` | `outreach_count` | Now cached, not recomputed per request |
| `reply_count` | `reply_count` | Same |
| `has_coach_reply` | `has_coach_reply` | Same |
| `last_outreach_date` | `last_outreach_date` | Same |
| `last_reply_date` | `last_reply_date` | Same |
| `days_since_outreach` | `days_since_outreach` | Same |
| `days_since_reply` | `days_since_reply` | Same |
| `days_since_activity` | `days_since_activity` (alias for `days_since_last_engagement`) | Same semantic, canonical field |
| `total_interactions` | `total_interactions` | Same |
| *(not available)* | `reply_rate` | NEW in signals via `extract_signals()` |
| *(not available)* | `meaningful_interaction_count` | NEW in signals |
| *(not available)* | `engagement_freshness_label` | NEW in signals |
| *(not available)* | `engagement_trend` | NEW in signals |
| *(not available)* | `pipeline_health_state` | NEW in signals |
| *(not available)* | `data_confidence` | NEW in signals |

### Functions Removed
| Function | File | Reason |
|---|---|---|
| `_compute_signals_from_interactions()` | `routers/athlete_dashboard.py` | Duplicate of `program_metrics._compute_interaction_metrics()` |
| `_batch_signals()` | `routers/athlete_dashboard.py` | Replaced by `program_metrics.batch_get_metrics()` + `extract_signals()` |

---

## Sprint 3: Stage/Progress Consolidation (Completed)

### Canonical Stage Model
| Field | Level | Owner | Semantics | Values |
|---|---|---|---|---|
| `recruiting_status` | Per-program | **User-set** (+ auto-corrections) | User's declared intent/state | `Not Contacted`, `Contacted`, `In Conversation`, `Campus Visit`, `Offer`, `Committed`, `Archived` |
| `pipeline_stage` | Per-program | **System-derived** (`stage_engine.py`) | Factual stage from recruiting_status + signals | `added`, `outreach`, `in_conversation`, `campus_visit`, `offer`, `committed`, `archived` |
| `board_group` | Per-program | **Derived** (never stored) | UI funnel bucket | `archived`, `overdue`, `in_conversation`, `waiting_on_reply`, `needs_outreach` |

### Stage Rank System
| Stage | Rank |
|---|---|
| `archived` | -1 |
| `added` | 0 |
| `outreach` | 1 |
| `in_conversation` | 2 |
| `campus_visit` | 3 |
| `offer` | 4 |
| `committed` | 5 |

### Rules Enforced
1. **No-downward-contradiction**: `pipeline_stage_rank >= base_stage_rank(recruiting_status)`. Always.
2. **Signal upgrades** (upgrade-only): `added + outreach_count > 0 → outreach`, `outreach + has_coach_reply → in_conversation`
3. **Stage locking**: `recruiting_status ∈ {In Conversation, Campus Visit, Offer, Committed} → pipeline_stage LOCKED to base`
4. **Auto-normalization** (write-time): `outreach_count > 0 AND "Not Contacted" → "Contacted"`, `has_coach_reply AND "Contacted" → "In Conversation"`
5. **Archived override**: `recruiting_status == "Archived" → pipeline_stage = "archived", board_group = "archived"`
6. **journey_stage writes blocked**: Stripped from PUT body, never written to DB

### Normalization Applied
| Legacy Value | Canonical Value | Programs Migrated |
|---|---|---|
| `Prospect` | `Not Contacted` | 8 |
| `Initial Contact` | `Contacted` | 9 |
| `Interested` | `In Conversation` | 4 |
| `Engaged` | `In Conversation` | 3 |
| Auto-correction (signals contradicted status) | Various | 9 |

### Files Created
| File | Purpose |
|---|---|
| `services/stage_engine.py` | Canonical stage computation (compute_pipeline_stage, compute_board_group, compute_journey_rail, compute_auto_corrections, normalize_recruiting_status) |

### Files Updated
| File | Change |
|---|---|
| `routers/athlete_dashboard.py` | Removed `categorize_program()`, `compute_journey_rail()`, imported from `stage_engine`. Added `normalize_recruiting_status` to `update_program`, stripped `journey_stage` from writes. Added `compute_auto_corrections` to interaction CRUD. |
| `routers/connected.py` | Imports from `stage_engine` instead of `athlete_dashboard` |
| `services/attention.py` | Uses `pipeline_stage` for stage weight instead of `journey_stage \|\| recruiting_status` |
| `services/top_action_engine.py` | Uses `pipeline_stage` for uncontacted check |
| `services/program_metrics.py` | Uses `_pipeline_stage` for health computation instead of `_journey_stage` |
| `services/athlete_store.py` | Canonical `STAGE_WEIGHTS` with normalized values |
| `routers/momentum_recap.py` | Delegates to `stage_engine.compute_pipeline_stage` |
| `routers/ai_features.py` | Delegates to `stage_engine.compute_pipeline_stage` |
| `routers/athlete_gmail.py` | New programs use canonical `recruiting_status` (no `journey_stage`) |
| `routers/athlete_gmail_intelligence.py` | Stage updates write to `recruiting_status` (upgrade-only) |
| `services/gmail_intelligence.py` | Reads `recruiting_status` instead of `journey_stage` |
| `intelligence/payload_builder.py` | Removed `journey_stage` from engagement payload |
| `intelligence/agents/timeline.py` | Removed `journey_stage` read |
| `intelligence/agents/school_insight.py` | Removed `journey_stage` from prompt |
| Frontend `pipeline-constants.js` | `programToKanbanCol()` uses `pipeline_stage` exclusively |
| Frontend `PipelinePage.js` | DnD handler writes `recruiting_status`, reads `pipeline_stage` |
| Frontend `JourneyPage.js` | Stage advance writes `recruiting_status` via `STAGE_TO_STATUS` map |
| Frontend `PipelineHero.js` | `buildRail()` uses `pipeline_stage` |
| Frontend `HeroCard.js` | Stage display uses `pipeline_stage` |
| Frontend `PipelineList.js` | Sorting/display uses `pipeline_stage` |

### Functions Removed
| Function | File | Reason |
|---|---|---|
| `categorize_program()` | `routers/athlete_dashboard.py` | Replaced by `stage_engine.compute_board_group()` |
| `compute_journey_rail()` | `routers/athlete_dashboard.py` | Replaced by `stage_engine.compute_journey_rail()` |

---

## Remaining Work

### P2 Mock Data (Backlog)
- `support_pod.py` — UPCOMING_EVENTS
- `advocacy_engine.py` — UPCOMING_EVENTS, SCHOOLS
- `program_engine.py` — UPCOMING_EVENTS

### P3 Mock Data (Low)
- `routers/admin.py` — SCHOOLS

### journey_stage Full Removal (Deferred)
- Field still exists in DB documents but is never written to or read from production paths
- Full removal requires data migration (drop field from all program docs)
- Scheduled for post-Sprint 3 cleanup
