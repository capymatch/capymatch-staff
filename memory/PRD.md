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
  - `GET /api/athlete/profile` — field mapping: canonical → profile namespace
  - `PUT /api/athlete/profile` — auto-save from frontend, maps back to canonical
  - `POST /api/athlete/profile/photo` — base64 photo upload
  - `GET /api/athlete/share-link` — returns tenant_id for public URL
- **Frontend**: `pages/athlete/ProfilePage.js`
  - Completeness ring (% progress of 14 key fields)
  - 5 collapsible sections: Athlete Info, Measurables, Team & Location, Media & Bio, Contact
  - Auto-save with 1200ms debounce
  - Photo upload
  - Share card with Copy Link + Preview buttons
  - Eye/EyeOff icons for public vs private fields

#### B.2 — Public Profile Page
- **Backend**: `GET /api/public/athlete/{tenant_id}` — no auth, excludes private fields (SAT/ACT)
- **Frontend**: `pages/public/AthletePublicProfile.js`
  - Route: `/s/:shortId` (shortId = tenant_id without "tenant-" prefix)
  - Hero with photo/placeholder, name (Barlow Condensed), position, class, team
  - Quick facts (Height, Weight, GPA, Handed)
  - Bio section, Athletic Measurables grid
  - Club Coach card
  - YouTube highlight embed with thumbnail → autoplay
  - "Where to See Me Play" events list
  - Mobile CTA bar (Email/Call)
  - Share button (top-right, copies URL)

#### B.3 — Calendar
- **Frontend**: `pages/athlete/CalendarPage.js`
  - Route: `/calendar`
  - Full month grid with color-coded event dots per type
  - Event type legend (Camp, Showcase, Tournament, Visit, Tryout)
  - Day click → shows events for that date
  - Sidebar: Upcoming Events list
  - Add Event modal: title, type, location, dates, times, linked school, notes
  - Edit/Delete events

**Phase B Tested: 10/10 backend, 9/9 frontend — 100% pass (iteration_51)**

### Phase C: School Knowledge Base — COMPLETE (2026-03-09)

#### C.1 — KB Search & Browse
- **Backend**: `routers/athlete_knowledge.py`
  - `GET /api/athlete/knowledge/search` — search/filter by name, division, state, conference, region
  - `GET /api/athlete/knowledge/{domain}` — full school detail with coaching staff, stats, in_pipeline flag
  - `POST /api/athlete/knowledge/{domain}/add-to-pipeline` — adds school + coaching staff to athlete's pipeline
- **Seed**: `seeders/seed_kb.py` — 21 volleyball programs (14 D1, 3 D2, 3 D3, 1 NAIA), idempotent upsert
- **Frontend**: `pages/athlete/SchoolsPage.js`
  - Route: `/schools`
  - Search bar with 300ms debounce
  - Filter dropdowns: Division, State, Conference, Region
  - School cards with color bar, division badge, stats, mascot initial, add-to-pipeline button
  - 3-column responsive grid

#### C.2 — School Detail Page
- **Frontend**: `pages/athlete/SchoolDetailPage.js`
  - Route: `/schools/:domain`
  - Hero section with school colors, mascot, location
  - 8-stat grid (Championships, Record, Roster, Conference Titles, Enrollment, Acceptance, Tuition)
  - Coaching Staff section with email links
  - Program Info section (Facilities, Scholarships, NCAA Appearances, RPI, GPA)
  - "Add to Pipeline" / "In Pipeline" button
  - Back to Knowledge Base navigation

**Phase C Tested: 20/20 backend, 8/8 frontend — 100% pass (iteration_52)**

### Pipeline & Journey Pages — COMPLETE (2026-03-09)

#### Pipeline (Recruiting Board)
- **Frontend**: `pages/athlete/PipelinePage.js`
  - Route: `/pipeline`
  - Kanban board with 5 columns: Overdue, Needs Outreach, Waiting on Reply, In Conversation, Archived
  - Board/List view toggle — list shows table with School, Status, Coach, Activity, Priority
  - Program cards: school name, division, conference, priority badge, coach, interaction signals
  - Quick actions: Log Interaction, Mark Replied, View Journey
  - Add School modal (manual entry with name, division, conference, priority, notes)
  - Summary chips with counts per column
  - Empty state with links to KB and manual add

#### Journey (School Timeline)
- **Frontend**: `pages/athlete/JourneyPage.js`
  - Route: `/pipeline/:programId`
  - School header with division, conference, board status badge
  - Signals bar: Interactions, Outreach count, Coach Reply status, Days Since Last, Follow-up date
  - Interaction timeline with color-coded icons per type (email, call, camp, visit, etc.)
  - Inline "Log Interaction" form (type selector + notes)
  - Sidebar: Coaching Staff with email links, Notes, Details (priority, status, follow-up interval, added date)
  - Back to Pipeline navigation

**Pipeline & Journey Tested: 19/19 frontend features — 100% pass (iteration_53)**

---

## Routes Added (cumulative)

### Athlete Backend Routes
| Method | Path | Purpose | Phase |
|---|---|---|---|
| GET | /api/athlete/dashboard | Aggregated dashboard | A |
| GET/POST/PUT/DELETE | /api/athlete/programs | Programs CRUD | A |
| GET | /api/athlete/programs/:id | Program detail | A |
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

### Frontend Routes (Athlete)
| Route | Page | Phase |
|---|---|---|
| /board | AthleteDashboard | A |
| /pipeline | PipelinePage (Kanban board) | A (frontend now) |
| /pipeline/:programId | JourneyPage (timeline) | A (frontend now) |
| /schools | SchoolsPage (KB browse) | C |
| /schools/:domain | SchoolDetailPage | C |
| /calendar | CalendarPage | B |
| /athlete-profile | ProfilePage | B |
| /s/:shortId | PublicProfilePage | B |

### Collections
| Collection | Scope | Phase |
|---|---|---|
| `programs` | tenant_id | A |
| `college_coaches` | tenant_id | A |
| `interactions` | tenant_id | A |
| `athlete_events` | tenant_id | A |
| `athletes` | org_id + tenant_id | 1 (extended in B) |
| `university_knowledge_base` | global | C |

---

## Upcoming Tasks

### Phase D: AI Features
- D.1: AI Email Drafts (Claude)
- D.2: Outreach Analysis + Highlight Advisor

### Phase C.2: School Comparison (optional enhancement)
- Compare 2-3 schools side-by-side

### Phase E–H: Gmail, Notifications, Stripe, Layout

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
