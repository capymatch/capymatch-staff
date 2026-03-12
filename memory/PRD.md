# CapyMatch — Product Requirements Document

## Original Problem Statement
Unify `capymatch-staff` and `capymatch` into a single platform with shared backend, data model, and auth. Role-based experiences for Directors, Coaches, Athletes, Parents.

## Core Architecture
- **Backend:** FastAPI + MongoDB (Motor)
- **Frontend:** React + Tailwind + Shadcn/UI
- **Auth:** JWT-based, multi-role
- **AI:** Emergent LLM Key (Claude Sonnet) for Gmail intelligence

## Recent Completions

### Support Pod V2 — Intervention Console (March 11, 2026)
10-point upgrade: Quick Actions Bar, Active Issue Banner with ACT NOW badge, Athlete Snapshot (Recruiting Progress + Coach Engagement), Support Team (Message/Call), Top-3 Next Actions, Recruiting Intelligence (rule-based signals), Intervention Playbooks (checkable recovery plans), Coaching Suggestions (renamed), compact Recruiting Timeline, enhanced Treatment History.

### Mobile Responsive — Dashboard + Pod (March 11, 2026)
Full mobile responsiveness for Coach Dashboard and Support Pod.

### Coach Action Bar — Journey-Style Interactions (March 12, 2026)
Replaced QuickActionsBar with Journey-style floating action bar. 5 dark-themed modals: Email, Log Interaction, Follow-up, Notes (sidebar), Escalate to Director.

## Key API Endpoints
- `GET /api/coach/mission-control` — Dashboard data
- `GET /api/support-pods/:athleteId` — Support Pod V2
- `POST /api/support-pods/:athleteId/actions` — Create action
- `POST /api/support-pods/:athleteId/escalate` — Coach escalation
- `GET/POST/PATCH/DELETE /api/athletes/:id/notes` — CRUD notes

## Credentials
- **Admin:** douglas@capymatch.com / 1234
- **Director:** director@capymatch.com / director123
- **Coach:** coach.williams@capymatch.com / coach123
- **Athlete:** emma.chen@athlete.capymatch.com / password123

### Add Action Modal — Premium Flow (March 12, 2026)
Completed the "Next Actions" component upgrade: dark-themed AddActionModal with real pod members in assignee dropdown, category chips, due date picker, notes. Auto-selects current user. Creates in-app notification + fires Resend email on submit. Deleted deprecated QuickActionsBar.js.

### Pod Hero Card — Decision Center (March 12, 2026)
Restructured Support Pod to be driven by a Pod Top Action Engine (same decision pattern as pipeline Top Action Engine). New layout: Pod Hero Card at top showing issue type, top action, explanation, owner, CTA buttons. Sections below: Next Actions, Athlete Snapshot, then collapsible sections (Recruiting Intelligence, Intervention Playbook, Recruiting Timeline, Treatment History). Old ActiveIssueBanner replaced by Pod Hero Card.

### Quick-Resolve Actions (March 12, 2026)
Added issue-specific quick-resolve buttons to the Pod Hero Card for simple mechanical issues only (ownership gaps → "Assign Owner"). Complex issues (momentum drop, blockers, family disengagement) show normal CTA instead. Backend endpoint POST /support-pods/{athlete_id}/quick-resolve bulk-assigns unowned actions to the coach.

### Mobile Pod Page Redesign (March 12, 2026)
Full redesign of Coach Pod Page. Reduced cognitive overload: one story, one top action, supporting context underneath. Renamed sections: Athlete Snapshot → Quick Summary (4-cell bento), Support Team → Pod Members (compact rows), Recruiting Intelligence → Key Signals (list), Intervention Playbook → Action Plan (checklist), Treatment History → Activity History (filtered log). Progressive disclosure: first 4 sections expanded, last 4 collapsed. Mobile-first, Apple-level restraint. New components: QuickSummary.js, KeySignals.js, ActionPlan.js, ActivityHistory.js.

## P1 Upcoming
- In-App Messaging + Email Notifications (coach-to-athlete messaging from Support Pod)
- Club Billing (subscription billing and management for organizations)

## P1 Backlog (Added March 12, 2026)
- **In-App Messaging + Email Notifications:** When a coach sends a message from the Support Pod: (1) create in-app message in athlete area, (2) optionally create for parent, (3) log in pod timeline, (4) send email notification from CapyMatch Notifications <noreply@capymatch.com> via Resend. Email is notification only, links back to app. Requires: `messages` collection, inbox enhancement, Resend domain verification for custom sender.

## P2 Future/Backlog
- AI-powered coach summary (LLM recruiting pitch)
- Intelligence Pipeline Phase 2 (Roster Stability, Scholarship, NIL agents)
- Coach Scraper Health Report V1
- Parent/Family Experience
- Coach Probability / Program Receptivity Feature
