# Phase 3 — Source of Truth Audit: CapyMatch Production Integrity Audit

## Deliverable A: Source-of-Truth Matrix

For each critical metric, the full end-to-end trace:

---

### METRIC 1: attention_status (Coach Dashboard)

| Layer | Detail |
|---|---|
| **DB Fields** | `athletes.*` (via athlete_store), `programs.*`, `program_metrics.*`, `pod_issues.*`, `coach_flags.*` |
| **Backend Service** | `unified_status.derive_attention_status()` |
| **Computation** | 1. Collect signals from 3 sources: decision_engine interventions, school_health (via school_pod.classify_school_health), active pod_issues. 2. Normalize each via `normalize_*_signal()` functions. 3. Score each signal by 4-dimension urgency: severity(40%) + time_sensitivity(30%) + opportunity_cost(20%) + pipeline_impact(10%). 4. Highest-scoring signal wins → becomes primary attention status. |
| **API Endpoint** | `GET /api/mission-control` (embedded in myRoster[].attention_status) |
| **Frontend Consumer** | `MissionControlPage.js` — renders label, color, bg directly from backend |
| **Re-computation** | NONE in frontend (coach view renders backend values directly) |
| **Output Shape** | `{ primary: { label, color, bg, reason, nature, score }, secondary: [...], total_issues }` |
| **Labels** | Blocker, Urgent Follow-up, At Risk, Needs Review, All Clear |
| **Canonical?** | YES — This is the canonical attention/urgency system for coach view |

---

### METRIC 2: urgency + tier + attentionScore (Athlete Pipeline)

| Layer | Detail |
|---|---|
| **DB Fields** | `programs.next_action_due`, `programs.journey_stage`, `programs.board_group`, `programs.signals.*` (computed by athlete_dashboard), top_action (from top_action_engine) |
| **Backend Service** | NONE — this is computed entirely in the frontend |
| **Frontend Service** | `computeAttention.js → computeAttention()` |
| **Computation** | 1. Score = sum of: coach_signals(0-100), due_date(0-80), activity(0-40), stage(0-15), recap_boost(0-65). 2. Hard triggers: overdue, dueSoon, coachFlag, escalation. 3. tier = high(>=80 or hard trigger)/medium(>=40)/low. 4. urgency = critical/soon/monitor. 5. momentum = cooling(7d+)/steady(3-7d)/building(<3d). |
| **API Endpoint** | Consumes `GET /api/athlete/programs` + `GET /api/internal/programs/top-actions` |
| **Frontend Consumer** | `PipelinePage.js` — Hero card, Priority Board, Kanban cards, Coming Up |
| **Re-computation** | FULL client-side recomputation. Backend provides raw data; frontend re-scores everything. |
| **Output Shape** | `{ attentionScore, tier, heroEligible, urgency, momentum, primaryAction, reason, ctaLabel, ... }` |
| **Labels** | high/medium/low (tier), critical/soon/monitor (urgency), cooling/steady/building (momentum) |
| **Canonical?** | NO — This is a DUPLICATE attention system, independent from unified_status |

---

### METRIC 3: riskScore + severity + trajectory (Coach/Director Inbox)

| Layer | Detail |
|---|---|
| **DB Fields** | `programs.recruiting_status`, `programs.next_action_due`, `athletes.days_since_activity`, `director_actions.*`, `interactions.*` |
| **Backend Service** | `risk_engine.evaluate_risk()` |
| **Computation** | 1. issue_keys collected from program state (no_activity, awaiting_reply, stalled_stage, etc.). 2. Base score from SIGNAL_BASE_SCORE map. 3. Stage multiplier (Offer=1.5x, Added=0.8x). 4. Compound interaction rules (up to 1.5x). 5. Time decay boost for old issues. 6. Severity band: critical(76+)/high(56+)/medium(31+)/low. 7. Trajectory: improving/stable/worsening. 8. Intervention type from (severity, trajectory) matrix. |
| **API Endpoint** | `GET /api/coach-inbox`, `GET /api/director-inbox` |
| **Frontend Consumer** | Coach Inbox page, Director Inbox page |
| **Re-computation** | NONE in frontend (renders backend values directly) |
| **Output Shape** | `{ riskScore, severity, trajectory, confidence, interventionType, whyNow, recommendedActionByRole }` |
| **Labels** | critical/high/medium/low (severity), blocker/escalate/review/nudge/monitor (intervention) |
| **Canonical?** | NO — This is a THIRD independent urgency/priority system |

