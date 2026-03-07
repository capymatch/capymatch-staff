# CapyMatch AI V1 Plan

## Philosophy
AI should feel like a sharp, well-briefed assistant — not a chatbot.
Every AI output is assistive, not authoritative. Clear reasoning, human approval for outward-facing content.

## Prioritized Use Cases (4 for V1)

### 1. Program Intelligence Narrative — "The Briefing"
**Value:** Highest. Turns raw metrics into executive-ready insight.
**Trigger:** Automatic on page load (cached, regenerated when data changes).
**Where:** Top of Program Intelligence page, above metrics.
**What it does:** 2-3 sentence narrative summarizing what changed, what matters, and what to watch. Coach-scoped for coaches.
**Data needed:** Program health metrics, trend data, athlete counts, advocacy outcomes.
**Example:** _"Your program has 3 athletes with declining engagement this week. Advocacy response rates improved 12% — the follow-up cadence is working. Watch: 2 events next week with unprepared athletes."_

### 2. Event Recap Summary — "What Happened"
**Value:** High. Saves 30min of post-event note consolidation.
**Trigger:** On-demand button on Event Summary page.
**Where:** Event Summary page, above notes list.
**What it does:** Synthesizes all captured notes into a structured recap: standout athletes, schools showing interest, follow-up priorities.
**Data needed:** All event_notes for the event, athlete names, school names.
**Example:** _"At Midwest Showcase (12 notes captured): 3 athletes drew strong interest from Big Ten schools. Emma Chen had standout moments noted by 2 coaches. Priority follow-ups: Ohio State showed high interest in 2 athletes."_

### 3. Advocacy Draft Assistant — "Help Me Write This"
**Value:** High. Directly accelerates the most time-consuming coach workflow.
**Trigger:** On-demand button when creating/editing a recommendation.
**Where:** Recommendation Builder page.
**What it does:** Generates a fit summary and intro draft based on athlete profile + school + event notes. Coach reviews and edits before sending.
**Data needed:** Athlete profile, school info, event notes, existing recommendation context.
**Example:** _"Emma Chen is a strong fit for Ohio State's program. As a 2026 midfielder with club-level experience at FC Thunder, she demonstrated consistent technical ability at the Midwest Showcase. Coach Williams noted her vision and work rate in two separate observations."_

### 4. Mission Control Daily Briefing — "What To Do First"
**Value:** Medium-high. Helps coaches prioritize their day.
**Trigger:** Automatic on Mission Control load (cached daily).
**Where:** Top of Mission Control, above alerts.
**What it does:** 2-3 prioritized action suggestions with reasoning, based on alerts, upcoming events, and athlete states.
**Data needed:** Priority alerts, upcoming events, athletes needing attention, recent activity.
**Example:** _"Priority today: (1) Follow up with Ohio State re: Emma Chen — they responded 3 days ago and you haven't replied. (2) Prep for Saturday's showcase — 4 of your athletes are attending with incomplete profiles."_

---

## Deferred to V2
- **Support Pod AI Summary** — needs more pod interaction data to be useful
- **Predictive analytics** — needs historical data accumulation first

## Implementation Architecture

```
/app/backend/services/ai.py          — LLM client wrapper + prompt builder
/app/backend/routers/intelligence.py — AI generation endpoints

Endpoints:
  POST /api/ai/briefing          — Mission Control daily briefing
  POST /api/ai/program-narrative — Program Intelligence narrative
  POST /api/ai/event-recap       — Event summary from notes
  POST /api/ai/advocacy-draft    — Recommendation draft text
```

All endpoints:
- Accept current_user for ownership scoping
- Return { text, generated_at, data_used }
- Cache responses for reasonable periods
- Never auto-send anything externally

## Build Order
1. AI service layer (services/ai.py)
2. Program Intelligence Narrative
3. Event Recap Summary
4. Advocacy Draft Assistant
5. Mission Control Briefing
