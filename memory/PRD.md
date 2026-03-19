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
- Messaging, task management, events, subscriptions
- Admin panel, knowledge base, organization management
- School Pod, decision-first UI, coach watch matrix
- Pipeline hero system, dual-mode pipeline (Priority + Kanban)
- Attention Engine V2, explainability polish, view morphing
- Priority board redesign, swipe gestures, unified design system
- Kanban D&D polish (magnetic columns, insertion lines)

### Session 11 (2026-03-19)
- **Kanban Board Task Board Redesign** — White columns with colored headers, compact 5-element cards, ghost placeholders, tilted drag effect
- **Hero Card Mobile Responsiveness** — Stacked vertical layout, hidden rail on mobile
- **Swipe Panel Fix** — Opaque snooze background
- **Director Sidebar Cleanup** — Removed Social Spotlight for directors

### Session 12 (2026-03-19)
- **Director Inbox Backend** — `GET /api/director-inbox` aggregates escalations, advocacy (awaiting reply >5d), roster (unassigned), momentum (inactive >7d) into normalized priority-sorted feed
- **Director Mission Control Redesign** — Complete visual/structural refactor:
  - Compact context strip (~118px): greeting, 5 KPI numbers, momentum, date
  - Dominant white Director Inbox: human-readable labels ("Needs follow-up", "Stalled", "Awaiting reply"), "Name — School" format, red/amber priority dots, teal CTAs
  - Lightweight Outbox strip: single-line summary with dot separators
  - 5 collapsible secondary sections (all closed by default): Program Insights, Recruiting Signals, Coach Health, Upcoming Events, Activity
  - Removed duplicate NeedsAttentionCard
  - Removed system jargon ("Escalation" → "Needs follow-up", "No activity" → "Stalled")
  - 10/10 features verified (iteration_194)
  - Key files: `DirectorView.js` (REWRITTEN), `DirectorInbox.js` (REDESIGNED), `director_inbox.py`

---

## Backlog

### P1 — Upcoming
- **CSV Import Tool** — Bulk importing school/coach data
- **College Scorecard API** — Needs user's API key
- **Parent/Family Experience** — Dedicated UI for parents

### P2 — Future
- **AI-Powered Coach Summary** — LLM-generated recruiting pitches
- **Club Billing** — Stripe subscription billing
- **Multi-Agent Intelligence Pipeline** — Roster Stability, Scholarship, NIL agents
- **Kanban Keyboard Shortcuts**
