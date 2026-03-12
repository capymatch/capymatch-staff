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
Full mobile responsiveness for Coach Dashboard and Support Pod. 2-col KPI grid, compact priority rows, scrollable filters, icon-only buttons on mobile.

### Coach Action Bar — Journey-Style Interactions (March 12, 2026)
Replaced simple QuickActionsBar with a Journey-style floating action bar at the bottom of the Support Pod. 5 dark-themed modal actions adapted for coach support workflow:

1. **Email** — Dark modal (teal accents) with recipient dropdown defaulting to athlete/parent/pod members. Logs to timeline with "Email" tag.
2. **Log Interaction** — Coach-support types: Athlete Check-in, Parent Call, Event Prep Conversation, Pod Discussion, Director Update, Video Call, In-Person Meeting. Outcomes: Positive, Neutral, Needs Follow-up, Concern Raised.
3. **Follow-up** — Creates a pod action item with due date AND logs a timeline note. Types: athlete check-in call, parent follow-up, event prep review, pod sync, director update, recruiting progress review.
4. **Notes** — Right-side sliding panel (dark theme, amber accent) for coach/pod notes. CRUD: create, read, edit, delete via GET/POST/PATCH/DELETE `/api/athletes/{id}/notes`.
5. **Escalate to Director** — Amber-themed modal. Reason dropdown, urgency toggles (Low/Medium/High), details textarea. Creates a `director_actions` document via `POST /api/support-pods/{id}/escalate`.

**Design:** Same glass-morphism dark modal system as Journey page (#161b25 bg, blur overlays, teal/amber accents). Click-outside-to-close on all overlays.

**Backend endpoints added:**
- `GET /api/athletes/{id}/notes` — List notes
- `DELETE /api/athletes/{id}/notes/{note_id}` — Delete note
- `PATCH /api/athletes/{id}/notes/{note_id}` — Update note text
- `POST /api/support-pods/{id}/escalate` — Coach escalation to director

**Testing:** iteration_109 — Backend 14/14 (100%), Frontend all modals verified.

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

## P1 Upcoming
- Club Billing (subscription billing and management for organizations)

## P2 Future/Backlog
- AI-powered coach summary (LLM recruiting pitch)
- Intelligence Pipeline Phase 2 (Roster Stability, Scholarship, NIL agents)
- Coach Scraper Health Report V1
- Parent/Family Experience
- Coach Probability / Program Receptivity Feature
