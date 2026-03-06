# Event Mode — Implementation Specification

**Version:** 1.0 (Implementation-Ready)
**Status:** READY FOR BUILD
**Routes:**
- `/events` — Event Home (list)
- `/events/:eventId/prep` — Event Prep View
- `/events/:eventId/live` — Live Event Mode
- `/events/:eventId/summary` — Post-Event Summary

---

## Product Position

**Mission Control = Triage.** What needs help right now.
**Support Pod = Treatment.** How to coordinate and resolve an issue.
**Event Mode = Capture.** Convert live recruiting moments into structured follow-up.

Event Mode is NOT an event management tool. It is NOT a calendar. It is the **capture-to-action pipeline** for live recruiting moments — showcases, tournaments, camps, ID events. The guiding principle: **capture now, organize later.**

Every interaction is optimized for courtside speed. A coach at a showcase should be able to log a school interaction in under 10 seconds.

---

## How You Get Here

### Primary Flows
- **From Mission Control sidebar/nav:** "Events" mode in the top navigation
- **From Mission Control event cards:** Upcoming Events section links directly to prep or live mode
- **From Support Pod:** Upcoming events in Athlete Snapshot link to the event prep view

### Deep Links
```
/events                          → Event Home (list of all events)
/events/event_1/prep             → Prep view for SoCal Showcase
/events/event_1/live             → Live capture mode
/events/event_1/summary          → Post-event debrief
```

---

## Screen 1: Event Home

**Route:** `/events`

### Purpose
The launchpad. See what's coming, what's in progress, what needs debrief. One glance tells you where to focus.

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│  EVENTS                                     [+ Create Event] │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  [All] [Upcoming] [Past]     [Filter: Team ▾] [Type ▾]      │
│                                                              │
│  ── HAPPENING NOW / TODAY ─────────────────────────────────  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 🔴 SoCal Showcase           TOMORROW    San Diego, CA  │  │
│  │    6 athletes · 12 schools · Prep: NOT STARTED         │  │
│  │    [Start Prep →]  [Go Live →]                         │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ── THIS WEEK ─────────────────────────────────────────────  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 🟡 Elite Academy Tournament  IN 3 DAYS  Los Angeles    │  │
│  │    8 athletes · 15 schools · Prep: IN PROGRESS         │  │
│  │    [Continue Prep →]                                   │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 🟢 College Exposure Camp     IN 5 DAYS  Irvine, CA    │  │
│  │    4 athletes · 10 schools · Prep: READY               │  │
│  │    [Review Prep]                                       │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ── LATER ─────────────────────────────────────────────────  │
│  ...                                                         │
│                                                              │
│  ── PAST (Needs Debrief) ──────────────────────────────────  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Winter Showcase              FEB 1       Portland, OR  │  │
│  │    5 athletes · 8 schools · 14 notes captured          │  │
│  │    ⚠ No summary yet                                   │  │
│  │    [Write Summary →]                                   │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Event Card Fields
| Field | Source | Display |
|-------|--------|---------|
| Event name | `event.name` | Title |
| Date/timing | `event.daysAway` | "TOMORROW", "IN 3 DAYS", "FEB 1" |
| Location | `event.location` | Subtitle |
| Athletes attending | `event.athleteCount` | Count |
| Expected schools | `event.expectedSchools` | Count |
| Prep status | `event.prepStatus` | Badge: NOT STARTED / IN PROGRESS / READY |
| Notes captured | `event.capturedNotes` (post-event) | Count |
| Summary status | `event.summaryStatus` | "No summary yet" if pending |

### Urgency Indicator
| Color | Rule |
|-------|------|
| Red | Event is today or tomorrow, prep not ready |
| Yellow | Event in 2-5 days, prep in progress or not started |
| Green | Prep is ready, OR event is 5+ days away |
| Gray | Past event |

### Filters
- **Tab filter:** All / Upcoming / Past
- **Team filter:** Dropdown of teams (U18 Academy, U17 Premier, U16 Elite)
- **Type filter:** Dropdown (Showcase, Tournament, Camp, ID Event)

### Interactions
| Action | Behavior |
|--------|----------|
| **Start Prep** | Navigate to `/events/:id/prep` |
| **Go Live** | Navigate to `/events/:id/live` |
| **Write Summary** | Navigate to `/events/:id/summary` |
| **+ Create Event** | Inline modal: name, type, date, location |

### Component
`EventHome.js` (page), `EventCard.js` (card component)

---

## Screen 2: Event Prep View

**Route:** `/events/:eventId/prep`

