# Program Intelligence — Implementation Specification

**Version:** 1.0 (Implementation-Ready)
**Status:** READY FOR BUILD
**Route:** `/program`

---

## Product Position

**Mission Control = Triage.** What needs help right now.
**Support Pod = Treatment.** How to coordinate and resolve an issue.
**Event Mode = Capture.** Convert live recruiting moments into follow-up.
**Advocacy Mode = Promotion.** Turn momentum into coach-backed introductions.
**Program Intelligence = Oversight.** Where is the program healthy, where is it fragile, and what should change.

Program Intelligence is NOT a reporting warehouse. It is NOT a dashboard of vanity metrics. It is the **decision surface for program directors** — the place where systemic issues become visible before they become crises.

Every section answers one of two questions:
1. **"What needs attention?"** — fragility, overload, stalled progress
2. **"What should change?"** — reallocation, process shifts, priority adjustments

---

## Who Uses This

Program Intelligence serves a different user than Mission Control. Mission Control is for the **coach in the field** triaging today's priorities. Program Intelligence is for the **director stepping back** to assess the whole system.

The director asks:
- Are we losing athletes because support broke down?
- Which grad year is furthest behind where it should be?
- Are our events actually producing recruiting outcomes?
- Is advocacy effort being wasted on unresponsive schools?
- Is Coach Martinez overloaded while Coach Thompson has slack?

---

## How You Get Here

**From header navigation:** "Program" mode tab (currently disabled, will be activated)

**Route:** `/program`

The page is a single scrollable view with 5 sections, not 5 separate pages. A director should be able to scan the entire program state in under 2 minutes.

---

## Section 1: Program Health

### Decision Supported
**"Where is the program fragile right now?"**

### What to Show

**Pod Health Distribution**
A simple count summary, not a pie chart.

```
┌──────────────────────────────────────────────────────────┐
│  PROGRAM HEALTH                                          │
│                                                          │
│  ● 8 Healthy    ● 11 Needs Attention    ● 6 At Risk     │
│  ├──────────────┼──────────────────────┼──────────┤      │
│  (segmented bar showing proportions)                     │
│                                                          │
│  ⚠ 6 athletes at risk — up from 4 last week             │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Open Issues Summary**
Grouped by severity, not listed individually.

```
│  Open Issues                                             │
│  6 Blockers · 4 Overdue Actions · 3 Ownership Gaps       │
│                                                          │
│  Highest concentration: U17 Premier (2026 class)         │
```

**Attention Needed (Callout)**
The most important single insight — which cluster of athletes/issues is the biggest systemic risk.

```
│  ⚠ Attention: 2026 grad year has 4 blockers and 3       │
│  athletes with momentum dropping. This is the cohort     │
│  that should be actively recruiting now.                  │
```

### Data Sources
- Pod health: `calculate_pod_health()` from `support_pod.py` for each athlete
- Open issues: `ALL_INTERVENTIONS` grouped by category
- Overdue actions: `pod_actions` collection where `status != "done"` and `due_date < now`

### API Response Shape
```json
{
  "pod_health": { "healthy": 8, "needs_attention": 11, "at_risk": 6 },
  "open_issues": {
    "blockers": 6,
    "overdue_actions": 4,
    "ownership_gaps": 3,
    "momentum_drops": 3,
    "event_follow_ups": 2
  },
  "intervention_total": 25,
  "highest_risk_cluster": {
    "type": "grad_year",
    "value": "2026",
    "reason": "4 blockers, 3 momentum drops in actively recruiting cohort"
  }
}
```

---

## Section 2: Team / Grad Year Readiness

### Decision Supported
**"Which teams or grad years need intervention? Who is stalling?"**

### What to Show

**Readiness Matrix**
A compact grid — rows are grad years, columns are readiness indicators.

```
┌──────────────────────────────────────────────────────────┐
│  READINESS BY GRAD YEAR                                  │
│                                                          │
│  2025 (U18 Academy)                                      │
│  8 athletes · 5 actively recruiting · 2 blockers         │
│  ⚠ 2 athletes missing transcripts (deadline risk)        │
│  ████████░░ 80% on track                                 │
│                                                          │
│  2026 (U17 Premier)                                      │
│  10 athletes · 4 actively recruiting · 3 exploring       │
│  ⚠ 3 athletes stalled in "exploring" >60 days            │
│  █████░░░░░ 50% on track                                 │
│                                                          │
│  2027 (U16 Elite)                                        │
│  7 athletes · 0 actively recruiting · 5 exploring        │
│  On track for this stage                                 │
│  ██████░░░░ 60% on track                                 │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Stalled Athletes**
Athletes stuck in the same recruiting stage longer than expected.