---

### METRIC 4: top_action (Per-School Action)

| Layer | Detail |
|---|---|
| **DB Fields** | `coach_flags.*`, `pod_actions.*`, `director_actions.*`, `programs.next_action_due`, `programs.journey_stage`, `programs.recruiting_status`, `program_metrics.*` |
| **Backend Service** | `services/top_action_engine.py → compute_top_action()` |
| **Computation** | Deterministic priority cascade (1=coach_flag → 8=no_action_needed). First match wins. Checks: coach flags, pod actions, director actions, overdue follow-ups, engagement staleness, first outreach needed, pipeline health cooling, no action needed. |
| **API Endpoint** | `GET /api/internal/programs/top-actions`, `GET /api/internal/programs/{id}/top-action` |
| **Frontend Consumer** | `PipelinePage.js` → feeds into `computeAttention.js` as input |
| **Re-computation** | Frontend does NOT recompute top_action itself, but uses it as INPUT to compute urgency/tier/attention (re-derivation). |
| **Output Shape** | `{ priority, action_key, action, reason, cta_label, owner, category, ... }` |
| **Canonical?** | YES — Canonical "what to do next" per school. But frontend re-interprets the result. |

---

### METRIC 5: board_group (Athlete Pipeline Kanban)

| Layer | Detail |
|---|---|
| **DB Fields** | `programs.is_active`, `programs.next_action_due`, `programs.signals.has_coach_reply`, `programs.signals.outreach_count` |
| **Backend Service** | `athlete_dashboard.categorize_program()` |
| **Computation** | Sequential rules: 1. `!is_active` → archived. 2. `next_action_due < today` → overdue. 3. `has_coach_reply` → in_conversation. 4. `outreach_count > 0` → waiting_on_reply. 5. Default → needs_outreach. |
| **API Endpoint** | `GET /api/athlete/programs` (embedded in each program) |
| **Frontend Consumer** | `PipelinePage.js` Kanban columns; also used by `computeAttention.js` as stage fallback |
| **Re-computation** | Frontend reads board_group directly but computeAttention.js uses it as fallback for journey_stage mapping |
| **Output Shape** | String: `"archived" | "overdue" | "in_conversation" | "waiting_on_reply" | "needs_outreach"` |
| **Canonical?** | YES — Canonical board grouping. But overlaps conceptually with journey_rail and recruiting_status. |

---

### METRIC 6: journey_stage / journey_rail (Athlete Journey View)

| Layer | Detail |
|---|---|
| **DB Fields** | `programs.journey_stage` (manual), `programs.signals.outreach_count`, `programs.signals.has_coach_reply` |
| **Backend Service** | `athlete_dashboard.compute_journey_rail()` |
| **Computation** | 6 stages: added → outreach → in_conversation → campus_visit → offer → committed. Auto-detects: outreach(outreach_count>0), in_conversation(has_coach_reply). Manual override cascades (setting "campus_visit" fills all prior stages). Pulse: hot(<=7d)/warm(<=14d)/cold(>14d). |
| **API Endpoint** | `GET /api/athlete/programs` (embedded in journey_rail), `GET /api/athlete/programs/{id}/journey` |
| **Frontend Consumer** | Journey page, Progress rail component |
| **Re-computation** | Frontend reads directly. computeAttention.js reads journey_stage for stage bonus scoring. |
| **Output Shape** | `{ stages: {added: true, outreach: true, ...}, active: "outreach", pulse: "hot" }` |
| **Canonical?** | YES for athlete journey UI — but journey_stage input overlaps with recruiting_status |

---

### METRIC 7: journey_state (Coach Dashboard)

| Layer | Detail |
|---|---|
| **DB Fields** | `athletes.pipeline_best_stage` (derived by athlete_store._compute_pipeline_momentum) |
| **Backend Service** | `unified_status.compute_journey_state()` |
| **Computation** | Direct lookup: `JOURNEY_STATE_MAP[pipeline_best_stage]`. Maps: Committed→"Committed", Offer→"Offer Received", Campus Visit→"Visiting Schools", Interested/In Conversation/Engaged→"Building Interest", Contacted/Initial Contact→"Reaching Out". Default→"Getting Started". |
| **API Endpoint** | `GET /api/mission-control` (embedded in myRoster[].journey_state) |
| **Frontend Consumer** | `MissionControlPage.js` — renders label, color directly |
| **Re-computation** | NONE (frontend renders directly) |
| **Output Shape** | `{ label, color, bg, rank }` |
| **Canonical?** | YES for coach view of journey. But pipeline_best_stage is derived from recruiting_status via STAGE_WEIGHTS |

