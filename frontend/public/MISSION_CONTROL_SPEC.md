# Mission Control Dashboard - Detailed Screen Specification

## Screen Overview

**Route:** `/mission-control` (default home for coaches/directors)

**Purpose:**  
Command center that gives coaches and directors immediate visibility into what needs attention, what changed, and what to do next.

**Primary Users:** Club Director, Club Coach

**Design Philosophy:**  
This is NOT a traditional dashboard with static widgets and tables.  
This IS an intelligent operating system that actively surfaces priorities and coordinates action.

---

## Screen Architecture

### Layout Structure

```
┌───────────────────────────────────────────────────────────────┐
│ HEADER                                                             │
│ Mode Nav | Search | Quick Actions | Profile                        │
├───────────────────────────────────────────────────────────────┤
│                                                                     │
│ PRIORITY ALERTS (if any)                                           │
│ High-priority cards for urgent items                               │
│                                                                     │
├───────────────────────────────────────────────────────────────┤
│                                                                     │
│ WHAT CHANGED TODAY                                                 │
│ Timeline feed of recent momentum signals                           │
│                                                                     │
├───────────────────────────────────────────────────────────────┤
│                                                                     │
│ ATHLETES NEEDING ATTENTION                                         │
│ Card-based layout of athletes with issues/blockers                 │
│                                                                     │
├───────────────────────────────────────────────────────────────┤
│                                                                     │
│ CRITICAL UPCOMING                                                  │
│ Next 7-14 days of events, deadlines, milestones                    │
│                                                                     │
└───────────────────────────────────────────────────────────────┘

[Quick Actions FAB - bottom right]
```

---

## Section 1: Header

### Components

**Mode Navigation (Primary)**
- Horizontal pill navigation or tabs
- Options: Mission Control | Support Pods | Events | Advocacy | Program
- Mission Control is highlighted/active
- Smooth transitions between modes

**Global Search**
- Search athletes, schools, events
- Prominent placement (top center)
- Keyboard shortcut (Cmd/Ctrl + K)
- Instant results dropdown

**Quick Actions Button**
- Icon button (+ or lightning bolt)
- Opens quick action menu:
  - Log interest/note
  - Create task
  - Start recommendation
  - Add athlete to watch list

**User Profile**
- User avatar/name
- Role indicator (Club Director, Coach)
- Dropdown: Profile, Settings, Logout

**Date/Time Context**
- Current date
- Optional: "Good morning, Coach"
- Sets temporal context for "What Changed Today"

### Visual Design
- Clean, spacious header
- Light background (or subtle gradient)
- Clear visual separation from content below
- Sticky on scroll

---

## Section 2: Priority Alerts

### Purpose
Immediately surface 2-4 highest-priority items that need attention RIGHT NOW.

### Display Logic
- Only show if there are critical/high-priority items
- Maximum 4 alerts to avoid overwhelming
- Sort by priority score

### Alert Card Components

**Each alert card contains:**
- **Alert Type Badge** (visual indicator)
  - Red: Critical blocker
  - Amber: High priority  
  - Blue: Opportunity
  
- **Athlete Name & Grad Year**
  - Prominent display
  - Quick visual identification
  
- **Issue Description**
  - Clear, human-readable
  - Examples:
    * "No recruiting activity in 21 days"
    * "College coach responded — no follow-up sent"
    * "Showcase tomorrow — targets not set"
    * "Official visit offer — response overdue"
  
- **Context**
  - Relevant details (school name, event name, days overdue)
  - Keep concise
  
- **Quick Action Button**
  - Primary CTA relevant to alert
  - Examples:
    * "View Support Pod"
    * "Send Follow-up"
    * "Set Targets"
    * "Review Offer"

### Visual Design
- Card-based layout
- Horizontal layout on desktop (2x2 grid or horizontal scroll)
- Stack vertically on mobile
- Use color sparingly for meaning
- Generous padding
- Subtle drop shadow
- Hover state for interactivity

### Interaction
- Click card → Navigate to relevant context (Support Pod, Event, etc.)
- Click action button → Open quick action modal or navigate
- Dismiss option ("Handle this later")

---

## Section 3: What Changed Today

### Purpose
Timeline-style feed showing momentum signals and changes from the last 24-48 hours.

### Content Types
- New interest from college
- Coach responses
- Event outcomes
- Commitments
- Offer received
- Stage changes
- Support pod updates

### Feed Item Components

**Each feed item contains:**
- **Timestamp** (e.g., "2 hours ago", "This morning")
- **Signal Type Icon** 
  - Positive signals: green/blue icons
  - Negative signals: amber/red icons
  - Neutral: gray icons
