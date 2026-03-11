# Support Pod → Intervention Console: Upgrade Plan

## Current State
- The Athlete Support Pod exists with 5 blocks: Active Issue Banner, Athlete Snapshot, Pod Members, Next Actions, Treatment History
- Your 10-point "intervention console" overhaul was received but NOT STARTED
- There's also a P0 bug in DirectorActionsCard (items disappear on Acknowledge/Resolve)

---

## Step 0 — Bug Fix: DirectorActionsCard (P0)

**Problem:** Items disappear from the Director Actions list when clicking "Acknowledge" or "Resolve"

**Root Cause:** Race condition — optimistic UI update changes the item's status locally, but `fetchActions()` immediately re-fetches from the server, causing the item to flash/disappear before the visual transition completes.

**Fix:**
- Add a debounced re-fetch (wait ~2s after optimistic update before re-fetching)
- Ensure the resolved section auto-expands when items move there
- Add a brief highlight animation on the changed item

**Files:** `frontend/src/components/mission-control/DirectorActionsCard.js`

---

## Batch 1 — Enhance Existing Blocks (Points 1-6)

### Point 1: Active Issue Banner Enhancement

**Goal:** Emphasize the primary action a coach must take

**Changes:**
- Make "WHAT TO DO NOW" section more prominent — larger font (text-lg → text-xl), bolder weight
- Add urgency badge (e.g., "TIME SENSITIVE" or "ACT TODAY") based on intervention score/urgency
- Increase visual contrast of the recommended action box
- Add a subtle pulsing animation on the action area to draw the eye

**File:** `frontend/src/components/support-pod/ActiveIssueBanner.js`

---

### Point 2: Athlete Snapshot — Add Recruiting Context

**Goal:** Add Coach Engagement and Recruiting Progress metrics

**Changes:**
- Add "Coach Engagement" metric: derived from how many coaches have responded/interacted
  - Display: score (e.g., "4/6 coaches engaged") + health bar
  - Color: green (>60%), amber (30-60%), red (<30%)
- Add "Recruiting Progress" metric: pipeline stage progression indicator
  - Visual: step progress indicator showing where the athlete is in the recruiting journey
  - Steps: Exploring → Contacted → Engaged → Narrowing → Committed
- Keep existing: Momentum, Stage, Pipeline Health, Target Schools, Blockers, Readiness, Upcoming Events

**Files:**
- `frontend/src/components/support-pod/AthleteSnapshot.js`
- `backend/routers/support_pods.py` (enrich athlete data with engagement metrics)
- `backend/support_pod.py` (add helper functions for engagement calculation)

---

### Point 3: Support Team — Quick Contact Actions

**Goal:** Add Message and Call quick-contact buttons for each pod member

**Changes:**
- Replace the current small ghost message icon with two visible buttons per member:
  - "Message" button (MessageSquare icon + text) — opens inline message form
  - "Call" button (Phone icon + text) — logs a call interaction to timeline
- Add email display under each member name
- Primary coach gets emphasized action buttons (filled style vs outline for others)

**File:** `frontend/src/components/support-pod/PodMembers.js`

---

### Point 4: Next Actions — Simplify to Top 3

**Goal:** Highlight the top 3 primary actions instead of showing everything

**Changes:**
- Show only the TOP 3 highest-priority actions prominently at the top
  - Priority order: Overdue > Ready (by due date) > Upcoming
  - Each with large checkbox, clear title, owner badge, due date
- Collapse remaining actions under "Show all X actions" expandable section
- Add a "priority rank" visual (1, 2, 3 badges) on the top actions
- Keep the existing add action form and reassign functionality

**File:** `frontend/src/components/support-pod/NextActions.js`

---

### Point 5: Coaching Suggestions Button — Rename + Helper Text

**Goal:** Rename the AI suggestions button and add context

**Changes:**
- Rename button from "Suggest Actions for This Athlete" to "Get Coaching Suggestions"
- Add helper text below: "AI will analyze this athlete's situation and suggest next steps"
- Rename section label from "AI Suggested Actions" to "Coaching Suggestions"

**File:** `frontend/src/pages/SupportPod.js` (where AiSuggestedActions is rendered)

---

### Point 6: Treatment History — Event Type Icons Enhancement

**Goal:** Improve scannability with better visual distinction per event type

**Changes:**
- Add colored left border to each timeline entry matching its type color
- Increase icon size slightly (w-7 h-7 → w-8 h-8) for better visibility
- Add type label badge next to the timestamp (e.g., "Note", "Resolution", "Blocker")
- Add "blocker_flagged" and "stage_change" to the filter options
- Use more distinct icon shapes per type for colorblind accessibility

**File:** `frontend/src/components/support-pod/TreatmentTimeline.js`

---

## Batch 2 — New Sections (Points 7-9)

### Point 7: Recruiting Timeline (NEW)

**Goal:** Show key recruiting progression events in a visual timeline

**What it shows:**
- A vertical timeline of major recruiting milestones across all target schools
- Event types: First Outreach Sent, Coach Responded, Campus Visit Scheduled, Official Visit, Offer Received, Verbal Commit
- Each event: school name, date, event type icon, brief description
- Color-coded by school (or by event type)
- Shows progression — where is this athlete in the recruiting journey

**Data Source:**
- Derived from pipeline data (school interactions, stage changes)
- Mock data for V1 — generated deterministically from athlete's school targets and recruiting stage

**New Files:**
- `frontend/src/components/support-pod/RecruitingTimeline.js` (NEW component)
- Backend: add `recruiting_timeline` field to support pod response

---

### Point 8: Recruiting Intelligence (NEW)