---

### METRIC 8: recruiting_status / pipeline_best_stage (Progress Tracking)

| Layer | Detail |
|---|---|
| **DB Fields** | `programs.recruiting_status` (manual, per-school), `athletes.pipeline_best_stage` (derived, per-athlete) |
| **Backend Services** | `recruiting_status`: Written by user via CRUD endpoints. `pipeline_best_stage`: Computed by `athlete_store._compute_pipeline_momentum()` from max STAGE_WEIGHTS across all programs. |
| **Computation** | STAGE_WEIGHTS: Not Contacted=5, Prospect=10, Initial Contact=20, Contacted=25, Interested=35, In Conversation=40, Engaged=45, Campus Visit=60, Visit Scheduled=60, Visit=60, Offer=80, Committed=100. pipeline_best_stage = recruiting_status with highest weight. |
| **API Endpoints** | programs CRUD, `/api/mission-control`, `/api/roster`, `/api/athlete/programs` |
| **Frontend Consumers** | Everywhere — Pipeline, Mission Control, Roster, Coach Inbox |
| **Re-computation** | Frontend does NOT recompute. But: momentum_recap._classify_momentum() maps recruiting_status → stage via its OWN `status_to_stage` dict. computeAttention.js maps board_group → stage via its OWN `stageMap`. |
| **Canonical?** | `recruiting_status` = canonical user-set per-school status. `pipeline_best_stage` = canonical derived per-athlete progress. But 3 other systems re-map these differently. |

---

### METRIC 9: momentum / pipeline_health / momentum_category

| Layer | Detail |
|---|---|
| **DB Fields** | `athletes.pipeline_momentum` (0-100), `program_metrics.pipeline_health_state` (per-school), `interactions.*` |
| **Backend Services** | A: `athlete_store._compute_pipeline_momentum()` → per-athlete 0-100. B: `program_metrics._compute_pipeline_health()` → per-school 5-state. C: `momentum_recap._classify_momentum()` → per-school 3-category. |
| **Frontend Service** | D: `computeAttention.js` → per-school `momentum` field (cooling/steady/building) |

**Computation details:**

| System | Input | Algorithm | Output |
|---|---|---|---|
| A: athlete_store | All programs' recruiting_status | Max stage weight + breadth bonus | 0-100 integer |
| B: program_metrics | Meaningful engagement recency, trend, depth, overdue, unanswered questions, velocity | 7-factor scoring → map to 5 states (with still_early/awaiting_reply overrides) | strong_momentum / active / needs_follow_up / cooling_off / at_risk / still_early / awaiting_reply |
| C: momentum_recap | Interactions in period vs before, has_coach_reply, has_visit, reply_status | Rule-based heated/cooling detection | heated_up / holding_steady / cooling_off |
| D: computeAttention.js | days_since_activity only | Simple threshold: >=7d→cooling, >=3d→steady, <3d→building | cooling / steady / building |

| API Endpoint | Exposed By |
|---|---|
| `/api/mission-control` | pipeline_momentum (athlete-level, from A) |
| `/api/internal/programs/{id}/metrics` | pipeline_health_state (school-level, from B) |
| `/api/athlete/momentum-recap` | category per school (from C) |
| Client-side only | momentum per school (from D) |

**Canonical?** | NO — Four independent systems. B (program_metrics) is the most sophisticated. |

---

### METRIC 10: interaction_signals (Engagement Data)

| Layer | Detail |
|---|---|
| **DB Fields** | `interactions.*` (type, date_time, initiated_by, coach_question_detected, request_type, invite_type, offer_signal, scholarship_signal, response_time_hours, is_meaningful) |

**Two computation systems:**

