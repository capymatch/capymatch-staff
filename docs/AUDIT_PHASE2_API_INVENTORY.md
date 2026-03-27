# Phase 2 — API Inventory: CapyMatch Production Integrity Audit

## Table of Contents
1. [Endpoint Inventory — Dashboard & Metrics (Critical)](#1-dashboard--metrics-critical)
2. [Endpoint Inventory — Athlete Pipeline (Critical)](#2-athlete-pipeline-critical)
3. [Endpoint Inventory — Internal Metrics (Critical)](#3-internal-metrics-critical)
4. [Endpoint Inventory — Coach/Director Inboxes](#4-coachdirector-inboxes)
5. [Endpoint Inventory — Roster & Staff Views](#5-roster--staff-views)
6. [Endpoint Inventory — Events System](#6-events-system)
7. [Endpoint Inventory — Intelligence & AI](#7-intelligence--ai)
8. [Endpoint Inventory — Support Pods & School Health](#8-support-pods--school-health)
9. [Endpoint Inventory — Momentum Recap](#9-momentum-recap)
10. [Full Endpoint Count by Domain](#10-full-endpoint-count-by-domain)
11. [Overlap / Duplication Report](#11-overlap--duplication-report)
12. [Canonical Owner Recommendations](#12-canonical-owner-recommendations)
13. [Remaining mock_data Exposure List](#13-remaining-mock_data-exposure-list)

---

## 1. Dashboard & Metrics (Critical)

### GET /api/mission-control
| Field | Value |
|---|---|
| **Method** | GET |
| **Auth** | Required (coach or director) |
| **Source File** | `routers/mission_control.py` |
| **Service Files** | `services/athlete_store.py`, `services/unified_status.py`, `decision_engine.py`, `services/program_metrics.py`, `services/ownership.py` |
| **DB Dependencies** | `athletes`, `programs`, `program_metrics`, `pod_issues`, `coach_flags`, `director_actions`, `event_notes`, `recommendations`, `users`, `program_snapshots`, `events` |
| **Response (Coach)** | `{ myRoster[], signals[], events[], alerts[], summary_lines[], priorities[], needingAction[] }` |
| **Response (Director)** | `{ programStatus, programSnapshot, trendData, needsAttention[], upcomingEvents[], programActivity, coachHealth[], recruitingSignals[], escalations[], outbox_summary }` |
| **Derived Metrics** | journey_state, attention_status (per athlete), summary_lines, priorities, needing_action count |
| **Frontend Consumers** | `MissionControlPage.js`, `DirectorView.js` |
| **Overlaps** | Coach roster overlaps with `GET /roster`. Director snapshot overlaps with `GET /mission-control/snapshot`. |
| **CANONICAL?** | YES — Primary coach/director dashboard endpoint |

### GET /api/mission-control/alerts
| Field | Value |
|---|---|
| **Method** | GET |
| **Auth** | Required |
| **Source File** | `routers/mission_control.py` |
| **Service Files** | `services/athlete_store.py` → `decision_engine.py` |
| **DB Dependencies** | `athletes` (via athlete_store cache) |
| **Response** | `[ { athlete_id, category, trigger, score, why_this_surfaced, recommended_action, ... } ]` |
| **Derived Metrics** | Priority alerts (interventions with score >= 70) |
| **Frontend Consumers** | Mission Control alerts panel |
| **Overlaps** | Subset of `/mission-control` coach response |
| **CANONICAL?** | DUPLICATE — Data already in `/mission-control` response |

### GET /api/mission-control/signals
| Field | Value |
|---|---|
| **Method** | GET |
| **Auth** | Required |
| **Source File** | `routers/mission_control.py` |
| **Service Files** | `services/athlete_store.py` → `_build_real_momentum_signals()` |
| **DB Dependencies** | `interactions`, `program_stage_history` |
| **Response** | `[ { id, type, athlete_id, athlete_name, text, timestamp, direction } ]` |
| **Derived Metrics** | Recent activity signals (last 48h) |
| **Frontend Consumers** | Mission Control activity feed |
| **Overlaps** | None (unique real-time feed) |
| **CANONICAL?** | YES — Canonical source for real-time activity signals |

### GET /api/mission-control/athletes
| Field | Value |
|---|---|
| **Method** | GET |
| **Auth** | Required |
| **Source File** | `routers/mission_control.py` |
| **Service Files** | `services/athlete_store.py` → `decision_engine.py` |
| **DB Dependencies** | `athletes` (via cache) |
| **Response** | `[ { athlete dict with intervention data } ]` |
| **Derived Metrics** | Athletes needing attention (interventions score >= 50) |
| **Frontend Consumers** | Mission Control "needs attention" list |
| **Overlaps** | Subset of `/mission-control` coach response (needing_action) |
| **CANONICAL?** | DUPLICATE — Data already in `/mission-control` response |

### GET /api/mission-control/events
| Field | Value |
|---|---|
| **Method** | GET |
| **Auth** | Required |
| **Source File** | `routers/mission_control.py` |
| **Service Files** | `_fetch_real_events_for_mc()` (inline) |
| **DB Dependencies** | `events` |
| **Response** | `[ event objects with daysAway computed ]` |
| **Derived Metrics** | daysAway (computed from date) |
| **Frontend Consumers** | Mission Control events panel |
| **Overlaps** | Overlaps with `GET /events` (events router) |
| **CANONICAL?** | DUPLICATE — `GET /events` provides richer event data |

### GET /api/mission-control/snapshot
| Field | Value |
|---|---|
| **Method** | GET |
| **Auth** | Required |
| **Source File** | `routers/mission_control.py` |
| **Service Files** | `services/athlete_store.py` → `_build_real_program_snapshot()` |
| **DB Dependencies** | `athletes`, `events` |
| **Response** | `{ totalAthletes, byStage, byGradYear, needingAttention, positiveMomentum, upcomingEvents }` |
| **Derived Metrics** | All fields are derived aggregations |
| **Frontend Consumers** | Director dashboard summary cards |
| **Overlaps** | Director response in `/mission-control` includes programSnapshot |
| **CANONICAL?** | DUPLICATE — Data already in director's `/mission-control` response |

---

## 2. Athlete Pipeline (Critical)

### GET /api/athlete/programs
| Field | Value |
|---|---|
| **Method** | GET |
| **Auth** | Required (athlete) |
| **Source File** | `routers/athlete_dashboard.py` |
| **Service Files** | Own signal computation: `_compute_signals_from_interactions()`, `categorize_program()`, `compute_journey_rail()` |
| **DB Dependencies** | `programs`, `interactions`, `college_coaches`, `coach_watch_states` |
| **Response** | `[ { program_id, university_name, board_group, journey_rail, signals{}, reply_status, ... } ]` |
| **Derived Metrics** | board_group (5-stage funnel), journey_rail (6-stage), signals (outreach_count, reply_count, has_coach_reply, days_since_*) |
| **Frontend Consumers** | `PipelinePage.js` (feeds into `computeAttention.js` for further client-side derivation) |
| **Overlaps** | `board_group` overlaps with `unified_status.compute_journey_state()`. Signal computation overlaps with `program_metrics` service. |
| **CANONICAL?** | YES for athlete pipeline view — but signal computation is DUPLICATED with program_metrics |

### GET /api/athlete/dashboard
| Field | Value |
|---|---|
| **Method** | GET |
| **Auth** | Required (athlete) |
| **Source File** | `routers/athlete_dashboard.py` |
| **Service Files** | Same as `/athlete/programs` plus aggregation |
| **DB Dependencies** | `programs`, `interactions`, `college_coaches`, `athlete_events`, `coach_flags` |
| **Response** | `{ programs[], stats{}, upcoming_events[], recent_activity[], follow_ups[] }` |
| **Derived Metrics** | stats (total_schools, needs_outreach, in_conversation, waiting_reply), aggregated from programs |
| **Frontend Consumers** | Athlete home dashboard |
| **Overlaps** | Stats overlap with `/mission-control/snapshot` (different perspective). Programs are same as `/athlete/programs`. |
| **CANONICAL?** | YES — Canonical athlete home page endpoint |

### GET /api/athlete/programs/{program_id}
| Field | Value |
|---|---|
| **Method** | GET |
| **Auth** | Required (athlete) |
| **Source File** | `routers/athlete_dashboard.py` |
| **Service Files** | Same signal computation as list |
| **DB Dependencies** | `programs`, `interactions`, `college_coaches` |
| **Response** | `{ program with signals, board_group, journey_rail, interactions[] }` |
| **Derived Metrics** | Same as list but for single program |
| **Frontend Consumers** | Program detail view |
| **CANONICAL?** | YES |

### GET /api/athlete/programs/{program_id}/journey
| Field | Value |
|---|---|
| **Method** | GET |
| **Auth** | Required (athlete) |
| **Source File** | `routers/athlete_dashboard.py` |
| **Service Files** | `compute_journey_rail()` |
| **DB Dependencies** | `programs`, `program_stage_history` |
| **Response** | `{ journey_rail[], stage_history[], current_stage }` |
| **Derived Metrics** | Journey rail stages, stage progression |
| **Frontend Consumers** | Journey page / timeline view |
| **Overlaps** | Journey stage logic overlaps with `unified_status.compute_journey_state()` |
| **CANONICAL?** | YES for athlete journey view — but stage system overlaps with unified_status |

### GET /api/coach-watch/{program_id}
| Field | Value |
|---|---|
| **Method** | GET |
| **Auth** | Required |
| **Source File** | `routers/athlete_dashboard.py` |
| **Service Files** | `_compute_coach_watch()` (10-state relationship matrix) |
| **DB Dependencies** | `programs`, `interactions`, `college_coaches`, `coach_watch_states` |
| **Response** | `{ relationship_state, score, signals[], coaching_changes[], recommended_actions[] }` |
| **Derived Metrics** | Relationship state, coach watch score, signals |
| **Frontend Consumers** | Coach Watch panel in program detail |
| **CANONICAL?** | YES — Unique relationship intelligence |

### GET /api/athlete/engagement/{program_id}
| Field | Value |
|---|---|
| **Method** | GET |
| **Auth** | Required (athlete) |
| **Source File** | `routers/athlete_dashboard.py` |
| **Service Files** | Own computation from interactions |
| **DB Dependencies** | `interactions` |
| **Response** | `{ engagement metrics for a single school }` |
| **Derived Metrics** | Engagement score, reply rate, response time |
| **Frontend Consumers** | School detail engagement section |
| **Overlaps** | Overlaps heavily with `program_metrics` service (reply_rate, response_time, engagement) |
| **CANONICAL?** | DUPLICATE — `program_metrics` computes richer version of same data |

---

## 3. Internal Metrics (Critical)

### POST /api/internal/programs/batch-metrics
| Field | Value |
|---|---|
| **Method** | POST |
| **Auth** | Required |
| **Source File** | `routers/program_metrics.py` |
| **Service Files** | `services/program_metrics.py` |
| **DB Dependencies** | `programs`, `interactions`, `program_metrics` (cache), `program_stage_history`, `program_signals`, `coach_flags`, `director_actions` |
| **Request** | `{ program_ids: string[] }` |
| **Response** | `{ metrics: { [program_id]: MetricsObject } }` |
| **Derived Metrics** | reply_rate, response_time, meaningful_engagement, stage_velocity, pipeline_health_state, engagement_trend |
| **Frontend Consumers** | PipelinePage.js (indirectly via top-actions) |
| **CANONICAL?** | YES — Canonical per-school metrics source |

### GET /api/internal/programs/top-actions
| Field | Value |
|---|---|
| **Method** | GET |
| **Auth** | Required |
| **Source File** | `routers/program_metrics.py` |
| **Service Files** | `services/top_action_engine.py` |
| **DB Dependencies** | `programs`, `coach_flags`, `pod_actions`, `director_actions`, `program_metrics` |
| **Response** | `{ [program_id]: { priority, action, reason, owner, ... } }` |
| **Derived Metrics** | Top action per school (priority 1-8 deterministic rules) |
| **Frontend Consumers** | `PipelinePage.js` → feeds into `computeAttention.js` |
| **Overlaps** | Frontend `computeAttention.js` re-derives urgency/priority from this data |
| **CANONICAL?** | YES — Canonical top action per school. But frontend RE-COMPUTES from this. |

### GET /api/internal/programs/{program_id}/metrics
| Field | Value |
|---|---|
| **Method** | GET |
| **Auth** | Public (no auth check!) |
| **Source File** | `routers/program_metrics.py` |
| **Service Files** | `services/program_metrics.py` |
| **Response** | `MetricsObject` |
| **CANONICAL?** | YES — Single-school version of batch-metrics |

### GET /api/internal/programs/{program_id}/top-action
| Field | Value |
|---|---|
| **Method** | GET |
| **Auth** | Required |
| **Source File** | `routers/program_metrics.py` |
| **Service Files** | `services/top_action_engine.py` |
| **Response** | `{ priority, action, reason, owner, ... }` |
| **CANONICAL?** | YES — Single-school version of top-actions |

---

## 4. Coach/Director Inboxes

### GET /api/coach-inbox
| Field | Value |
|---|---|
| **Method** | GET |
| **Auth** | Required (coach) |
| **Source File** | `routers/coach_inbox.py` |
| **Service Files** | `services/athlete_store.py`, `risk_engine.py`, `advocacy_engine.py` |
| **DB Dependencies** | `director_actions`, `athletes`, `programs`, `recommendations`, `interactions` |
| **Response** | `{ items[], count, highCount }` |
| **Derived Metrics** | Inbox items with urgency, risk assessment, stage velocity |
| **Frontend Consumers** | Coach Inbox page |
| **Overlaps** | Risk/urgency assessment overlaps with `unified_status.py` attention status. Stage velocity overlaps with `program_metrics`. |
| **CANONICAL?** | YES for coach inbox — but risk/urgency logic is INDEPENDENT from unified_status |

### GET /api/director-inbox
| Field | Value |
|---|---|
| **Method** | GET |
| **Auth** | Public (no auth check!) |
| **Source File** | `routers/director_inbox.py` |
| **Service Files** | `services/athlete_store.py`, `risk_engine.py`, `advocacy_engine.py` |
| **DB Dependencies** | `director_actions`, `athletes`, `programs`, `recommendations`, `interactions`, `users` |
| **Response** | `{ sections{ escalations[], advocacy[], roster[], momentum[] }, total, high }` |
| **Derived Metrics** | Momentum signals (own computation!), risk assessment, roster health |
| **Frontend Consumers** | Director Inbox page |
| **Overlaps** | Momentum signals overlap with `/mission-control/signals`. Risk assessment overlaps with unified_status. |
| **CANONICAL?** | YES for director inbox — but has OWN momentum signal logic |

---

## 5. Roster & Staff Views

### GET /api/roster
| Field | Value |
|---|---|
| **Method** | GET |
| **Auth** | Required |
| **Source File** | `routers/roster.py` |
| **Service Files** | `services/athlete_store.py`, `services/ownership.py` |
| **DB Dependencies** | `athletes`, `users`, `programs`, `recommendations` |
| **Response** | `{ athletes[], coaches[], unassigned[] }` with momentum_score, momentum_trend, pipeline_best_stage |
| **Derived Metrics** | completeness score (from profile.py), momentum data from athlete_store |
| **Frontend Consumers** | Roster management page |
| **Overlaps** | Athlete list overlaps with `/mission-control` myRoster (different enrichment) |
| **CANONICAL?** | YES for roster management — DIFFERENT enrichment than mission_control |

### GET /api/roster/athlete/{athlete_id}/pipeline
| Field | Value |
|---|---|
| **Method** | GET |
| **Auth** | Required |
| **Source File** | `routers/connected.py` |
| **Service Files** | `athlete_dashboard.compute_journey_rail()`, `athlete_dashboard.categorize_program()` |
| **DB Dependencies** | `athletes`, `programs`, `interactions` |
| **Response** | `PipelineResponse { programs[], summary, momentum }` |
| **Derived Metrics** | Same board_group and journey_rail as `/athlete/programs` |
| **Frontend Consumers** | Staff view of athlete pipeline |
| **Overlaps** | DIRECT DUPLICATE of `/athlete/programs` logic (imports same functions) |
| **CANONICAL?** | DUPLICATE — Reuses athlete_dashboard functions but from staff perspective |

---

## 6. Events System

### GET /api/events
| Field | Value |
|---|---|
| **Method** | GET |
| **Auth** | Required |
| **Source File** | `routers/events.py` |
| **Service Files** | `event_engine.py` |
| **DB Dependencies** | `events`, `event_notes`, `athletes` |
| **Response** | `{ upcoming[], past[] }` with urgency colors, prep progress |
| **Derived Metrics** | urgency color, prep progress |
| **Frontend Consumers** | Events page |
| **Overlaps** | Overlaps with `/mission-control/events` |
| **mock_data** | YES — `event_engine.py` reads from `UPCOMING_EVENTS` (P1 fix needed) |
| **CANONICAL?** | YES for events — but built on mock data |

### GET /api/events/schools/available
| Field | Value |
|---|---|
| **mock_data** | YES — Reads `SCHOOLS` from mock_data |
| **CANONICAL?** | MOCK — Should query real school DB |

---

## 7. Intelligence & AI

### POST /api/ai/briefing
| Field | Value |
|---|---|
| **Method** | POST |
| **Auth** | Required |
| **Source File** | `routers/intelligence.py` |
| **Service Files** | `services/athlete_store.py`, `program_engine.py`, `event_engine.py` |
| **DB Dependencies** | `athletes`, `programs`, `events`, `recommendations` |
| **Response** | AI-generated briefing with context data |
| **mock_data** | YES — Uses `UPCOMING_EVENTS`, `get_program_snapshot` from mock_data |
| **Overlaps** | Snapshot overlaps with `/mission-control/snapshot`. Events overlap with event system. |
| **CANONICAL?** | YES for AI briefing — but contaminated by mock data |

### POST /api/ai/suggested-actions
| Field | Value |
|---|---|
| **Method** | POST |
| **Auth** | Required |
| **Source File** | `routers/intelligence.py` |
| **mock_data** | YES — Uses `UPCOMING_EVENTS`, `get_program_snapshot` |
| **CANONICAL?** | YES — but contaminated by mock data |

---

## 8. Support Pods & School Health

### GET /api/support-pods/{athlete_id}/school/{program_id}
| Field | Value |
|---|---|
| **Method** | GET |
| **Auth** | Required |
| **Source File** | `routers/school_pod.py` |
| **Service Files** | `services/program_metrics.py`, `school_pod.classify_school_health()`, `school_pod.compute_school_signals()` |
| **DB Dependencies** | `programs`, `program_metrics`, `interactions`, `pod_actions`, `pod_issues`, `playbook_progress` |
| **Response** | `{ health_state, signals[], actions[], playbook, metrics }` |
| **Derived Metrics** | School health classification, signals, playbook progress |
| **Frontend Consumers** | School Pod detail view |
| **Overlaps** | School health feeds into `unified_status.py` attention derivation. Signals overlap with `program_metrics`. |
| **CANONICAL?** | YES — Canonical school health source (feeds unified_status) |

### GET /api/support-pods/{athlete_id}/schools
| Field | Value |
|---|---|
| **Source File** | `routers/school_pod.py` |
| **Service Files** | `support_pod.py` |
| **mock_data** | YES — `support_pod.py` uses `UPCOMING_EVENTS` for upcoming event list |
| **CANONICAL?** | YES — but partially contaminated |

---

## 9. Momentum Recap

### GET /api/athlete/momentum-recap
| Field | Value |
|---|---|
| **Method** | GET |
| **Auth** | Required (athlete) |
| **Source File** | `routers/momentum_recap.py` |
| **Service Files** | Own `_classify_momentum()` function |
| **DB Dependencies** | `programs`, `interactions`, `momentum_recaps` (cache) |
| **Response** | `{ items[], priorities[], summary, last_computed }` |
| **Derived Metrics** | Momentum classification (heated_up/cooling_off/holding_steady), priority reset |
| **Frontend Consumers** | Momentum Recap card/page, feeds `computeAttention.js` via recapCtx |
| **Overlaps** | Momentum classification overlaps with `athlete_store.pipeline_momentum`. Priority overlaps with `top_action_engine`. Stage mapping overlaps with `compute_journey_rail()`. |
| **CANONICAL?** | YES for momentum recap — but ANOTHER independent momentum classification system |

---

## 10. Full Endpoint Count by Domain

| Domain | Router File(s) | Endpoint Count | Has Derived Metrics? | Has mock_data? |
|---|---|---|---|---|
| Auth | auth.py | 10 | No | No |
| Mission Control | mission_control.py | 6 | YES | **FIXED** |
| Athlete Dashboard | athlete_dashboard.py | 21 | YES | No |
| Program Metrics | program_metrics.py | 6 | YES | No |
| Coach Inbox | coach_inbox.py | 2 | YES | No |
| Director Inbox | director_inbox.py | 1 | YES | No |
| Roster | roster.py | 14 | YES | No |
| Connected (Staff Pipeline) | connected.py | 1 | YES | No |
| Events | events.py | 18 | YES | **YES** |
| Intelligence/AI | intelligence.py | 11 | YES | **YES** |
| AI Features | ai_features.py | 14 | YES | No |
| Support Pods | support_pods.py, school_pod.py | 23 | YES | **YES** (via support_pod.py) |
| Advocacy | advocacy.py | 13 | YES | **YES** (via advocacy_engine.py) |
| Digest | digest.py | 3 | YES | **YES** |
| Momentum Recap | momentum_recap.py | 2 | YES | No |
| Athletes (Staff) | athletes.py | 8 | No | No |
| Profile | profile.py, athlete_profile.py | 9 | Minimal | No |
| Athlete Self | athlete_self.py | 1 | No | No |
| Athlete Settings | athlete_settings.py | 5 | No | No |
| Athlete Tasks | athlete_tasks.py | 1 | YES | No |
| Athlete Knowledge | athlete_knowledge.py | 11 | No | No |
| Athlete Onboarding | athlete_onboarding.py | 3 | No | No |
| Athlete Gmail | athlete_gmail.py, athlete_gmail_intelligence.py | 20 | YES | No |
| Smart Match | smart_match.py | 2 | YES | No |
| Coach Flags | coach_flags.py | 3 | No | No |
| Director Actions | director_actions.py | 5 | No | No |
| Invites | invites.py | 8 | No | No |
| Organizations | organizations.py | 9 | No | No |
| Team | team.py | 5 | No | No |
| Onboarding | onboarding.py | 3 | No | No |
| Notifications | notifications.py | 3 | No | No |
| Subscription/Stripe | subscription.py, stripe_checkout.py, club_plans.py | 14 | No | No |
| Admin | admin.py, admin_*.py | 17 | Minimal | **YES** (SCHOOLS) |
| Debug | debug.py | 3 | YES | No |
| Loop Analytics | loop_analytics.py | 3 | YES | No |
| Scraper | coach_scraper.py | 5 | No | No |
| College Scorecard | college_scorecard.py | 5 | No | No |
| Coaching Stability | coaching_stability.py | 2 | YES | No |
| File Upload | file_upload.py | 2 | No | No |
| YouTube Feed | youtube_feed.py | 3 | No | No |
| Public Profile | public_profile.py | 6 | Minimal | No |
| Program Notes | program_notes.py | 4 | No | No |
| Support Messages | support_messages.py | 5 | No | No |
| Program | program.py | 2 | YES | No |
| Autopilot | autopilot.py | 1 | YES | No |
| **TOTAL** | | **339** | | |

---

## 11. Overlap / Duplication Report

### OVERLAP A: Athlete Attention / Urgency / Priority (CRITICAL)

**Three independent systems compute "what needs attention":**

| System | Location | Algorithm | Used By |
|---|---|---|---|
| 1. Unified Status | `unified_status.derive_attention_status()` | 4-dimension urgency scoring (severity, time_sensitivity, opportunity_cost, pipeline_impact) | Coach dashboard (`/mission-control`) |
| 2. computeAttention.js | `frontend/lib/computeAttention.js` | Weighted scoring (coach signals 60pt, due dates 40pt, activity 35pt, stage 25pt, recap 40pt) | Athlete pipeline (`PipelinePage.js`) |
| 3. Risk Engine | `risk_engine.evaluate_risk()` | Own risk assessment | Coach Inbox, Director Inbox |

**Result:** The same school can be "Blocker" on the coach dashboard, "medium" on the athlete pipeline, and "high risk" in the coach inbox.

### OVERLAP B: Interaction Signal Computation (HIGH)

**Two independent systems compute signals from the same interactions:**

| System | Location | Computes | Used By |
|---|---|---|---|
| System A | `athlete_dashboard._compute_signals_from_interactions()` | outreach_count, reply_count, has_coach_reply, days_since_outreach, days_since_reply | Athlete pipeline, athlete dashboard |
| System B | `program_metrics._compute_interaction_metrics()` + `_compute_meaningful_engagement()` | reply_rate, response_time, meaningful_interaction_count, engagement_freshness, engagement_trend | Top action engine, school health, unified status |

**Result:** System A and B can disagree on engagement state for the same school.

### OVERLAP C: Stage / Journey / Progress (HIGH)

**Five parallel tracking systems for progress:**

| System | Source | Stages | Used By |
|---|---|---|---|
| `recruiting_status` | `programs` collection (manual) | Not Contacted, Contacted, Interested, Applied, Committed, Archived | top_action_engine, program_metrics |
| `journey_stage` | `programs` collection (manual) | added, outreach, in_conversation, campus_visit, offer, committed | computeAttention.js, journey_rail |
| `board_group` | `categorize_program()` (computed) | archived, overdue, in_conversation, waiting_on_reply, needs_outreach | Athlete pipeline (kanban) |
| `pipeline_best_stage` | `athletes` collection (computed) | No Schools, Initial Contact, Interested, Engaged, Campus Visit, Offer, Committed | unified_status.compute_journey_state() |
| `momentum category` | `momentum_recap._classify_momentum()` | heated_up, cooling_off, holding_steady | Momentum Recap page |

### OVERLAP D: Momentum / Health Computation (MEDIUM)

| System | Location | Output | Used By |
|---|---|---|---|
| pipeline_momentum | `athlete_store._compute_pipeline_momentum()` | 0.0-1.0 float per athlete | Roster, connected |
| pipeline_health_state | `program_metrics._compute_pipeline_health()` | 5 states per school | Top action engine, school health |
| momentum category | `momentum_recap._classify_momentum()` | heated_up/cooling_off/steady per school | Momentum Recap |
| computeAttention.momentum | `computeAttention.js` | cooling/steady/building per school | Athlete pipeline hero card |

### OVERLAP E: Events Duplication (LOW)

| Endpoint | Source | mock_data? |
|---|---|---|
| `GET /mission-control/events` | `_fetch_real_events_for_mc()` | NO (FIXED) |
| `GET /events` | `event_engine.get_all_events()` | YES (reads UPCOMING_EVENTS) |
| `GET /athlete/events` | `db.athlete_events` | NO (real DB) |

Three separate event endpoints with different data sources.

### OVERLAP F: Snapshot / Summary Stats (LOW)

| Endpoint | Location | Algorithm |
|---|---|---|
| `/mission-control/snapshot` | `mission_control._build_real_snapshot_for_athletes()` | Real from athletes collection |
| `/mission-control` (director) | Same + trend computation | Includes historical trends |
| `/ai/briefing` (intelligence) | `mock_data.get_program_snapshot()` | STILL MOCK |

---

## 12. Canonical Owner Recommendations

### Recommended Single Source of Truth (SSOT) Assignments

| Metric Domain | Canonical Owner | Current State | Action Required |
|---|---|---|---|
| **Attention/Priority** | `unified_status.derive_attention_status()` | 3 competing systems | Frontend `computeAttention.js` should consume backend attention_status. `risk_engine` should delegate to unified_status. |
| **Interaction Signals** | `services/program_metrics.py` | 2 competing systems | `athlete_dashboard._compute_signals_from_interactions()` should call program_metrics instead of own computation. |
| **Stage/Progress** | `programs.recruiting_status` (manual) + `athlete_store.pipeline_best_stage` (derived) | 5 competing systems | Consolidate to: `recruiting_status` (user-set), `pipeline_best_stage` (system-derived). Remove redundant fields. |
| **Momentum** | `services/program_metrics.pipeline_health_state` (per school) + `athlete_store.pipeline_momentum` (per athlete) | 4 competing systems | `momentum_recap` and `computeAttention.js` should consume backend pipeline_health_state. |
| **Events** | `db.events` collection | 3 sources (DB, mock, athlete_events) | All event endpoints should read from `db.events`. Remove event_engine dependency on mock_data. |
| **Program Snapshot** | `athlete_store._build_real_program_snapshot()` | 2 sources (real + mock in intelligence.py) | All snapshot consumers should use athlete_store function. |
| **Top Action** | `services/top_action_engine.py` | Canonical (no duplication) | Frontend should render top action directly, not re-derive. |
| **School Health** | `school_pod.classify_school_health()` + `program_metrics` | Canonical (feeds unified_status) | No action needed. |

---

## 13. Remaining mock_data Exposure List

| File | Imported Symbol(s) | Reachable from Production? | Route/Path | Severity | Recommended Action |
|---|---|---|---|---|---|
| `event_engine.py` | `UPCOMING_EVENTS`, `SCHOOLS` | YES | `GET /events`, `GET /events/{id}`, all event sub-routes | **P1** | Migrate event_engine to read from `db.events`. Replace SCHOOLS with `db.university_knowledge_base`. |
| `routers/events.py` | `UPCOMING_EVENTS`, `SCHOOLS` | YES | `GET /events/schools/available`, `GET /schools` | **P1** | Query real schools from DB. |
| `routers/intelligence.py` | `UPCOMING_EVENTS`, `get_program_snapshot` | YES | `POST /ai/briefing`, `POST /ai/suggested-actions`, `POST /ai/program-insights` | **P1** | Replace with real DB queries (same pattern as mission_control fix). |
| `routers/digest.py` | `UPCOMING_EVENTS` | YES | `POST /digest/generate` | **P1** | Replace with real events from DB. |
| `support_pod.py` | `UPCOMING_EVENTS` | YES | `GET /support-pods/{id}/schools` (upcoming events section) | **P2** | Replace with DB events query. |
| `advocacy_engine.py` | `UPCOMING_EVENTS`, `SCHOOLS` | YES | `POST /advocacy/recommendations`, other advocacy routes | **P2** | Replace with DB queries. |
| `program_engine.py` | `UPCOMING_EVENTS` | YES | `GET /program/intelligence` (via compute_all) | **P2** | Replace with DB events query. |
| `routers/admin.py` | `SCHOOLS` | YES | `GET /admin/status` (school count) | **P3** | Replace with `db.university_knowledge_base.count_documents()`. |
| `services/startup.py` | `mock_data` (full import) | YES (startup only) | Server startup seed | **ACCEPTABLE** | Keep for dev seeding. Add guard for production. |

### Summary
- **P1 (fix soon):** 4 files on critical user-facing production paths (event_engine, events router, intelligence, digest)
- **P2 (fix next):** 3 files on secondary production paths (support_pod, advocacy_engine, program_engine)
- **P3 (low):** 1 file on admin-only path (admin.py)
- **ACCEPTABLE:** 1 file for startup seeding only (startup.py)

---

*Generated: Phase 2 of CapyMatch Production Integrity Audit*
*Next: Phase 3 — Source of Truth Audit*
