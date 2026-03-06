# Advocacy Mode — Implementation Specification

**Version:** 1.0 (Implementation-Ready)
**Status:** READY FOR BUILD
**Routes:**
- `/advocacy` — Advocacy Home (recommendation list)
- `/advocacy/new` — Recommendation Builder
- `/advocacy/:recommendationId` — Recommendation Detail / Response Tracking
- `/advocacy/relationships/:schoolId` — School Relationship Memory

---

## Product Position

**Mission Control = Triage.** What needs help right now.
**Support Pod = Treatment.** How to coordinate and resolve an issue.
**Event Mode = Capture.** Convert live recruiting moments into follow-up.
**Advocacy Mode = Promotion.** Turn recruiting momentum into coach-backed introductions and sustained school relationships.

Advocacy Mode is NOT an email client. It is NOT a CRM pipeline. It is the **promotion and relationship memory system** where a club coach's credibility is leveraged to open doors for athletes. The coach is vouching — and the system helps them do it with context, history, and follow-through.

Every recommendation carries the coach's reputation. The system should make that feel weighty, not transactional.

---

## Core Concept: The Recommendation

A recommendation is a coach-backed introduction of an athlete to a college program. It is the atomic unit of Advocacy Mode. It carries:

1. **Who** — athlete + college coach/program
2. **Why** — fit reasons (athletic, academic, character)
3. **Evidence** — event notes, clips, performance context
4. **Relationship context** — prior interactions with this school
5. **Ask** — the desired next step (evaluate at event, schedule call, review film)

A recommendation is NOT a cold email. It is a trusted introduction built on observed evidence and existing relationships.

---

## How You Get Here

### Primary Flows
- **From header navigation:** "Advocacy" mode tab
- **From Event Summary:** "Hot" interest notes with "Route to Pod" can also seed a recommendation
- **From Support Pod:** Athletes with strong school interest can trigger "Recommend" action
- **Direct:** Coach opens Advocacy Home to manage active recommendations

### Deep Links
```
/advocacy                              → Advocacy Home
/advocacy/new?athlete=athlete_5&school=ucla  → Pre-populated builder
/advocacy/:recommendationId            → Detail + response tracking
/advocacy/relationships/:schoolId      → School relationship history
```

---

## Screen 1: Advocacy Home

**Route:** `/advocacy`

### Purpose
The coach's active recommendation board. What's in progress, what needs follow-up, what's been sent. Organized by status, not by date.

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│  ADVOCACY                                  [+ New Recommendation] │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  [All] [Drafts] [Sent] [Awaiting Reply] [Responded] [Closed]│
│                                                              │
│  [Athlete ▾] [School ▾] [Grad Year ▾]                       │
│                                                              │
│  ── NEEDS ATTENTION ───────────────────────────────────────  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Sarah Martinez → UCLA              AWAITING REPLY      │  │
│  │ Sent 4 days ago · "Athletic fit, strong footwork"      │  │
│  │ No response yet                                        │  │
│  │ ⚠ Follow-up recommended                               │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Marcus Johnson → Michigan           WARM RESPONSE       │  │
│  │ Sent 6 days ago · "GK talent, spring camp candidate"   │  │
│  │ Michigan coach replied — wants to see spring tape       │  │
│  │ → Next: Send updated film                              │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ── DRAFTS ────────────────────────────────────────────────  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Emma Chen → Duke                   DRAFT                │  │
│  │ Started 1 day ago · Fit: Defensive positioning         │  │
│  │ [Continue Editing →]                                   │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ── RECENTLY SENT ─────────────────────────────────────────  │
│  ...                                                         │
│                                                              │
│  ── CLOSED ────────────────────────────────────────────────  │
│  ...                                                         │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Recommendation Card Fields
| Field | Source | Display |
|-------|--------|---------|
| Athlete name | `rec.athlete_name` | "Sarah Martinez" |
| School name | `rec.school_name` | "→ UCLA" |
| Status | `rec.status` | Badge: DRAFT / SENT / AWAITING REPLY / WARM RESPONSE / CLOSED |
| Fit summary | `rec.fit_summary` (first fit reason) | Truncated preview |
| Time context | `rec.sent_at` or `rec.created_at` | "Sent 4 days ago" / "Started 1 day ago" |
| Response summary | `rec.response_note` | Latest response text if any |
| Follow-up flag | Derived from status + time | "Follow-up recommended" if awaiting >3 days |
| Next step | `rec.next_step` | "Next: Send updated film" |

