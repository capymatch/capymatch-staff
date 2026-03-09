# CapyMatch — Product Requirements Document

## Original Problem Statement
Unify `capymatch-staff` (director/coach) and `capymatch` (athlete/parent) into a single platform with shared auth, data model, and role-based experiences.

## Core Architecture
- **Backend:** FastAPI, Motor (async MongoDB)
- **Frontend:** React, Tailwind CSS, Shadcn/UI
- **Database:** MongoDB
- **Auth:** JWT (director, coach, athlete, parent roles)

---

## Completed Work

### Phase 1: Unified Foundation — COMPLETE
Steps 1.1–1.6: Canonical athletes, org scoping, auth expansion, claim flow, role-based routing

### Phase A: Core Pipeline + Real Dashboard — COMPLETE (2026-03-09)
- Programs CRUD with 5-stage board grouping, interaction signals, auto-follow-ups
- College Coaches CRUD, Interactions CRUD, Events CRUD
- Real Athlete Dashboard (Greeting, Pulse, Today's Actions, Spotlight, Activity, Events)
- **Tested: 27/27 pass (iteration_50)**

### Phase B: Profile & Calendar — COMPLETE (2026-03-09)

#### B.1 — Athlete Profile Editor
- **Backend**: `routers/athlete_profile.py`
- **Frontend**: `pages/athlete/ProfilePage.js`
  - Completeness ring, 5 collapsible sections, auto-save, photo upload, share card

#### B.2 — Public Profile Page
- **Backend**: `GET /api/public/athlete/{tenant_id}` — no auth
- **Frontend**: `pages/public/AthletePublicProfile.js`
  - Route: `/s/:shortId`

#### B.3 — Calendar
- **Frontend**: `pages/athlete/CalendarPage.js`
  - Route: `/calendar`

**Phase B Tested: 10/10 backend, 9/9 frontend — 100% pass (iteration_51)**

### Phase C: School Knowledge Base — COMPLETE (2026-03-09)
- **Backend**: `routers/athlete_knowledge.py` + `seeders/seed_kb.py`
- **Frontend**: `pages/athlete/SchoolsPage.js`, `pages/athlete/SchoolDetailPage.js`
- Routes: `/schools`, `/schools/:domain`

**Phase C Tested: 20/20 backend, 8/8 frontend — 100% pass (iteration_52)**

### Pipeline Page — REBUILT (2026-03-09)
- **Frontend**: `pages/athlete/PipelinePage.js` — list-based pipeline matching original capymatch design
- Route: `/pipeline`
- Hero Card, Filter Chips, Collapsible Sections, School Row Cards, Committed/Archived sections

**Pipeline Rebuild Tested: 14/14 frontend — 100% pass (iteration_55)**

### Journey Page — REBUILT (2026-03-09)
- **Frontend**: `pages/athlete/JourneyPage.js` — completely rebuilt to faithfully replicate original capymatch
- Route: `/pipeline/:programId`
- **14 journey components** in `/components/journey/`:
  - `ProgressRail.js` — Interactive 6-stage rail (Added, Outreach, Talking, Visit, Offer, Committed) with animated fill, pulse ring, clickable stage advancement
  - `PulseIndicator.js` — Animated dot showing Hot/Warm/Neutral/Cold relationship health
  - `GettingStartedChecklist.js` — 4-step onboarding checklist for new schools (add school, profile, add coach, send email)
  - `CommittedHero.js` — Celebration animation with confetti for committed schools
  - `CelebrationHero.js` — "Coach is interested!" hero when coach replied, with action buttons
  - `NextStepCard.js` — Rule-based "What's Next" automation card based on latest interaction type (camp, visit, call, email, etc.)
  - `ConversationBubble.js` — Chat-style timeline (right=You, left=Coach, center=milestones)
  - `FloatingActionBar.js` — Sticky bottom bar with Email/Log/Replied/Follow-up buttons
  - `StageLogModal.js` — Modal for logging notes when advancing a stage
  - `LogInteractionForm.js` — Full interaction logging form (type, outcome, date, notes)
  - `MarkAsRepliedModal.js` — Log coach reply with description
  - `CoachForm.js` — Add/edit coaching staff (name, role, email, phone)
  - `FollowUpScheduler.js` — Schedule follow-up date and action
  - `EmailComposer.js` — Email composition (MOCKED: logs to timeline, Gmail integration coming)
  - `constants.js` — RAIL_STAGES, PULSE_CONFIG, CONV_CONFIG, NEXT_STEP_RULES, ACTION_BUTTONS
  - `index.js` — Barrel exports
- **Backend additions**:
  - `compute_journey_rail()` — Computes 6-stage rail from signals + manual overrides with cascade fill
  - `GET /api/athlete/programs/:id/journey` — Returns formatted timeline with conversation events
  - `reply_count` added to signals computation
- **Features**:
  - Follow-up overdue/upcoming alerts at top
  - Contextual heroes: Getting Started (new school), Celebration (coach replied), Committed (final)
  - Coaching staff sidebar with full CRUD
  - Engagement stats sidebar (outreach, replies, days since activity, total interactions)
  - Archive/Reactivate toggle
  - School Intelligence link to KB

**Journey Rebuild Tested: 25/25 backend, 20/20 frontend — 100% pass (iteration_56)**

### Athlete Onboarding Quiz — COMPLETE (2026-03-09)
- **Backend**: `routers/athlete_onboarding.py`
- **Frontend**: `pages/athlete/OnboardingQuiz.js`
- Route: `/onboarding` (full-screen, forced for new athletes)

**Onboarding Tested: 13/13 backend, all frontend — 100% pass (iteration_54)**

---

## Routes (cumulative)

### Athlete Backend Routes
| Method | Path | Purpose | Phase |
|---|---|---|---|
| GET | /api/athlete/dashboard | Aggregated dashboard | A |
| GET/POST/PUT/DELETE | /api/athlete/programs | Programs CRUD | A |
| GET | /api/athlete/programs/:id | Program detail + journey_rail | A |
| GET | /api/athlete/programs/:id/journey | Journey timeline | Journey |
| GET/POST/PUT/DELETE | /api/athlete/college-coaches | College coaches | A |
| GET/POST | /api/athlete/interactions | Interactions | A |
| POST | /api/athlete/programs/:id/mark-replied | Log reply | A |
| GET | /api/athlete/follow-ups | Overdue follow-ups | A |
| POST | /api/athlete/follow-ups/:id/mark-sent | Reschedule | A |
| GET/POST/PUT/DELETE | /api/athlete/events | Events CRUD | A |
| GET/PUT | /api/athlete/profile | Profile read/write | B |
| POST | /api/athlete/profile/photo | Photo upload | B |
| GET | /api/athlete/share-link | Public link | B |
| GET | /api/public/athlete/:tenantId | Public profile | B |
| GET | /api/athlete/me | Self profile | 1 |
| GET | /api/athlete/knowledge/search | KB search with filters | C |
| GET | /api/athlete/knowledge/:domain | School detail | C |
| POST | /api/athlete/knowledge/:domain/add-to-pipeline | Add school to pipeline | C |
| GET | /api/athlete/onboarding-status | Check quiz completion | Onboarding |
| POST | /api/athlete/recruiting-profile | Save quiz answers | Onboarding |
| GET | /api/athlete/suggested-schools | Matched school suggestions | Onboarding |

### Frontend Routes (Athlete)
| Route | Page | Phase |
|---|---|---|
| /onboarding | OnboardingQuiz (full-screen) | Onboarding |
| /board | AthleteDashboard | A |
| /pipeline | PipelinePage (list-based) | A |
| /pipeline/:programId | JourneyPage (rebuilt) | Journey |
| /schools | SchoolsPage (KB browse) | C |
| /schools/:domain | SchoolDetailPage | C |
| /calendar | CalendarPage | B |
| /athlete-profile | ProfilePage | B |
| /s/:shortId | PublicProfilePage | B |

---

## Upcoming Tasks

### P1 — Pipeline & Communication
- Gmail integration for real email sending
- AI-powered email drafting

### P2 — Technical Debt
- Normalize camelCase to snake_case in DB fields

### Future
- Connected Experiences: Director ↔ Athlete visibility
- Advanced Features: Stripe subscriptions, engagement analytics, Smart Match AI
- Parent/Family experience

## Key Credentials
- Director: director@capymatch.com / director123
- Coach: coach.williams@capymatch.com / coach123
- Athlete: emma.chen@athlete.capymatch.com / password123
- Public profile: /s/9ec4167f-0874-4502-803f-6647b8f4cc26

## Key Documents
- `/app/UNIFICATION_PLAN.md`
- `/app/ATHLETE_APP_AUDIT.md`
- `/app/ATHLETE_MIGRATION_PLAN.md`
- `/app/memory/PRD.md`