```
│  STALLED ATHLETES                                        │
│                                                          │
│  Jake Williams · 2027 · Exploring for 65 days            │
│  Expected: actively recruiting by now                    │
│  Blockers: Missing highlight reel                        │
│  → Open Support Pod                                      │
│                                                          │
│  Sophia Garcia · 2026 · Exploring for 72 days            │
│  Expected: actively recruiting by now                    │
│  No blockers identified — may need coaching conversation │
│  → Open Support Pod                                      │
```

**Stage Thresholds for "Stalled":**
- 2025 grad: should be `actively_recruiting` or `committed`. Stalled if `exploring` >30 days.
- 2026 grad: should be `actively_recruiting`. Stalled if `exploring` >45 days.
- 2027 grad: stalled if `exploring` >90 days (earlier cohort has more time).

### Data Sources
- Athletes: `ATHLETES` grouped by `gradYear`
- Stage duration: `daysSinceActivity` + `recruitingStage`
- Blockers: `ALL_INTERVENTIONS` filtered by `category == "blocker"` per athlete

### API Response Shape
```json
{
  "by_grad_year": [
    {
      "grad_year": 2025,
      "team": "U18 Academy",
      "total_athletes": 8,
      "actively_recruiting": 5,
      "exploring": 2,
      "committed": 1,
      "blockers": 2,
      "on_track_pct": 80,
      "attention_note": "2 athletes missing transcripts (deadline risk)"
    }
  ],
  "stalled_athletes": [
    {
      "id": "athlete_2",
      "name": "Jake Williams",
      "grad_year": 2027,
      "stage": "exploring",
      "days_in_stage": 65,
      "expected_stage": "actively_recruiting",
      "blockers": ["missing_highlight_reel"],
      "has_blockers": true
    }
  ]
}
```

---

## Section 3: Event Effectiveness

### Decision Supported
**"Which events are producing real recruiting outcomes? Where is follow-up falling through?"**

### What to Show

**Event Impact Summary**
One row per event (past events only). Shows whether the event generated outcomes, not just activity.

```
┌──────────────────────────────────────────────────────────┐
│  EVENT EFFECTIVENESS                                     │
│                                                          │
│  Winter Showcase (Feb 1)                                 │
│  5 notes · 2 Hot · 1 Warm · 0 follow-ups completed      │
│  ⚠ 0% follow-up completion — 4 stale actions             │
│  Impact: 0 routed to pods · 0 recommendations created    │
│                                                          │
│  (upcoming events show prep readiness only)               │
│  SoCal Showcase (Tomorrow) · Prep: Not started           │
│  Elite Academy Tournament (3 days) · Prep: In progress   │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Key Metric: Follow-Up Completion Rate**
For past events: notes with Hot/Warm interest that had follow-ups marked → how many were actually routed to pods or completed?

**Impact Chain:**
Event notes captured → Follow-ups identified → Routed to Support Pod → Recommendations created → Warm responses received

Each step in the chain is a conversion. Program Intelligence shows where the funnel breaks.

### Data Sources
- Events: `UPCOMING_EVENTS` (past events with `capturedNotes`)
- Follow-up completion: notes where `routed_to_pod == True` / total notes with follow-ups
- Downstream: cross-reference `advocacy_engine.RECOMMENDATIONS` with event notes

### API Response Shape
```json
{
  "past_events": [
    {
      "id": "event_0",
      "name": "Winter Showcase",
      "date": "2026-02-01T...",
      "notes_captured": 5,
      "hot_interactions": 2,
      "warm_interactions": 1,
      "follow_ups_identified": 4,
      "follow_ups_completed": 0,
      "follow_up_completion_pct": 0,
      "routed_to_pods": 0,
      "recommendations_created": 0,
      "attention_note": "0% follow-up completion — 4 stale actions"
    }
  ],
  "upcoming_events": [
    {
      "id": "event_1",
      "name": "SoCal Showcase",
      "days_away": 1,
      "prep_status": "not_started",
      "athletes_attending": 6
    }
  ]
}
```

---

## Section 4: Advocacy Outcomes

### Decision Supported
**"Is our advocacy producing results? Where should we focus effort?"**

### What to Show

**Advocacy Pipeline**
Simple funnel counts, not a CRM pipeline chart.

```
┌──────────────────────────────────────────────────────────┐
│  ADVOCACY OUTCOMES                                       │
│                                                          │
│  5 Total · 1 Draft · 1 Sent · 1 Awaiting · 1 Warm · 1 Closed │
│                                                          │
│  Response rate: 50% (1 warm / 2 sent+awaiting)           │
│                                                          │
│  ⚠ 1 recommendation awaiting reply >5 days (Stanford)    │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Aging Recommendations**
Recommendations that have been sent but not responded to, sorted by staleness.

