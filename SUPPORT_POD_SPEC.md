# Support Pod — Implementation Specification

**Version:** 2.0 (Implementation-Ready)
**Status:** READY FOR BUILD
**Route:** `/support-pods/:athleteId`
**URL with context:** `/support-pods/:athleteId?context=:category&intervention=:interventionId`

---

## Product Position

**Mission Control = Triage.** Fast scan. What needs help. Who's at risk.
**Support Pod = Treatment.** Deep coordination. How to help. Resolve the issue.

Support Pod is NOT an athlete detail page. It is NOT a timeline. It is the **resolution environment** where interventions identified in Mission Control get worked, coordinated, and closed. Every element exists to move an athlete forward.

---

## How You Get Here

### Primary Flow: Mission Control → Peek Panel → "Open Support Pod"

The peek panel already shows the intervention preview. Clicking "Open Support Pod" navigates to:

```
/support-pods/athlete_5?context=deadline_proximity
```

The `context` param tells Support Pod which intervention to feature in the Active Issue Banner.

### Secondary Flows
- Direct navigation from sidebar ("Support Pods" mode)
- From athlete search results
- From upcoming events list (athlete prep)

When no `?context` param, the Active Issue Banner shows the **highest-scored intervention** for that athlete (if any exist). If no interventions, it's hidden.

---

## Screen Layout

```
┌─────────────────────────────────────────────────────┐
│ HEADER BAR                                          │
│ ← Mission Control    Sarah Martinez    Pod Health   │
├─────────────────────────────────────────────────────┤
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ BLOCK 1: ACTIVE ISSUE BANNER                    │ │
│ │ Context from Mission Control. The reason we're  │ │
│ │ here. Actionable. Dismissable once resolved.    │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ┌──────────────────┐  ┌──────────────────────────┐ │
│ │                  │  │                          │ │
│ │ BLOCK 2:         │  │ BLOCK 3:                 │ │
│ │ ATHLETE SNAPSHOT │  │ POD MEMBERS + OWNERSHIP  │ │
│ │                  │  │                          │ │
│ └──────────────────┘  └──────────────────────────┘ │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ BLOCK 4: NEXT ACTIONS                           │ │
│ │ Action list by person. Due dates. Status.       │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ BLOCK 5: TIMELINE / TREATMENT HISTORY           │ │
│ │ Chronological. Scannable. Grouped by date.      │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
└─────────────────────────────────────────────────────┘
```

Desktop: 2-column layout for Blocks 2+3, full-width for 1, 4, 5.
Mobile: Single column, stacked.

---

## Block 1: Active Issue Banner

### Purpose
Preserve the context that brought the coach here. This is the reason we're in this pod right now. It should feel like the peek panel's content elevated into a prominent position.

### When It Shows
- **With `?context` param:** Shows the specific intervention that triggered navigation
- **Without `?context`:** Shows highest-scored active intervention for this athlete
- **No interventions:** Banner is hidden entirely

### Data Source
The intervention object from `/api/mission-control` (matched by `athlete_id` + `category`), or from `/api/support-pods/:athleteId` response.

### Content Structure

