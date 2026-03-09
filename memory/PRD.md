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

### Collections
| Collection | Scope | Phase |
|---|---|---|
| `programs` | tenant_id | A |
| `college_coaches` | tenant_id | A |
| `interactions` | tenant_id | A |
| `athlete_events` | tenant_id | A |
| `athletes` | org_id + tenant_id | 1 (extended in B) |

---

## Upcoming Tasks

### Phase C: Knowledge Base
- C.1: University KB search + school detail pages
- C.2: School comparison tool

### Phase D: AI Features
- D.1: AI Email Drafts (Claude)
- D.2: Outreach Analysis + Highlight Advisor

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
