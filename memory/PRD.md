# CapyMatch — Product Requirements Document

## Original Problem Statement
Build CapyMatch, a "recruiting operating system" for clubs, coaches, families, and athletes.

## Core Architecture
- **Backend:** FastAPI (Python), Motor (async MongoDB)
- **Frontend:** React, Tailwind CSS, Shadcn/UI
- **Database:** MongoDB
- **AI:** emergentintegrations (GPT 5.2)
- **Auth:** JWT with passlib (director + coach roles)
- **Email:** Resend API

## Completed Features

### Core Platform
- JWT-based auth, Mission Control, Athlete profiles, Decision Engine, Support Pod, Event Mode, Advocacy Mode, Program Intelligence

### AI Layer V1 & V2
- 8 AI features with confidence indicators

### Coach Management
- Invite system, Roster management, Onboarding checklist, Activation panel, Nudge coach

### Auth & Profile
- Forgot Password flow, Coach Self-Service Profile, Quick Notes, Weekly Digest

### Left Sidebar Layout (2026-03-08)
- Sidebar with CapyMatch logo, role-based nav, auto-detected page titles
- All pages wrapped in AppLayout

### Director Mission Control — Leadership Command Surface (2026-03-08)
**Page structure:** Overview > AI Brief > Needs Attention > Coach Health > Events > Recruiting Signals + Activity

**Visual refinements (latest):**
1. **Program Overview:** "Need Attention" KPI uses red #FF6B6B, 42px font, AlertTriangle icon
2. **AI Program Brief:** Explanatory empty state text + "Generate Brief" button. Leadership summaries (2-4 sentences, no task lists)
3. **Needs Attention:** Grouped by category (Event Prep Risk, Momentum Drop, etc.), red count badge, quick actions (View, Nudge, Assign Coach)
4. **Coach Health:** Grid cards with colored status badges (Active=green, Activating=yellow, Inactive=red), athlete counts, activity info. Filters test coaches.
5. **Upcoming Events:** First event highlighted, progress bars instead of percentages, simplified labels (Tomorrow, 3 days, 1 week)
6. **Recruiting Signals:** Trend arrows (TrendingUp/Minus) next to each metric
7. **Program Activity:** Typed icons (star=interest, file=note, message=response, alert=inactivity), max 6 items, shortened text
8. **Section spacing:** space-y-8 for calmer layout

### Coach Mission Control (2026-03-08)
- Today's Actions (AI hero), My Roster, Upcoming Events, Recent Activity
- Unchanged by director refinements

## Key Credentials
- Director: director@capymatch.com / director123 (name: Clara Adams)
- Coach Williams: coach.williams@capymatch.com / coach123
- Coach Garcia: coach.garcia@capymatch.com / coach123

## Upcoming Tasks
- P1: Platform Integrations (calendars, messaging)
- P2: Smart Match Build
- P2: Unified Platform Merge