```
│  AGING RECOMMENDATIONS                                   │
│                                                          │
│  Olivia Anderson → Stanford   5 days, no response        │
│  1 follow-up already sent                                │
│  → View recommendation                                   │
```

**School Response Activity**
Which schools are responsive vs unresponsive? Drawn from relationship data.

```
│  SCHOOL RESPONSE ACTIVITY                                │
│                                                          │
│  Michigan    ● Hot    1 warm response · 1 rec sent       │
│  Stanford    ● Cold   0 responses · 1 rec awaiting       │
│  Georgetown  ● Warm   1 positive outcome · 1 closed      │
│  Virginia    ● —      1 sent (1 day ago, too early)      │
```

### Data Sources
- Recommendations: `advocacy_engine.RECOMMENDATIONS`
- Relationships: `advocacy_engine.get_all_relationships()`

### API Response Shape
```json
{
  "pipeline": {
    "total": 5,
    "draft": 1,
    "sent": 1,
    "awaiting_reply": 1,
    "warm_response": 1,
    "closed": 1
  },
  "response_rate": 0.5,
  "aging_recommendations": [
    {
      "id": "rec_2",
      "athlete_name": "Olivia Anderson",
      "school_name": "Stanford",
      "days_since_sent": 5,
      "follow_up_count": 1,
      "status": "awaiting_reply"
    }
  ],
  "school_activity": [
    {
      "school_name": "Michigan",
      "warmth": "hot",
      "recs_sent": 1,
      "warm_responses": 1,
      "response_rate": 1.0
    }
  ]
}
```

---

## Section 5: Support Load

### Decision Supported
**"Are coaches overloaded? Is work distributed fairly? Where are ownership gaps?"**

### What to Show

**Load by Owner**
Who owns how many open actions, and how many are overdue.

```
┌──────────────────────────────────────────────────────────┐
│  SUPPORT LOAD                                            │
│                                                          │
│  Coach Martinez                                          │
│  18 open actions · 4 overdue · 12 athletes               │
│  ⚠ Overloaded — highest action count in program          │
│  ████████████████████ 18                                 │
│                                                          │
│  Coach Thompson                                          │
│  6 open actions · 1 overdue · 5 athletes                 │
│  ██████░░░░░░░░░░░░░░ 6                                 │
│                                                          │
│  Unassigned                                              │
│  3 actions with no owner                                 │
│  ⚠ Ownership gap — these need assignment                 │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Overload Detection**
If one coach has >2x the actions of another, flag it.

```
│  ⚠ Coach Martinez has 3x the open actions of Coach       │
│  Thompson. Consider redistributing 5-6 actions.          │
```

**Ownership Gaps**
Interventions with no assigned owner.

### Data Sources
- Interventions: `ALL_INTERVENTIONS` grouped by `owner`
- Pod actions: `pod_actions` collection grouped by `owner`
- Athletes per owner: cross-reference via interventions

### API Response Shape
```json
{
  "by_owner": [
    {
      "owner": "Coach Martinez",
      "open_actions": 18,
      "overdue": 4,
      "athletes_assigned": 12,
      "is_overloaded": true
    },
    {
      "owner": "Coach Thompson",
      "open_actions": 6,
      "overdue": 1,
      "athletes_assigned": 5,
      "is_overloaded": false
    }
  ],
  "unassigned_actions": 3,
  "imbalance_detected": true,
  "imbalance_note": "Coach Martinez has 3x the open actions of Coach Thompson"
}
```

---

## API Specification

### Endpoint

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/program/intelligence` | Return all 5 sections in a single response |