### Purpose
Pre-event planning. Know who's going, which schools to watch, what needs to happen before event day. Checklist-driven — complete the list, you're ready.

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│  ← Events    SoCal Showcase    TOMORROW · San Diego, CA      │
│              12 schools expected                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─── ATHLETES ATTENDING (6) ─────────────────── [+ Add] ─┐ │
│  │                                                         │ │
│  │  Sarah Martinez    2026 · FWD   Prep: ✓ Ready           │ │
│  │    Targets: UCLA, Stanford      → Open Pod              │ │
│  │                                                         │ │
│  │  Jake Williams     2027 · MID   Prep: ⚠ Needs film     │ │
│  │    Targets: UNC, Georgetown     → Open Pod              │ │
│  │                                                         │ │
│  │  Emma Chen         2026 · DEF   Prep: ✓ Ready           │ │
│  │    Targets: Duke, Virginia      → Open Pod              │ │
│  │                                                         │ │
│  │  Marcus Johnson    2025 · GK    Prep: ✗ Blocker         │ │
│  │    Missing transcript           → Open Pod              │ │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─── TARGET SCHOOLS (12) ─────────────────────────────────┐ │
│  │                                                         │ │
│  │  UCLA         D1 · 3 of your athletes targeting         │ │
│  │  Stanford     D1 · 2 of your athletes targeting         │ │
│  │  Duke         D1 · 1 of your athletes targeting         │ │
│  │  Georgetown   D1 · 1 of your athletes targeting         │ │
│  │  + 8 more schools expected                              │ │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─── PREP CHECKLIST ──────────────────────────────────────┐ │
│  │                                                         │ │
│  │  ✓  Confirm athlete attendance (6/6)                    │ │
│  │  ✓  Identify target school coaches attending            │ │
│  │  ☐  Review highlight reels — 2 athletes need updates    │ │
│  │  ☐  Prepare talking points for each athlete-school pair │ │
│  │  ☐  Confirm travel/logistics                            │ │
│  │                                                         │ │
│  │  Progress: 2/5 complete                                 │ │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─── BLOCKERS (2) ───────────────────────────────────────┐  │
│  │                                                         │ │
│  │  ⚠ Jake Williams — Missing highlight reel               │ │
│  │    Blocks: Film sharing with UNC, Georgetown coaches     │ │
│  │    → Open Support Pod                                   │ │
│  │                                                         │ │
│  │  ⚠ Marcus Johnson — Missing transcript                  │ │
│  │    Blocks: Application hand-off at event                 │ │
│  │    → Open Support Pod                                   │ │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  [Go Live →]                                                 │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Block: Athletes Attending
Shows each athlete going to this event with their prep readiness.

| Field | Source | Display |
|-------|--------|---------|
| Athlete name | `athlete.fullName` | Name |
| Grad year, position | `athlete.gradYear`, `athlete.position` | Subtitle |
| Prep status | Derived from interventions | Ready / Needs film / Blocker |
| Target schools at event | Cross-reference athlete targets with event schools | List |
| Pod link | Navigate to Support Pod | "Open Pod" link |

**Prep Status Logic:**
- **Ready:** No blockers, highlight reel available, targets identified
- **Needs film:** Blocker intervention with `missing_highlight_reel` trigger
- **Blocker:** Any blocker-category intervention

### Block: Target Schools
Schools expected at this event, ranked by how many of your athletes are targeting them.

| Field | Source | Display |
|-------|--------|---------|
| School name | `school.name` | Name |
| Division | `school.division` | Badge |
| Athlete overlap | Count of athletes targeting this school | "3 of your athletes targeting" |

### Block: Prep Checklist
Auto-generated checklist items based on event context. Checkable inline.

**Default checklist items (auto-generated per event):**
1. Confirm athlete attendance
2. Identify target school coaches attending
3. Review highlight reels
4. Prepare talking points for athlete-school pairs
5. Confirm travel/logistics

Each item can be checked off. Progress bar shows completion.

### Block: Blockers
Athletes with active blocker-category interventions that could impact event performance. Links directly to Support Pod for resolution.

### Interactions
| Action | Behavior |
|--------|----------|
| **Check checklist item** | Toggle complete, update `event.prepStatus` |
| **+ Add athlete** | Select from program roster |
| **Open Pod** | Navigate to `/support-pods/:athleteId` |
| **Go Live** | Navigate to `/events/:eventId/live` |
| **← Events** | Navigate back to `/events` |