```
┌─ [category color bar] ────────────────────────────────────────┐
│                                                                │
│  [Category Icon] ACTIVE ISSUE: Momentum Drop         [Dismiss]│
│                                                                │
│  WHY:     No activity in 25 days — this athlete has gone dark  │
│  CHANGED: Last logged activity was 25 days ago                 │
│  ACTION:  Check in with family about engagement                │
│  OWNER:   Coach Martinez                                       │
│                                                                │
│  [Log Call]  [Send Message]  [Mark Resolved]                   │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Fields (from intervention object)
| Field | Source |
|-------|--------|
| Category + icon | `intervention.category` |
| Why | `intervention.why_this_surfaced` |
| What changed | `intervention.what_changed` |
| Recommended action | `intervention.recommended_action` |
| Owner | `intervention.owner` |
| Suggested steps | `intervention.details.suggested_steps` |
| Score/urgency | `intervention.score`, `intervention.urgency` (internal, not shown to user) |
| Color | `intervention.badge_color` → bar color |

### Interactions
| Action | Behavior |
|--------|----------|
| **Log Call** | Opens inline note form (same as peek panel), pre-tagged "Check-in" |
| **Send Message** | Opens inline message form (same as peek panel) |
| **Mark Resolved** | POST to `/api/support-pods/:athleteId/resolve`, hides banner, logs resolution to timeline |
| **Dismiss** | Hides banner for this session (issue still exists), does NOT log anything |
| **← Back to Mission Control** | Navigate to `/mission-control` |

### Component
`ActiveIssueBanner.js`

---

## Block 2: Athlete Snapshot

### Purpose
Quick, scannable state of this athlete. Not a full profile — just the information a coach needs to coordinate treatment.

### Content Structure

```
┌────────────────────────────────────┐
│  Sarah Martinez                    │
│  2026 · Forward · U17 Premier      │
│                                    │
│  MOMENTUM          STAGE           │
│  ↘ -5  declining   Active          │
│                                    │
│  TARGET SCHOOLS    INTEREST        │
│  6 schools         2 responding    │
│                                    │
│  BLOCKERS          READINESS       │
│  1 active          Narrow list     │
│                                    │
│  UPCOMING                          │
│  SoCal Showcase (2 days)           │
│  Spring Classic (8 days)           │
│                                    │
│  LAST ACTIVITY                     │
│  25 days ago                       │
└────────────────────────────────────┘
```

### Fields
| Field | Source | Display |
|-------|--------|---------|
| Name, grad year, position, team | Athlete object | Header |
| Momentum score + trend | `athlete.momentumScore`, `momentumTrend` | Color-coded badge (green rising, red declining) |
| Recruiting stage | `athlete.recruitingStage` | Badge (Exploring/Active/Narrowing) |
| Target schools | `athlete.schoolTargets` | Count |
| Active interest | `athlete.activeInterest` | Count of schools responding |
| Active blockers | Count from interventions where `category === 'blocker'` | Count + brief label |
| Readiness summary | From `readiness_issue` interventions if any | Brief label or "On track" |
| Upcoming events | Filtered from `upcomingEvents` where athlete is relevant | Name + days away |
| Last activity | `athlete.daysSinceActivity` | "X days ago" |

### Component
`AthleteSnapshot.js`

---

## Block 3: Pod Members + Ownership

### Purpose
Show the support team. Who's here. Who owns what. Where are the gaps. This is what makes Support Pod a coordination tool, not just a detail page.

### Data Model: Pod Member

```json
{
  "id": "member_1",
  "pod_id": "pod_athlete_5",
  "name": "Coach Martinez",
  "role": "club_coach",
  "is_primary": true,
  "email": "coach@club.com",
  "last_active": "2026-02-06T...",
  "tasks_owned": 3,
  "tasks_overdue": 0,
  "status": "active"
}
```

### Content Structure

```
┌────────────────────────────────────────┐
│  SUPPORT TEAM                          │
│                                        │
│  ● Coach Martinez          PRIMARY     │
│    Club Coach                          │
│    Owns: 3 tasks (0 overdue)           │
│    Active today                        │
│                                        │
│  ● Maria Martinez                      │
│    Parent                              │
│    Owns: 1 task (1 overdue)            │
│    Last active: 7 days ago      ⚠      │
│    [Message]                           │
│                                        │
│  ● Sarah Martinez                      │
│    Athlete                             │
│    Owns: 2 tasks                       │
│    Last active: 25 days ago     🔴     │
│                                        │
│  [+ Add Pod Member]                    │
│                                        │
│  ─── Ownership Summary ───             │
│  Coach: 3 tasks | Parent: 1 | Athlete: 2 │
│  ⚠ 1 unassigned action               │
└────────────────────────────────────────┘
```

### Ownership Visibility Rules
- Each member shows: task count, overdue count, last active date
- **Activity indicator:** Green dot (active today), yellow (1-7 days), red (7+ days)
- **Overdue badge:** Warning icon if any tasks overdue
- **Ownership gap:** If any action has no owner, show warning at bottom
- **Primary badge:** Clear "PRIMARY" label on the lead coordinator

### V1 Pod Members (Mock)
For V1, pod members are generated from the athlete's context:
- Club Coach (always present, always primary)
- Parent/Guardian (present for most athletes)
- Athlete (always present)
- Optional: Assistant Coach, Academic Advisor

### Interactions
| Action | Behavior |
|--------|----------|
| **Message** (per member) | Opens inline message form pre-addressed to that member |
| **+ Add Pod Member** | Simple form: name, role, email |
| **Click ownership summary** | Scrolls to Next Actions block |

### Component
`PodMembers.js`

---

## Block 4: Next Actions

### Purpose
The working list. What needs to happen, who does it, when it's due. This is the coordination engine of the pod.

### Data Model: Action Item

```json
{
  "id": "action_1",
  "pod_id": "pod_athlete_5",
  "athlete_id": "athlete_5",
  "title": "Request transcript from school counselor",
  "description": "Contact counselor office, request official transcript for UCLA, Stanford, Duke applications",
  "owner": "Parent/Guardian",
  "status": "ready",
  "due_date": "2026-02-10T00:00:00Z",
  "created_by": "Coach Martinez",
  "created_at": "2026-02-06T...",
  "source": "intervention",
  "source_category": "blocker",
  "completed_at": null
}
```

### Status Values
| Status | Meaning | Visual |
|--------|---------|--------|
| `ready` | Can be worked now | Default style |
| `in_progress` | Being worked | Blue indicator |
| `blocked` | Cannot proceed, dependency | Red indicator + reason |
| `completed` | Done | Strikethrough, green check |
| `overdue` | Past due date, not done | Red badge |

### Content Structure

```
┌─────────────────────────────────────────────────────────┐
│  NEXT ACTIONS                                    [+ Add] │
│                                                          │
│  ── Coach Martinez (3) ──────────────────────────────── │
│  ☐ Set target schools for SoCal Showcase    Due: Feb 8  │
│    Ready · From: Deadline proximity                      │
│  ☐ Check in with Sarah's family             Due: Feb 7  │
│    Ready · From: Momentum drop                           │
│  ☐ Review highlight reel clips              Due: Feb 10  │
│    In progress                                           │
│                                                          │
│  ── Parent/Guardian (1) ────────────────────────────── │
│  ☐ Request transcript from counselor        Due: Feb 10  │
│    ⚠ OVERDUE · From: Blocker                            │
│    [Reassign]                                            │
│                                                          │
│  ── Athlete (2) ──────────────────────────────────────  │
│  ☐ Update target school preferences          Due: Feb 9  │
│    Ready · From: Readiness issue                         │
│  ☐ Film practice for highlight reel         Due: Feb 12  │
│    Blocked: Waiting on coach film selection               │
│                                                          │
│  ── Unassigned (1) ─────────────────────────────────── │
│  ⚠ Respond to Georgetown camp invite                     │
│    No owner · From: Ownership gap                        │
│    [Assign Now]                                          │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Key Rules
1. **Grouped by owner** — coach sees their items together, parent sees theirs
2. **Unassigned at the bottom** — ownership gaps are visible and pressured
3. **Source shown** — "From: Blocker" links back to the intervention category
4. **Overdue is prominent** — red badge, cannot be missed
5. **Quick actions inline** — checkbox to complete, [Reassign] for overdue items