- **Athlete Name** (prominent)
- **Change Description**
  - Examples:
    * "Sarah Martinez received camp invite from UCLA"
    * "Jake Williams moved to 'Actively Recruiting' stage"
    * "Emma Chen — Stanford coach responded to coach outreach"
    * "Marcus Johnson — no activity logged in 14 days"
- **Quick Action Link** (optional)
  - "View details"
  - "Send follow-up"
  - "Update status"

### Display Logic
- Show 5-8 most recent/relevant changes
- "View all activity" link at bottom
- Group by time ("This Morning", "Earlier Today", "Yesterday")
- Filter options: All | Positive | Needs Action

### Visual Design
- Timeline layout with left-aligned timestamps
- Clean, scannable list
- Icons for visual parsing
- Use color to indicate sentiment
- Subtle separators between items
- Expandable for more context

### Interaction
- Click item → Expand for details
- Click athlete name → Navigate to Support Pod
- Click action link → Context-specific action

---

## Section 4: Athletes Needing Attention

### Purpose
Core operational view: show all athletes with issues, blockers, or declining momentum.

### Display Logic
- Sort by priority score (algorithm-driven or manual)
- Default view: Show all athletes needing attention
- Filters:
  - Grad Year (2025, 2026, 2027, All)
  - Team (if multi-team program)
  - Issue Type (No activity, Blocker, Missed deadline, Opportunity)
  - Momentum (Declining, Stalled)

### Athlete Card Components

**Each athlete card contains:**

1. **Header Section**
   - Athlete Name (large, prominent)
   - Grad Year & Position (secondary text)
   - Momentum Indicator (visual badge or icon)
     * Trending up (green)
     * Stable (yellow)
     * Trending down (red)

2. **Issue/Blocker Description**
   - Primary issue in clear language
   - Examples:
     * "No recruiting activity in 18 days"
     * "Follow-up needed: Boston College coach responded"
     * "Blocker: Transcript not submitted"
     * "Opportunity: 3 schools showed interest at last event"

3. **Context Indicators**
   - Days since last activity (if relevant)
   - Recruiting stage (Exploring, Actively Recruiting, etc.)
   - Support pod health indicator
   - School interest count (e.g., "5 schools tracking")

4. **Quick Actions**
   - Primary button: "View Support Pod"
   - Secondary actions (icon buttons):
     * Log update
     * Send message
     * Add note
     * Set reminder

### Layout Options

**Desktop:**
- Grid layout: 2-3 cards per row
- Card width: 300-400px
- Generous spacing

**Mobile:**
- Single column
- Full-width cards
- Stackable

### Visual Design
- Card-based (NOT table-based)
- Clean, modern cards with subtle shadow
- Use whitespace generously
- Color only for meaning (momentum, priority)
- Clear typography hierarchy
- Hover states for interactivity

### Interaction
- Click card → Navigate to Support Pod
- Click quick action → Open modal or perform action
- Drag to reorder (optional advanced feature)
- Mark as "handled" (optional)

### Empty State
"No athletes need immediate attention. Great work!"  
Show program snapshot or positive momentum highlights instead.

---

## Section 5: Critical Upcoming

### Purpose
Show next 7-14 days of events, deadlines, and scheduled activities.

### Content Types
- Tournaments/showcases
- College visits (unofficial/official)
- Application deadlines
- Scheduled calls with college coaches
- Important milestones

### Display Logic
- Chronological order
- Group by date
- Show date labels ("Tomorrow", "This Weekend", "Next Week")
- Limit to 7-14 day window

### Event/Deadline Card Components

**Each item contains:**
- **Date** (prominent)
- **Event/Deadline Name**
- **Type** (Tournament, Visit, Deadline, Call)
- **Athletes Involved** (names or count)
- **Prep Status** (for events)
  - Ready (green)
  - In Progress (yellow)
  - Not Started (red)
- **Quick Action**
  - "View event details"
  - "Set prep tasks"
  - "View athlete(s)"

### Visual Design
- Compact list or timeline layout
- Date labels as section headers
- Icons for event types
- Status indicators for prep
- Clean, scannable

### Interaction
- Click event → Navigate to Event detail (or Event Prep)
- Click athlete → Navigate to Support Pod
- Quick add event (if permission)

---

## Section 6: Quick Actions Panel

### Delivery Method
**Option 1: Floating Action Button (FAB)**
- Bottom right corner
- Always accessible
- Click to open action menu

**Option 2: Sidebar Panel**
- Right sidebar (if space allows)
- Always visible

### Quick Actions
1. **Log Interest/Note**
   - Quick form: Athlete + Note + School (optional)
   - Timestamp automatically
   
2. **Create Task**
   - Assign to: Coach, Parent, Athlete
   - Set due date and priority
   
