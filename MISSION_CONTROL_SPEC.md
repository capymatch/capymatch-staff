# Mission Control Dashboard - Detailed Screen Specification (V2)

## Screen Overview

**Route:** `/mission-control` (default home for coaches/directors)

**Purpose:**  
Command center that gives coaches and directors immediate visibility into what needs attention, what changed, and what to do next—with full explainability for every surfaced item.

**Primary Users:** Club Director, Club Coach

**Design Philosophy:**  
This is NOT a traditional dashboard with static widgets and tables.  
This IS an intelligent operating system that actively surfaces priorities, explains its reasoning, and coordinates action.

**Core Principle:**  
Every item shown must answer: WHY (it surfaced), WHAT CHANGED (trigger), RECOMMENDED ACTION (next step), and OWNER (who acts).

---

## Explainability UI Pattern

### Consistent Structure Across All Cards

Every card in Mission Control follows this lightweight pattern:

```
┌─────────────────────────────────────┐
│ [Badge] Athlete Name | Grad Year    │ ← Header
│                                      │
│ Short reason (1 line, bold)         │ ← WHY
│ Context detail (1 line, subtle)     │ ← WHAT CHANGED
│                                      │
│ [?] More details                     │ ← Expandable (optional)
│                                      │
│ [Primary Action Button]              │ ← RECOMMENDED ACTION
│ Owner: Coach Name                    │ ← OWNER
└─────────────────────────────────────┘
```

### Design Principles for Explainability

**DO:**
- Keep visible reason to 1 sentence (8-12 words max)
- Use bold for main reason, regular weight for context
- Show owner name clearly (not just "Coach")
- Make action button text specific ("Check In" not "View")
- Use progressive disclosure for details (expand icon)

**DON'T:**
- Write paragraphs or multiple sentences
- Show scores or numeric priorities to user
- Use jargon or database language
- Clutter card with too many details upfront
- Make expanding mandatory (key info visible always)

---

## Screen Architecture

### Layout Structure

```
┌───────────────────────────────────────────────────────────────┐
│ HEADER                                                             │
│ Mode Nav | Search | Quick Actions | Profile                        │
├───────────────────────────────────────────────────────────────┤
│                                                                     │
│ PRIORITY ALERTS (2-4 urgent items)                                 │
│ Full explainability: why, what changed, action, owner              │
│                                                                     │
├───────────────────────────────────────────────────────────────┤
│                                                                     │
│ WHAT CHANGED TODAY (5-8 recent signals)                            │
│ Timeline with "why this matters" context                           │
│                                                                     │
├───────────────────────────────────────────────────────────────┤
│                                                                     │
│ ATHLETES NEEDING ATTENTION (up to 12 cards)                        │
│ Sortable cards with explainability                                 │
│                                                                     │
├───────────────────────────────────────────────────────────────┤
│                                                                     │
│ CRITICAL UPCOMING (7-14 day window)                                │
│ Events and deadlines with prep status                              │
│                                                                     │
└───────────────────────────────────────────────────────────────┘

[Quick Actions FAB - bottom right]
```

---

## Section 1: Header

(No changes from previous spec - omitted for brevity)

---

## Section 2: Priority Alerts (UPDATED)

### Purpose
Surface 2-4 highest-priority items (score ≥70) that need immediate attention.

### Display Logic
- Show top 2-4 items from Decision Engine (Critical or High tier)
- Never more than 4 (avoid overwhelming)
- If same athlete has multiple issues, consolidate to 1 card
- If zero critical/high priority, hide section entirely

### Alert Card Structure

**Visual Layout:**
```
┌────────────────────────────────────────────┐
│ [Red/Amber Badge]  Emma Chen | 2026        │
│                                             │
│ SoCal Showcase in 24 hours                 │ ← WHY (bold)
│ Event starts tomorrow at 9am               │ ← WHAT CHANGED
│                                             │
│ [ⓘ] Show details ▼                         │ ← Expandable
│                                             │
│ [Set Targets & Review Prep] ────────       │ ← ACTION
│ Owner: Coach Martinez                      │ ← OWNER
└────────────────────────────────────────────┘
```