### Interactions
| Action | Behavior |
|--------|----------|
| **Checkbox** | Marks complete, logs to timeline, toast |
| **[+ Add]** | Inline form: title, owner (select), due date |
| **[Reassign]** | Inline owner select (same as peek panel assign) |
| **[Assign Now]** | Inline owner select for unassigned items |
| **Click action title** | Expand to show description and source details |

### Auto-Generated Actions
When an athlete enters the pod (or an intervention is surfaced), the system can auto-generate suggested actions from `intervention.details.suggested_steps`. These appear as "Suggested" actions that the coach can accept (assigns owner + due date) or dismiss.

### Component
`NextActions.js`

---

## Block 5: Timeline / Treatment History

### Purpose
Chronological record of everything that's happened in this pod. Notes, assignments, messages, resolutions, status changes. This is the treatment history — what was tried, what worked, what's pending.

### Data Source
Existing endpoints already persist this data:
- `GET /api/athletes/:athleteId/timeline` → returns `{ notes, assignments, messages }`

### Timeline Entry Types

| Type | Icon | Color | Example |
|------|------|-------|---------|
| `note` | FileText | Gray | "Called family — prep meeting scheduled for 7am tomorrow" |
| `assignment` | UserPlus | Blue | "Reassigned to Parent/Guardian — closer to school counselor" |
| `message` | MessageSquare | Green | "Sent to Parent/Guardian: Quick update on transcript?" |
| `resolution` | CheckCircle | Emerald | "Resolved: Momentum Drop — family re-engaged after call" |
| `action_completed` | Check | Emerald | "Completed: Request transcript from counselor" |
| `action_created` | Plus | Blue | "Created action: Set target schools for showcase" |
| `stage_change` | ArrowRight | Purple | "Stage changed: Exploring → Actively Recruiting" |
| `blocker_flagged` | ShieldAlert | Red | "Blocker: Missing highlight reel" |

