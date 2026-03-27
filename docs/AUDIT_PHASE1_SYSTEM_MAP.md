# Phase 1 — System Map: CapyMatch Production Integrity Audit

## 1. High-Level Architecture

```
                    +-----------------+
                    |    MongoDB      |
                    | (Source of      |
                    |  Truth: Data)   |
                    +--------+--------+
                             |
          +------------------+------------------+
          |                  |                  |
   +------v------+   +------v------+   +------v------+
   | athlete_    |   | program_    |   | decision_   |
   | store.py    |   | metrics.py  |   | engine.py   |
   | (Cache+     |   | (Per-school |   | (Interven-  |
   |  Derived)   |   |  metrics)   |   |  tions)     |
   +------+------+   +------+------+   +------+------+
          |                  |                  |
          |           +------v------+           |
          |           | top_action_ |           |
          |           | engine.py   |<----------+
          |           | (Top action |
          |           |  per school)|
          |           +------+------+
          |                  |
   +------v------+   +------v------+
   | unified_    |   | FE: compute |
   | status.py   |   | Attention.js|
   | (Journey +  |   | (Client-side|
   |  Attention) |   |  re-scoring)|
   +------+------+   +------+------+
          |                  |
   +------v------+   +------v------+
   | mission_    |   | athlete_    |
   | control.py  |   | dashboard.py|
   | (Coach/Dir  |   | (Athlete    |
   |  Dashboard) |   |  Pipeline)  |
   +------+------+   +------+------+
          |                  |
          +--------+---------+
                   |
            +------v------+
            |   React     |
            |   Frontend  |
            +-------------+
```

---

## 2. Backend Services — Metric Computation Sources

### 2.1 `services/athlete_store.py` — Central Data Access + Derived Data Cache

**Role**: All athlete reads. MongoDB is the source of truth. Redis provides shared cache.

**Primary reads**:
- `get_all()` → All athletes from `db.athletes` (cached in Redis)
- `get_by_id(athlete_id)` → Single athlete

**Derived data** (computed in `_recompute_derived()`):
| Derived Key | Computed By | Source |
|---|---|---|
| `interventions` | `decision_engine.detect_all_interventions()` | Athletes + **MOCK** UPCOMING_EVENTS |
| `priority_alerts` | `decision_engine.get_priority_alerts()` | Interventions (score >= 70) |
| `needing_attention` | `decision_engine.get_athletes_needing_attention()` | Interventions (score >= 50) |
| `momentum_signals` | **`mock_data.generate_momentum_signals()`** | Athletes (but generates FAKE signals) |
| `program_snapshot` | **`mock_data.get_program_snapshot()`** | Athletes (computes counts from real data with mock logic) |

**CRITICAL ISSUE**: Lines 118-119 import from `mock_data.py`:
```python
from mock_data import UPCOMING_EVENTS, generate_momentum_signals, get_program_snapshot
```

**Internal helpers**:
- `_recompute_time_fields()` — recalculates `days_since_activity` from stored timestamps
- `_compute_pipeline_momentum()` — computes `pipeline_momentum`, `pipeline_best_stage`, `momentum_score` from `db.programs` stage weights

---

### 2.2 `services/unified_status.py` — Journey State + Attention Status

**Role**: Two independent status dimensions per athlete:
- **Journey State**: recruiting progress (always positive/stable), derived from `pipeline_best_stage`
- **Attention Status**: most urgent action needed, derived from urgency-scored signals

**Signal sources** (collected in `mission_control._compute_unified_statuses()`):
1. Decision engine interventions → `normalize_decision_engine_signal()`
2. School-level health alerts → `normalize_school_alert_signal()` (from `school_pod.classify_school_health()`)
3. Active pod_issues → `normalize_pod_issue_signal()`

**Algorithm**: Signals are scored by 4-dimension urgency formula (severity 40%, time_sensitivity 30%, opportunity_cost 20%, pipeline_impact 10%). Highest-scoring signal becomes primary attention status.

**Consumers**: `mission_control.py` only (coach/director dashboard)

---

### 2.3 `decision_engine.py` — Intervention Detection

**Role**: Detects 7 intervention categories per athlete.