### Status Badges
| Status | Color | Meaning |
|--------|-------|---------|
| `draft` | Gray | Being composed, not yet sent |
| `sent` | Blue | Sent to college coach |
| `awaiting_reply` | Amber | Waiting for response |
| `warm_response` | Emerald | Positive response received |
| `follow_up_needed` | Orange | Requires coach action |
| `closed` | Gray muted | No further action (positive or negative) |

### Grouping Logic
Cards are grouped by priority:
1. **Needs Attention:** `awaiting_reply` >3 days, `follow_up_needed`, `warm_response` (action needed)
2. **Drafts:** `draft` status
3. **Recently Sent:** `sent` or `awaiting_reply` <3 days
4. **Closed:** `closed` status

### Filters
- **Status tabs:** All / Drafts / Sent / Awaiting Reply / Responded / Closed
- **Athlete filter:** Dropdown of athletes with active recommendations
- **School filter:** Dropdown of schools
- **Grad Year filter:** 2025 / 2026 / 2027

### Interactions
| Action | Behavior |
|--------|----------|
| **Click card** | Navigate to `/advocacy/:id` (detail + response tracking) |
| **+ New Recommendation** | Navigate to `/advocacy/new` |
| **Continue Editing** (draft) | Navigate to `/advocacy/:id` in edit mode |

### Component
`AdvocacyHome.js` (page)

---

## Screen 2: Recommendation Builder

**Route:** `/advocacy/new` (new) or `/advocacy/:id` with `?edit=true` (editing draft)

### Purpose
Compose a coach-backed recommendation. This is where the coach's credibility meets evidence. The builder guides the coach through constructing a compelling introduction — not writing an email.

### Design Principle
The builder should feel like assembling a case file, not filling in a form. Each section adds weight to the recommendation.

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│  ← Advocacy    New Recommendation                            │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─── ATHLETE ─────────────────────────────────────────────┐ │
│  │                                                         │ │
│  │  [Search or select athlete...]                          │ │
│  │                                                         │ │
│  │  Selected: Sarah Martinez · 2026 · Forward · U17        │ │
│  │  Momentum: ↗ 7 rising · 6 target schools               │ │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─── SCHOOL / PROGRAM ────────────────────────────────────┐ │
│  │                                                         │ │
│  │  [Search or select school...]                           │ │
│  │                                                         │ │
│  │  Selected: UCLA · D1                                    │ │
│  │  Relationship: 2 prior interactions                     │ │
│  │  Last contact: SoCal Showcase (3 days ago)              │ │
│  │  [View full relationship →]                             │ │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─── WHY THIS ATHLETE FITS ──────────────────────────────┐  │
│  │                                                         │ │
│  │  Fit Reasons (select all that apply):                   │ │
│  │  [✓ Athletic ability]  [✓ Tactical awareness]           │ │
│  │  [  Academic fit]      [  Character/leadership]         │ │
│  │  [  Coachability]      [  Program need match]           │ │
│  │                                                         │ │
│  │  Custom note:                                           │ │
│  │  ┌──────────────────────────────────────────────────┐   │ │
│  │  │ Her footwork and off-ball movement are exactly   │   │ │
│  │  │ what UCLA's attacking system needs...            │   │ │
│  │  └──────────────────────────────────────────────────┘   │ │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─── SUPPORTING CONTEXT ─────────────────────────────────┐  │
│  │                                                         │ │
│  │  From events:                                           │ │
│  │  ● SoCal Showcase — "Coach loved her footwork" (Hot)    │ │
│  │  ● Winter Showcase — "Stanford pulled her aside" (Hot)  │ │
│  │                                                         │ │
│  │  From Support Pod:                                      │ │
│  │  ● Momentum: Rising (7/10)                              │ │
│  │  ● Stage: Actively Recruiting                           │ │
│  │  ● 3 schools responding                                 │ │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─── INTRO MESSAGE ──────────────────────────────────────┐  │
│  │                                                         │ │
│  │  ┌──────────────────────────────────────────────────┐   │ │
│  │  │ Coach [Name], I wanted to introduce you to       │   │ │
│  │  │ Sarah Martinez, a 2026 forward in our U17        │   │ │
│  │  │ program. I saw your staff's interest at SoCal    │   │ │
│  │  │ Showcase and wanted to personally vouch for...   │   │ │
│  │  └──────────────────────────────────────────────────┘   │ │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─── DESIRED NEXT STEP ──────────────────────────────────┐  │
│  │                                                         │ │
│  │  [  Evaluate at upcoming event]                         │ │
│  │  [✓ Review film / highlight reel]                       │ │
│  │  [  Schedule call with family]                          │ │
│  │  [  Visit campus]                                       │ │
│  │  [  Attend ID camp / clinic]                            │ │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  [Save Draft]                    [Send Recommendation →]     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Sections

