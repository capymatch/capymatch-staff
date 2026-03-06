# Support Pod Specification - DRAFT

## Overview

Support Pod is the **core operational unit** of athlete support in CapyMatch. It's not just a collaboration workspace—it's the fundamental organizing principle for how recruiting support is delivered, coordinated, and made visible to families.

**Route:** `/support-pods/:athleteId`

**Purpose:**  
The Support Pod is where coaches, families, and advisors coordinate to move an athlete forward. It's the destination from Mission Control interventions and the center of all support activity.

---

## Core Concept

### Support Pod as Operational Unit

**What it is:**
- The group of people responsible for an athlete's recruiting success
- Clear ownership and accountability structure
- Visible coordination (not hidden coach work)
- Action-oriented workspace (not just information display)

**Pod Members:**
- **Athlete** (center of everything)
- **Parent(s)** (decision-makers, logistics coordinators)
- **Club Coach** (primary supporter, primary coordinator)
- **High School Coach** (optional, coordination partner)
- **Recruiting Advisor** (optional, strategic guidance)

**Key Principle:**  
Every action has an owner. Every blocker is visible. Every athlete knows they're supported.

---

## Operating Context

**Support Pod vs. Mission Control:**
- **Mission Control:** Fast identification (5-10 min, who needs help)
- **Support Pod:** Deep coordination (15-30 min, how to help them)

**Mental Model:**
- Mission Control = Triage
- Support Pod = Treatment room

**Workflow:**
1. Coach identifies issue in Mission Control
2. Coach clicks into Support Pod
3. Issue is highlighted, action is pre-loaded
4. Coach coordinates with pod members
5. Actions are assigned, blockers are resolved
6. Athlete momentum improves

---

## Routing from Mission Control

### Context Preservation

When navigating from Mission Control → Support Pod:

**URL Pattern:**
```
/support-pods/[athleteId]?context=[category]&intervention=[intervention_id]
```

**Support Pod Opens With:**
1. **Active Issue Banner** (at top, prominent)
2. **Pre-loaded Action** (from Mission Control recommendation)
3. **Quick Action Buttons** (ready to use)
4. **Timeline Context** (recent activity shown)
5. **Pod Members** (who can help)

**Example:**

**From Mission Control:**
```
[AMBER] Sarah Martinez | 2026
No activity in 18 days
Last activity: UCLA email on Dec 18
[Check In with Family] → clicks here
Owner: Coach Martinez
```

**To Support Pod:**
```
┌──────────────────────────────────────────────┐
│ ⚠️ ACTIVE ISSUE (from Mission Control)       │
│                                               │
│ Momentum Drop                                 │
│ No activity in 18 days                       │
│ Last activity: UCLA email on Dec 18          │
│                                               │
│ Recommended: Check in with family            │
│                                               │
│ [Log Call] [Send Message] [Create Task]      │
└──────────────────────────────────────────────┘

[Rest of Support Pod interface below...]
```

---

## Screen Architecture

### Layout Structure

```
┌─────────────────────────────────────────────┐
│ HEADER                                       │
│ ← Back to Mission Control | Sarah Martinez  │
├─────────────────────────────────────────────┤
│                                              │
│ ACTIVE ISSUE BANNER (if from Mission Control)│
│ Highlighted, actionable, dismissable        │
│                                              │
├─────────────────────────────────────────────┤
│                                              │
│ ATHLETE OVERVIEW                             │
│ Name, grad year, stage, momentum            │
│                                              │
├─────────────────────────────────────────────┤
│                                              │
│ POD MEMBERS                                  │
│ Who's who, roles, ownership                 │
│                                              │
├─────────────────────────────────────────────┤
│                                              │
│ CURRENT STATUS                               │
│ Recent momentum, blockers, next actions     │
│                                              │
├─────────────────────────────────────────────┤
│                                              │
│ ACTIVITY TIMELINE                            │
│ What's happened, coordination feed          │
│                                              │
├─────────────────────────────────────────────┤
│                                              │
│ QUICK ACTIONS                                │
│ Log, message, create task, update           │
│                                              │
└─────────────────────────────────────────────┘
```

---

## Section 1: Active Issue Banner (CRITICAL)

### Purpose
When arriving from Mission Control, the specific issue must be immediately visible and actionable.

### Display Logic
- Only shows if `?context=` param in URL
- Highlighted at top (cannot miss it)
- Dismissable once addressed
- Links back to Mission Control