### Component
`EventPrep.js` (page), `PrepAthleteRow.js`, `PrepChecklist.js`, `PrepBlockers.js`

---

## Screen 3: Live Event Mode

**Route:** `/events/:eventId/live`

### Purpose
The courtside capture tool. Optimized for speed and minimal typing. A coach should be able to log an interaction in **under 10 seconds**. Mobile-first layout. Large tap targets. One-handed operation.

### Design Principles
1. **Speed over completeness.** Capture the moment. Details come later.
2. **Tap over type.** Pre-populated chips, not text fields.
3. **One hand, one thumb.** Large buttons, bottom-anchored actions.
4. **Context is remembered.** Once you select an athlete, they stay selected until you change.

### Layout (Mobile-First)

```
┌────────────────────────────────┐
│  SoCal Showcase   LIVE  ● REC │
│  12 notes captured             │
├────────────────────────────────┤
│                                │
│  ATHLETE ──────────────────    │
│  [Sarah M.] [Jake W.] [Emma]  │
│  [Marcus] [Olivia] [Ryan]     │
│                                │
│  SCHOOL ───────────────────    │
│  [UCLA] [Stanford] [Duke]     │
│  [UNC] [Georgetown] [+ Other] │
│                                │
│  INTEREST ─────────────────    │
│  [Hot] [Warm] [Cool] [None]   │
│                                │
│  QUICK NOTE ───────────────    │
│  ┌──────────────────────────┐  │
│  │ Coach asked for film...  │  │
│  └──────────────────────────┘  │
│                                │
│  FOLLOW-UP ────────────────    │
│  [☐ Send film]                 │
│  [☐ Schedule call]             │
│  [☐ Add to target list]       │
│  [☐ Route to Support Pod]     │
│                                │
│  ┌──────────────────────────┐  │
│  │        LOG NOTE ✓        │  │
│  └──────────────────────────┘  │
│                                │
├────────────────────────────────┤
│  RECENT ───────────────────    │
│  Sarah × UCLA · Hot · 2m ago  │
│  Jake × Georgetown · Warm     │
│  Emma × Duke · Hot · 8m ago   │
│                                │
└────────────────────────────────┘
```

### Capture Fields
| Field | Input Type | Required | Options |
|-------|-----------|----------|---------|
| Athlete | Chip selector (pre-populated from event roster) | Yes | Event athletes |
| School | Chip selector (pre-populated from expected schools) + "Other" with quick type | No | Expected schools + freeform |
| Interest level | 4-option button group | No | Hot / Warm / Cool / None |
| Quick note | Short text field (1-2 lines) | No | Freeform, max 280 chars |
| Follow-up needed | Checkbox group | No | Send film / Schedule call / Add to target list / Route to Support Pod |

### Data Model: Event Note

```json
{
  "id": "note_uuid",
  "event_id": "event_1",
  "athlete_id": "athlete_1",
  "athlete_name": "Sarah Martinez",
  "school_id": "ucla",
  "school_name": "UCLA",
  "interest_level": "hot",
  "note_text": "Coach asked for highlight reel, loved her footwork",
  "follow_ups": ["send_film", "schedule_call"],
  "captured_by": "Coach Martinez",
  "captured_at": "2026-02-07T14:32:00Z",
  "routed_to_pod": false,
  "routed_to_mc": false
}
```

### Recent Notes Feed
Bottom section shows a scrollable feed of notes captured during this event, newest first. Each entry shows: athlete × school · interest level · time ago. Tapping a note opens it for editing.

### Interactions
| Action | Behavior |
|--------|----------|
| **Select athlete chip** | Sets active athlete context (persists) |
| **Select school chip** | Sets school for this note |
| **Tap interest level** | Single-select button group |
| **Type note** | Short freeform text |
| **Check follow-up** | Multi-select checkboxes |
| **LOG NOTE** | Save note, clear school/interest/note/follow-up, keep athlete selected, toast confirmation, increment counter |
| **Tap recent note** | Open inline edit |
| **"+ Other" school** | Quick type-ahead for unlisted schools |

### State After Logging
After "LOG NOTE":
- **Kept:** Selected athlete (most notes are sequential for same athlete)
- **Cleared:** School, interest, note text, follow-ups
- **Updated:** Note counter increments, recent feed shows new note at top
- **Toast:** "Logged: Sarah × UCLA" (1 second, non-blocking)

### Desktop Adaptation
On desktop, the layout becomes a 2-column view:
- Left: Capture form (same fields)
- Right: Recent notes feed (full-width, more detail per entry)

