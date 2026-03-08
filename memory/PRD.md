# CapyMatch — Product Requirements Document

## Original Problem Statement
Build CapyMatch, a "recruiting operating system" for clubs, coaches, families, and athletes. The system actively coordinates support, surfaces priorities, and helps users know what to do next.

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
- Invite system with team-aware suggestions
- Roster management with reassignment/audit trail
- Coach onboarding checklist (5 steps)
- Coach activation panel with status labels + profile completeness
- Nudge coach (check-in emails with reason presets, 24h cooldown)

### Forgot Password, Coach Profile, Quick Notes, Weekly Digest
- All implemented and tested

### Left Sidebar Layout (2026-03-08)
- Sidebar with CapyMatch logo, role-based nav (Roster hidden from coaches)
- Top bar with auto-detected page title, notifications, user menu
- All pages wrapped in AppLayout

### Director Mission Control — Leadership Command Surface (2026-03-08)
- **Hero:** Dark card (#1E213A) with personalized greeting, date badge, 5 KPIs with vertical dividers
- **AI Program Brief:** Leadership summary (2-4 sentences, strategic, no task lists). Updated prompt: risks first, positive progress, event readiness
- **Needs Attention:** Max 5 leadership-level alerts with quick actions (View, Assign Coach, Nudge)
- **Coach Health:** NEW — Coach engagement visibility (status: active/inactive/activating, athlete count, last activity). Filters out test coaches.
- **Upcoming Events:** Simplified day labels (Tomorrow, 3 days, 1 week), readiness indicators
- **Recruiting Signals:** NEW — Weekly summary (school interests, hot interests, recommendations sent, coach notes logged)
- **Program Activity:** Limited to 6 meaningful items
- **Section order:** Overview > AI Brief > Needs Attention > Coach Health > Events > Recruiting Signals + Activity

### Coach Mission Control (2026-03-08)
- Today's Actions (AI hero), My Roster, Upcoming Events, Recent Activity
- Unchanged by director refinements

## Key Credentials
- Director: director@capymatch.com / director123 (name: Clara Adams)
- Coach Williams: coach.williams@capymatch.com / coach123
- Coach Garcia: coach.garcia@capymatch.com / coach123

## Code Architecture
```
/app/frontend/src/components/
  layout/
    AppLayout.js, Sidebar.js, TopBar.js
  mission-control/
    DirectorView.js, CoachView.js
    AIProgramBrief.js       # Leadership summary (paragraph)
    NeedsAttentionCard.js   # Quick actions (View, Nudge, Assign)
    CoachHealthCard.js      # NEW: coach engagement
    RecruitingSignalsCard.js # NEW: weekly recruiting metrics
    UpcomingEventsCard.js   # Simplified day labels + readiness
    ActivityFeed.js         # Max 6 items
    TodaysActionsCard.js, MyRosterCard.js

/app/backend/routers/
  mission_control.py   # coachHealth, recruitingSignals, programActivity(6)
  /app/backend/services/ai.py  # Updated briefing prompt
```

## Upcoming Tasks
- P1: Platform Integrations (calendars, messaging)
- P2: Smart Match Build
- P2: Unified Platform Merge