**Badge Colors:**
- **Red:** Critical (score 90-100)
- **Amber:** High Priority (score 70-89)

**Expanded Details (when clicked):**
```
┌────────────────────────────────────────────┐
│ ... (collapsed content above) ...          │
│                                             │
│ Details:                                    │
│ • 12 target schools expected at event      │
│ • No prep plan created yet                 │
│ • Target list needs review                 │
│                                             │
│ Prep checklist:                             │
│ ☐ Set target schools                       │
│ ☐ Review Emma's current list               │
│ ☐ Prepare intro talking points             │
│                                             │
│ [Collapse] ▲                                │
└────────────────────────────────────────────┘
```

### Example Cards

**Example 1: Deadline Proximity (Critical)**
```
[RED BADGE] Emma Chen | 2026 | Forward

SoCal Showcase in 24 hours
Event starts tomorrow at 9am

[Set Targets & Review Prep]
Owner: Coach Martinez
```

**Example 2: Momentum Drop (High)**
```
[AMBER BADGE] Sarah Martinez | 2026 | Midfielder

No activity in 18 days
Last activity: UCLA email on Dec 18

[Check In with Family]
Owner: Coach Martinez
```

**Example 3: Blocker (High)**
```
[AMBER BADGE] Jake Williams | 2025 | Defender

Transcript missing for 3 target schools
Application deadlines in 10-14 days

[Request Transcript]
Owner: Parent + Coach
```

**Example 4: Ownership Gap (High)**
```
[AMBER BADGE] Marcus Johnson | 2026 | Forward

Boston College coach responded 3 days ago
No follow-up owner assigned

[Assign & Draft Response]
Owner: Coach (needs to assign)
```

### Interaction
- Click card body → Navigate to Support Pod (with context)
- Click action button → Primary action or quick modal
- Click expand icon → Show details inline
- Hover → Subtle lift effect

### Empty State
If no Priority Alerts (score <70), hide section entirely.

---

## Section 3: What Changed Today (UPDATED)

### Purpose
Timeline of recent momentum signals (last 24-48 hours) with context on why each matters.

### Display Logic
- Show 5-8 most recent changes
- Include positive and negative signals
- Sort by recency (newest first)
- Group by time: "This Morning", "Earlier Today", "Yesterday"

### Feed Item Structure

**Visual Layout:**
```
┌────────────────────────────────────────────┐
│ [Icon] Emma Chen                            │
│ 2 hours ago                                 │
│                                             │
│ Received camp invite from Stanford         │ ← WHAT HAPPENED
│                                             │
│ Why this matters:                           │ ← WHY
│ Stanford is Emma's top choice              │
│                                             │
│ [ⓘ] Show details ▼                         │
│                                             │
│ [Review Invite] →                           │ ← ACTION LINK
└────────────────────────────────────────────┘
```

**Icons by Signal Type:**
- ✅ Green check: Positive (new interest, response, progress)
- ⚠️ Amber alert: Needs attention (deadline, gap, blocker)
- ↗️ Blue arrow: Neutral change (stage change, update)

**Expanded Details:**
```
Details:
• Coach-initiated invite (strong signal)
• Response needed within 48 hours
• Stanford currently shows "high interest"

Suggested next steps:
• Review invite details with Emma & family
• Confirm attendance
• Log response in system

[Collapse] ▲
```

### Example Feed Items

**Example 1: Positive Signal**
```
✅ Emma Chen
2 hours ago

Received camp invite from Stanford

Why this matters:
Stanford is Emma's top choice school

[Review Invite] →
```

**Example 2: Negative Signal**
```
⚠️ Sarah Martinez
4 hours ago

No activity logged in 14 days

Why this matters:
Momentum is declining, engagement at risk

[Check In] →
```

**Example 3: Neutral Update**
```
↗️ Jake Williams
Yesterday

Moved to "Actively Recruiting" stage

Why this matters:
Jake is ramping up recruitment efforts

[View Support Pod] →
```

### Interaction
- Click item → Expand for details
- Click athlete name → Navigate to Support Pod
- Click action link → Context-specific quick action
- "View all activity" link → Full momentum timeline

### Empty State
```
No new momentum signals yet today.

Check back this afternoon or review [Athletes Needing Attention] below.
```

