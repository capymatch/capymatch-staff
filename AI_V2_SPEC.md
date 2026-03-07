# AI V2 Specification — CapyMatch Intelligence Layer

## Design Principles
- Every suggestion includes: **WHY** (reasoning) + **EVIDENCE** (data source) + **OWNER** (who should act) + **CTA** (what to do)
- No black-box recommendations — users can trace every suggestion to data
- No auto-sending — drafts only
- Coach scope = owned athletes only; Director scope = full program
- All features are on-demand (button-triggered)

---

## Feature 1: Suggested Next Actions

**Where:** Mission Control (all users) + Support Pod (per-athlete)

### Mission Control — "What should I do next?"
- **Endpoint:** `POST /api/ai/suggested-actions`
- **Input:** Priority alerts, athletes needing attention, upcoming events, program snapshot, open recommendations
- **Output:** Array of structured action objects:
  ```json
  {
    "actions": [
      {
        "action": "Follow up with UCLA about Sarah Martinez",
        "why": "Recommendation sent 12 days ago with no response",
        "evidence": "Recommendation rec_042, sent 2026-02-23, 0 follow-ups",
        "owner": "Coach Williams",
        "cta": "Open recommendation",
        "cta_link": "/advocacy/rec_042",
        "priority": "high",
        "category": "advocacy"
      }
    ]
  }
  ```
- **Categories:** advocacy, event_prep, athlete_support, admin
- **Scoping:** Coach sees actions for owned athletes only. Director sees all.

### Support Pod — "What should I do for this athlete?"
- **Endpoint:** `POST /api/ai/pod-actions/{athlete_id}`
- **Input:** Athlete data, interventions, open actions, timeline, upcoming events
- **Output:** Same structured action format, scoped to one athlete
- **Scoping:** Must pass `can_access_athlete` check

---

## Feature 2: Support Pod Brief

**Where:** Top of Support Pod page (per-athlete)

- **Endpoint:** `POST /api/ai/pod-brief/{athlete_id}`
- **Input:** Athlete snapshot, active interventions, pod health, recent timeline events, open actions
- **Output:**
  ```json
  {
    "text": "2-3 sentence summary of athlete's current state and what needs attention",
    "status_signal": "needs_attention|stable|improving",
    "key_facts": [
      {"label": "Days since last contact", "value": "14", "flag": "overdue"},
      {"label": "Open actions", "value": "3", "flag": null},
      {"label": "Active issue", "value": "Academic concern", "flag": "active"}
    ]
  }
  ```
- **Scoping:** Must pass `can_access_athlete` check

---

## Feature 3: Program-Level Narrative Insights (Director)

**Where:** Program Intelligence page, replaces/enhances existing V1 program narrative

- **Endpoint:** `POST /api/ai/program-insights` (director-only)
- **Input:** Full program data: health, readiness, events, advocacy, support load, trends
- **Output:**
  ```json
  {
    "narrative": "3-4 sentence strategic overview",
    "insights": [
      {
        "insight": "2027 class has 3 stalled athletes with no activity in 30+ days",
        "why": "Stalled athletes in critical recruiting window risk missing deadlines",
        "evidence": "Athletes: James Wilson (42d), Michael Brown (38d), David Lee (35d)",
        "recommendation": "Schedule check-in calls this week",
        "severity": "high"
      }
    ]
  }
  ```
- **Scoping:** Director-only. Coach sees their own V1 narrative (unchanged).

---

## Feature 4: Event-Driven Follow-Up Suggestions

**Where:** Event Summary page, below the existing V1 recap

- **Endpoint:** `POST /api/ai/event-followups/{event_id}`
- **Input:** Event data, all captured notes, existing follow-up actions, recommendation pipeline
- **Output:**
  ```json
  {
    "followups": [
      {
        "action": "Send recommendation to Stanford for athlete Emily Davis",
        "why": "Hot interest signal from Stanford coach, athlete expressed mutual interest",
        "evidence": "Note from Feb 15: 'Stanford coach asked for highlight reel'",
        "owner": "Coach Williams",
        "cta": "Create recommendation",
        "cta_link": "/advocacy/new",
        "priority": "high",
        "athlete_id": "athlete_5",
        "athlete_name": "Emily Davis"
      }
    ]
  }
  ```
- **Scoping:** Coach sees follow-ups for their athletes only. Director sees all.

---

## Implementation Order
1. `generate_suggested_actions` + `generate_pod_actions` (backend + frontend)
2. `generate_pod_brief` (backend + frontend)
3. `generate_program_insights` (backend + frontend)
4. `generate_event_followups` (backend + frontend)

## Schema
No new collections needed. All V2 features are on-demand generation using existing data.