### Visual Design
```
┌──────────────────────────────────────────────┐
│ [⚠️ AMBER BAR]                               │
│                                               │
│ ACTIVE ISSUE: Momentum Drop                  │
│                                               │
│ Why: No activity in 18 days                  │
│ What changed: Last activity Dec 18           │
│                                               │
│ Recommended action:                           │
│ Check in with family about engagement        │
│                                               │
│ [Log Call] [Send Message] [Mark Resolved]    │
│                                               │
│ Owner: Coach Martinez                         │
│                                               │
│ [Dismiss] [Back to Mission Control]          │
└──────────────────────────────────────────────┘
```

### Interactions
- Click [Log Call] → Open quick log modal
- Click [Send Message] → Open message composer
- Click [Mark Resolved] → Update status, dismiss banner
- Click [Dismiss] → Hide banner (issue still exists)
- Click [Back to Mission Control] → Return to Mission Control

---

## Section 2: Athlete Overview

### Purpose
Quick context on who this athlete is and their current state.

### Content
```
┌──────────────────────────────────────────────┐
│ Sarah Martinez                                │
│ 2026 | Midfielder | U17 Premier              │
│                                               │
│ [↓ Declining]  Stage: Actively Recruiting   │
│                                               │
│ 6 target schools | 2 active interest         │
│                                               │
│ Last activity: 18 days ago                   │
│ Last coach contact: 12 days ago              │
└──────────────────────────────────────────────┘
```

---

## Section 3: Pod Members

### Purpose
Show who is in the support pod, their roles, and who owns what.

### Visual Design
```
┌──────────────────────────────────────────────┐
│ SUPPORT POD                                   │
│                                               │
│ [👤] Sarah Martinez                          │
│      Athlete                                  │
│      Last login: 5 days ago                  │
│                                               │
│ [👤] Maria Martinez                          │
│      Parent (Primary Contact)                │
│      Last active: 7 days ago                 │
│      [Message]                                │
│                                               │
│ [👤] Coach Martinez                          │
│      Club Coach (Primary Supporter)          │
│      Owns: 3 active tasks                    │
│      [Assign Task]                            │
│                                               │
│ [➕] Add pod member                          │
└──────────────────────────────────────────────┘
```

### Key Features
- Primary supporter clearly marked (badge)
- Last activity shown (engagement visibility)
- Task ownership count
- Quick actions per member
- Ability to add high school coach or advisor

---

## Section 4: Current Status

### Purpose
Snapshot of where things stand right now.

### Content Areas

**Recent Momentum:**
- Last 7-14 days of momentum signals
- Positive: green, Negative: red
- Timeline view

**Active Blockers:**
- What's stuck and why
- Owner for resolution
- Due dates if applicable

**Next Actions:**
- Top 3-5 actions by owner
- Due dates
- Status (pending, in progress, blocked)

---

## Section 5: Activity Timeline

### Purpose
Chronological feed of everything that's happened with this athlete.

### Content Types
- Coach check-ins
- Family communication
- School interest/responses
- Events attended
- Stage changes
- Document uploads
- Tasks created/completed

### Visual Design
- Timeline with timestamps
- Grouped by date
- Icons by type
- Expandable for details

---

## Section 6: Quick Actions

### Purpose
Fast logging and coordination without leaving the pod.

### Actions
1. **Log Activity** (call, email, meeting)
2. **Send Message** (to pod members)
3. **Create Task** (assign to pod member)
4. **Update Stage** (recruiting stage change)
5. **Add Note** (general observation)
6. **Flag Blocker** (identify obstacle)

---

## Ownership Model

### Clear Responsibility

**Every action has an owner:**
- Tasks assigned to specific pod member
- Blockers have resolution owner
- Follow-ups have owner and due date

**Ownership Visibility:**
- Pod members see what they own
- Coach sees ownership distribution
- Family sees who is helping

**Ownership Gaps Detected:**
- Unassigned tasks flagged
- Ownership gaps surface in Mission Control
- Coach prompted to assign

---

## Support Pod Health

### What Makes a Healthy Pod

**Green (Healthy):**
- All pod members active (weekly)
- No overdue actions
- No unresolved blockers >48 hours
- Regular coach coordination

**Yellow (Needs Attention):**
- Pod member inactive 7+ days
- 1-2 overdue actions
- Blocker unresolved 3-5 days

**Red (At Risk):**
- Pod member inactive 14+ days
- 3+ overdue actions
- Critical blocker unresolved 5+ days
- No coach contact 7+ days

### Pod Health Indicator
Shown in Mission Control list and in pod header.

