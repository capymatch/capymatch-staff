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
- [2026-04-02] Coach Management CRUD + Page Redesign (summary strip, rich cards, health signals)
- [2026-04-02] Team dropdown from rosters in invite/edit forms
- **[2026-04-02] New Athlete Onboarding Logic**: 5-day grace period for new athletes. Suppresses declining/risk warnings. Shows "Getting Started" (blue, neutral) instead of "Declining" (red). Roster Insights shows onboarding guidance. "No coach assigned yet" instead of "without coach ownership."

## Product Principle
Treat missing setup and missing data as onboarding states, not failure states.

## Key Files
- `/app/backend/routers/roster.py` — Roster view with onboarding detection (lines 90-145)
- `/app/backend/routers/coaches.py` — Coach CRUD endpoints
- `/app/frontend/src/pages/RosterPage.js` — Roster page with neutral onboarding states
- `/app/frontend/src/pages/InvitesPage.js` — Coach management page

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
