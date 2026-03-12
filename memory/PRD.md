# CapyMatch — Product Requirements Document

## Overview
CapyMatch is a full-stack sports recruiting platform connecting athletes, coaches, and club directors. Built with React (frontend) + FastAPI (backend) + MongoDB.

## User Personas
- **Athletes** — Manage recruiting pipeline, track schools, build profile, invite helpers
- **Coaches** — Monitor athletes via Mission Control, manage support pods, run events
- **Directors** — Oversee roster, handle director-level actions, manage invites
- **Platform Admins** — Manage users, subscriptions, integrations, universities

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

## Athlete-Side Page Structure (Matches capymatch/capymatch repo)

### Sidebar Navigation (core features)
- Dashboard (`/board`), My Schools (`/pipeline`), Find Schools (`/schools`), Calendar, Inbox, Highlights, Analytics

### TopBar Dropdown (account/settings)
- Athlete Profile (`/athlete-profile`)
- Settings (`/athlete-settings`) — Theme, Gmail, Team Management, Privacy, Guided Tour
- Account (`/account`) — Personal Info, Change Password, Notifications, Privacy, Danger Zone
- Billing (`/billing`) — Current Plan, Usage, Plan Features, Billing History, Cancel/Reactivate
- Sign Out

## Core Features — Implemented

### Coach Side (Complete)
- Mission Control dashboard with unified athlete attention list
- Support Pod with mobile-first redesign
- Director Actions (acknowledge/resolve with modal notes)
- Events, Advocacy, Program Intelligence

### Athlete Side (Complete)
- Dashboard, Pipeline, Find Schools, Calendar, Inbox, Highlights, Analytics
- **Profile** — Athlete profile editing
- **Account** — Personal info, change password, notifications, privacy, data export, delete account
- **Settings** — Appearance/theme, Gmail integration, Team Management (Invite Someone), data & privacy, guided tour
- **Billing** — Current plan details, usage bars, plan features checklist, billing history with transaction table, cancel/reactivate subscription
- **Gmail Consent Modal** — Matches reference: Pro Tip box, What We Access (3 items), What We Never Do (4 items), security note, consent checkbox
- **Team Management** — Invite helpers/parents by email, manage members, "How it works" accordion

## Key API Endpoints
- `GET/POST /api/team` — Team management
- `POST /api/team/invite` — Invite member by email
- `GET /api/stripe/billing-history` — Billing history
- `POST /api/stripe/cancel` — Cancel subscription
- `POST /api/stripe/reactivate` — Reactivate subscription
- `GET/PUT /api/athlete/settings` — Preferences
- `POST /api/athlete/settings/change-password` — Password change
- `DELETE /api/athlete/settings/delete-account` — Account deletion

## 3rd Party Integrations
- MongoDB, Resend, Stripe, Emergent LLM Key, Gmail API

## Test Credentials
- **Athlete:** emma.chen@athlete.capymatch.com / password123

## Backlog

### P1 — In-App Messaging & Notifications
- Coach-to-athlete messaging system

### P2 — Club Billing
- Subscription billing for organizations

### P3 — Future
- Multi-Agent Intelligence Pipeline Phase 2
- AI-Powered Coach Summary
- Parent/Family Experience