**1. Athlete Selection**
- Search/select from athlete roster
- Once selected, shows snapshot: name, grad year, position, team, momentum, targets

**2. School/Program Selection**
- Search/select from school list
- Shows existing relationship summary if any (prior interactions count, last contact)
- Link to full relationship view

**3. Fit Reasons**
- Chip-select from predefined categories: Athletic ability, Tactical awareness, Academic fit, Character/leadership, Coachability, Program need match
- Custom note field for specific fit explanation

**4. Supporting Context**
- Auto-populated from Event Mode notes where athlete × school match (or athlete × any, for general evidence)
- Shows Support Pod snapshot data (momentum, stage, interest level)
- Coach can select which event notes to attach

**5. Intro Message**
- Text field for the coach's personal message
- This is the coach vouching — not a system-generated email

**6. Desired Next Step**
- Single-select from: Evaluate at event, Review film, Schedule call, Visit campus, Attend camp
- This tells the college coach what the club coach hopes will happen next

### Data Model: Recommendation

```json
{
  "id": "rec_uuid",
  "athlete_id": "athlete_5",
  "athlete_name": "Olivia Anderson",
  "school_id": "ucla",
  "school_name": "UCLA",
  "college_coach_name": "",
  "status": "draft",
  "fit_reasons": ["athletic_ability", "tactical_awareness"],
  "fit_note": "Her footwork and off-ball movement are exactly what UCLA's system needs",
  "supporting_event_notes": ["past_note_1"],
  "intro_message": "Coach, I wanted to introduce you to...",
  "desired_next_step": "review_film",
  "created_by": "Coach Martinez",
  "created_at": "2026-02-08T...",
  "sent_at": null,
  "response_status": null,
  "response_note": null,
  "response_at": null,
  "follow_up_count": 0,
  "last_follow_up_at": null,
  "closed_at": null,
  "closed_reason": null
}
```

### Interactions
| Action | Behavior |
|--------|----------|
| **Save Draft** | Saves recommendation with status `draft` |
| **Send Recommendation** | Sets status to `sent`, records `sent_at`, logs to athlete timeline |

### Component
`RecommendationBuilder.js` (page)

---

## Screen 3: Recommendation Detail + Response Tracking

**Route:** `/advocacy/:recommendationId`

### Purpose
View a sent recommendation's full context and track the response. This is where the coach manages the conversation lifecycle — lightweight and operational, not a full email thread.

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│  ← Advocacy    Sarah Martinez → UCLA         AWAITING REPLY  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─── RECOMMENDATION SUMMARY ─────────────────────────────┐  │
│  │                                                         │ │
│  │  Athlete: Sarah Martinez · 2026 · Forward               │ │
│  │  School: UCLA · D1                                      │ │
│  │  Sent: Feb 5, 2026 (4 days ago)                         │ │
│  │  Ask: Review film / highlight reel                      │ │
│  │                                                         │ │
│  │  Fit: Athletic ability, Tactical awareness              │ │
│  │  "Her footwork and off-ball movement are exactly..."    │ │
│  │                                                         │ │
│  │  Event context:                                         │ │
│  │  ● SoCal Showcase — Hot interest from UCLA coach        │ │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─── RESPONSE TRACKING ──────────────────────────────────┐  │
│  │                                                         │ │
│  │  Status: ○ Sent → ◉ Awaiting Reply → ○ Responded       │ │
│  │                                                         │ │
│  │  [Log Response]  [Mark Follow-up Needed]  [Close]       │ │
│  │                                                         │ │
│  │  ── Response History ──                                 │ │
│  │                                                         │ │
│  │  Feb 5 · Sent recommendation to UCLA                    │ │
│  │  Feb 7 · Follow-up: No response after 2 days           │ │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─── RELATIONSHIP WITH UCLA ─────────────────────────────┐  │
│  │                                                         │ │
│  │  3 total interactions · 2 athletes introduced           │ │
│  │  Last: SoCal Showcase (3 days ago)                      │ │
│  │  [View full relationship →]                             │ │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Response Actions

