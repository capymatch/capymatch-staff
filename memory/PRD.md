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

## Core Features — Implemented

### Coach Side (Complete)
- Mission Control dashboard with unified athlete attention list
- Support Pod with mobile-first redesign (Pod Hero Card, collapsible sections)
- Director Actions (acknowledge/resolve with modal notes and follow-ups)
- Events, Advocacy, Program Intelligence

### Athlete Side (Complete)
- **Dashboard** — Recruiting overview at `/board`
- **Pipeline** — School tracking kanban at `/pipeline`
- **Find Schools** — School discovery at `/schools`
- **Calendar** — Events calendar at `/calendar`
- **Inbox** — Email management at `/inbox`
- **Highlights** — Video highlights at `/highlights`
- **Analytics** — Outreach analytics at `/analytics`
- **Profile** — Athlete profile editing at `/athlete-profile`
- **Account** (NEW - Mar 2026) — Personal info, subscription, change password, notifications, privacy, danger zone at `/account`
- **Settings** (REFACTORED - Mar 2026) — Appearance/theme, Gmail integration, Team Management (Invite Someone), data & privacy, guided tour at `/athlete-settings`
- **Team Management** (NEW - Mar 2026) — Invite helpers/parents to collaborate on recruiting. Backend API at `/api/team/*`

### Admin Side
- User management, subscriptions, integrations, universities dashboard

## Key API Endpoints
- `GET/POST /api/team` — Team info and auto-creation
- `POST /api/team/invite` — Invite team member by email
- `DELETE /api/team/invitations/{id}` — Cancel pending invite
- `DELETE /api/team/members/{id}` — Remove team member
- `POST /api/team/leave` — Leave team
- `POST /api/team/accept/{id}` — Accept team invite
- `GET/PUT /api/athlete/settings` — Athlete preferences
- `POST /api/athlete/settings/change-password` — Password change
- `GET /api/athlete/settings/export-data` — Data export
- `DELETE /api/athlete/settings/delete-account` — Account deletion

## 3rd Party Integrations
- **MongoDB** — Primary database
- **Resend** — Transactional emails
- **Stripe** — Payment processing
- **Emergent LLM Key** — AI features
- **Gmail API** — Email integration for athletes

## Test Credentials
- **Coach:** coach.williams@capymatch.com / (check DB)
- **Athlete:** emma.chen@athlete.capymatch.com / password123

## Backlog

### P1 — In-App Messaging & Notifications
- Coach-to-athlete messaging system
- Real-time notifications

### P2 — Club Billing
- Subscription billing for organizations

### P3 — Future
- Multi-Agent Intelligence Pipeline (Phase 2+): Roster Stability, Scholarship, NIL Readiness agents
- AI-Powered Coach Summary (LLM-generated recruiting pitches)
- Parent/Family Experience (dedicated UX for parents/helpers)
- Coach Probability / Program Receptivity Feature