---

## Coordination Features

### What Makes This Different

**Not just messaging:**
- Task assignment with due dates
- Blocker flagging with resolution tracking
- Ownership visibility
- Action history

**Not just activity log:**
- Proactive next actions
- Clear who does what
- Visible to all pod members (transparency)

**Family transparency:**
- Parents see coach activity
- Parents see what's owned vs. unassigned
- Builds trust through visibility

---

## Mobile Considerations

Support Pod must work on mobile because:
- Coaches work on the go
- Post-event updates often mobile
- Quick coordination between practices

**Mobile optimizations:**
- Sticky issue banner
- Tap-friendly quick actions
- Swipeable timeline
- Voice-friendly logging

---

## Integration Points

### Where Support Pod Connects

**From Mission Control:**
- Issue context preserved
- Action pre-loaded
- Routing includes intervention ID

**To Event Mode:**
- Pre-event: Prep tasks created in pod
- Post-event: Updates logged to pod
- Interest captured flows to pod timeline

**To Advocacy Mode:**
- Coach creates recommendation from pod
- Recommendation links to athlete pod
- Success tracked back to pod

---

## Success Metrics

**Pod Coordination:**
- Coach-family coordination: 2x per week per athlete
- Task completion rate: 80%+ within due date
- Blocker resolution time: <48 hours

**Family Satisfaction:**
- "I know my coach is helping": 90%+ agree
- "I know what to do next": 85%+ agree
- Support Pod NPS: 50+

**Coach Efficiency:**
- Time to coordinate support: <5 min per athlete
- Ownership clarity: 95%+ tasks assigned
- Fewer "who's handling this?" questions

---

## V1.5 Scope (Initial Build)

### Must Have
1. Active Issue Banner (from Mission Control)
2. Athlete Overview (snapshot)
3. Pod Members (list with roles)
4. Current Status (momentum, blockers, next actions)
5. Activity Timeline (basic feed)
6. Quick Actions (log activity, send message, create task)
7. Ownership assignment

### Can Defer
8. Real-time messaging (async only in V1.5)
9. Advanced collaboration (shared notes, co-editing)
10. Pod configuration (adding/removing members)
11. Document upload/sharing
12. Deep integration with athlete workspace

---

## Implementation Notes

### Data Model Requirements

**Support Pod Object:**
```javascript
{
  id: "pod_athlete_3",
  athleteId: "athlete_3",
  members: [
    {
      userId: "coach_1",
      role: "club_coach",
      isPrimary: true,
      activeTasksOwned: 3
    },
    {
      userId: "parent_1",
      role: "parent",
      isPrimary: true,
      lastActive: "2025-01-05T10:00:00Z"
    }
  ],
  currentIssues: [...],
  activeBlockers: [...],
  nextActions: [...],
  recentActivity: [...]
}
```

### API Endpoints Needed

```
GET /api/support-pods/:athleteId
  Returns: Pod data with members, issues, actions, timeline

POST /api/support-pods/:athleteId/log-activity
  Body: { type, description, timestamp }
  Returns: Activity created

POST /api/support-pods/:athleteId/create-task
  Body: { title, description, ownerId, dueDate }
  Returns: Task created

POST /api/support-pods/:athleteId/flag-blocker
  Body: { type, description, resolutionOwner }
  Returns: Blocker created

PATCH /api/support-pods/:athleteId/resolve-issue
  Body: { issueId, resolution }
  Returns: Issue resolved status
```

---

## Next Steps

### For Full Specification
1. Detailed wireframes for each section
2. Full explainability structure (like Mission Control)
3. Mobile interaction patterns
4. Ownership assignment workflows
5. Blocker resolution flows
6. Timeline filtering and search

### For V1.5 Implementation
1. Define Support Pod data model
2. Create API endpoints
3. Build pod components
4. Implement routing from Mission Control
5. Test with coaches (coordination workflows)

---

## Summary

Support Pod is the **core operational unit** where:
- Mission Control issues get resolved
- Coaches coordinate with families
- Ownership is clear and visible
- Actions are assigned and tracked
- Families see the support in action

It's not just a collaboration tool—it's the **fundamental organizing principle** of how CapyMatch coordinates athlete support at scale.

The seamless flow from Mission Control (identify) → Support Pod (coordinate) → Action (resolve) is what makes CapyMatch a recruiting operating system, not just a dashboard.

---

**Status:** DRAFT v1.0  
**Ready for:** Review and feedback  
**Next:** Complete detailed specifications for V1.5 implementation
