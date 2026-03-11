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
- Unified auth, role-based routing, mission control, events, advocacy, onboarding

### Phase 7 — Athlete Experience (DONE)
- Dashboard, pipeline, schools/knowledge base, inbox, journey, settings, Gmail integration

### Phase 8 — Match Scoring V2 (DONE)
- Fit labels, confidence scores, match breakdowns on school cards and detail pages

### Phase 9 — AI Gmail Intelligence (DONE)
- Background email scanning, LLM analysis, signal detection, actionable insights

### Phase 10 — My Schools Page Redesign V3 (DONE)
- Hero card = Actions carousel with prev/next navigation
- Pro Kanban board: clean white cards, division/conference tags, match %, urgency labels

### Phase 11 — Subscription Tiers & Drag-and-Drop Kanban (DONE)
- Subscription system (Starter Free / Pro $29 / Premium $49)
- School limit enforcement, upgrade modal, drag-and-drop Kanban

### Phase 12 — Upcoming Tasks Feature (DONE)
- Backend endpoint, hero card expansion, upcoming tasks section

### Journey Page Features J1-J4 (DONE)
- Match Score badge, Risk Badges, Coach Watch Alert, Engagement Stats
- Send Profile Card, Gmail Connect Nudge, Notes Sidebar, Subscription Gating

### Unmocking Sprint + Settings + Smart Match + Multi-Tenant + Director Actions (DONE)
- Real Stripe integration, Stripe Customer Portal, Smart Match engine, Org architecture, Director lifecycle

### User Onboarding + Admin Management + Intelligence Pipeline Phase 1 (DONE)
- Volleyball quiz, admin users/subscriptions, School Insight & Timeline agents

### Schema V2 + Derived Metrics + Hero Carousel + Performance Fix (DONE)
- Structured signals, program_metrics, priority alerts, smart-match caching (11s→1s)

### Public Athlete Profile V1 (DONE - March 11, 2026)
- Slug-based public profile (`/p/{slug}`), privacy-filtered by `profile_visible` + section toggles
- Settings UI with publish toggle, share link, completeness bar, coach summary preview
- Safe defaults: contact email/phone hidden, profile unpublished by default

### Internal Staff Profile + Dual-Mode Profiles (DONE - March 11, 2026)
- **Two profile modes:**
  - `/p/{slug}` — Public, anyone with link, respects `profile_visible` + all privacy toggles
  - `/internal/athlete/:athleteId/profile` — Staff-only (director, club_coach, platform_admin), ignores publish toggle, shows full recruiting context
- **Internal profile features:**
  - Full athlete profile card (same design as public, no privacy filtering)
  - Recruiting Context panel: Pipeline Status (school list with stages, reply status, due dates), Coach Flags, Director Actions, Recent Interactions (with meaningful engagement indicators)
  - Quick actions: "Publish Profile" toggle, "Copy Athlete Profile Link" (with warning if unpublished), "Preview Public Profile" (opens public page in new tab)
  - Unpublished banner when `profile_visible=false`
  - Profile completeness bar with missing fields
- **Rename:** `is_published` → `profile_visible` (backward-compatible normalization)
- **New endpoints:**
  - `GET /api/internal/athlete/{athlete_id}/profile` — staff-only full view
  - `PUT /api/internal/athlete/{athlete_id}/profile/publish` — staff publish toggle
- **New files:** `InternalAthleteProfile.js`, updated `public_profile.py`
- **Testing:** 100% pass (iteration_99: 31/31 backend, all frontend verified)

### Roster "View Profile" Quick Action (DONE - March 11, 2026)
- Added teal "Profile" button to athlete rows on the Roster page (both desktop hover and mobile)
- Navigates directly to `/internal/athlete/:athleteId/profile` for quick staff access
- Stands out from other gray action buttons with teal accent color

## Key API Endpoints
- `GET /api/subscription` — Current user's tier
- `GET /api/public/profile/{slug}` — Public athlete profile (no auth)
- `GET /api/internal/athlete/{athlete_id}/profile` — Staff-only full profile + recruiting context
- `PUT /api/internal/athlete/{athlete_id}/profile/publish` — Staff toggle publish
- `GET /api/athlete/public-profile/settings` — Athlete's public profile settings
- `PUT /api/athlete/public-profile/settings` — Update visibility settings
- `POST /api/athlete/public-profile/generate-slug` — Regenerate slug

## Credentials
- **Platform Admin:** douglas@capymatch.com / 1234
- **Director:** director@capymatch.com / director123
- **Club Coach (Williams):** coach.williams@capymatch.com / coach123
- **Athlete (Emma):** emma.chen@athlete.capymatch.com / password123

## P0 In Progress
- (None — all P0 items completed)

## P1 Upcoming
- Club Billing (subscription billing and management for organizations)

## P2 Future/Backlog
- AI-powered coach summary (LLM-enhanced recruiting pitch using pipeline data)
- Intelligence Pipeline Phase 2: Roster Stability, Scholarship, NIL agents
- Coach Scraper Health Report V1
- Parent/Family Experience
- Coach Probability / Program Receptivity Feature