| Category | Trigger | Deterministic? |
|---|---|---|
| `momentum_drop` | Low pipeline_momentum + inactivity | YES |
| `blocker` | Missing docs (2025 grads with archetype) | PARTIALLY (random.random() for support_pod_gap) |
| `deadline_proximity` | Event <=2 days, no prep | NO (random.random() < 0.25) |
| `engagement_drop` | Inactive 7-20 days | NO (random.random() with thresholds) |
| `ownership_gap` | >=3 active_interest schools | NO (random.random() with thresholds) |
| `readiness_issue` | 2025 grad with <4 targets | YES |
| `event_follow_up` | Hot/warm interest note, stale follow-ups | YES |

**CRITICAL ISSUE**: 4 of 7 detectors use `random.random()`. Same athlete can produce different interventions on each API call. This is fundamentally incompatible with SSOT.

**Consumers**: `athlete_store._recompute_derived()` → cached in Redis/local memory

---

### 2.4 `services/top_action_engine.py` — Top Action per School

**Role**: Deterministic rules engine. One action per program, priority 1 (coach flags) to 8 (no action needed).

**Data sources** (all from MongoDB):
- `db.coach_flags` (priority 1)
- `db.pod_actions` (priority 2)
- `db.director_actions` (priority 3)
- `programs.next_action_due` (priority 4-6)
- `services/program_metrics.get_metrics()` (priority 5, 7)
- `programs.journey_stage / recruiting_status / board_group` (priority 6)

**Consumers**: `routers/program_metrics.py` router → Frontend PipelinePage

---

### 2.5 `services/program_metrics.py` — Per-Program Derived Metrics

**Role**: Computes and caches school-level recruiting metrics.

**Computed metrics**:
- reply_rate, median_response_time_hours
- meaningful_interaction_count, days_since_last_meaningful_engagement
- engagement_freshness_label, engagement_trend
- stage_velocity, stage_stalled_days, overdue_followups
- pipeline_health_state (5 states: strong_momentum → at_risk)
- coach_flag_count, director_action_count
- data_confidence (HIGH/MEDIUM/LOW)

**Stored in**: `db.program_metrics` (cached, max_age 6 hours)

**Consumers**: top_action_engine, unified_status (indirectly via school_pod.classify_school_health), program_metrics router

---

### 2.6 `mock_data.py` — Mock Data (SHOULD NOT BE IN PRODUCTION PATH)

**What it provides at runtime**:
- `UPCOMING_EVENTS` — 3 hardcoded events with relative dates (daysAway: -6, 2, 8)
- `generate_momentum_signals(athletes)` — Creates 8 fake "what changed today" signals
- `get_program_snapshot(athletes)` — Computes program-wide aggregates

**Who imports it at runtime**:
1. `athlete_store.py` line 118 — Uses all three
2. `mission_control.py` lines 23-26 — Uses UPCOMING_EVENTS, get_program_snapshot

---

## 3. Backend Routers — API Layer

### 3.1 `routers/mission_control.py` — Coach/Director Dashboard

**Endpoint**: `GET /api/mission-control`

**Data pipeline (Coach role)**:
```
1. get_athletes() → filtered by ownership
2. get_alerts(), get_signals(), get_needing_attention() → from athlete_store derived data
3. UPCOMING_EVENTS → MOCK data (hardcoded)
4. _build_coach_response() → builds myRoster, todays_summary
5. _compute_unified_statuses(roster) → enriches each athlete with:
   - journey_state (from unified_status.compute_journey_state)
   - attention_status (from unified_status.derive_attention_status)
   - school_alerts count
6. Recount needing_action from attention_status
7. Build summary_lines and priorities
```

**Data pipeline (Director role)**:
```
1. get_snapshot() → from athlete_store derived (mock_data.get_program_snapshot)
2. _compute_trends() → from historical snapshots
3. UPCOMING_EVENTS → MOCK data
4. Recruiting signals → from db.event_notes, db.recommendations
5. Coach health → from db.users
6. Escalations → from db.director_actions
```

**Sub-endpoints**:
- `GET /api/mission-control/alerts` → get_alerts()
- `GET /api/mission-control/signals` → get_signals() (MOCK momentum signals!)
- `GET /api/mission-control/athletes` → get_needing_attention()
- `GET /api/mission-control/events` → MOCK UPCOMING_EVENTS
- `GET /api/mission-control/snapshot` → get_snapshot() / get_program_snapshot()

### 3.2 `routers/athlete_dashboard.py` — Athlete Pipeline + CRUD

