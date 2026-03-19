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
- **Kanban Board Task Board Redesign (Complete)**
  - Rewrote `KanbanBoard.js` to match user-approved mockup (nTask/Trello hybrid design)
  - White column containers with 36px colored header bars: Added (#e05555 red), Outreach (#2f80ed blue), Talking (#e8862a orange), Visit (#8b5cf6 purple), Offered (#27ae60 green)
  - Count badges on headers (pill style with semi-transparent white bg)
  - "+ Add New Task" row in each column with hover effect
  - Compact 5-element cards:
    1. School row: 24px circular logo + bold school name
    2. Status line: colored dot + label (Needs attention / Needs action / On track)
    3. Time line: "2d overdue", "Due today", etc. with color coding
    4. Action line: bold, largest text ("Follow up", "Start outreach", "Take action", "Re-engage")
    5. Owner line: colored avatar + label ("Owner: You", "Coach assigned task")
  - Optional metrics row (last activity) on cards with recent activity
  - Dashed "+ Add" column on the right
  - Dense, scannable, operational layout
  - Drag-and-drop preserved with @hello-pangea/dnd (card lift, insertion lines, column highlighting)
  - Helper functions: getShortAction(), getTimeLine(), OwnerBadge component
  - Updated pipeline-constants.js column colors
  - 10/10 features verified (iteration_192)
  - Key files: `KanbanBoard.js` (REWRITTEN), `pipeline-constants.js` (UPDATED)

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
