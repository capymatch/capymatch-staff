# CapyMatch - Product Requirements Document

## Original Problem Statement
Athlete management platform (CapyMatch) with multi-role support (Admin, Director, Coach, Athlete). Features include pipeline management, journey tracking, mission control dashboards, coach invitations, roster management, and AI-powered insights.

## Architecture
- **Frontend**: React (CRA) with Shadcn/UI components
- **Backend**: FastAPI with MongoDB (Motor async driver)
- **Auth**: JWT-based with multi-role support via `roles` array and `X-Effective-Role` header
- **DB**: MongoDB (`test_database`)

## Key Users
- Douglas (`douglas@capymatch.com` / `abc123`) - Platform admin with all roles
- Coach account (`douglas.gmns@gmail.com`) - Registered coach

## What's Been Implemented
- Pipeline Page performance optimization
- Journey Page UI polish (timeline bubbles, floating action bar, top header)
- App rebranding to "CapyMatch"
- Multi-Role Switcher (Admin/Director/Coach/Athlete)
- Database purge of all mock data
- Routing & Invites fixes (Coaches page, Roster page)
- AcceptInvitePage redesign (matches Login page style)
- **[2026-04-02] Bug Fix**: Director dashboard coach count now queries actual registered users. Momentum defaults to "Stable" when no athletes exist.
- **[2026-04-02] Coach Management Page**: Redesigned InvitesPage with tabs (Active Coaches / Invites). Full CRUD for coaches: view, edit name/team, deactivate/activate, remove. Backend: new `/api/coaches` endpoints. Frontend: tabbed UI with edit modal, action menus, confirm dialogs.

## Current State
- DB has 2 users (Douglas admin + Douglas Coach) and 1,057 university KB entries
- Auto-seeding is disabled
- All dashboard KPIs reflect real data
- Coach management fully operational

## Key Files
- `/app/backend/routers/coaches.py` — Coach CRUD endpoints
- `/app/backend/routers/invites.py` — Invite system
- `/app/frontend/src/pages/InvitesPage.js` — Tabbed Coaches + Invites page

## P1 Upcoming Tasks
- CSV Import Tool: Bulk import for school/coach data
- Bulk Approve Mode: Director Inbox multi-select and bulk approve

## P2 Future/Backlog
- Parent/Family Experience
- AI-Powered Coach Summary
- Multi-Agent Intelligence Pipeline

## 3rd Party Integrations
- OpenAI GPT / Claude (Emergent LLM Key)
- Stripe (Payments)
- Resend (Email)
- Google OAuth