### Component
`LiveEvent.js` (page), `AthleteChips.js`, `SchoolChips.js`, `InterestSelector.js`, `NoteCapture.js`, `RecentNotesFeed.js`

---

## Screen 4: Post-Event Summary

**Route:** `/events/:eventId/summary`

### Purpose
The debrief. Turns raw courtside notes into structured follow-up. Surfaces what mattered, who was interested, and what should route into Support Pod or Mission Control.

Accessible after event ends. Auto-generated from captured notes, editable by coach.

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│  ← Events    SoCal Showcase — Summary                        │
│              Feb 7 · San Diego · 14 notes captured            │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─── EVENT STATS ─────────────────────────────────────────┐ │
│  │                                                         │ │
│  │  14 Notes    8 Schools    6 Athletes    5 Follow-ups    │ │
│  │  captured    interacted   seen          needed          │ │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─── HOTTEST INTEREST ────────────────────────────────────┐ │
│  │                                                         │ │
│  │  🔴 Sarah Martinez × UCLA             HOT              │ │
│  │     "Coach loved her footwork, asked for film"          │ │
│  │     Follow-up: Send film, Schedule call                 │ │
│  │     [Route to Pod →]                                    │ │
│  │                                                         │ │
│  │  🔴 Emma Chen × Duke                   HOT              │ │
│  │     "Defensive positioning impressed staff"             │ │
│  │     Follow-up: Add to target list                       │ │
│  │     [Route to Pod →]                                    │ │
│  │                                                         │ │
│  │  🟡 Jake Williams × Georgetown         WARM             │ │
│  │     "Good chat, wants to see spring season"             │ │
│  │     Follow-up: Schedule call                            │ │
│  │     [Route to Pod →]                                    │ │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─── FOLLOW-UP ACTIONS ──────────────────────────────────┐  │
│  │                                                         │ │
│  │  ☐ Send highlight reel to UCLA coach (Sarah M.)        │ │
│  │    Owner: Coach Martinez · Due: Feb 9                   │ │
│  │                                                         │ │
│  │  ☐ Schedule call with UCLA (Sarah M.)                  │ │
│  │    Owner: Unassigned · Due: Feb 10                      │ │
│  │                                                         │ │
│  │  ☐ Send film to Georgetown (Jake W.)                   │ │
│  │    Owner: Coach Martinez · Due: Feb 9                   │ │
│  │                                                         │ │
│  │  ☐ Add Duke to Emma's target list                      │ │
│  │    Owner: Coach Martinez · Due: Feb 8                   │ │
│  │                                                         │ │
│  │  [Route All to Support Pods →]                          │ │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─── SCHOOLS SEEN ───────────────────────────────────────┐  │
│  │                                                         │ │
│  │  UCLA       3 interactions   Hot: 1  Warm: 2            │ │
│  │  Duke       2 interactions   Hot: 1  Warm: 1            │ │
│  │  Georgetown 2 interactions   Hot: 0  Warm: 2            │ │
│  │  Stanford   1 interaction    Hot: 0  Warm: 1            │ │
│  │  UNC        1 interaction    Hot: 0  Warm: 0  Cool: 1   │ │
│  │  + 3 more                                               │ │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─── ALL NOTES ──────────────────────────────────────────┐  │
│  │                                                         │ │
│  │  Grouped by athlete, chronological                      │ │
│  │  (expandable/collapsible per athlete)                   │ │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Block: Event Stats
Top-level numbers: notes captured, schools interacted with, athletes seen, follow-ups needed.

### Block: Hottest Interest
Notes sorted by interest level (Hot first, then Warm). Each shows: athlete × school, interest badge, note excerpt, follow-up items, and a "Route to Pod" button.

### Block: Follow-Up Actions
Aggregated from all notes' `follow_ups` arrays. Each follow-up becomes a concrete action item with:
- Title (derived from follow-up type + school + athlete)
- Owner (auto-assigned or "Unassigned")
- Due date (auto-set: 2 days for "send film", 3 days for "schedule call", 1 day for "add to target list")

**"Route All to Support Pods"** button pushes all follow-up actions into the relevant athletes' Support Pods as action items.

### Block: Schools Seen
Aggregated school interaction summary. Sorted by interaction count. Shows interest breakdown per school.

### Block: All Notes
Full list of captured notes, grouped by athlete, expandable. Allows editing notes post-event.