3. **Start Recommendation**
   - Select athlete
   - Select target schools
   - Navigate to recommendation builder
   
4. **Add to Watch List**
   - Flag athlete for extra attention
   - Set reminder date

### Visual Design
- Modal or drawer UI
- Fast, keyboard-friendly forms
- Clear CTAs
- Minimal fields (progressive disclosure)

---

## Section 7: Program Snapshot (Optional)

### Purpose
High-level metrics for context. Not the focus, but helpful.

### Metrics (Select 3-4)
- Total athletes in program
- Athletes by recruiting stage
- Active support pods
- Upcoming events (count)
- Commitments this year
- Athletes needing attention (count)

### Visual Design
- Compact display
- Bottom of page or sidebar
- Simple stat cards or metrics
- Link to Program Intelligence for deep dive

### Interaction
- Click metric → Filter or navigate to relevant view

---

## Responsive Design

### Desktop (1200px+)
- Full layout as described
- Multi-column grids
- Sidebar or FAB for quick actions

### Tablet (768px - 1199px)
- Stack sections vertically
- 2-column grid for athlete cards
- Collapsible sections

### Mobile (< 768px)
- Full vertical stack
- Single-column athlete cards
- Sticky header with mode navigation
- FAB for quick actions
- Swipe gestures for cards

---

## Loading & Empty States

### Loading State
- Skeleton screens for each section
- No generic spinners
- Maintain layout structure while loading

### Empty States

**No Priority Alerts:**
"No urgent items right now. You're on top of things."

**No Changes Today:**
"No new momentum signals yet today. Check back later."

**No Athletes Needing Attention:**
"All athletes are looking good! Great work."
(Show positive momentum highlights or program metrics instead)

**No Upcoming Events:**
"No events scheduled in the next two weeks."

---

## Data Requirements

### API Endpoints Needed

```
GET /api/mission-control
  Returns:
  - priorityAlerts: array<Alert>
  - recentChanges: array<MomentumSignal>
  - athletesNeedingAttention: array<Athlete>
  - upcomingEvents: array<Event>
  - programSnapshot: object
  
GET /api/mission-control/athletes/:athleteId
  Returns athlete detail for quick view
  
POST /api/mission-control/quick-actions
  Handles quick log, task creation, etc.
```

### Mock Data Structure

See `/app/backend/mock_data.py` for detailed mock data.

Key objects:
- 20-30 athletes across grad years
- 5-10 priority alerts
- 10-15 recent momentum signals
- 8-12 athletes needing attention
- 5-8 upcoming events

---

## Technical Implementation Notes

### Frontend
- React components
- State management for filters
- Real-time updates (optional: WebSockets for live changes)
- Smooth animations and transitions
- Optimistic UI updates

### Backend
- Mission Control aggregation logic
- Momentum scoring algorithm
- Priority calculation
- Caching for performance

### Performance
- Initial load < 2 seconds
- Lazy load "Athletes Needing Attention" if many
- Pagination or infinite scroll (if needed)
- Optimize for mobile networks

---

## Success Metrics

### User Behavior
- Time to identify athlete needing support (target: < 10 seconds)
- Daily active coaches checking Mission Control
- Click-through to Support Pods from Mission Control
- Quick action usage

### Product Metrics
- Reduction in athletes falling through cracks
- Faster response to momentum changes
- Increased coach coordination activity

---

## Design Differentiation Checklist

☐ No traditional data tables  
☐ No generic enterprise UI patterns  
☐ Card-based, not row-based  
☐ Action-oriented, not information-display  
☐ Proactive alerts, not reactive reports  
☐ Human language, not database labels  
☐ Generous whitespace, not cramped  
☐ Color for meaning, not decoration  
☐ Mobile-first operations  
☐ Calm, clear, premium feel  

---

## Visual Design References

**Inspiration (tone, not literal):**
- Apple Health app (clarity, card-based, actionable)
- Linear app (clean, fast, modern)
- Notion (calm, organized, spacious)
- Flight tracking apps (real-time, status-focused)
- Mission control interfaces (focused, high-signal)

**Avoid:**
- Salesforce (too enterprise, cluttered)
- Generic SaaS dashboards (too static)
- Hudl (too data-dense for this use case)
- Traditional CRMs (too transactional)

---

## Next Steps for Implementation

1. Create mock data (athletes, signals, events)
2. Build component library (cards, badges, buttons)
3. Implement header and navigation
4. Build Priority Alerts section
5. Build What Changed Today feed
6. Build Athletes Needing Attention cards
7. Build Critical Upcoming section
8. Add Quick Actions FAB/panel
9. Add filters and search
10. Polish animations and interactions
11. Test on mobile
12. Get feedback from real coaches
