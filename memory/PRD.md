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
- **Profile Completeness Alert** (shows when <80%, displays missing fields with circular progress ring)
- Target Schools list sorted by urgency

### School Pod (`/support-pods/:athleteId/school/:programId`)
- School header, hero, contact info, signals
- **Action Plan** (auto-generated from school signals — 4 types: Follow-Up Required, Re-engagement, Outreach Strategy, Stage Advancement)
- Manual Actions (coach-created, with "+ Add")
- Notes (inline + sidebar)
- Timeline, Stage history
- All data scoped to one athlete-school relationship

## School-Specific Playbooks
Signal-to-playbook mapping:
| Signal | Playbook Type | Timeline |
|--------|--------------|----------|
| Overdue Follow-up | Follow-Up Required | 3-5 days |
| Engagement Gone Stale | Re-engagement Plan | 5-7 days |
| No Response (contacted) | Outreach Strategy | 7-10 days |
| No Response (not contacted) | First Outreach Plan | 1-2 days |
| Stage Stalled | Stage Advancement Plan | 3-5 days |
| No actionable signals | No playbook shown | — |

Playbooks reference real coach names from `university_knowledge_base` and the athlete's actual name.

## Profile Completeness (Unified 12-Field Formula)
Fields: full_name, photo_url, position, grad_year, height, bio, video_link, email, team, city, state, gpa
- Used consistently across: athlete profile editor, public profile settings, athlete overview (coach view)
- Stored value recomputed on profile updates via `compute_profile_completeness()`

## Key API Endpoints
- `GET /api/support-pods/:athleteId` — Athlete overview (includes `profile_completeness`)
- `GET /api/support-pods/:athleteId/schools` — Target schools sorted by urgency
- `GET /api/support-pods/:athleteId/school/:programId` — Full school pod data (includes `playbook`)
- `POST /api/support-pods/:athleteId/school/:programId/actions` — Create school-scoped action
- `POST /api/support-pods/:athleteId/school/:programId/notes` — Create school-scoped note
- `GET /api/athlete/profile` — Athlete profile
- `PUT /api/athlete/profile` — Update athlete profile

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
- **School-Specific Action Plan Playbooks** (Mar 13, 2026) — 4 playbook types auto-generated from school signals

## Backlog
### P2 — Club Billing
Org subscription management.

### P3 — AI Coach Summary
LLM-generated recruiting pitches.

### P3 — Intelligence Pipeline Phase 2
Roster Stability, Scholarship, NIL Readiness agents.

### P3 — Parent/Family Experience
Dedicated parent/helper UX.

## Important: Program status should only change when the athlete acts, NOT from coach actions.
