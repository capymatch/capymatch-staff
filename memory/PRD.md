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

### Phase A: Core Pipeline + Real Dashboard — COMPLETE
- Programs CRUD with 5-stage board grouping, interaction signals, auto-follow-ups
- College Coaches CRUD, Interactions CRUD, Events CRUD
- Real Athlete Dashboard (Greeting, Pulse, Today's Actions, Spotlight, Activity, Events)

### Phase B: Profile & Calendar — COMPLETE
- Athlete Profile Editor, Public Profile Page, Calendar

### Phase C: School Knowledge Base — COMPLETE
- Backend (`/api/athlete/knowledge_base`) + seeder, Frontend search/detail pages

### Pipeline Page — REBUILT
- List-based pipeline matching original capymatch design

### Journey Page — REBUILT (2026-03-09)
- 14 new journey components in `/components/journey/`
- Interactive 6-stage progress rail, pulse indicator, contextual heroes, automation cards
- Conversation timeline, floating action bar, modals for all actions
- **Tested: 25/25 backend, 20/20 frontend — 100% pass (iteration_56)**

### Athlete Onboarding Quiz — COMPLETE
- 6-step quiz with matching algorithm, forced redirect for new athletes

### Settings Page + Gmail Integration — COMPLETE (2026-03-09)
- **Frontend**: `pages/athlete/SettingsPage.js` — full settings with 6 sections:
  - Personal Information (name/email editing)
  - Gmail Integration (Connect/Disconnect, Import from Gmail)
  - Notifications (Follow-up Reminders, Email Notifications toggles)
  - Appearance (Dark/Light/System theme)
  - Change Password (bcrypt verification)
  - Data & Privacy (Inbound Scan, Export Data, Delete Account)
- **Frontend**: `components/GmailConsentModal.js` — Privacy disclosure before Gmail connect
- **Frontend**: `components/GmailImportModal.js` — 4-stage import flow:
  1. Consent → 2. Scanning (polls progress) → 3. Preview/Select Schools → 4. Done
- **Backend**: `routers/athlete_settings.py` — Settings CRUD, password change, data export, account deletion
- **Backend**: `routers/athlete_gmail.py` — Full Gmail OAuth flow:
  - `GET /athlete/gmail/connect` → Returns Google OAuth auth_url
  - `GET /gmail/callback` → Handles OAuth callback, stores encrypted tokens
  - `GET /athlete/gmail/status` → Check connection status
  - `POST /athlete/gmail/disconnect` → Revoke and remove tokens
  - `POST /athlete/gmail/send` → Send email via Gmail (fallback: log to timeline)
  - `POST /athlete/gmail/import-history` → Start background inbox scan
  - `GET /athlete/gmail/import-history/{run_id}/status` → Poll scan progress
  - `POST /athlete/gmail/import-history/{run_id}/confirm` → Create programs from selected schools
- **Backend**: `services/gmail_import.py` — Background Gmail scanning service:
  - Scans 6 months of email headers (subject + sender only, never body)
  - Classifies messages by .edu domain mapping
  - Aggregates per-school: outbound/inbound counts, threads, subjects
  - Assigns stages (added/outreach/in_conversation) and follow-up dates
  - Filters out admissions/newsletter noise with negative keyword detection
- **Backend**: `services/domain_mapper.py` — Maps email domains to schools via KB + aliases
- **Backend**: `encryption.py` — Fernet encryption for Gmail tokens
- **Updated**: `components/journey/EmailComposer.js` — Now uses Gmail send when connected
- **Tested: 28/28 backend, all frontend sections — 100% pass (iteration_57)**

---

## Routes (cumulative)

### Athlete Backend Routes
| Method | Path | Purpose |
|---|---|---|
| GET | /api/athlete/dashboard | Dashboard |
| GET/POST/PUT/DELETE | /api/athlete/programs | Programs CRUD |
| GET | /api/athlete/programs/:id | Program detail + journey_rail |
| GET | /api/athlete/programs/:id/journey | Journey timeline |
| GET/POST/PUT/DELETE | /api/athlete/college-coaches | College coaches |
| GET/POST | /api/athlete/interactions | Interactions |
| POST | /api/athlete/programs/:id/mark-replied | Log reply |
| GET | /api/athlete/follow-ups | Overdue follow-ups |
| POST | /api/athlete/follow-ups/:id/mark-sent | Reschedule |
| GET/POST/PUT/DELETE | /api/athlete/events | Events CRUD |
| GET/PUT | /api/athlete/profile | Profile read/write |
| POST | /api/athlete/profile/photo | Photo upload |
| GET | /api/athlete/share-link | Public link |
| GET | /api/public/athlete/:tenantId | Public profile |
| GET | /api/athlete/knowledge/search | KB search |
| GET | /api/athlete/knowledge/:domain | School detail |
| POST | /api/athlete/knowledge/:domain/add-to-pipeline | Add school |
| GET | /api/athlete/onboarding-status | Quiz status |
| POST | /api/athlete/recruiting-profile | Save quiz |
| GET | /api/athlete/suggested-schools | Matched schools |
| GET/PUT | /api/athlete/settings | Settings CRUD |
| POST | /api/athlete/settings/change-password | Password change |
| GET | /api/athlete/settings/export-data | Data export |
| DELETE | /api/athlete/settings/delete-account | Account deletion |
| GET | /api/athlete/gmail/connect | Gmail OAuth start |
| GET | /api/gmail/callback | OAuth callback |
| GET | /api/athlete/gmail/status | Gmail status |
| POST | /api/athlete/gmail/disconnect | Disconnect Gmail |
| POST | /api/athlete/gmail/send | Send via Gmail |
| POST | /api/athlete/gmail/import-history | Start import |
| GET | /api/athlete/gmail/import-history/:id/status | Import progress |
| POST | /api/athlete/gmail/import-history/:id/confirm | Confirm import |

### Frontend Routes (Athlete)
| Route | Page |
|---|---|
| /onboarding | OnboardingQuiz |
| /board | AthleteDashboard |
| /pipeline | PipelinePage |
| /pipeline/:programId | JourneyPage |
| /schools | SchoolsPage |
| /schools/:domain | SchoolDetailPage |
| /calendar | CalendarPage |
| /athlete-profile | ProfilePage |
| /athlete-settings | SettingsPage |
| /s/:shortId | PublicProfilePage |

---

## Upcoming Tasks

### P1 — Remaining Migration Items
- AI-powered email drafting from Journey page (requires LLM integration)
- Inbox page (email threads view when Gmail connected)

### P2 — Technical Debt
- Normalize camelCase to snake_case in DB fields

### Future
- Connected Experiences: Director ↔ Athlete visibility
- Advanced Features: Stripe subscriptions, engagement analytics, Smart Match AI
- Parent/Family experience

## Key Credentials
- Director: director@capymatch.com / director123
- Athlete: emma.chen@athlete.capymatch.com / password123
- Gmail OAuth: Stored in app_config collection (key: gmail_oauth)

## Key Documents
- `/app/UNIFICATION_PLAN.md`
- `/app/ATHLETE_MIGRATION_PLAN.md`
- `/app/memory/PRD.md`