### Content Structure

```
┌─────────────────────────────────────────────────────────┐
│  TREATMENT HISTORY                            [Filter ▾] │
│                                                          │
│  ── Today ──────────────────────────────────────────── │
│                                                          │
│  📝 Coach Martinez · 2:30 PM                            │
│  Called family — prep meeting scheduled for 7am tomorrow  │
│  Tag: Check-in                                           │
│                                                          │
│  👤 Coach Martinez · 1:15 PM                            │
│  Reassigned to Parent/Guardian                           │
│  Reason: Closer to school counselor                      │
│                                                          │
│  ── Yesterday ─────────────────────────────────────── │
│                                                          │
│  ✉ Coach Martinez → Parent/Guardian · 4:00 PM           │
│  Quick update on transcript status?                      │
│                                                          │
│  ── Feb 4 ─────────────────────────────────────────── │
│                                                          │
│  ✅ Completed: Review target school list                 │
│  Owner: Coach Martinez                                   │
│                                                          │
│  ⚠ Blocker flagged: Missing transcript                  │
│  Owner: Parent + Coach                                   │
│                                                          │
│  ── Earlier ──────────────────────────────────────────  │
│  [Load more...]                                          │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Key Rules
1. **Grouped by date** — "Today", "Yesterday", then specific dates
2. **Author shown** — who did this action
3. **Scannable** — one line summary, expandable for details
4. **Newest first** — most recent at top
5. **Filter** — by type (notes, assignments, messages, all)

### Component
`TreatmentTimeline.js`

---

## API Specification

### Primary Endpoint

```
GET /api/support-pods/:athleteId
```

Returns the complete pod data for rendering all 5 blocks:

```json
{
  "athlete": {
    "id": "athlete_5",
    "fullName": "Olivia Anderson",
    "gradYear": 2025,
    "position": "Forward",
    "team": "U18 Academy",
    "recruitingStage": "actively_recruiting",
    "momentumScore": 7,
    "momentumTrend": "rising",
    "daysSinceActivity": 3,
    "lastActivity": "2026-02-03T...",
    "schoolTargets": 7,
    "activeInterest": 4
  },

  "active_interventions": [
    {
      "category": "deadline_proximity",
      "why_this_surfaced": "SoCal Showcase is tomorrow — no prep started",
      "what_changed": "Event starts in 1 day(s), 12 schools expected",
      "recommended_action": "Set target schools and complete prep checklist now",
      "owner": "Coach Martinez",
      "score": 92,
      "badge_color": "red",
      "priority_tier": "critical",
      "details": { "suggested_steps": [...], "event_name": "SoCal Showcase", ... }
    }
  ],

  "pod_members": [
    {
      "id": "member_1",
      "name": "Coach Martinez",
      "role": "club_coach",
      "is_primary": true,
      "last_active": "2026-02-06T...",
      "tasks_owned": 3,
      "tasks_overdue": 0,
      "status": "active"
    },
    {
      "id": "member_2",
      "name": "Maria Anderson",
      "role": "parent",
      "is_primary": false,
      "last_active": "2026-01-30T...",
      "tasks_owned": 1,
      "tasks_overdue": 1,
      "status": "inactive"
    },
    {
      "id": "member_3",
      "name": "Olivia Anderson",
      "role": "athlete",
      "is_primary": false,
      "last_active": "2026-02-03T...",
      "tasks_owned": 2,
      "tasks_overdue": 0,
      "status": "active"
    }
  ],

  "actions": [
    {
      "id": "action_1",
      "title": "Set target schools for SoCal Showcase",
      "owner": "Coach Martinez",
      "status": "ready",
      "due_date": "2026-02-08T00:00:00Z",
      "source": "intervention",
      "source_category": "deadline_proximity",
      "created_at": "2026-02-06T..."
    }
  ],

  "timeline": {
    "notes": [...],
    "assignments": [...],
    "messages": [...],
    "resolutions": [...],
    "action_events": [...]
  },

  "pod_health": "yellow",

  "upcoming_events": [
    { "name": "SoCal Showcase", "daysAway": 1, "prepStatus": "not_started" }
  ]
}
```

### Action Endpoints

These already exist from the quick actions feature:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/athletes/:id/notes` | Log note to timeline |
| `POST` | `/api/athletes/:id/assign` | Reassign owner |
| `POST` | `/api/athletes/:id/messages` | Send message |
| `GET` | `/api/athletes/:id/timeline` | Get treatment history |

