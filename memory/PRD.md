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
- [2026-04-02] Bug Fix: Director dashboard coach count + momentum
- [2026-04-02] Coach Management CRUD: Backend `/api/coaches` endpoints
- **[2026-04-02] Coach Management Page Redesign**: Complete overhaul of Director's Coaches page:
  - Summary stat strip (Active Coaches, Pending Invites, Athletes Managed, Avg Response)
  - Refined tabs with icons and dark count badges
  - Rich coach cards with avatar health signals, stats row, edit/menu actions
  - Contextual "Grow your coaching staff" prompt when < 3 coaches
  - Improved invite flow with dashed CTA button
  - Orange accent styling consistent with design system
  - Coach health signals (Active/Needs attention/Inactive)

## Key Files
- `/app/backend/routers/coaches.py` — Coach CRUD endpoints
- `/app/backend/routers/invites.py` — Invite system
- `/app/frontend/src/pages/InvitesPage.js` — Redesigned Coaches + Invites page

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