**Key endpoints**:
- `GET /api/athlete/programs` — Lists all programs with signals, board_group, journey_rail
- `GET /api/athlete/dashboard` — Aggregated athlete home page
- `GET /api/coach-watch/{program_id}` — Coach Watch relationship intelligence

**OWN signal computation** (does NOT use program_metrics.py):
- `_compute_signals_from_interactions()` — Computes outreach_count, reply_count, has_coach_reply, days_since_*
- `categorize_program()` — 5-stage funnel: archived, overdue, in_conversation, waiting_on_reply, needs_outreach
- `compute_journey_rail()` — 6-stage rail: added, outreach, in_conversation, campus_visit, offer, committed
- `_compute_coach_watch()` — 10-state relationship matrix with scoring

### 3.3 `routers/program_metrics.py` — Internal Metrics API

**Endpoints**:
- `POST /api/internal/programs/batch-metrics` — Batch fetch metrics
- `GET /api/internal/programs/{id}/metrics` — Single program metrics
- `POST /api/internal/programs/{id}/recompute-metrics` — Force recompute
- `POST /api/internal/programs/recompute-all` — Admin: recompute all
- `GET /api/internal/programs/top-actions` — All top actions for tenant
- `GET /api/internal/programs/{id}/top-action` — Single top action

---

## 4. Frontend — Metric Consumers

### 4.1 `lib/computeAttention.js` — Client-Side Attention Scoring

**Role**: Re-scores and classifies every program client-side.

**Inputs**: 
- `program` — from `GET /api/athlete/programs`
- `topAction` — from `GET /api/internal/programs/top-actions`
- `recapCtx` — from Momentum Recap data

**Output fields**:
- `attentionScore` (0-200+): Weighted sum of coach signals, due dates, activity, stage, recap boosts
- `tier` (high/medium/low): Classification
- `heroEligible`: Boolean — shows in hero carousel
- `urgency` (critical/soon/monitor): Placement signal
- `momentum` (cooling/steady/building): Tone signal
- `primaryAction`: Verb-first text ("Follow up with X now")
- `reason`, `reasonShort`, `heroReason`: Context lines
- `ctaLabel`: Button text
- `riskContext`: Risk warning for high-urgency items

**Consumer**: `pages/athlete/PipelinePage.js` (Hero card, Priority Board, Kanban, Coming Up)

---

## 5. Identified SSOT Violations

### VIOLATION 1: Mock Data in Production

| File | Import | Impact |
|---|---|---|
| `athlete_store.py:118` | `UPCOMING_EVENTS` | Decision engine interventions use fake events |
| `athlete_store.py:118` | `generate_momentum_signals()` | "Recent activity" signals are entirely fabricated |
| `athlete_store.py:118` | `get_program_snapshot()` | Program snapshot uses mock aggregation logic |
| `mission_control.py:23` | `UPCOMING_EVENTS` | Coach/Director see fake events |
| `mission_control.py:24` | `get_program_snapshot()` | Coach snapshot endpoint uses mock logic |

### VIOLATION 2: Nondeterministic Decision Engine

`decision_engine.py` uses `random.random()` in detectors for engagement_drop, ownership_gap, deadline_proximity, and blocker (support_pod_gap variant). The same athlete will generate different interventions on each API call, making dashboard data unstable.

### VIOLATION 3: Duplicate Metric Computation

| Metric Domain | Backend Location | Frontend Location | Agreement? |
|---|---|---|---|
| Attention/Priority | `unified_status.derive_attention_status()` | `computeAttention()` | NO — completely different algorithms |
| Pipeline Health | `program_metrics._compute_pipeline_health()` | `computeAttention().momentum` | NO — different inputs and thresholds |
| Board Grouping | `athlete_dashboard.categorize_program()` | `computeAttention().tier` | NO — different classification |
| Journey Stage | `unified_status.compute_journey_state()` | `computeAttention()` (uses journey_stage directly) | PARTIAL — different label mapping |
| "Needs Outreach" | `athlete_dashboard.categorize_program()` | `computeAttention()` (checks board_group) | YES — frontend consumes backend value |

### VIOLATION 4: Split Signal Computation

Two independent systems compute interaction-derived signals:

| System | Location | Used By |
|---|---|---|
| System A | `athlete_dashboard._compute_signals_from_interactions()` | Athlete pipeline (programs list, dashboard) |
| System B | `program_metrics._compute_interaction_metrics()` + `_compute_meaningful_engagement()` | Top action engine, school health, unified status |