### Interactions
| Action | Behavior |
|--------|----------|
| **Route to Pod** (per note) | Creates action items in the athlete's Support Pod, marks `routed_to_pod: true` |
| **Route All to Support Pods** | Bulk routes all follow-up actions to relevant Support Pods |
| **Edit note** | Inline edit of note text, interest, follow-ups |
| **← Events** | Navigate back to `/events` |

### Component
`EventSummary.js` (page), `EventStats.js`, `HottestInterest.js`, `FollowUpActions.js`, `SchoolsSeen.js`, `AllNotes.js`

---

## Signal Routing Matrix

Every signal captured in Live Event Mode has a defined downstream path. This is the contract between Event Mode and the rest of the system.

### By Interest Level

| Interest | Timeline | Follow-up Action | Support Pod | Mission Control | Advocacy-Ready |
|----------|----------|-------------------|-------------|-----------------|----------------|
| **Hot** | Always | Auto-created from checked follow-ups | Action items created when routed (manual or auto) | Surfaces as `event_follow_up` intervention if follow-ups stale >48h | Yes — tagged as advocacy candidate |
| **Warm** | Always | Created only from checked follow-ups | Action items created when manually routed | Does not surface unless follow-ups stale >72h | Yes — lower priority pool |
| **Cool** | Always | No auto-creation | No | No | No |
| **None** | Always | No | No | No | No |

### By Follow-Up Type

Each checked follow-up box produces a specific action with defined ownership, urgency, and routing:

| Follow-Up | Action Created | Owner | Due | Routes To | MC Eligible |
|-----------|---------------|-------|-----|-----------|-------------|
| **Send film** | "Send [athlete] highlight reel to [school] coach" | Coach Martinez | +2 days | Support Pod action | Yes, if overdue |
| **Schedule call** | "Schedule follow-up call with [school] re: [athlete]" | Coach Martinez | +3 days | Support Pod action | Yes, if overdue |
| **Add to target list** | "Add [school] to [athlete] target list" | Coach Martinez | +1 day | Support Pod action | No |
| **Route to Support Pod** | Creates/updates active issue in Support Pod | Coach Martinez | immediate | Support Pod issue banner | Yes — treated as new context |

### Signal Lifecycle

```
CAPTURE (Live Mode)
  │
  ├─ note_text ──────────────── → Timeline entry (always, immediate)
  │
  ├─ interest: Hot/Warm ─────── → Follow-up actions created (from checked boxes)
  │                                 │
  │                                 ├─ Manual "Route to Pod" ──→ Support Pod actions + timeline
  │                                 │
  │                                 └─ Auto-route (Hot only) ──→ Support Pod actions
  │                                     when summary is finalized
  │
  ├─ interest: Hot ──────────── → Advocacy candidate flag set
  │                                 (future: feeds Advocacy Mode pipeline)
  │
  ├─ follow-up stale >48h ──── → Decision Engine: event_follow_up intervention
  │   (Hot interest)               surfaces in Mission Control Priority Alerts
  │
  ├─ follow-up stale >72h ──── → Decision Engine: event_follow_up intervention
  │   (Warm interest)              surfaces in MC Athletes Needing Attention
  │
  └─ interest: Cool/None ───── → Timeline only. No downstream routing.
```

### Routing Mechanics

#### 1. Timeline Entry (Every Note)

Every captured note logs to the athlete's treatment timeline immediately on save. No user action required.

```
POST /api/athletes/:athleteId/notes
{
  "text": "[SoCal Showcase] UCLA — Coach loved footwork, asked for film",
  "tag": "event_note"
}
```

This ensures the Support Pod always has a record of what happened, even for Cool/None interactions.

#### 2. Follow-Up Action Creation

When a note is saved with checked follow-ups AND interest is Hot or Warm, action items are **staged** (stored on the event note, not yet pushed to Support Pod). They become Support Pod actions when:

- **Explicit route:** Coach clicks "Route to Pod" on the note or on the summary page
- **Bulk route:** Coach clicks "Route All to Pods" on the Post-Event Summary
- **Auto-route (Hot only):** When the Post-Event Summary is marked as finalized, all un-routed Hot follow-ups auto-push to Support Pods

Staged actions live on the event note as `follow_ups` array entries. When routed:

```
POST /api/support-pods/:athleteId/actions
{
  "title": "Send highlight reel to UCLA coach",
  "owner": "Coach Martinez",
  "due_date": "2026-02-09",
  "source_category": "event_follow_up"
}
```

```
PATCH /api/events/:eventId/notes/:noteId
{ "routed_to_pod": true }
```

#### 3. Support Pod Issue Creation

