# CapyMatch — Product Requirements Document

## Problem Statement
CapyMatch is a full-stack recruiting platform for women's volleyball. It connects athletes, coaches, directors, and parents to streamline the college recruiting journey.

## Core Users
- **Athletes** — Track their recruiting pipeline, communicate with coaches, manage their profile
- **Club Coaches** — Manage assigned athletes, track recruiting progress, send tasks/messages, advocate to college programs
- **Club Directors** — Oversee all athletes and coaches, manage roster/teams, run events, admin operations
- **Parents/Family** — (Planned) Support athletes in the recruiting process
- **Platform Admins** — Manage organizations, integrations, and knowledge base

## Credentials
- Admin: douglas@capymatch.com / demo2026
- Director: director@capymatch.com / director123
- Coach: coach.williams@capymatch.com / coach123
- Athlete: emma.chen@athlete.capymatch.com / athlete123

## Architecture
- **Frontend:** React (CRA) + Tailwind CSS + Shadcn/UI | Port 3000
- **Backend:** FastAPI + Motor (async MongoDB) | Port 8001
- **Database:** MongoDB (test_database)
- **Payments:** Stripe (test key)
- **Email:** Resend

---

## Completed Features

### Sessions 1-10 (Previous)
- Full authentication system (JWT)
- Athlete pipeline (school targets, recruiting stages)
- Messaging module (coach-athlete communication)
- Coach-to-athlete task management
- Event management (live events, signal logging)
- Subscription tiers (basic, pro, premium)
- Admin panel (user management)
- Knowledge base (1,057 schools)
- Admin Organization Management (CRUD + members with roles)
- Live Event workflow overhaul
- Social Spotlight scaffolding (UI + routing)
- School Pod Overhaul (two-column layout, relationship tracker, sliding notes panel)
- Unified Health Signal Logic
- Dashboard-to-School-Pod Alert Consistency
- Pipeline-Based Momentum Model
- Unified Status Model (Journey State + Attention Status)
- Director Pod Access & Dashboard Deduplication
- Journey Page Right Rail Refinement
- Engagement Data Transformation
- Per-Message Engagement Tracking on Timeline
- School Intelligence Unification + Drawer
- Decision-First UI Refactor
- Coach Watch 10-State Matrix + State-Copy Matrix
- Hero Orchestration Refactor
- Pipeline 2-Tier Hero System
- Pipeline Capacity Strip
- Dual-Mode Pipeline System (Priority + Kanban)
- Attention Engine V2
- Explainability Polish
- Animated View Morphing
- Priority Board Layout + Card Redesign
- Swipe Gestures on Priority Cards
- PipelinePage.js Refactoring (6 components extracted)
- Unified Coming Up & On Track Sections
- School Logos in Priority List
- Priority List UI Final Polish
- Unified Design System (pipeline-design.js)
- Kanban Strict Structure (Stage Visualization Only)
- Kanban Board Interaction Redesign (Attention-level system)
- Kanban D&D Polish (Magnetic columns, insertion lines, etc.)

### Session 11 (2026-03-19)
- **Kanban Board Task Board Redesign**
  - White columns with 36px colored headers + count badges
  - Compact 5-element cards (logo, status, time, action, owner)
  - Ghost placeholder drop targets (dashed border)
  - Tilted drag effect (rotate -3deg + scale 1.05)
  - Updated pipeline-constants.js column colors
  
- **Hero Card Mobile Responsiveness**
  - Stacked vertical layout on mobile (was side-by-side)
  - Progress rail hidden on small screens
  - CTA row becomes horizontal on mobile

- **Swipe Panel Fix**
  - Snooze panel uses opaque background (#fef3e2)
  - Left swipe shows "Snooze" label only

- **Director Sidebar Cleanup**
  - Removed Social Spotlight from director's sidebar

- **Director Inbox (NEW)**
  - Backend: GET /api/director-inbox aggregates 4 data sources
    - Escalations (from director_actions collection)
    - Advocacy (awaiting_reply >5d, follow_up_needed)
    - Roster (unassigned athletes, missing documents)
    - Momentum (athletes inactive >7 days)
  - Frontend: DirectorInbox component replaces EscalationsCard
  - Priority sorting: high (red dot) first, then medium (amber dot)
  - Minimal inbox-style rows: name, school, issue type, time ago, CTA
  - Empty state: "No urgent issues"
  - 13/13 backend tests passed, all frontend features verified (iteration_193)
  - Key files: `routers/director_inbox.py`, `DirectorInbox.js`, `DirectorView.js`

---

## Backlog

### P0 — Immediate
- (None currently)

### P1 — Upcoming
- **CSV Import Tool** — For manually gathered school/coach data from university sites
- **College Scorecard API** — Integrated but needs user's API key from api.data.gov
- **Parent/Family Experience** — Dedicated UI for parents/helpers

### P2 — Future
- **AI-Powered Coach Summary** — LLM-generated recruiting pitches from athlete data
- **Club Billing** — Stripe subscription billing for organizations
- **Multi-Agent Intelligence Pipeline** — Roster Stability, Scholarship, NIL Readiness agents
- **Kanban Keyboard Shortcuts**
