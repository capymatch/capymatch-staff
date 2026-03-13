# CapyMatch — Product Requirements Document

## Vision
Sports recruiting platform connecting athletes, coaches, and schools with intelligent workflow management.

## Core Architecture
- **Frontend**: React + Tailwind + Shadcn/UI
- **Backend**: FastAPI + MongoDB
- **Auth**: JWT-based with role-based access (athlete, parent, club_coach, director, platform_admin)

## Coach Workflow (Updated Mar 2026)
```
Mission Control (Roster) → Click Athlete → Athlete Overview + School List → Click School → School Pod
```

### Mission Control (Coach Dashboard)
Shows only:
- Roster (which athletes need attention)
- Events Requiring Prep
- Upcoming Events
- ~~Assigned Actions~~ (removed — actions now live in School Pods)

### Athlete Pod (`/support-pods/:athleteId`)
- Athlete-level hero (athlete-level issues: inactivity, profile incomplete)
- **Target Schools list** sorted by urgency (at_risk → needs_attention → active → strong → early)
- Athlete-level actions (non-school-specific)
- Athlete signals overview (collapsed)
- Action plan / playbook (collapsed)
- Timeline (collapsed)
- Athlete context (collapsed)

### School Pod (`/support-pods/:athleteId/school/:programId`)
Same layout as athlete pod but ALL data scoped to one school:
- School header (name, division, conference, stage, health badge)
- School hero (worst signal or current issue)
- School contact info (coach name, email, website from knowledge base)
- School-level signals (overdue follow-ups, no reply, stale engagement, stalled stage)
- School-level actions (create, complete, track)
- School-level notes (inline + sidebar)
- School-level timeline
- Stage history

### Issue Lifecycle
- Issues auto-created when conditions detected (e.g., `days_since_activity > 14`)
- 2-hour cooldown after legitimate auto-resolution (prevents flapping)
- Manual resolves don't trigger cooldown
- Signal-derived warning state when no DB issue but signals are bad

### Signal-Aware Hero Card (3 states)
1. **Active Issue** (from DB) → red hero with resolve/escalate
2. **Signal Warning** (no DB issue, but critical/high signals) → red/amber hero
3. **Healthy** → green "On Track" (only when truly no problems)

## Data Model

### Key Collections
- `programs`: Per school-athlete records (university_name, stage, reply_status, priority, next_action)
- `program_metrics`: Per school-athlete computed metrics (health_state, engagement_trend, reply_rate, overdue_followups)
- `university_knowledge_base`: School directory (953 schools, coach contacts, division, conference)
- `pod_actions`: Actions with optional `program_id` (null = athlete-level, set = school-scoped)
- `pod_action_events`: Timeline events with optional `program_id`
- `athlete_notes`: Notes with optional `program_id`
- `pod_issues`: Issues with optional `program_id` for school-level issues
- `support_message_threads` / `support_messages`: In-app messaging
- `users`: User accounts with optional `athlete_id` link

### School Health Classification
```
at_risk          → overdue + stale engagement
needs_attention  → overdue OR no reply + stale
awaiting_reply   → waiting for school response
active           → engaged, progressing
strong_momentum  → high reply rate + accelerating
still_early      → not contacted yet
```

## API Endpoints

### School Pod
- `GET /api/support-pods/:athleteId/schools` — List all target schools sorted by urgency
- `GET /api/support-pods/:athleteId/school/:programId` — Full school pod data
- `POST /api/support-pods/:athleteId/school/:programId/actions` — Create school-scoped action
- `POST /api/support-pods/:athleteId/school/:programId/notes` — Create school-scoped note
- `PATCH /api/support-pods/:athleteId/school/:programId/actions/:actionId` — Update/complete action

### Existing
- `GET /api/support-pods/:athleteId` — Athlete pod data
- `POST /api/support-messages/threads` — Send in-app message
- `GET /api/support-messages/inbox` — Athlete message inbox
- `GET /api/support-messages/unread-count` — Unread message count

## Test Credentials
- **Coach:** coach.williams@capymatch.com / coach123
- **Athlete (Emma):** emma.chen@athlete.capymatch.com / athlete123
- **Test Athlete ID:** athlete_3
- **Test Program ID (Emory):** ae7647cc-affc-44ef-8977-244309ac3a30

## Completed (Mar 2026)
- V1 In-App Messaging (coach → athlete, with timeline logging)
- Messaging bug fixes (athlete_id in JWT, timeline event rendering)
- Signal-aware hero card (3 states: DB issue / signal warning / healthy)
- Issue lifecycle cooldown fix (2h instead of 24h, condition-aware)
- **School Pod architecture** — full restructuring of coach workflow to school-level
- Coach dashboard cleanup (removed Assigned Actions)
- Mobile responsiveness fixes (PodHeader, NotificationBell, CoachNotesSidebar)
- **School Pod Notes Feature** — Full notes sidebar with school-scoping, auth headers fix for CRUD operations (Mar 13, 2026)

## Backlog
### P1 — Close the Action Loop
Coach actions in School Pod should update `programs` and `program_metrics` so signals recompute in real-time.

### P2 — Club Billing
Org subscription management.

### P2 — Refactor User-Athlete Linking
Replace email fallback with proper onboarding flow.

### P3 — AI Coach Summary
LLM-generated recruiting pitches.

### P3 — Intelligence Pipeline Phase 2
Roster Stability, Scholarship, NIL Readiness agents.

### P3 — Parent/Family Experience
Dedicated parent/helper UX.