| System | Location | Output Fields | Used By |
|---|---|---|---|
| A: athlete_dashboard | `_compute_signals_from_interactions()` | outreach_count, reply_count, has_coach_reply, days_since_outreach, days_since_reply, days_since_activity, total_interactions | Athlete pipeline, journey_rail, board_group, computeAttention.js (via days_since_activity) |
| B: program_metrics | `_compute_interaction_metrics()` + `_compute_meaningful_engagement()` + `_compute_engagement_trend()` | reply_rate, median_response_time_hours, meaningful_interaction_count, days_since_last_engagement, unanswered_coach_questions, engagement_freshness_label, engagement_trend | top_action_engine, school_health, pipeline_health_state, unified_status (indirect) |

**Key differences:**
- System A counts ALL interactions as outreach (except coach_reply and email_received)
- System B differentiates outbound vs inbound by type AND `initiated_by` field
- System A has no concept of "meaningful engagement"
- System B has a sophisticated 4-rule meaningful engagement classifier
- System A has `has_coach_reply` (boolean); System B has `reply_rate` (ratio) and `meaningful_interaction_count`
- System A computes `days_since_activity` from ANY interaction; System B computes `days_since_last_engagement` from most recent interaction only

**Conflict Example:** A school with 5 athlete emails and 1 coach_reply:
- System A: outreach_count=5, reply_count=1, has_coach_reply=true → "in_conversation"
- System B: reply_rate=0.2, meaningful_interaction_count=1 (only the coach_reply qualifies) → "needs_follow_up" or "cooling_off" depending on recency

**Canonical?** | System B (program_metrics) is more sophisticated and should be canonical. System A should delegate to program_metrics or be replaced. |

---

### METRIC 11: reply_rate / engagement (Per-School Engagement)

| Layer | Detail |
|---|---|
| **DB Fields** | `interactions.*` |
| **Backend Service** | `program_metrics._compute_interaction_metrics()` |
| **Computation** | reply_rate = inbound_count / outbound_count. median_response_time_hours from response_time_hours field. |
| **API Endpoint** | `POST /api/internal/programs/batch-metrics`, `GET /api/internal/programs/{id}/metrics` |
| **Frontend Consumer** | School Pod, Top Action Engine (indirect) |
| **Overlap** | `GET /api/athlete/engagement/{program_id}` (athlete_dashboard) computes its OWN engagement metrics from same interaction data |
| **Canonical?** | YES — program_metrics is canonical. athlete_dashboard engagement endpoint is DUPLICATE. |

---

### METRIC 12: summary_snapshot (Dashboard Counts)

| Layer | Detail |
|---|---|
| **DB Fields** | `athletes.*` (count, pipeline_momentum, days_since_activity, pipeline_best_stage, grad_year), `events.*` |
| **Backend Service** | `athlete_store._build_real_program_snapshot()` |
| **Computation** | totalAthletes=count, byStage=groupby(pipeline_best_stage), byGradYear=groupby(grad_year), needingAttention=count(days_since_activity>7 OR momentum<0.3), positiveMomentum=count(momentum>=0.6 AND days<=7), upcomingEvents=count(future events in DB) |
| **API Endpoint** | `GET /api/mission-control` (director: programSnapshot), `GET /api/mission-control/snapshot` |
| **Frontend Consumer** | Director dashboard summary cards |
| **Overlap** | `intelligence.py` still uses `mock_data.get_program_snapshot()` for AI briefing — MOCK DATA CONTAMINATION |
| **Canonical?** | YES — athlete_store is now canonical. intelligence.py must be migrated. |

---

### METRIC 13: events (Dashboard/Intelligence/Digest)

| Layer | Detail |
|---|---|
| **DB Fields** | `events.*` (date, name, type, status, athlete_ids, school_ids) |

**Three event systems:**

| System | Location | Source | Output |
|---|---|---|---|
| A: mission_control | `_fetch_real_events_for_mc()` | `db.events` (real) | Events with computed daysAway |
| B: event_engine | `event_engine.get_all_events()` | MOCK: `mock_data.UPCOMING_EVENTS` | Hardcoded events |
| C: athlete_dashboard | Direct DB query | `db.athlete_events` (real) | Athlete-specific events |

