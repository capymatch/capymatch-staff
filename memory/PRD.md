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
- **Profile Completeness Alert** (shows when <80%, displays missing fields)
- Target Schools list sorted by urgency
- Athlete-level issues

### School Pod (`/support-pods/:athleteId/school/:programId`)
- School header, hero, contact info, signals, actions, notes (inline + sidebar), timeline, stage history
- All data scoped to one athlete-school relationship

## Profile Completeness (Unified)
**12-field canonical formula** used across all views:
- full_name, photo_url, position, grad_year, height, bio, video_link, email, team, city, state, gpa
- Sources: `public_profile.py`, `schema_v2_signals.py`, `ProfilePage.js` — all aligned
- Displayed in: Athlete profile editor, Public profile settings, Athlete Overview (coach view)

## Key API Endpoints
- `GET /api/support-pods/:athleteId` — Athlete overview (includes `profile_completeness`)
- `GET /api/support-pods/:athleteId/schools` — Target schools sorted by urgency
- `GET /api/support-pods/:athleteId/school/:programId` — Full school pod data
- `POST /api/support-pods/:athleteId/school/:programId/actions` — Create school-scoped action
- `POST /api/support-pods/:athleteId/school/:programId/notes` — Create school-scoped note
- `GET /api/athlete/profile` — Athlete profile (for athlete/parent)
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

## Backlog
### P1 — Action Plan Playbooks in School Pod
Wire existing 6 playbooks (Momentum Recovery, Blocker Resolution, Event Prep, Re-engagement, Ownership Assignment, Readiness) into the School Pod actions section.

### P1 — Close the Action Loop
Coach actions in School Pod should update `programs` and `program_metrics` so signals recompute in real-time.

### P2 — Club Billing
Org subscription management.

### P3 — AI Coach Summary
LLM-generated recruiting pitches.

### P3 — Intelligence Pipeline Phase 2
Roster Stability, Scholarship, NIL Readiness agents.

### P3 — Parent/Family Experience
Dedicated parent/helper UX.