| Action | Effect |
|--------|--------|
| **Log Response** | Opens inline form: response note + response type (warm/neutral/decline). Sets status to `warm_response` or `closed`. |
| **Mark Follow-up Needed** | Sets status to `follow_up_needed`, increments `follow_up_count`, records `last_follow_up_at` |
| **Close** | Sets status to `closed` with reason (positive_outcome / no_response / declined). Records `closed_at`. |

### Status Progression
```
draft → sent → awaiting_reply → warm_response → closed (positive)
                              → follow_up_needed → awaiting_reply (loop)
                              → closed (no_response / declined)
```

### Component
`RecommendationDetail.js` (page)

---

## Screen 4: School Relationship Memory

**Route:** `/advocacy/relationships/:schoolId`

### Purpose
Institutional memory for a school relationship. Every introduction, every event interaction, every response — aggregated over time. This is what makes the coach's advocacy informed rather than cold.

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│  ← Advocacy    UCLA — Relationship History                   │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─── RELATIONSHIP SUMMARY ───────────────────────────────┐  │
│  │                                                         │ │
│  │  UCLA · Division 1                                      │ │
│  │  5 total interactions · 3 athletes introduced           │ │
│  │  Last contact: SoCal Showcase (3 days ago)              │ │
│  │  Response rate: 2/3 (67%)                               │ │
│  │  Warmth: Warm (based on response history)               │ │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─── ATHLETES INTRODUCED ────────────────────────────────┐  │
│  │                                                         │ │
│  │  Sarah Martinez · 2026 · FWD    Rec: Sent (awaiting)   │ │
│  │  Jake Williams · 2027 · MID     Rec: Warm response     │ │
│  │  Emma Chen · 2026 · DEF          Rec: Draft             │ │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─── INTERACTION TIMELINE ───────────────────────────────┐  │
│  │                                                         │ │
│  │  Feb 7 — SoCal Showcase                                 │ │
│  │  Sarah Martinez: "Coach loved footwork" (Hot)           │ │
│  │                                                         │ │
│  │  Feb 5 — Recommendation sent                            │ │
│  │  Sarah Martinez → UCLA (Review film)                    │ │
│  │                                                         │ │
│  │  Feb 1 — Winter Showcase                                │ │
│  │  Olivia Anderson: "Stanford pulled her aside" (Hot)     │ │
│  │                                                         │ │
│  │  Jan 15 — Recommendation sent                           │ │
│  │  Jake Williams → UCLA (Evaluate at event)               │ │
│  │  Response: "Liked his pace, wants spring film"          │ │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Relationship Data (Aggregated)
| Field | Source | Display |
|-------|--------|---------|
| School name + division | School object | Header |
| Total interactions | Count of event notes + recommendations for this school | Number |
| Athletes introduced | Count of unique athletes with recommendations to this school | Number |
| Last contact | Most recent event note or recommendation date | Time ago |
| Response rate | Recommendations with response / total sent | Percentage |
| Warmth | Derived from response rate + recency | Cold / Warm / Hot |

### Warmth Calculation
| Warmth | Criteria |
|--------|----------|
| Hot | Response rate >60% AND last contact <14 days |
| Warm | Response rate >30% OR last contact <30 days |
| Cold | Response rate <30% AND last contact >30 days |

### Component
`RelationshipDetail.js` (page)

---

## Routing Logic

### Event Mode → Advocacy Mode
Event notes with `advocacy_candidate: true` (Hot/Warm interest) are available as supporting context in the Recommendation Builder. When creating a new recommendation, the builder auto-populates event notes where the athlete and school match.

