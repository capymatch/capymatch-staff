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

### Forgot Password (2026-03-07)
- Secure reset flow: hashed tokens, 1-hour expiry, no email enumeration

### Coach Self-Service Profile (2026-03-07)
- /profile page via avatar dropdown: name, contact method, phone, availability, bio
- Completeness tracking, director visibility in activation + roster

### Coach Quick Notes (2026-03-07)
- Inline quick note on Mission Control athlete cards and Support Pod
- Category pills (Recruiting/Event/Parent/Follow-up/Other)

### Weekly Coach Digest (2026-03-07)
- Manual trigger on Roster page (director-only)

### Mission Control Redesign (2026-03-08)
- **Role-based dashboards:** Single `/api/mission-control` endpoint returns role-specific data
- **Director MC:** AI Program Brief, Program Status Row (5 KPIs), Needs Attention (max 5), Upcoming Events, Program Activity
- **Coach MC:** Today's Actions (AI), My Roster (athletes with momentum/health), Upcoming Events, Recent Activity
- **Above-the-fold rule:** Max 3 modules per role

### UI/UX Redesign to Match CapyMatch App (2026-03-08)
- **Left Sidebar Navigation:** CapyMatch logo (CM), nav items (Dashboard, Events, Advocacy, Program, Roster/director-only, AI Features), active state highlighting in emerald
- **Minimal Top Bar:** Page title with icon, notification bell, dark mode toggle, user avatar with initials + name, dropdown menu (Profile, Sign out)
- **Dark Hero Section:** Personalized greeting ("Good evening, [Name]" with green name #4CAF50), date badge, 4 inline KPI metrics with colored indicator dots
- **AppLayout Wrapper:** All authenticated pages wrapped in Sidebar + TopBar via ProtectedRoute in App.js
- **Route-based page titles:** AppLayout auto-detects page title from current route
- **Login page excluded from sidebar layout**

## Key Credentials
- Director: director@capymatch.com / director123
- Coach Williams: coach.williams@capymatch.com / coach123
- Coach Garcia: coach.garcia@capymatch.com / coach123

## Code Architecture
```
/app/frontend/src/
  components/
    layout/
      AppLayout.js       # Sidebar + TopBar wrapper, auto-detects page title
      Sidebar.js         # Left nav: logo, role-based items, active state
      TopBar.js          # Page title, notifications, theme toggle, user menu
    mission-control/
      DirectorView.js    # Dark hero + KPIs + Program Brief + Needs Attention
      CoachView.js       # Onboarding + Dark hero + KPIs + Actions + Roster
      AIProgramBrief.js  # Director: AI program summary card
      ProgramStatusRow.js # (legacy, KPIs now inline in hero)
      NeedsAttentionCard.js # Director: critical interventions (max 5)
      TodaysActionsCard.js  # Coach: AI work queue card
      MyRosterCard.js    # Coach: athlete roster with health
      UpcomingEventsCard.js # Shared: upcoming events
      ActivityFeed.js    # Shared: recent activity feed
  pages/
    MissionControl.js    # Role router: DirectorView or CoachView
    (All pages render inside AppLayout via ProtectedRoute in App.js)

/app/backend/routers/
  mission_control.py     # Single endpoint, role-based response
  (other routers unchanged)
```

## Upcoming Tasks
- P1: Platform Integrations (calendars, messaging)
- P2: Smart Match Build (/app/SMART_MATCH_CONCEPT.md)
- P2: Unified Platform Merge (/app/MERGE_ASSESSMENT_PLAN.md)
- V2: Auto-scheduled digest (Monday 8am)
- V2: Multi-recipient digest support
