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
**Page structure:** Overview > AI Brief > Recruiting Signals > Needs Attention > Coach Health > Events > Activity

**Final UX Refinements (2026-03-08):**
1. **Program Overview KPIs:** "Need Attention" shows trend indicator ("↑ +5 this week") from historical snapshot comparison. Other KPIs unchanged.
2. **Program Momentum Indicator:** Below KPI row — shows Improving/Stable/Declining state with engagement delta percentage. Computed from pod health, issues, and attention changes.
3. **AI Program Brief:** Always renders as bullet points (max 4 lines, • prefix). Never paragraphs. Data source footer shows signal count.
4. **Recruiting Signals:** Large centered numbers (text-4xl font-extrabold), centered layout, trend arrows with delta text (↑ +6 this week / → same as last week).
5. **Needs Attention — Director Intervention Console:** Category card groups with 3 quick actions per row (Open Athlete + 2 context-specific: Assign Coach, Send Reminder, Log Check-In, Request Document). Expand/collapse for 3+ items. Header with issue+athlete count summary.
6. **Coach Health — Management Control Panel:** Status badges (Active/Activating/Needs Support/Inactive), workload bars (High/Moderate/Light), last activity signal, quick actions (View Roster, Send Nudge, Reassign).
7. **Upcoming Events:** Unchanged — timeline, athlete/school counts, readiness progress bars.
8. **Activity Feed:** Typed icons (Star=interest, MessageCircle=response, FileText=note, AlertCircle=inactivity), "Name — description" format with mdash, "6 most recent" counter.

### AI Brief Data Alignment Fix (2026-03-08)
- **Root cause:** AI Program Brief was fed different data than what the dashboard displayed
- **Fixes applied:**
  1. Needs Attention card now uses `ATHLETES_NEEDING_ATTENTION` (matching KPI count) instead of `PRIORITY_ALERTS` — shows top 8 items
  2. AI briefing endpoint now filters to future events only (same as dashboard) and uses same attention data
  3. AI prompt explicitly instructs model to only reference provided data
  4. Decision engine `detect_deadline_proximity` now skips past events (daysAway < 0)
  5. Events KPI now counts only future events (0 <= daysAway <= 14)
  6. Cleaned test artifacts (TEST_REFACTOR, TEST_Phase2) from MongoDB
  7. Added data source transparency footer to AI Brief card ("Based on X flagged athletes, Y upcoming events")

### Coach Mission Control (2026-03-08)
- Today's Actions (AI hero), My Roster, Upcoming Events, Recent Activity
- Unchanged by director refinements

### Roster Page — Recruiting Operations Hub (2026-03-08)
- **Three view modes** via tab switcher: Team View (default), Coach View, Age Group View
- **Team View**: Groups by team (U16 Elite, U17 Premier, U18 Academy) with coach names
- **Coach View**: Groups by assigned coach
- **Age Group View**: Groups by graduation year (Class of 2025/2026/2027)
- **UI Refinements (2026-03-08):**
  - **4-line athlete row**: Name → Position · GradYear → Momentum | Pipeline → Coach · Last Activity. Warnings below.
  - **Mini pipeline indicator**: 7-stage dots (Prospect→Contacted→Responded→Talking→Visit→Offer→Committed), active stage wider with label
  - **Shortened warning labels**: Inactive, Missing Docs, No Owner, Follow-Up, At Risk, Momentum Drop, Disengaged
  - **Stronger momentum colors**: Green=Strong, Amber=Stable, Red=Declining
  - **Bulk actions**: Checkboxes + sticky action bar (Assign Coach, Send Reminder, Add Note)
  - **AI Roster Insights panel**: Computed insights above roster (strong interest count, declining momentum, missing docs, no ownership)
- **Athlete rows**: Name, momentum badge, stage badge, risk alert, position, grad year, coach, last activity
- **Quick actions on hover**: Open Profile, Assign Coach, Notes
- **Needs Attention banner**: Amber section showing flagged athletes with expand/collapse
- **Search**: Filters across name, position, team
- **Reassign modal**: Select new coach + optional reason

## Key Credentials
- Director: director@capymatch.com / director123 (name: Clara Adams)
- Coach Williams: coach.williams@capymatch.com / coach123
- Coach Garcia: coach.garcia@capymatch.com / coach123

## Upcoming Tasks
- P1: Platform Integrations (calendars, messaging)
- P2: Smart Match Build
- P2: Unified Platform Merge