Pre-population URL: `/advocacy/new?athlete=athlete_5&school=ucla`

### Advocacy Mode → Support Pod
When a recommendation status changes:
- **Sent:** Timeline entry logged to athlete's Support Pod
- **Warm response:** Timeline entry + action item created ("Follow up on UCLA warm response")
- **Closed (positive):** Timeline entry logged as resolution milestone

### Advocacy Mode → Mission Control
Stale recommendations surface through the Decision Engine:
- `advocacy_stale` is NOT a separate intervention category (per user guidance, stay within existing framework)
- Instead, stale advocacy signals piggyback on the `ownership_gap` category when an athlete has a sent recommendation with no response >5 days
- This keeps Mission Control focused on operational urgency, not advocacy pipeline management

### Support Pod → Advocacy Mode
From an athlete's Support Pod, a "Recommend" action can navigate to the Recommendation Builder pre-populated with the athlete.

---

## API Specification

### New Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/advocacy/recommendations` | List all recommendations with filters |
| `GET` | `/api/advocacy/recommendations/:id` | Single recommendation detail |
| `POST` | `/api/advocacy/recommendations` | Create new recommendation (draft) |
| `PATCH` | `/api/advocacy/recommendations/:id` | Update recommendation (edit, send, respond, close) |
| `POST` | `/api/advocacy/recommendations/:id/send` | Mark as sent |
| `POST` | `/api/advocacy/recommendations/:id/respond` | Log a response |
| `POST` | `/api/advocacy/recommendations/:id/follow-up` | Mark follow-up needed |
| `POST` | `/api/advocacy/recommendations/:id/close` | Close recommendation |
| `GET` | `/api/advocacy/relationships/:schoolId` | School relationship memory |
| `GET` | `/api/advocacy/relationships` | All school relationships summary |
| `GET` | `/api/advocacy/context/:athleteId/:schoolId` | Get event context for athlete-school pair |

### Response: `GET /api/advocacy/recommendations`

```json
{
  "needs_attention": [ ... ],
  "drafts": [ ... ],
  "recently_sent": [ ... ],
  "closed": [ ... ],
  "stats": {
    "total": 8,
    "drafts": 2,
    "sent": 3,
    "awaiting": 2,
    "warm": 1,
    "closed": 0
  }
}
```

### Request: `POST /api/advocacy/recommendations`

```json
{
  "athlete_id": "athlete_5",
  "school_id": "ucla",
  "college_coach_name": "Coach Williams",
  "fit_reasons": ["athletic_ability", "tactical_awareness"],
  "fit_note": "Her footwork and off-ball movement...",
  "supporting_event_notes": ["past_note_1"],
  "intro_message": "Coach, I wanted to introduce...",
  "desired_next_step": "review_film"
}
```

### Response: `GET /api/advocacy/relationships/:schoolId`

```json
{
  "school": { "id": "ucla", "name": "UCLA", "division": "D1" },
  "summary": {
    "totalInteractions": 5,
    "athletesIntroduced": 3,
    "lastContact": "2026-02-07T...",
    "responseRate": 0.67,
    "warmth": "warm"
  },
  "athletes": [
    {
      "id": "athlete_5",
      "name": "Olivia Anderson",
      "recommendation_status": "awaiting_reply"
    }
  ],
  "timeline": [
    {
      "type": "event_note",
      "date": "2026-02-07T...",
      "athlete_name": "Sarah Martinez",
      "text": "Coach loved footwork",
      "interest_level": "hot",
      "event_name": "SoCal Showcase"
    },
    {
      "type": "recommendation_sent",
      "date": "2026-02-05T...",
      "athlete_name": "Sarah Martinez",
      "desired_next_step": "review_film"
    }
  ]
}
```

---

## Mock Data

### Seed Recommendations
To make Advocacy Home useful on first load, seed 5-6 recommendations in various states:

