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

## Remaining Work

### P2 Mock Data (Backlog)
- `support_pod.py` — UPCOMING_EVENTS
- `advocacy_engine.py` — UPCOMING_EVENTS, SCHOOLS
- `program_engine.py` — UPCOMING_EVENTS

### P3 Mock Data (Low)
- `routers/admin.py` — SCHOOLS

### Refactor Sprint 2 — Interaction Signals (Next)
- `athlete_dashboard._compute_signals_from_interactions()` → delegate to `program_metrics`
- Unify engagement/reply/freshness views

### Refactor Sprint 3 — Stage/Progress Consolidation (Future)
- Consolidate 5 parallel stage systems to 2 canonical fields
