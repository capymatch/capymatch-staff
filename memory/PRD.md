# CapyMatch — Product Requirements Document

## Vision
Sports recruiting platform connecting athletes, coaches, and schools with intelligent workflow management.

## Core Architecture
- **Frontend**: React + Tailwind + Shadcn/UI
- **Backend**: FastAPI + MongoDB
- **Auth**: JWT-based with role-based access (athlete, parent, club_coach, director, platform_admin)

## Coach Workflow
```
Mission Control (Roster) → Click Athlete → Athlete Overview + School List → Click School → School Pod
```

### Athlete Overview (`/support-pods/:athleteId`)
- Hero card (critical issues like Momentum Drop)
- **Profile Completeness Alert** (<80%, "Send Reminder" button sends in-app message)
- Target Schools list sorted by urgency

### School Pod (`/support-pods/:athleteId/school/:programId`)
- School header, hero, contact info, signals
- **Action Plan** (auto-generated from signals, step completion persists to DB)
- **Actions** (manual + event-routed, school-scoped via `program_id`)
- Notes (inline + sidebar, school-scoped)
- Timeline, Stage history

### Events (`/events`)
- Event Home → Prep → Live Mode → Post-Event Summary
- **Route to Pod** maps event notes to correct School Pod via `_find_program_id()`
- Actions created with `program_id` so they appear in the right School Pod

## School-Specific Playbooks
| Signal | Playbook Type | Timeline |
|--------|--------------|----------|
| Overdue Follow-up | Follow-Up Required | 3-5 days |
| Engagement Gone Stale | Re-engagement Plan | 5-7 days |
| No Response (contacted) | Outreach Strategy | 7-10 days |
| No Response (not contacted) | First Outreach Plan | 1-2 days |
| Stage Stalled | Stage Advancement Plan | 3-5 days |

## Profile Completeness (Unified 12-Field Formula)
Fields: full_name, photo_url, position, grad_year, height, bio, video_link, email, team, city, state, gpa

## Key API Endpoints
- `GET /api/support-pods/:athleteId` — Athlete overview (includes `profile_completeness`)
- `GET /api/support-pods/:athleteId/schools` — Target schools sorted by urgency
- `GET /api/support-pods/:athleteId/school/:programId` — Full school pod
- `PATCH /api/support-pods/:athleteId/school/:programId/playbook-progress` — Save playbook progress
- `POST /api/events/:eventId/notes/:noteId/route` — Route event note to School Pod (returns `program_id`)
- `POST /api/events/:eventId/route-to-pods` — Bulk route eligible notes
- `POST /api/support-messages` — Send in-app message

## Test Credentials
- **Coach:** coach.williams@capymatch.com / coach123
- **Athlete (Emma):** emma.chen@athlete.capymatch.com / athlete123

## Completed
- V1 In-App Messaging
- Signal-aware hero card (3 states)
- Issue lifecycle cooldown fix
- School Pod architecture (full restructure)
- School Pod Notes Feature (Mar 13, 2026)
- Profile completeness alignment & coach visibility (Mar 13, 2026)
- Emma login fix (Mar 13, 2026)
- School-Specific Action Plan Playbooks (Mar 13, 2026)
- Playbook Step Persistence (Mar 13, 2026)
- Profile Reminder (Mar 13, 2026)
- **Event Route-to-Pod Fix** (Mar 13, 2026) — Actions now correctly scoped to School Pod via program_id lookup + auth headers fixed on EventSummary

## Important Constraints
- Program status should only change when the athlete acts, NOT from coach actions

## Backlog
### P2 — Club Billing
Org subscription management.

### P3 — AI Coach Summary
LLM-generated recruiting pitches.

### P3 — Intelligence Pipeline Phase 2
Roster Stability, Scholarship, NIL Readiness agents.

### P3 — Parent/Family Experience
Dedicated parent/helper UX.