When "Route to Support Pod" follow-up is checked, this is a stronger signal. It means the coach believes this interaction warrants an active issue in the Support Pod — not just an action item, but a context-setting issue.

On route:
- Existing Support Pod active issue is preserved (not overwritten)
- A new timeline entry is logged with the full event context
- Follow-up actions are created as usual
- The note's `routed_to_pod` flag is set

#### 4. Mission Control Surfacing

Event signals reach Mission Control through the existing Decision Engine pipeline via a new `event_follow_up` detection category:

**Trigger conditions:**
| Condition | Priority Tier | MC Section |
|-----------|--------------|------------|
| Hot interest + follow-up action overdue >48h | High | Priority Alerts |
| Warm interest + follow-up action overdue >72h | Medium | Athletes Needing Attention |
| 3+ Hot interactions for same athlete at one event (no follow-up actions created) | Medium | Athletes Needing Attention |

**Intervention object:**
```json
{
  "category": "event_follow_up",
  "trigger": "hot_follow_up_stale",
  "why_this_surfaced": "UCLA showed hot interest in Sarah at SoCal Showcase — follow-up overdue",
  "what_changed": "2 days since event, no response sent",
  "recommended_action": "Send highlight reel and schedule call with UCLA coach",
  "owner": "Coach Martinez",
  "details": {
    "event_name": "SoCal Showcase",
    "school_name": "UCLA",
    "interest_level": "hot",
    "days_since_event": 2,
    "stale_follow_ups": ["send_film", "schedule_call"]
  }
}
```

This intervention surfaces naturally alongside existing categories (momentum_drop, blocker, etc.) using the same scoring formula.

#### 5. Advocacy Mode Readiness

Every note with `interest_level: "hot"` or `"warm"` is tagged with an `advocacy_candidate` flag in the data model. This flag is not consumed by V1 but prepares the data for future Advocacy Mode:

```json
{
  "advocacy_candidate": true,
  "advocacy_signals": {
    "school_id": "ucla",
    "interest_level": "hot",
    "has_follow_up_call": true,
    "event_context": "SoCal Showcase",
    "captured_at": "2026-02-07T14:32:00Z"
  }
}
```

Future Advocacy Mode will query for `advocacy_candidate: true` notes to build school relationship timelines and recommend advocacy actions (e.g., "UCLA has shown interest in 3 of your athletes across 2 events — consider a program-level introduction").

---

## API Specification

### New Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/events` | List all events with status, filters |
| `GET` | `/api/events/:eventId` | Single event detail |
| `POST` | `/api/events` | Create a new event |
| `PATCH` | `/api/events/:eventId` | Update event (prep status, details) |
| `GET` | `/api/events/:eventId/prep` | Prep data: athletes, schools, checklist, blockers |
| `PATCH` | `/api/events/:eventId/checklist/:itemId` | Toggle checklist item |
| `POST` | `/api/events/:eventId/athletes` | Add athlete to event roster |
| `DELETE` | `/api/events/:eventId/athletes/:athleteId` | Remove athlete from event |
| `GET` | `/api/events/:eventId/notes` | Get all captured notes for event |
| `POST` | `/api/events/:eventId/notes` | Capture a new event note (live mode) |
| `PATCH` | `/api/events/:eventId/notes/:noteId` | Edit a captured note |
| `GET` | `/api/events/:eventId/summary` | Get aggregated summary data |
| `POST` | `/api/events/:eventId/route-to-pods` | Bulk route follow-ups to Support Pods |
| `POST` | `/api/events/:eventId/notes/:noteId/route` | Route single note to Support Pod |

### Response: `GET /api/events`

```json
{
  "upcoming": [
    {
      "id": "event_1",
      "name": "SoCal Showcase",
      "type": "showcase",
      "date": "2026-02-08T00:00:00Z",
      "daysAway": 1,
      "location": "San Diego, CA",
      "athleteCount": 6,
      "expectedSchools": 12,
      "prepStatus": "not_started",
      "prepProgress": { "completed": 0, "total": 5 },
      "capturedNotes": 0,
      "summaryStatus": null,
      "urgency": "red"
    }
  ],
  "past": [
    {
      "id": "event_0",
      "name": "Winter Showcase",
      "type": "showcase",
      "date": "2026-02-01T00:00:00Z",
      "daysAway": -6,
      "location": "Portland, OR",
      "athleteCount": 5,
      "expectedSchools": 8,
      "capturedNotes": 14,
      "summaryStatus": "pending",
      "urgency": "gray"
    }
  ]
}
```

### Response: `GET /api/events/:eventId/prep`

