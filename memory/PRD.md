# CapyMatch - Product Requirements Document

## Original Problem Statement
Athlete management platform (CapyMatch) with multi-role support (Admin, Director, Coach, Athlete). Features include pipeline management, journey tracking, mission control dashboards, coach invitations, roster management, and AI-powered insights.

## Architecture
- **Frontend**: React (CRA) with Shadcn/UI components
- **Backend**: FastAPI with MongoDB (Motor async driver)
- **Auth**: JWT-based with multi-role support via `roles` array and `X-Effective-Role` header
- **DB**: MongoDB (`test_database`)

## Athlete State Model (4 independent layers)

### Layer 1: Momentum Label (roster.py)
| Label | Meaning | UI Color |
|---|---|---|
| `getting_started` | New athlete, no activity, within grace period | Blue |
| `setup_needed` | Past grace, missing key setup (no email/schools) | Violet |
| `active` | Normal recruiting activity | Sky |
| `building_momentum` | Rising trend, score >= 5 | Green |
| `declining` | Score <= 0 or declining trend with inactivity | Red |
| `inactive` | Intentional pause, 21+ days, score 0, not declining | Gray |

### Layer 2: Attention Status (unified_status.py — UNCHANGED)
`blocker`, `urgent_followup`, `at_risk`, `needs_review`, `all_clear`

### Layer 3: Journey State (unified_status.py — UNCHANGED)
"Getting Started", "Reaching Out", "Building Interest", "Visiting Schools", "Offer Received", "Committed"

### Layer 4: Pod Health (program_engine.py — UNCHANGED)
`healthy`, `needs_attention`, `at_risk`

### Display Status (derived, read-only)
Computed from momentum + attention: `critical > at_risk > needs_attention > building_momentum > active > setup_needed > getting_started > inactive`

## Key Product Principles
- No data yet ≠ negative momentum
- Missing setup ≠ decline
- New athletes default to neutral onboarding state
- Onboarding and health/risk are separate dimensions

## What's Been Implemented
- Pipeline Page performance optimization
- Journey Page UI polish
- App rebranding to "CapyMatch"
- Multi-Role Switcher (Admin/Director/Coach/Athlete)
- Database purge of all mock data
- Routing & Invites fixes
- AcceptInvitePage redesign
- Coach Management CRUD + Page Redesign (summary strip, rich cards, health signals)
- Team dropdown from rosters
- New Athlete Onboarding Logic (5-day grace period)
- Auto coach-athlete linking from team assignment
- **Phase 2 Athlete State Refinement**: Renamed stable→active, strong→building_momentum. Added setup_needed, inactive states. Added display_status computed field. Color-coded left borders per status.

## Key Files
- `/app/backend/routers/roster.py` — Roster with athlete state computation
- `/app/backend/services/unified_status.py` — Attention + journey state (unchanged)
- `/app/frontend/src/pages/RosterPage.js` — Roster UI with MOM_CFG
- `/app/backend/routers/coaches.py` — Coach CRUD
- `/app/frontend/src/pages/InvitesPage.js` — Coach management page

## P1 Upcoming Tasks
- CSV Import Tool: Bulk import for school/coach data
- Bulk Approve Mode: Director Inbox multi-select and bulk approve

## P2 Future/Backlog
- Parent/Family Experience
- AI-Powered Coach Summary
- Multi-Agent Intelligence Pipeline
