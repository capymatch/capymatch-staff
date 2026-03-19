# CapyMatch — Product Requirements Document

## Problem Statement
CapyMatch is a full-stack recruiting platform for women's volleyball. It connects athletes, coaches, directors, and parents to streamline the college recruiting journey.

## Core Users
- **Athletes** — Track their recruiting pipeline, communicate with coaches, manage their profile
- **Club Coaches** — Manage assigned athletes, track recruiting progress, send tasks/messages
- **Club Directors** — Oversee all athletes and coaches, manage roster/teams, run events, triage issues
- **Parents/Family** — (Planned) Support athletes in the recruiting process

## Credentials
- Admin: douglas@capymatch.com / demo2026
- Director: director@capymatch.com / director123
- Coach: coach.williams@capymatch.com / coach123
- Athlete: emma.chen@athlete.capymatch.com / athlete123

## Architecture
- **Frontend:** React (CRA) + Tailwind CSS + Shadcn/UI | Port 3000
- **Backend:** FastAPI + Motor (async MongoDB) | Port 8001
- **Database:** MongoDB (test_database)

---

## Completed Features

### Sessions 1-10 (Previous)
- Auth, pipeline, messaging, tasks, events, subscriptions, admin, knowledge base
- Organization management, live events, school pod, health signals
- Unified status model, decision-first UI, coach watch matrix
- Pipeline hero, capacity strip, dual-mode pipeline (Priority + Kanban)
- Attention engine V2, swipe gestures, unified design system

### Session 11 (2026-03-19)
- **Kanban Task Board Redesign** — White columns, colored headers, compact 5-element cards, ghost placeholders, tilted drag
- **Hero Mobile Responsiveness** — Stacked layout, hidden rail on mobile
- **Swipe Panel Fix** — Opaque snooze background
- **Director Sidebar** — Removed Social Spotlight for directors

### Session 12 (2026-03-19)
- **Director Inbox Backend** — `GET /api/director-inbox` aggregates escalations, advocacy, roster, momentum
- **Director Mission Control Redesign** — Compact context strip, dominant inbox, outbox strip, collapsible sections

### Session 13 (2026-03-19)
- **Inbox Deduplication** — Group by athlete+school, merge issues into single row (8→5 items)
- **Issue Language Standardization** — Human-readable labels (Needs attention, Awaiting reply, etc.)
- **CTA Priority Hierarchy** — Primary (Open Pod) vs secondary (Review, Assign) opacity treatment
- **Priority Grouping** — HIGH PRIORITY / AT RISK section labels
- **3-Column Grid** — Strict alignment: dot, text, CTA

### Session 14 (2026-03-19)
- **Top Priority Right Now** — Client-side scoring (issue severity + boosts) selects ONE item, shows "why it matters" explanation
- **Auto Nudges** — Rule-based suggested actions mapped to issues (Send follow-up, Check in, Assign coach, etc.)
- **Inbox Hover Nudges** — Suggestions appear on row hover
- **Autopilot Suggestions** — "Approve & Send" + "Edit" buttons on Top Priority
  - Backend: `POST /api/autopilot/execute` — sends pre-templated messages via support_messages, logs to autopilot_log
  - Safety: always requires human approval, Edit opens manual flow
  - State: item removed from inbox after successful execution, smooth UI update
  - 100% backend (8/8) + 100% frontend verified (iteration_195)
  - Key files: `autopilot.py`, `DirectorInbox.js`

---

## Backlog

### P1 — Upcoming
- **CSV Import Tool** — Bulk importing school/coach data
- **Parent/Family Experience** — Dedicated UI for parents

### P2 — Future
- **AI-Powered Coach Summary** — LLM-generated recruiting pitches
- **Club Billing** — Stripe subscription billing
- **Multi-Agent Intelligence Pipeline** — Roster Stability, Scholarship, NIL agents
- **Autopilot Phase 2** — Auto-send, scheduling, escalation rules, AI-generated messages