```json
{
  "event": { ... },
  "athletes": [
    {
      "id": "athlete_1",
      "fullName": "Sarah Martinez",
      "gradYear": 2026,
      "position": "Forward",
      "prepStatus": "ready",
      "targetSchoolsAtEvent": ["UCLA", "Stanford"],
      "blockers": [],
      "interventions": []
    },
    {
      "id": "athlete_4",
      "fullName": "Marcus Johnson",
      "gradYear": 2025,
      "position": "Goalkeeper",
      "prepStatus": "blocker",
      "targetSchoolsAtEvent": ["Duke"],
      "blockers": [
        {
          "category": "blocker",
          "trigger": "missing_transcript",
          "why_this_surfaced": "Transcript missing — blocks applications"
        }
      ]
    }
  ],
  "targetSchools": [
    { "id": "ucla", "name": "UCLA", "division": "D1", "athleteOverlap": 3 },
    { "id": "stanford", "name": "Stanford", "division": "D1", "athleteOverlap": 2 }
  ],
  "checklist": [
    { "id": "check_1", "label": "Confirm athlete attendance", "completed": true, "auto": true },
    { "id": "check_2", "label": "Identify target school coaches attending", "completed": true, "auto": false },
    { "id": "check_3", "label": "Review highlight reels", "completed": false, "auto": false, "note": "2 athletes need updates" },
    { "id": "check_4", "label": "Prepare talking points", "completed": false, "auto": false },
    { "id": "check_5", "label": "Confirm travel/logistics", "completed": false, "auto": false }
  ],
  "blockers": [
    {
      "athleteId": "athlete_2",
      "athleteName": "Jake Williams",
      "category": "blocker",
      "trigger": "missing_highlight_reel",
      "impact": "Blocks film sharing with UNC, Georgetown coaches"
    }
  ]
}
```

### Request: `POST /api/events/:eventId/notes`

```json
{
  "athlete_id": "athlete_1",
  "school_id": "ucla",
  "school_name": "UCLA",
  "interest_level": "hot",
  "note_text": "Coach asked for highlight reel, loved her footwork",
  "follow_ups": ["send_film", "schedule_call"]
}
```

### Response: `GET /api/events/:eventId/summary`

```json
{
  "event": { ... },
  "stats": {
    "totalNotes": 14,
    "schoolsInteracted": 8,
    "athletesSeen": 6,
    "followUpsNeeded": 5
  },
  "hottestInterest": [
    {
      "note_id": "note_1",
      "athlete_name": "Sarah Martinez",
      "athlete_id": "athlete_1",
      "school_name": "UCLA",
      "interest_level": "hot",
      "note_text": "Coach loved her footwork, asked for film",
      "follow_ups": ["send_film", "schedule_call"],
      "routed_to_pod": false
    }
  ],
  "followUpActions": [
    {
      "id": "followup_1",
      "title": "Send highlight reel to UCLA coach",
      "athlete_id": "athlete_1",
      "athlete_name": "Sarah Martinez",
      "school_name": "UCLA",
      "type": "send_film",
      "owner": "Coach Martinez",
      "due_date": "2026-02-09",
      "routed": false
    }
  ],
  "schoolsSeen": [
    { "name": "UCLA", "interactions": 3, "hot": 1, "warm": 2, "cool": 0 }
  ],
  "allNotes": [ ... ]
}
```

---

## Data Model Additions to Mock Data

### Event (enhanced from existing)

```json
{
  "id": "event_1",
  "name": "SoCal Showcase",
  "type": "showcase",
  "date": "2026-02-08T00:00:00Z",
  "daysAway": 1,
  "location": "San Diego, CA",
  "expectedSchools": 12,
  "prepStatus": "not_started",
  "status": "upcoming",

  "athlete_ids": ["athlete_1", "athlete_3", "athlete_4", "athlete_5", "athlete_12", "athlete_14"],
  "school_ids": ["ucla", "stanford", "duke", "unc", "georgetown", "usc", "boston-college", "virginia", "michigan", "pepperdine"],

  "checklist": [
    { "id": "check_1", "label": "Confirm athlete attendance", "completed": false },
    { "id": "check_2", "label": "Identify target coaches attending", "completed": false },
    { "id": "check_3", "label": "Review highlight reels", "completed": false },
    { "id": "check_4", "label": "Prepare talking points", "completed": false },
    { "id": "check_5", "label": "Confirm travel/logistics", "completed": false }
  ],

  "capturedNotes": [],
  "summaryStatus": null
}
```