A single endpoint returns all data for the page. This keeps the frontend simple — one fetch, one render. The backend computes all 5 sections from existing data sources.

### Full Response Shape
```json
{
  "program_health": { ... },
  "readiness": { ... },
  "event_effectiveness": { ... },
  "advocacy_outcomes": { ... },
  "support_load": { ... },
  "generated_at": "2026-02-08T..."
}
```

---

## Frontend Layout

Single scrollable page. No tabs, no sub-navigation. The director reads top-to-bottom.

```
┌──────────────────────────────────────────────────────────┐
│  HEADER (with Program tab active)                        │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Program Intelligence                                    │
│  Strategic overview · 25 athletes · 7 events · 5 recs    │
│                                                          │
│  ┌── § 1: PROGRAM HEALTH ──────────────────────────────┐ │
│  │  (pod distribution, issues, attention callout)       │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌── § 2: READINESS ───────────────────────────────────┐ │
│  │  (grad year matrix, stalled athletes)               │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌── § 3: EVENT EFFECTIVENESS ─────────────────────────┐ │
│  │  (past event impact, follow-up completion)          │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌── § 4: ADVOCACY OUTCOMES ───────────────────────────┐ │
│  │  (pipeline, aging recs, school activity)            │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌── § 5: SUPPORT LOAD ───────────────────────────────┐  │
│  │  (owner distribution, overload, gaps)              │  │
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Component Structure
```
/frontend/src/pages/
  ProgramIntelligence.js          ← Single page, 5 sections

/frontend/src/components/program/
  ProgramHealth.js                ← § 1
  ReadinessMatrix.js              ← § 2
  EventEffectiveness.js           ← § 3
  AdvocacyOutcomes.js             ← § 4
  SupportLoad.js                  ← § 5
```

### Visual Language
- **No pie charts, no line graphs, no bar charts** unless they directly answer a question
- **Segmented bars** for distributions (pod health, readiness %)
- **Count summaries** (not percentages alone — "6 athletes" is more useful than "24%")
- **Attention callouts** (⚠ prefixed, amber background) for items needing action
- **Calm base** — most of the screen is low-contrast data; attention items pop
- **Links** — stalled athletes link to Support Pod, events link to Event Mode, aging recs link to Advocacy

---

## Route Addition to App.js

```jsx
<Route path="/program" element={<ProgramIntelligence />} />
```

## Navigation Update

```
┌──────────────────────────────────────────────────────────────┐
│  [Mission Control]  [Events]  [Advocacy]  [Program]          │
└──────────────────────────────────────────────────────────────┘
```

All 4 operating modes now active. "Support Pods" remains accessible via direct links from other modes (not a top-level nav item — you always arrive at a specific pod).

---

## V1 Build Scope

### Build
1. Backend: `program_engine.py` — compute all 5 sections from existing data sources
2. Backend API: single `GET /api/program/intelligence` endpoint
3. Frontend: `ProgramIntelligence.js` page with 5 section components
4. Navigation: activate "Program" tab in header
5. Links: stalled athletes → Support Pod, aging recs → Advocacy detail, events → Event Mode

### Defer
- Historical trending (requires persistent data to compare over time)
- Configurable thresholds (stall duration, overload detection)
- Export / report generation
- Coach-specific views (filter by owner)
- Comparison between time periods

---

## Design Principles

1. **Decisions, not data.** Every section answers "what needs attention?" or "what should change?"
2. **Signal over noise.** A calm page with 3-4 attention callouts is more useful than 20 charts.
3. **Counts, not just percentages.** "6 athletes at risk" is actionable. "24% at risk" needs context.
4. **Attention flows outward.** Each callout links to the relevant operating mode for action.
5. **Director speed.** Entire program state scannable in under 2 minutes.
6. **No vanity metrics.** "25 athletes in program" is not intelligence. "6 athletes at risk in the cohort that should be actively recruiting" is.

---

**Ready for implementation.**