### New Endpoints Needed

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/support-pods/:athleteId` | Get full pod data |
| `POST` | `/api/support-pods/:athleteId/actions` | Create action item |
| `PATCH` | `/api/support-pods/:athleteId/actions/:actionId` | Update action (complete, reassign, status change) |
| `POST` | `/api/support-pods/:athleteId/resolve` | Resolve active issue (logs to timeline, removes from MC) |
| `POST` | `/api/support-pods/:athleteId/members` | Add pod member |
| `GET` | `/api/support-pods/:athleteId/actions` | Get action items |

---

## Pod Health Indicator

### Calculation

| Health | Criteria |
|--------|----------|
| **Green** | All members active (7 days), 0 overdue actions, no unresolved blockers >48h |
| **Yellow** | Any member inactive 7-14 days, OR 1-2 overdue actions, OR blocker 3-5 days old |
| **Red** | Any member inactive 14+ days, OR 3+ overdue actions, OR critical blocker >5 days |

Shown in: pod header, Mission Control athlete cards.

---

## Frontend Component Structure

```
/frontend/src/pages/
  SupportPod.js                     ← Main page, route handler

/frontend/src/components/support-pod/
  PodHeader.js                      ← Back nav + athlete name + pod health
  ActiveIssueBanner.js              ← Block 1
  AthleteSnapshot.js                ← Block 2
  PodMembers.js                     ← Block 3
  NextActions.js                    ← Block 4
  TreatmentTimeline.js              ← Block 5
```

---

## Routing Integration

### App.js Route Addition

```jsx
<Route path="/support-pods/:athleteId" element={<SupportPod />} />
```

### From Peek Panel

The "Open Support Pod" button in PeekPanel navigates to:

```javascript
navigate(`/support-pods/${intervention.athlete_id}?context=${intervention.category}`)
```

### From Active Issue Banner

"← Back to Mission Control" navigates to `/mission-control`.

---

## V1 Implementation Scope

### Build (V1)
1. `GET /api/support-pods/:athleteId` — aggregates athlete + interventions + pod members (mock) + actions + timeline
2. Active Issue Banner — renders intervention context, dismiss/resolve actions
3. Athlete Snapshot — renders from athlete data + intervention summary
4. Pod Members — mock members generated per athlete, shows ownership counts
5. Next Actions — auto-generated from `intervention.details.suggested_steps`, manual creation, completion/reassignment
6. Treatment Timeline — renders existing notes/assignments/messages chronologically, grouped by date
7. Route from Peek Panel → Support Pod with context preservation
8. Route back to Mission Control

### Defer (V2)
- Real pod member management (invite by email, roles)
- Real-time messaging between pod members
- Document upload/sharing
- Advanced blocker resolution workflows
- Pod health scoring connected to Mission Control
- Mobile-optimized interaction patterns

---

## Design Principles

1. **Treatment, not display.** Every element should help resolve an issue, not just show information.
2. **Ownership is visible.** Who does what is never ambiguous. Gaps are highlighted.
3. **Context is preserved.** Coming from Mission Control, the issue that brought you here is front and center.
4. **Actions are first-class.** The action list is the working heart of the pod, not a sidebar afterthought.
5. **Timeline is evidence.** It shows what was tried, not just what happened. Treatment history, not activity log.
6. **Fast in, fast out.** A coach should be able to enter, take action, and return to Mission Control in under 2 minutes.

---

**Ready for implementation.**