### Past Event (for debrief testing)

```json
{
  "id": "event_0",
  "name": "Winter Showcase",
  "type": "showcase",
  "date": "2026-02-01T00:00:00Z",
  "daysAway": -6,
  "location": "Portland, OR",
  "expectedSchools": 8,
  "prepStatus": "ready",
  "status": "past",
  "athlete_ids": ["athlete_4", "athlete_5", "athlete_9", "athlete_13", "athlete_20"],
  "school_ids": ["stanford", "virginia", "michigan", "pepperdine", "boston-college"],
  "checklist": [...],
  "capturedNotes": [
    {
      "id": "past_note_1",
      "event_id": "event_0",
      "athlete_id": "athlete_5",
      "athlete_name": "Olivia Anderson",
      "school_id": "stanford",
      "school_name": "Stanford",
      "interest_level": "hot",
      "note_text": "Stanford coach pulled her aside after match, very interested",
      "follow_ups": ["schedule_call"],
      "captured_by": "Coach Martinez",
      "captured_at": "2026-02-01T15:22:00Z",
      "routed_to_pod": false,
      "routed_to_mc": false
    }
  ],
  "summaryStatus": "pending"
}
```

---

## Frontend Component Structure

```
/frontend/src/pages/
  EventHome.js                      ← Event list page
  EventPrep.js                      ← Pre-event planning
  LiveEvent.js                      ← Live capture mode
  EventSummary.js                   ← Post-event debrief

/frontend/src/components/events/
  EventCard.js                      ← Card for event list
  PrepAthleteRow.js                 ← Athlete row in prep view
  PrepChecklist.js                  ← Checklist component
  PrepBlockers.js                   ← Blockers section
  AthleteChips.js                   ← Chip selector for athletes
  SchoolChips.js                    ← Chip selector for schools
  InterestSelector.js               ← 4-option interest level
  NoteCapture.js                    ← Note text + follow-ups
  RecentNotesFeed.js                ← Scrollable recent notes
  EventStats.js                     ← Top-level summary numbers
  HottestInterest.js                ← Ranked interest list
  FollowUpActions.js                ← Action items from notes
  SchoolsSeen.js                    ← School interaction summary
```

---

## Route Additions to App.js

```jsx
<Route path="/events" element={<EventHome />} />
<Route path="/events/:eventId/prep" element={<EventPrep />} />
<Route path="/events/:eventId/live" element={<LiveEvent />} />
<Route path="/events/:eventId/summary" element={<EventSummary />} />
```

---

## Navigation Update

The top-level navigation should now show three modes:

```
┌─────────────────────────────────────────────────┐
│  [Mission Control]  [Events]  [Support Pods ▾]  │
└─────────────────────────────────────────────────┘
```

- **Mission Control:** `/mission-control` (existing)
- **Events:** `/events` (new)
- **Support Pods:** Dropdown or future list page (existing individual pods)

---

## V1 Implementation Scope

### Build (V1)
1. Enhanced event mock data with athlete rosters, school lists, checklists, and past events with captured notes
2. Backend API: event list, event detail, prep data, note capture, note editing, summary aggregation, routing to pods
3. Event Home page with urgency indicators, filters (tab + team + type), and time-grouped event list
4. Event Prep page with 4 blocks: athletes attending, target schools, prep checklist, blockers
5. Live Event page with chip-based capture form, interest selector, follow-up checkboxes, and recent notes feed
6. Post-Event Summary with stats, hottest interest, follow-up actions, schools seen, all notes
7. Routing logic: note → Support Pod action items + timeline entries
8. Navigation bar update across all pages

### Defer (V2)
- Event follow-up as a new Decision Engine intervention category
- Automatic Mission Control surfacing of stale follow-ups
- Event-to-event comparison ("did interest from SoCal convert?")
- Coach assignment per event (multi-coach support)
- Real-time collaboration during live events
- Push notifications for high-signal captures
- Photo/video attachment to notes

---

## Design Principles

1. **Capture now, organize later.** Live mode is about speed. Summary mode is about structure.
2. **10-second rule.** Any courtside interaction must be loggable in under 10 seconds.
3. **Tap over type.** Chips, buttons, and checkboxes over text fields wherever possible.
4. **Context flows downstream.** Every note can become a Support Pod action. Every hot signal can surface in Mission Control.
5. **Prep reduces surprises.** The prep view exists to catch blockers before game day, not to create busy work.
6. **Debrief closes the loop.** A past event without a summary is an incomplete event. The system should nudge.

---

**Ready for implementation.**