```python
SEED_RECOMMENDATIONS = [
    # Warm response — needs action
    {
        "athlete_id": "athlete_4", "school_id": "michigan",
        "status": "warm_response",
        "sent_at": -6 days, "response_at": -2 days,
        "response_note": "Michigan coach wants spring tape",
        "desired_next_step": "review_film",
    },
    # Awaiting reply — stale
    {
        "athlete_id": "athlete_5", "school_id": "stanford",
        "status": "awaiting_reply",
        "sent_at": -5 days,
        "desired_next_step": "schedule_call",
    },
    # Recently sent
    {
        "athlete_id": "athlete_13", "school_id": "virginia",
        "status": "sent",
        "sent_at": -1 day,
        "desired_next_step": "evaluate_at_event",
    },
    # Draft
    {
        "athlete_id": "athlete_5", "school_id": "ucla",
        "status": "draft",
        "fit_reasons": ["athletic_ability"],
    },
    # Closed positive
    {
        "athlete_id": "athlete_12", "school_id": "georgetown",
        "status": "closed",
        "closed_reason": "positive_outcome",
        "response_note": "Georgetown invited to spring camp",
    },
]
```

---

## Frontend Component Structure

```
/frontend/src/pages/
  AdvocacyHome.js                   ← Recommendation list
  RecommendationBuilder.js          ← Create/edit recommendation
  RecommendationDetail.js           ← Detail + response tracking
  RelationshipDetail.js             ← School relationship memory

/frontend/src/components/advocacy/
  RecommendationCard.js             ← Card for advocacy home
  FitReasonSelector.js              ← Chip selector for fit reasons
  EventContextBlock.js              ← Auto-populated event notes
  ResponseTracker.js                ← Status progression + actions
  RelationshipSummary.js            ← Inline relationship preview
```

---

## Route Additions to App.js

```jsx
<Route path="/advocacy" element={<AdvocacyHome />} />
<Route path="/advocacy/new" element={<RecommendationBuilder />} />
<Route path="/advocacy/:recommendationId" element={<RecommendationDetail />} />
<Route path="/advocacy/relationships/:schoolId" element={<RelationshipDetail />} />
```

---

## Navigation Update

```
┌────────────────────────────────────────────────────────────┐
│  [Mission Control]  [Events]  [Advocacy]  [Support Pods ▾] │
└────────────────────────────────────────────────────────────┘
```

Advocacy tab is now active/linked alongside Mission Control and Events.

---

## V1 Implementation Scope

### Build (V1)
1. Seed recommendation data in mock_data.py (5-6 recs in various states)
2. Backend: advocacy_engine.py with recommendation CRUD, relationship aggregation, event context lookup
3. Backend API: all 11 endpoints listed above
4. Advocacy Home page with status grouping, filters, recommendation cards
5. Recommendation Builder with athlete/school selection, fit reasons, event context, intro message, next step
6. Recommendation Detail with response tracking (log response, follow-up, close)
7. Relationship Detail with interaction timeline and aggregate stats
8. Routing: recommendation status changes create Support Pod timeline entries
9. Navigation update: Advocacy tab linked in header

### Build separately (already scoped)
10. Decision Engine `event_follow_up` detection for stale post-event opportunities (implemented before Advocacy build)

### Defer (V2)
- AI-suggested fit reasons based on athlete data
- Auto-generated intro message drafts
- College coach contact management (email, phone)
- Recommendation templates
- Batch recommendations (same athlete → multiple schools)
- Analytics: recommendation conversion rate, school responsiveness trends

---

## Design Principles

1. **Vouching, not spamming.** Every recommendation carries the coach's reputation. The UI should make this feel intentional.
2. **Evidence over assertion.** Fit reasons and event context give recommendations weight. A bare message is weak advocacy.
3. **Memory is power.** Relationship history with a school makes the 5th recommendation stronger than the 1st. The system remembers so the coach doesn't have to.
4. **Lightweight response tracking.** Three actions: log response, mark follow-up, close. No complex pipelines.
5. **Event context flows in.** Hot interest captured courtside becomes evidence in a recommendation. The capture-to-advocacy pipeline is the product loop.
6. **Close the loop.** Warm responses create Support Pod actions. The athlete's team knows when a door opens.

---

## Durability Note

The data layer is still mocked (in-memory). Recommendations, responses, and relationship history will reset on backend restart. The workflow is real; the persistence is not yet production-grade. This is acknowledged and does not block V1 implementation.

---

**Ready for implementation.**