**Mock contamination chain:**
- `routers/events.py` → `event_engine.py` → `mock_data.UPCOMING_EVENTS` → 3 hardcoded events
- `routers/intelligence.py` → `mock_data.UPCOMING_EVENTS` directly → AI briefing uses fake events
- `routers/digest.py` → `mock_data.UPCOMING_EVENTS` directly → Digest uses fake events
- `support_pod.py` → `mock_data.UPCOMING_EVENTS` → Support pod shows fake events
- `advocacy_engine.py` → `mock_data.UPCOMING_EVENTS` → Advocacy uses fake events

**Canonical?** | `db.events` collection should be canonical. Systems A and C are correct. Systems B and all direct mock_data imports must migrate. |

---

## Deliverable B: Conflict Report

### CONFLICT 1: Attention / Urgency / Priority — Three Independent Systems

| Field | unified_status (Coach) | computeAttention.js (Athlete) | risk_engine (Inbox) |
|---|---|---|---|
| **Scoring** | 4-dim urgency (severity 40%, time 30%, opp 20%, pipeline 10%) | Weighted sum (coach 100pt, due 80pt, activity 40pt, stage 15pt, recap 65pt) | Base score × stage multiplier × compound rules × time decay |
| **Scale** | 0-100 float | 0-300+ integer | 0-100 integer |
| **Labels** | Blocker / Urgent Follow-up / At Risk / Needs Review / All Clear | critical / soon / monitor (urgency); high / medium / low (tier) | critical / high / medium / low (severity); blocker / escalate / review / nudge / monitor (intervention) |
| **Inputs** | Decision engine interventions + school health + pod issues | top_action + due dates + activity + stage + recap | Issue keys + stage + days_inactive + recent_actions |
| **Affected Views** | Coach dashboard (myRoster) | Athlete pipeline (Hero, Priority Board, Kanban) | Coach Inbox, Director Inbox |
| **Risk** | CRITICAL — Same school shows "Blocker" on coach view, "medium/soon" on athlete view, "high/escalate" on inbox |
| **Canonical Owner** | `unified_status.derive_attention_status()` |
| **Migration** | computeAttention.js should consume a backend-computed attention field. risk_engine should delegate to unified_status or be unified with it. |

### CONFLICT 2: Interaction Signal Computation

| Field | athlete_dashboard (System A) | program_metrics (System B) |
|---|---|---|
| **Reply detection** | Counts `type in ("coach_reply", "email_received")` | Counts by type OR `initiated_by == "coach"` |
| **Engagement depth** | Boolean `has_coach_reply` | `meaningful_interaction_count` with 4-rule classifier |
| **Engagement recency** | `days_since_activity` (any interaction) | `days_since_last_meaningful_engagement` (meaningful only) |
| **Engagement trend** | Not computed | `accelerating / steady / decelerating / stalled / inactive` |
| **Unanswered questions** | Not computed | `unanswered_coach_questions` count |
| **Affected Views** | Athlete pipeline (board_group, journey_rail), computeAttention.js | Top action engine, school health, unified_status |
| **Risk** | HIGH — A school with shallow replies is "in_conversation" in System A but "needs_follow_up" in System B |
| **Canonical Owner** | `services/program_metrics.py` |
| **Migration** | `athlete_dashboard._compute_signals_from_interactions()` should be replaced by calling program_metrics. Or: add a lightweight signal computation endpoint that program_metrics exposes. |

### CONFLICT 3: Stage / Progress — Five Parallel Systems

| System | Field | Values | Set By | Consumed By |
|---|---|---|---|---|
| 1 | `programs.recruiting_status` | Not Contacted, Contacted, Interested, Applied, Campus Visit, Offer, Committed, Archived | User (manual) | top_action_engine, program_metrics, risk_engine, athlete_store.pipeline_momentum |
| 2 | `programs.journey_stage` | added, outreach, in_conversation, campus_visit, offer, committed | User (manual) | compute_journey_rail, computeAttention.js stage bonus |
| 3 | `categorize_program()` → board_group | archived, overdue, in_conversation, waiting_on_reply, needs_outreach | Computed from signals + due date | Athlete pipeline Kanban |
| 4 | `athletes.pipeline_best_stage` | No Schools, Prospect, Initial Contact, Contacted, Interested, Engaged, Campus Visit, Offer, Committed | Derived from max(STAGE_WEIGHTS) | unified_status.compute_journey_state() → Coach dashboard |
| 5 | `momentum_recap.status_to_stage` | added, outreach, in_conversation, campus_visit, offer, committed | Mapped from recruiting_status | Momentum Recap classification |