---

## Section 4: Athletes Needing Attention (UPDATED)

### Purpose
Show all athletes with medium+ priority issues (score ≥50), sorted by Decision Engine priority.

### Display Logic
- Show up to 12 athletes (paginate if more)
- Sort by priority score descending
- Filter by grad year (via header dropdown)
- Filter by issue type (optional advanced filter)
- May include athletes already in Priority Alerts (with context)

### Athlete Card Structure

**Visual Layout:**
```
┌───────────────────────────────────────┐
│ Sarah Martinez                         │
│ 2026 | Midfielder                     │
│ [Momentum Badge: ↓ Declining]         │
│                                        │
│ No activity in 18 days                │ ← WHY (bold)
│ Last activity: Dec 18                 │ ← CONTEXT
│                                        │
│ [ⓘ] Details                           │
│                                        │
│ Stage: Actively Recruiting            │
│ Schools: 6 targets                    │
│                                        │
│ [View Support Pod]  📝 💬             │ ← ACTIONS
│ Owner: Coach Martinez                 │ ← OWNER
└───────────────────────────────────────┘
```

**Momentum Badges:**
- ↑ Rising (green): Positive momentum
- → Stable (gray): Steady state
- ↓ Declining (red): Needs attention

**Quick Action Icons:**
- 📝 Log note
- 💬 Send message
- ➕ Create task

**Expanded Details:**
```
Issue details:
• Last logged: UCLA email (Dec 18)
• No coach contact in 12 days
• No family engagement in 10 days

Recommended actions:
1. Phone call to check in
2. Review target school engagement
3. Update recruiting plan if needed

Recent timeline:
• Dec 18: UCLA coach email
• Dec 10: Coach check-in call
• Dec 5: Event attended (Vegas Showcase)

[Collapse] ▲
```

### Example Cards

**Example 1: Momentum Drop**
```
Sarah Martinez
2026 | Midfielder
[↓ Declining]

No activity in 18 days
Last activity: UCLA email on Dec 18

Stage: Actively Recruiting | 6 targets

[View Support Pod]  📝 💬
Owner: Coach Martinez
```

**Example 2: Blocker**
```
Jake Williams
2025 | Defender
[→ Stable]

Transcript missing for 3 target schools
Application deadlines in 10-14 days

Stage: Narrowing | 5 targets

[View Support Pod]  📝 💬
Owner: Parent + Coach
```

**Example 3: Readiness Issue**
```
Ryan Thomas
2025 | Forward
[↓ Declining]

Only 2 target schools for 2025 grad
Critical recruiting window (spring)

Stage: Actively Recruiting | 2 targets

[View Support Pod]  📝 💬
Owner: Coach + Athlete
```

### Layout
- **Desktop:** 3-column grid
- **Tablet:** 2-column grid
- **Mobile:** Single column, full width

### Interaction
- Click card → Navigate to Support Pod
- Click quick action icon → Open quick modal (log note, send message)
- Click expand → Show details inline
- Sort/filter → Re-order or reduce visible cards

### Empty State
```
┌─────────────────────────────────────────┐
│                                          │
│           ✅                             │
│                                          │
│     No athletes need immediate attention │
│                                          │
│     All athletes are looking good!       │
│     Great work, Coach Martinez.          │
│                                          │
│     [View Program Snapshot] →            │
│                                          │
└─────────────────────────────────────────┘
```

---

## Section 5: Critical Upcoming

