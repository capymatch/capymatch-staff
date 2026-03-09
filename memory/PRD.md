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
1. **Program Overview KPIs:** "Need Attention" shows trend indicator from historical snapshot comparison.
2. **Program Momentum Indicator:** Below KPI row — shows Improving/Stable/Declining state.
3. **AI Program Brief:** Always renders as bullet points (max 4 lines).
4. **Recruiting Signals:** Large centered numbers, trend arrows with delta text.
5. **Needs Attention — Director Intervention Console:** Category card groups with quick actions.
6. **Coach Health — Management Control Panel:** Status badges, workload bars, quick actions.
7. **Upcoming Events:** Timeline, athlete/school counts, readiness progress bars.
8. **Activity Feed:** Typed icons, "Name — description" format.

### AI Brief Data Alignment Fix (2026-03-08)
- Fixed data inconsistencies between AI brief and dashboard.

### Coach Mission Control (2026-03-08)
- Today's Actions (AI hero), My Roster, Upcoming Events, Recent Activity

### Mobile Responsiveness (2026-03-08)
- Sidebar, TopBar, AppLayout, Director Hero KPIs, Recruiting Signals, Coach Health, Roster — all mobile responsive.

### Roster Page — Intelligence Surface (2026-03-08)
- Three view modes: Team View, Coach View, Age Group View
- 4-line athlete rows: Name, Position/GradYear, Momentum/Pipeline, Coach/Activity
- Mini pipeline indicator (7-stage dots)
- Momentum badges (Strong/Stable/Declining)
- Risk alerts with shortened warning labels
- Per-athlete quick actions (Open Profile, Assign Coach, Notes)
- AI Roster Insights panel
- Search filter across name, position, team

### Bulk Actions — COMPLETE (2026-02-13) ✅
- **Backend:** 3 endpoints: `POST /api/roster/bulk-assign`, `POST /api/roster/bulk-remind`, `POST /api/roster/bulk-note`
- **Frontend:** Checkbox selection on athlete rows, sticky BulkActionBar with count/clear, BulkAssignModal (coach dropdown), BulkTextModal (reusable for Remind/Note)
- **E2E tested:** 100% backend (15/15), 100% frontend (12/12) — all passing

## Key Credentials
- Director: director@capymatch.com / director123 (name: Clara Adams)
- Coach Williams: coach.williams@capymatch.com / coach123
- Coach Garcia: coach.garcia@capymatch.com / coach123

## Unified Platform Strategy (2026-02-13)
- Architecture plan created at `/app/UNIFICATION_PLAN.md`
- Both codebases reviewed: athlete app (`capymatch/capymatch`) and staff app (`capymatch/capymatch-staff`)
- Backup branches created for both repos before unification work begins
- Target: One platform, role-based experiences (Director, Coach, Athlete, Parent)

## Upcoming Tasks
- P0: Unified Platform — Phase 1 Foundation (add athlete/parent roles, role-based routing, migrate mock data to MongoDB)
- P1: Unified Platform — Phase 2 Athlete Dashboard
- P1: Platform Integrations (calendars, messaging)
- P2: Smart Match Build (concept at /app/SMART_MATCH_CONCEPT.md)
- P2: Unified Platform — Phase 3+ (pipeline, Gmail, connected experiences)

## Refactoring Backlog
- Extract modal components from RosterPage.js into frontend/src/components/roster/modals/
- Migrate ATHLETES mock data array to real MongoDB collection