These produce DIFFERENT metrics from the SAME raw interaction data. System B is more sophisticated (has meaningful engagement rules), while System A is simpler (basic outreach/reply counting).

### VIOLATION 5: Multiple Stage/Progress Tracking Systems

| Field | Collection | Who Sets It | Who Reads It |
|---|---|---|---|
| `recruiting_status` | `programs` | User (manual) + automation | athlete_dashboard, top_action_engine, program_metrics |
| `journey_stage` | `programs` | User (manual) | athlete_dashboard.compute_journey_rail(), computeAttention.js |
| `board_group` | Computed | `athlete_dashboard.categorize_program()` | Frontend pipeline views |
| `pipeline_best_stage` | `athletes` | `athlete_store._compute_pipeline_momentum()` | `unified_status.compute_journey_state()` |
| `recruiting_stage` | `athletes` | Mock data / seed | `decision_engine` detectors |

---

## 6. Data Flow — End to End

### Flow A: Coach Dashboard Metric
```
MongoDB (athletes, programs, program_metrics, pod_issues)
  → athlete_store.get_all() (computes pipeline_momentum, pipeline_best_stage)
  → decision_engine.detect_all_interventions(athlete, MOCK_EVENTS)  [NONDETERMINISTIC]
  → athlete_store caches: interventions, alerts, needing_attention
  → mission_control._build_coach_response()
    → builds roster items with intervention category
  → mission_control._compute_unified_statuses()
    → unified_status.compute_journey_state(athlete)  [from pipeline_best_stage]
    → unified_status.derive_attention_status(signals)  [from decision_engine + school_health + pod_issues]
  → API response: myRoster[].journey_state, myRoster[].attention_status
  → Frontend renders directly (NO client-side recomputation for coach view)
```

### Flow B: Athlete Pipeline Metric
```
MongoDB (programs, interactions, college_coaches)
  → athlete_dashboard.list_programs()
    → _batch_signals() [OWN interaction computation]
    → categorize_program() [OWN board grouping]
    → compute_journey_rail() [OWN journey computation]
  + program_metrics router: compute_all_top_actions()
    → top_action_engine reads: coach_flags, pod_actions, director_actions, program_metrics
  → Frontend PipelinePage.js
    → computeAllAttention(programs, topActionsMap, recapCtx)  [CLIENT-SIDE RE-SCORING]
    → Produces: attentionScore, tier, heroEligible, urgency, etc.
    → Drives: Hero card, Priority Board, Kanban, Coming Up
```

---

## 7. Collections Used

| Collection | Domain | Primary Writers | Primary Readers |
|---|---|---|---|
| `athletes` | Core profiles | seed, onboarding | athlete_store, mission_control, unified_status |
| `programs` | School relationships | athlete_dashboard CRUD | athlete_dashboard, program_metrics, top_action_engine |
| `interactions` | Communication log | athlete_dashboard CRUD | athlete_dashboard, program_metrics |
| `program_metrics` | Derived metrics cache | program_metrics service | top_action_engine, unified_status (indirect) |
| `coach_flags` | Coach-to-athlete flags | coach_flags router | top_action_engine, program_metrics |
| `director_actions` | Director requests | director_actions router | top_action_engine, mission_control |
| `pod_issues` | Active support issues | school_pod router | unified_status |
| `pod_actions` | Support pod action items | school_pod router | top_action_engine |
| `program_stage_history` | Stage change log | athlete_dashboard | program_metrics |
| `program_signals` | Active program signals | various | program_metrics |
| `coach_watch_states` | Relationship state tracking | athlete_dashboard | athlete_dashboard |
| `program_snapshots` | Historical snapshots | startup/periodic | mission_control trends |

---

## 8. Summary of Critical Risks

| # | Risk | Severity | Impact |
|---|---|---|---|
| 1 | Mock data in production path | CRITICAL | Fake events, fake signals, fake snapshot shown to real users |
| 2 | Nondeterministic decision engine | CRITICAL | Dashboard data changes on every page load |
| 3 | Frontend recomputes backend metrics | HIGH | Coach view and Athlete view can show contradictory urgency for same school |
| 4 | Two independent signal computation systems | HIGH | Same interactions produce different metrics in different views |
| 5 | Five parallel stage/progress tracking systems | MEDIUM | Confusion about which is authoritative |

---

*Generated: Phase 1 of CapyMatch Production Integrity Audit*
*Next: Phase 2 — API Inventory*
