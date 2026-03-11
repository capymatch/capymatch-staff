# CapyMatch — Product Requirements Document

## Original Problem Statement
Unify `capymatch-staff` (coach/director app) and `capymatch` (athlete/parent app) into a single platform with shared backend, data model, and auth. Provide role-based experiences for Directors, Coaches, Athletes, and Parents.

## Core Architecture
- **Backend:** FastAPI + MongoDB (Motor)
- **Frontend:** React + Tailwind + Shadcn/UI
- **Auth:** JWT-based, multi-role (director, coach, athlete, parent)
- **AI:** Emergent LLM Key (Claude Sonnet) for Gmail intelligence

## Completed Phases

### Phase 1-6 — Foundation & Staff Features (DONE)
### Phase 7 — Athlete Experience (DONE)
### Phase 8 — Match Scoring V2 (DONE)
### Phase 9 — AI Gmail Intelligence (DONE)
### Phase 10 — My Schools Page Redesign V3 (DONE)
### Phase 11 — Subscription Tiers & Drag-and-Drop Kanban (DONE)
### Phase 12 — Upcoming Tasks Feature (DONE)
### Journey Page Features J1-J4 (DONE)
### Unmocking Sprint + Settings + Smart Match + Multi-Tenant + Director Actions (DONE)
### User Onboarding + Admin Management + Intelligence Pipeline Phase 1 (DONE)
### Schema V2 + Derived Metrics + Hero Carousel + Performance Fix (DONE)
### Public Athlete Profile V1, V2, Dual-Mode Profiles (DONE)
### Pipeline Command Center — Phase A+B+C (DONE)
### Coach Dashboard Restructure — Phase 1-5 (DONE)
### Real-Time Notifications V1 (DONE)
### NCAA Timeline on Calendar Page (DONE)
### Support Pod V2 — Intervention Console (DONE - March 11, 2026)
### Mobile Responsive — Dashboard + Support Pod (DONE - March 11, 2026)

**Changes made:**

**Dashboard (CoachView.js):**
- Hero KPIs: `grid-cols-2 sm:grid-cols-4` for 2-column mobile, 4-column desktop
- KPI values: `text-2xl sm:text-4xl` for smaller mobile numbers
- Greeting: `text-xl sm:text-[28px]` for compact mobile heading
- Date badge: Hidden on mobile via `hidden sm:inline-block`
- KPI subtitles: Hidden on mobile via `hidden sm:block`
- KPI icon circles: Hidden on mobile via `hidden sm:flex`
- Summary card: `flex-col sm:flex-row` with full-width button on mobile
- Summary text: `text-xs sm:text-sm`

**TodaysPrioritiesCard:**
- Priority rows: Compact padding `px-3 sm:px-4`, smaller icons, text
- CTA button: Icon-only on mobile (text `hidden sm:inline`)
- Action badges: Hidden on mobile

**MyRosterCard:**
- Roster rows: Compact gaps `gap-2 sm:gap-4`, smaller text `text-xs sm:text-sm`
- Year/position: Hidden on mobile
- Category labels: Icon-only on mobile
- CTA button: Always visible on mobile, hover-reveal on desktop
- QuickNote: Hidden on mobile

**UpcomingEventsCard:**
- Event rows: Compact padding, smaller text
- Progress bar: Hidden on mobile
- School count: Hidden on mobile

**Support Pod (PodHeader):**
- "Mission Control" text: `hidden sm:inline`
- "View Profile" text: `hidden sm:inline`
- Health label text: `hidden sm:inline` (only dot + icon visible)
- Health badge: Compact padding

**QuickActionsBar:**
- Button labels: `hidden sm:inline` (icon-only on mobile)
- Already has `overflow-x-auto` for horizontal scrolling

**ActiveIssueBanner:**
- Recommended action: `text-base sm:text-xl`

**TreatmentTimeline:**
- Filter row: `flex-col sm:flex-row` + `overflow-x-auto`

**SupportPod page:**
- Page wrapper: `-mx-4 -mt-4 sm:-mx-6 sm:-mt-6` to negate AppLayout padding for full-width sticky bars

**Testing:** iteration_108 — 100% (11/11 responsive features verified via DOM class inspection)

## Key API Endpoints
- `GET /api/coach/mission-control` — Coach dashboard data
- `GET /api/support-pods/:athleteId` — Support Pod with V2 fields
- `POST /api/support-pods/:athleteId/actions` — Create action
- `PATCH /api/support-pods/:athleteId/actions/:actionId` — Update action
- `POST /api/support-pods/:athleteId/resolve` — Resolve active issue

## Credentials
- **Platform Admin:** douglas@capymatch.com / 1234
- **Director:** director@capymatch.com / director123
- **Club Coach:** coach.williams@capymatch.com / coach123
- **Athlete:** emma.chen@athlete.capymatch.com / password123

## P0 In Progress
- (None)

## P1 Upcoming
- Club Billing (subscription billing and management for organizations)

## P2 Future/Backlog
- AI-powered coach summary (LLM-enhanced recruiting pitch)
- Intelligence Pipeline Phase 2 (Roster Stability, Scholarship, NIL agents)
- Coach Scraper Health Report V1
- Parent/Family Experience
- Coach Probability / Program Receptivity Feature
