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
- Notes in athlete timeline, counts as engagement activity

### Weekly Coach Digest (2026-03-07)
- Manual trigger on Roster page (director-only)
- Command brief email with coach activation, athletes needing attention, notes logged

### Mission Control Redesign (2026-03-08)
- **Role-based dashboards:** Single `/api/mission-control` endpoint returns different data based on user role
- **Director Mission Control:** AI Program Brief (hero), Program Status Row (5 KPIs), Needs Attention (max 5 critical items), Upcoming Events, Program Activity
- **Coach Mission Control:** Today's Actions (AI hero), My Roster (athletes with momentum/health/categories), Upcoming Events, Recent Activity
- **Above-the-fold rule:** Max 3 modules per role above the fold
- **Design:** Premium dark shell + light content surfaces, calm spacing, strong visual hierarchy

### Documentation
- pages.html, gallery.html

## Key Credentials
- Director: director@capymatch.com / director123
- Coach Williams: coach.williams@capymatch.com / coach123
- Coach Garcia: coach.garcia@capymatch.com / coach123

## DB Schema
- **users**: {id, email, password_hash, name, role, team, onboarding, profile, last_active, created_at}
- **athlete_notes**: {id, athlete_id, author, created_by, created_by_name, text, tag, category, created_at}
- **invites**: {id, email, name, team, token, status, accepted_user_id, assignment_reviewed, ...}
- **nudges**: {id, coach_id, reason, subject, message, delivery_status, last_error, sent_at}
- **password_resets**: {id, email, token_hash, expires_at, used, created_at}
- **digests**: {id, sent_by, sent_by_name, recipients[], period_start, period_end, summary_data, delivery_status, last_error, sent_at}

## Code Architecture
```
/app/backend/routers/
  mission_control.py   # Role-based MC: director/coach views
  digest.py            # Weekly digest generation + history
  profile.py           # Coach self-service profile
  roster.py            # Roster + Activation + Nudge
  onboarding.py        # Coach onboarding checklist
  athletes.py          # Athletes + Quick Notes
  intelligence.py      # AI endpoints (briefing, actions, pod, insights)
  auth.py, ai.py, invites.py, events.py, advocacy.py, program.py

/app/frontend/src/components/mission-control/
  Header.js            # Shared nav header
  DirectorView.js      # Director MC container
  CoachView.js         # Coach MC container
  AIProgramBrief.js    # Director hero: AI program summary
  ProgramStatusRow.js  # Director: 5 KPI pills
  NeedsAttentionCard.js # Director: critical interventions (max 5)
  TodaysActionsCard.js # Coach hero: AI work queue
  MyRosterCard.js      # Coach: athlete roster with health
  UpcomingEventsCard.js # Shared: upcoming events
  ActivityFeed.js      # Shared: recent activity feed

/app/frontend/src/pages/
  MissionControl.js    # Role router: DirectorView or CoachView
  ProfilePage.js, ForgotPasswordPage.js, ResetPasswordPage.js
  RosterPage.js, SupportPod.js, etc.
```

## Upcoming Tasks
- P1: Platform Integrations (calendars, messaging)
- P2: Smart Match Build (/app/SMART_MATCH_CONCEPT.md)
- P2: Unified Platform Merge (/app/MERGE_ASSESSMENT_PLAN.md)
- V2: Auto-scheduled digest (Monday 8am)
- V2: Multi-recipient digest support