**Goal:** Rule-based section that interprets recruiting signals and recommends interventions

**What it shows:**
- A panel of "signal cards" — each card represents a detected pattern
- Example signals:
  - "3 schools went silent after initial contact" → Recommend: "Follow up with personalized video"
  - "Strong D2 interest but no D1 responses" → Recommend: "Adjust target list or strengthen highlights"
  - "2 coaches opened profile but didn't respond" → Recommend: "Send follow-up email with updated stats"
  - "Approaching showcase with incomplete prep" → Recommend: "Complete prep checklist ASAP"
- Each signal: icon, title, description, recommended action, priority level
- Deterministic rules engine — no LLM needed

**Data Source:**
- Rules engine that evaluates athlete's pipeline data, momentum, interventions, and events
- Generates signals deterministically based on patterns

**New Files:**
- `frontend/src/components/support-pod/RecruitingIntelligence.js` (NEW component)
- `backend/support_pod.py` (add `generate_recruiting_signals()` function)
- Backend: add `recruiting_signals` field to support pod response

---

### Point 9: Intervention Playbooks (NEW)

**Goal:** Provide structured recovery plans for common issues

**What it shows:**
- Pre-built playbook cards triggered by the active intervention category
- Each playbook contains:
  - Title (e.g., "Momentum Recovery Plan", "Re-engagement Playbook", "Showcase Prep Checklist")
  - Description of when to use it
  - Step-by-step actions (numbered list with checkboxes)
  - Estimated timeline (e.g., "3-5 days")
  - Suggested owner for each step
  - Success criteria (what "resolved" looks like)
- Playbook types mapped to intervention categories:
  - `momentum_drop` → "Momentum Recovery Plan"
  - `blocker` → "Blocker Resolution Playbook"
  - `deadline_proximity` → "Event Prep Checklist"
  - `engagement_drop` → "Re-engagement Playbook"
  - `ownership_gap` → "Ownership Assignment Guide"
  - `readiness_issue` → "Readiness Improvement Plan"

**Data Source:**
- Static playbook definitions (hardcoded structured data)
- Matched to the current active intervention category

**New Files:**
- `frontend/src/components/support-pod/InterventionPlaybooks.js` (NEW component)
- Playbook data defined as constants within the component

---

## Batch 3 — Quick Actions Bar (Point 10)

### Point 10: Quick Actions Bar (NEW)

**Goal:** Always-accessible bar for common coaching actions

**What it shows:**
- Sticky bar positioned below the header
- Buttons:
  - Send Message (opens message modal/form)
  - Log Interaction (opens quick note form)
  - Schedule Check-in (opens date picker + note form)
  - Flag for Director (creates a director action request)
- Compact design — icon + short label per button
- Responsive: horizontal scroll on mobile

**New Files:**
- `frontend/src/components/support-pod/QuickActionsBar.js` (NEW component)
- Integrated into `SupportPod.js` page layout

---

## Final Page Layout (top to bottom)

```
┌─────────────────────────────────────────────────┐
│ HEADER (existing - athlete name, health, nav)   │
├─────────────────────────────────────────────────┤
│ QUICK ACTIONS BAR (NEW - Point 10)              │
│ [Send Message] [Log Interaction] [Schedule]     │
│ [Flag for Director]                             │
├─────────────────────────────────────────────────┤
│ ACTIVE ISSUE BANNER (Enhanced - Point 1)        │
│ Emphasized primary action, urgency badge        │
├─────────────────────────────────────────────────┤
│ ┌───────────────────┐ ┌───────────────────────┐ │
│ │ ATHLETE SNAPSHOT  │ │ SUPPORT TEAM          │ │
│ │ (Enhanced - Pt 2) │ │ (Enhanced - Pt 3)     │ │
│ │ + Coach Engagement│ │ + Message/Call buttons │ │
│ │ + Recruiting Prog │ │                       │ │
│ └───────────────────┘ └───────────────────────┘ │
├─────────────────────────────────────────────────┤
│ NEXT ACTIONS (Simplified - Point 4)             │
│ Top 3 priority actions + "Show all" expander    │
├─────────────────────────────────────────────────┤
│ COACHING SUGGESTIONS (Renamed - Point 5)        │
│ "Get Coaching Suggestions" + helper text        │
├─────────────────────────────────────────────────┤
│ RECRUITING INTELLIGENCE (NEW - Point 8)         │
│ Signal cards with detected patterns             │
├─────────────────────────────────────────────────┤
│ INTERVENTION PLAYBOOKS (NEW - Point 9)          │
│ Recovery plan matched to active issue           │
├─────────────────────────────────────────────────┤
│ RECRUITING TIMELINE (NEW - Point 7)             │
│ Visual timeline of recruiting milestones        │
├─────────────────────────────────────────────────┤
│ QUICK NOTE (existing)                           │
├─────────────────────────────────────────────────┤
│ TREATMENT HISTORY (Enhanced - Point 6)          │
│ Better icons, colored borders, type labels      │
└─────────────────────────────────────────────────┘
```

---

## Implementation Approach

- **Frontend-focused** with backend data enrichment where needed
- **Mock/deterministic data** for new sections (Recruiting Timeline, Intelligence, Playbooks) — no LLM required
- **Existing theme** maintained (light background with dark accents, consistent with current Support Pod)
- **Testing** via testing agent after each batch

## Estimated Batches
1. Bug fix + Batch 1 (existing enhancements): ~6 components modified
2. Batch 2 (new sections): ~3 new components + backend enrichment
3. Batch 3 (quick actions bar): ~1 new component + page layout update