**Conflict Example:** An athlete with one school at "Interested" (recruiting_status):
- System 1: recruiting_status = "Interested"
- System 2: journey_stage could be "added" (if user never manually set it)
- System 3: board_group = "needs_outreach" (if no interactions yet, despite "Interested" status)
- System 4: pipeline_best_stage = "Interested" (from STAGE_WEIGHTS)
- System 5: momentum stage = "in_conversation" (from status_to_stage map)

**Risk** | HIGH — User sees contradictory progress indicators across pages |
**Canonical Owner** | `recruiting_status` (user-set, per-school) + `pipeline_best_stage` (derived, per-athlete) |
**Migration** | 1. journey_stage should derive from recruiting_status (not be independent). 2. board_group should incorporate recruiting_status. 3. momentum_recap should use the same stage mapping as journey_rail. |

### CONFLICT 4: Momentum — Four Independent Computations

| System | Location | Input | Output | Scale |
|---|---|---|---|---|
| A | `athlete_store._compute_pipeline_momentum()` | All programs' recruiting_status via STAGE_WEIGHTS | pipeline_momentum | 0-100 integer (per athlete) |
| B | `program_metrics._compute_pipeline_health()` | 7 factors (meaningful engagement, trend, depth, overdue, questions, velocity) | pipeline_health_state | 7 states (per school) |
| C | `momentum_recap._classify_momentum()` | Interaction counts in/before period, coach_reply, visit, reply_status | category | 3 categories (per school) |
| D | `computeAttention.js` | days_since_activity only | momentum | 3 labels (per school) |

**Risk** | MEDIUM — Same school shows "cooling" (System D, based on 8 days inactive) but "active" (System B, based on recent meaningful engagement 5 days ago that happened to be a phone call, not counted in days_since_activity). |
**Canonical Owner** | System B (program_metrics.pipeline_health_state) for per-school. System A for per-athlete. |
**Migration** | Systems C and D should consume pipeline_health_state from backend. |

---

## Deliverable C: Refactor Plan

### DELETE (Remove Entirely)

| Target | Reason | Replacement |
|---|---|---|
| `computeAttention.js` urgency/tier/momentum computation | Frontend should not independently score attention. | Backend should expose `attention_status` per program (extend unified_status or top_action_engine to include attention fields). Frontend renders directly. |
| `athlete_dashboard._compute_signals_from_interactions()` | Duplicate of program_metrics, less sophisticated. | Call `program_metrics.get_metrics()` or expose a lightweight signal endpoint. |
| `momentum_recap._classify_momentum()` status_to_stage mapping | Uses own stage mapping that diverges from canonical. | Use shared stage constants or derive from `programs.journey_stage`. |
| `computeAttention.js` momentum field | Trivial and divergent from backend. | Consume backend `pipeline_health_state`. |

### DELEGATE (Keep the Module, but Source Data from Canonical)

| Target | Current Source | Should Delegate To |
|---|---|---|
| `computeAttention.js` | Computes everything client-side from raw program data + topAction | Backend-computed attention/urgency fields per program. Keep `computeAttention.js` for sorting/filtering only, not scoring. |
| `risk_engine.evaluate_risk()` | Independent risk scoring | Could delegate severity/urgency to `unified_status` or merge into it. Or: keep risk_engine for inbox-specific risk view, but source signals from same pool as unified_status. |
| `athlete_dashboard.compute_journey_rail()` | Uses own signal detection for stage auto-fill | Source signal data from program_metrics instead of raw interaction counting. |
| `categorize_program()` | Uses own signal checks (has_coach_reply, outreach_count) | Source from program_metrics (meaningful_engagement, engagement_trend) for richer classification. |

### MAKE CANONICAL (Establish as Single Source of Truth)

| Target | Scope | Action |
|---|---|---|
| `unified_status.derive_attention_status()` | Per-athlete attention/urgency for ALL views | Extend to also produce per-program attention status (currently only per-athlete). This becomes the single attention API. |
| `services/program_metrics.py` | Per-school interaction metrics, engagement, pipeline health | All interaction-derived data should flow through this service. Expose as internal API for both athlete_dashboard and mission_control. |
| `services/top_action_engine.py` | Per-school "what to do next" | Already canonical. Frontend should render its output directly without re-scoring. |
| `programs.recruiting_status` + `athletes.pipeline_best_stage` | Stage/progress tracking | All stage references should trace back to these two fields. Journey_stage should be derived, not independent. |
| `db.events` | Events | All event consumers should read from this collection. event_engine must migrate off mock_data. |
| `athlete_store._build_real_program_snapshot()` | Dashboard summary counts | Already canonical (fixed in Phase 1). intelligence.py must migrate. |

