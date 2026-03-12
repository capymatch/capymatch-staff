# CapyMatch — Product Requirements Document

## Overview
CapyMatch is a full-stack sports recruiting platform connecting athletes, coaches, and club directors. Built with React (frontend) + FastAPI (backend) + MongoDB.

## Architecture
```
/app/
├── backend/          (FastAPI, MongoDB)
│   ├── routers/      (API endpoints)
│   ├── services/     (Business logic)
│   └── tests/        (Pytest test suites)
└── frontend/         (React, Shadcn UI)
    ├── src/pages/    (Page components)
    ├── src/components/ (Reusable UI)
    └── src/lib/      (Utilities, context)
```

## Athlete-Side Page Structure

### Sidebar Navigation (core features)
Dashboard, My Schools, Find Schools, Calendar, Inbox, Highlights, Analytics

### TopBar Dropdown (account/settings)
- Athlete Profile (`/athlete-profile`)
- Settings (`/athlete-settings`) — Theme, Gmail, Team Management, Privacy, Guided Tour
- Account (`/account`) — Personal Info, Password, Notifications, Privacy, Danger Zone
- Billing (`/billing`) — Current Plan, Usage, Plan Features, Billing History
- Sign Out

## Coach Mission Control (Refined — Mar 2026)

### Hero KPIs
- MY ATHLETES (count)
- NEED ATTENTION (renamed from "Need Action")
- EVENTS THIS WEEK
- DIRECTOR REQUESTS

### Section Order
1. Athletes Requiring Attention — action-needed athletes with prominent NEXT action pills
2. On Track (collapsed by default) — healthy athletes
3. Events Requiring Prep
4. Assigned Actions — with severity badges (Critical/Needs Review/Request)
5. Upcoming Events + Recent Activity (hidden in Focus Mode)

### Focus Mode
- Toggle hides Events + Activity sections
- Shows only Athletes Requiring Attention + Assigned Actions

## Support Pod Task Lifecycle (Implemented — Mar 2026)

### Task States
- **Open/Ready**: Active tasks in "Next Actions" list
- **Completed**: Moved to "Completed & Resolved" section with completed_by/completed_at audit trail
- **Escalated**: Converted to Director Action, logged in activity history
- **Cancelled**: Moved to "Completed & Resolved" section with cancelled_by/cancelled_at

### Key Endpoints
- `PATCH /api/support-pods/{athlete_id}/actions/{action_id}` — Complete/cancel tasks
- `POST /api/support-pods/{athlete_id}/actions/{action_id}/escalate` — Escalate to Director Action
- `POST /api/support-pods/{athlete_id}/actions` — Create new task
- `GET /api/support-pods/{athlete_id}` — Full pod data with actions, timeline, events

### Frontend Components
- `NextActions.js` — Active tasks list + "Completed & Resolved" section + EscalateTaskModal
- `SupportPod.js` — Parent page with full layout (Problem → Context → Actions → Insights)

## Core Features Implemented

### Coach Side
- Mission Control with refined intervention console design
- Support Pod with mobile-first redesign and full task lifecycle
- Director Actions with acknowledge/resolve workflow
- Events, Advocacy, Program Intelligence

### Athlete Side
- Dashboard, Pipeline, Find Schools, Calendar, Inbox, Highlights, Analytics
- Profile, Account, Settings, Billing (separated, no duplication)
- Team Management (Invite Someone)
- Gmail Integration with consent modal

## 3rd Party Integrations
MongoDB, Resend, Stripe, Emergent LLM Key, Gmail API

## Test Credentials
- **Coach:** coach.williams@capymatch.com / coach123
- **Athlete:** emma.chen@athlete.capymatch.com / password123
- **Test Athlete ID:** athlete_3 (Emma Chen)

## Backlog

### P1 — In-App Messaging & Notifications
### P2 — Club Billing (org subscriptions)
### P3 — AI Coach Summary, Intelligence Pipeline Phase 2, Parent/Family Experience