(This section remains largely unchanged - shows events/deadlines without full explainability since they're time-based, not issue-based)

### Brief Update

Add "Prep Status" explainability:
```
[Event Card]
SoCal Showcase
Tomorrow, 9:00 AM | San Diego

8 athletes attending
12 schools expected

Prep Status: [⚠️ Not Started]
Why: Targets not set for 3 athletes

[View Event Details]
```

---

## Section 6: Quick Actions Panel

(No changes - remains FAB with quick log/task creation)

---

## Section 7: Program Snapshot

(No changes - high-level metrics sidebar)

---

## Routing to Support Pod

### Context Preservation

When coach clicks any Mission Control item, they navigate to Support Pod with:

**URL Pattern:**
```
/support-pods/[athleteId]?context=[issue-id]
```

**Support Pod Opens With:**
1. **Issue Highlighted** - The specific problem from Mission Control shown at top
2. **Action Pre-Loaded** - Recommended action ready to take
3. **Owner Visible** - Clear assignment
4. **Timeline Context** - Recent activity shown
5. **Quick Actions** - [Log Call] [Send Message] [Create Task] immediately available

**Example Flow:**

**Mission Control:**
```
[AMBER] Sarah Martinez | 2026

No activity in 18 days
Last activity: UCLA email on Dec 18

[Check In with Family]
Owner: Coach Martinez
```

**↓ Click card**

**Support Pod (Sarah Martinez):**
```
┌─────────────────────────────────────────┐
│ ACTIVE ISSUE (from Mission Control)     │
│                                          │
│ [⚠️] Momentum Drop                       │
│ No activity in 18 days                  │
│ Last activity: UCLA email on Dec 18     │
│                                          │
│ Recommended: Check in with family       │
│                                          │
│ [Log Call] [Send Message] [Create Task] │
└─────────────────────────────────────────┘

[Rest of Support Pod interface below...]

Recent Timeline:
• Dec 18: UCLA coach email
• Dec 10: Coach check-in call
• Dec 5: Vegas Showcase attended

Pod Members:
• Coach Martinez (Primary)
• Parent: Maria Martinez
• Athlete: Sarah Martinez
```

### Seamless Flow

**Mission Control** (Identify) → **Support Pod** (Coordinate) → **Action** (Resolve)

The context from Mission Control becomes the entry point into the Support Pod workflow, making it clear why the coach is there and what needs to happen next.

---

## Data Requirements (UPDATED)

### API Endpoint

```
GET /api/mission-control

Returns:
{
  "priorityAlerts": [
    {
      "id": "alert_1",
      "athleteId": "athlete_5",
      "athleteName": "Emma Chen",
      "gradYear": 2026,
      "category": "deadline_proximity",
      "priority": "critical",
      "score": 92,
      
      // Explainability (required)
      "why": "SoCal Showcase in 24 hours",
      "whatChanged": "Event starts tomorrow at 9am",
      "recommendedAction": "Set target schools and review prep checklist",
      "owner": "Coach Martinez",
      
      // Details (for expansion)
      "details": {
        "expectedSchools": 12,
        "prepStatus": "not_started",
        "checklist": [
          "Set target schools",
          "Review current list",
          "Prepare intro points"
        ]
      },
      
      // Routing
      "actionLink": "/support-pods/athlete_5?context=alert_1",
      "actionType": "navigate" | "quick_modal"
    }
  ],
  
  "recentChanges": [
    {
      "id": "signal_1",
      "athleteId": "athlete_5",
      "athleteName": "Emma Chen",
      "timestamp": "2025-01-06T10:30:00Z",
      "hoursAgo": 2,
      
      "whatHappened": "Received camp invite from Stanford",
      
      // Why this matters (required)
      "whyThisMatters": "Stanford is Emma's top choice school",
      
      "sentiment": "positive",
      "icon": "check",
      
      // Details
      "details": {
        "schoolName": "Stanford",
        "inviteType": "coach-initiated",
        "responseDeadline": "48 hours"
      }
    }
  ],
  
  "athletesNeedingAttention": [
    {
      "id": "athlete_3",
      "fullName": "Sarah Martinez",
      "gradYear": 2026,
      "position": "Midfielder",
      "score": 74,
      
      // Explainability (required)
      "why": "No activity in 18 days",
      "whatChanged": "Last activity: Dec 18",
      "recommendedAction": "Check in with family",
      "owner": "Coach Martinez",
      
      // Context
      "momentumTrend": "declining",
      "recruitingStage": "actively_recruiting",
      "schoolTargets": 6,
      "daysSinceActivity": 18,
      
      // Details
      "details": {
        "lastActivity": "UCLA email",
        "lastCoachContact": "12 days ago",
        "recentTimeline": [...]
      }
    }
  ],
  
  "upcomingEvents": [...],
  "programSnapshot": {...}
}
```

---

## Visual Design Guidelines (UPDATED)

### Explainability Typography

**WHY (Main Reason):**
- Font: Inter, 14px, font-weight: 600 (semibold)
- Color: Gray-900 (dark)
- Max width: 1 line, truncate with ellipsis if needed

**WHAT CHANGED (Context):**
- Font: Inter, 13px, font-weight: 400 (regular)
- Color: Gray-600 (muted)
- Max width: 1 line

**RECOMMENDED ACTION (Button):**
- Font: Inter, 14px, font-weight: 500 (medium)
- Button style: Primary (blue) or Secondary (outlined)
- Text should be specific ("Check In" not "Action")

**OWNER:**
- Font: Inter, 12px, font-weight: 400
- Color: Gray-500
- Prefix: "Owner: " or icon
- Format: "Coach [Name]" or "Coach + Parent"

### Spacing
- 16px padding inside cards
- 8px gap between WHY and WHAT CHANGED
- 12px gap before action button
- 6px gap between action button and owner

### Colors
- Critical badge: Red-500 (#EF4444)
- High badge: Amber-500 (#F59E0B)
- Medium badge: Blue-500 (#3B82F6)
- Momentum rising: Green-500 (#10B981)
- Momentum declining: Red-500 (#EF4444)

---

## Mobile Considerations

### Responsive Explainability

**Mobile cards (< 768px):**
- Stack all content vertically
- WHY remains 1 line (may truncate)
- WHAT CHANGED may wrap to 2 lines if needed
- Action button full width
- Expand icon prominent for details

**Touch Targets:**
- Minimum 44px height for action buttons
- Expand icon 40px x 40px tap target
- Card itself tappable (navigate to Support Pod)

---

## Performance & Loading

### Skeleton States

While loading, show skeleton cards with:
- Gray placeholder for athlete name
- Gray placeholder for reason text
- Gray placeholder for action button
- Maintain layout structure

**Never show:**
- Generic spinners
- "Loading..." text
- Blank screen

### Initial Load Time
- Target: < 2 seconds for full Mission Control data
- Cache explainability strings for fast rendering
- Lazy load "details" expansion content

---

## Success Metrics (UPDATED)

### Explainability Validation
- **95%+ coaches understand** why each item surfaced (post-session survey)
- **<5% "Why is this here?"** questions in user feedback
- **80%+ coaches trust** the system's recommendations
- **90%+ coaches find** recommended actions helpful

### Engagement Metrics
- **Time to identify priority:** < 10 seconds
- **Click-through to Support Pod:** 70%+ from alerts
- **Expand details usage:** 20-30% (details are helpful, not required)
- **Action completion:** 60%+ within 24 hours of surfacing

---

## Implementation Checklist

### Backend (API)
- [ ] Decision Engine logic (6 categories, scoring)
- [ ] Explainability fields in data model (why, whatChanged, action, owner)
- [ ] Priority surfacing logic (top 2-4, consolidation)
- [ ] Mock data with realistic explainability
- [ ] Routing context preservation

### Frontend (UI)
- [ ] Alert card component with explainability
- [ ] Momentum feed item with "why this matters"
- [ ] Athlete card with issue reason
- [ ] Expandable details component
- [ ] Owner label component
- [ ] Navigation to Support Pod with context
- [ ] Skeleton loading states

### Testing
- [ ] Coaches understand every alert (user testing)
- [ ] Explainability text is clear and concise
- [ ] No information overload (cards feel calm)
- [ ] Expansion works smoothly (progressive disclosure)
- [ ] Mobile experience is touch-friendly
- [ ] Support Pod context flows correctly

---

## Summary

Mission Control V2 adds **full explainability** to every surfaced item while keeping the UI **calm, premium, and fast to scan**.

**Key Improvements:**
- Every card shows WHY, WHAT CHANGED, ACTION, OWNER
- Progressive disclosure (expand for details)
- Lightweight, not verbose
- Consistent structure across all sections
- Seamless routing to Support Pod

**Design Principles Maintained:**
- High signal, low noise
- Action-oriented
- Calm clarity
- Premium feel
- Mobile-ready

The Decision Engine spec defines the logic. This spec defines how it looks and feels.
