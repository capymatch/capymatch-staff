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
- **Profile Completeness Alert** (shows when <80%, displays missing fields, **"Send Reminder" button** sends in-app message to athlete)
- Target Schools list sorted by urgency

### School Pod (`/support-pods/:athleteId/school/:programId`)
- School header, hero, contact info, signals
- **Action Plan** (auto-generated from school signals, **step completion persists to database**)
- Manual Actions (coach-created, with "+ Add")
- Notes (inline + sidebar, school-scoped)
- Timeline, Stage history

## School-Specific Playbooks
| Signal | Playbook Type | Timeline |
|--------|--------------|----------|
| Overdue Follow-up | Follow-Up Required | 3-5 days |
| Engagement Gone Stale | Re-engagement Plan | 5-7 days |
| No Response (contacted) | Outreach Strategy | 7-10 days |
| No Response (not contacted) | First Outreach Plan | 1-2 days |
| Stage Stalled | Stage Advancement Plan | 3-5 days |

Playbooks reference real coach names and athlete names. Step completion saves to `playbook_progress` collection.

## Profile Completeness (Unified 12-Field Formula)
Fields: full_name, photo_url, position, grad_year, height, bio, video_link, email, team, city, state, gpa

## Key API Endpoints
- `GET /api/support-pods/:athleteId` — Athlete overview (includes `profile_completeness`)
- `GET /api/support-pods/:athleteId/schools` — Target schools sorted by urgency
- `GET /api/support-pods/:athleteId/school/:programId` — Full school pod (includes `playbook`, `playbook_checked_steps`)
- `PATCH /api/support-pods/:athleteId/school/:programId/playbook-progress` — Save playbook step completion
- `GET /api/support-pods/:athleteId/school/:programId/playbook-progress` — Get saved step completion
- `POST /api/support-pods/:athleteId/school/:programId/notes` — Create school-scoped note
- `POST /api/support-messages` — Send in-app message (used by profile reminder)

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
- **Playbook Step Persistence** (Mar 13, 2026) — Steps save to DB, survive page reloads, per-school progress
- **Profile Reminder** (Mar 13, 2026) — Coach can send in-app message to athlete about completing profile

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