---

## Deliverable D: P0/P1 Fix List for Remaining Live mock_data Paths

### P1 Fixes Required (Live Production Paths)

| # | File | Import | Used In | Fix |
|---|---|---|---|---|
| 1 | `routers/intelligence.py:25-28` | `UPCOMING_EVENTS`, `get_program_snapshot` | `POST /ai/briefing` (L169), `POST /ai/suggested-actions` (L318), program insights (L490) | Replace `UPCOMING_EVENTS` with `await _fetch_real_events()` (same pattern as mission_control fix). Replace `get_program_snapshot(athletes)` with `await _build_real_snapshot(athletes)` (copy from athlete_store). |
| 2 | `event_engine.py:11` | `UPCOMING_EVENTS`, `SCHOOLS` | `get_all_events()` → `GET /events` and all sub-routes | Modify `_load_events()` to read from `db.events` instead of `UPCOMING_EVENTS`. Replace `SCHOOLS` with `db.university_knowledge_base.find()`. |
| 3 | `routers/events.py:10-13` | `UPCOMING_EVENTS`, `SCHOOLS` | `GET /events/schools/available` | Query `db.university_knowledge_base` for schools. Remove direct UPCOMING_EVENTS reference. |
| 4 | `routers/digest.py:19` | `UPCOMING_EVENTS` | `POST /digest/generate` | Replace with DB events query. |

### P2 Fixes Required (Secondary Production Paths)

| # | File | Import | Used In | Fix |
|---|---|---|---|---|
| 5 | `support_pod.py` | `UPCOMING_EVENTS` | `GET /support-pods/{id}/schools` | Replace with DB events query. |
| 6 | `advocacy_engine.py` | `UPCOMING_EVENTS`, `SCHOOLS` | Advocacy recommendations | Replace with DB queries. |
| 7 | `program_engine.py` | `UPCOMING_EVENTS` | Program intelligence compute | Replace with DB events query. |

### P3 Fixes (Admin Only)

| # | File | Import | Used In | Fix |
|---|---|---|---|---|
| 8 | `routers/admin.py:7` | `SCHOOLS` | `GET /admin/status` (school count) | Replace with `db.university_knowledge_base.count_documents()`. |

---

## Summary: Where Every Critical Metric Lives

| Metric | Computed | Canonical Owner | Duplicates | Fix Priority |
|---|---|---|---|---|
| attention_status | Backend | unified_status.py | computeAttention.js, risk_engine | P0 |
| urgency/tier | Frontend | computeAttention.js (WRONG) | unified_status, risk_engine | P0 |
| top_action | Backend | top_action_engine.py | None (but frontend re-derives from it) | P1 |
| board_group | Backend | categorize_program() | None | OK |
| journey_rail | Backend | compute_journey_rail() | None | OK (but stage input fragmented) |
| journey_state | Backend | unified_status.py | None | OK |
| recruiting_status | DB | User-set | None | OK (canonical) |
| pipeline_best_stage | Backend | athlete_store.py | None | OK (canonical derived) |
| momentum (athlete) | Backend | athlete_store.pipeline_momentum | None | OK |
| momentum (school) | Backend | program_metrics.pipeline_health_state | momentum_recap, computeAttention.js | P1 |
| interaction_signals | Backend | program_metrics.py | athlete_dashboard._compute_signals | P1 |
| reply_rate | Backend | program_metrics.py | athlete_dashboard.engagement endpoint | P1 |
| engagement_trend | Backend | program_metrics.py | None | OK (canonical) |
| summary_snapshot | Backend | athlete_store._build_real_program_snapshot | intelligence.py (MOCK) | P1 |
| events | DB | db.events | event_engine (MOCK), intelligence (MOCK), digest (MOCK) | P1 |

---

*Generated: Phase 3 of CapyMatch Production Integrity Audit*
*Next: Phase 4 — Duplicate Logic Detection*
