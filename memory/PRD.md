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

### Phase 10 — My Schools Page Redesign V3 (DONE - March 9, 2026)
- Hero card = Actions carousel with prev/next navigation
- Pro Kanban board: clean white cards, division/conference tags, match %, urgency labels
- Upcoming events section, guidance banner

### Phase 11 — Subscription Tiers & Drag-and-Drop Kanban (DONE - March 9, 2026)
- Subscription system (Starter Free / Pro $29 / Premium $49)
- School limit enforcement, upgrade modal, drag-and-drop Kanban

### Phase 12 — Upcoming Tasks Feature (DONE - March 10, 2026)
- Backend endpoint, hero card expansion, upcoming tasks section

### Phase J1-J4 — Journey Page Features (DONE - March 10, 2026)
- Match Score badge, Risk Badges, Overdue/Upcoming Follow-Up Cards
- Coach Watch Alert, Engagement Stats, Coach Social Links, Conversation Enrichment
- Send Profile Card, Gmail Connect Nudge, Archive Dialog, Notes Sidebar
- Subscription Gating, AI Premium Gating, Compare Button, Committed Toggle

### Unmocking Sprint (DONE - March 10, 2026)
- Coach Watch Alert (real web search), School Social Links, Stripe Checkout (real integration)

### Enhanced Settings Page (DONE - March 10, 2026)
- Two-tab layout (Profile / Plan & Billing), Stripe Customer Portal, Billing History, Cancel/Reactivate

### Smart Match Phase 1 + Refinements (DONE - March 10, 2026)
- Rule-based scoring engine, dashboard cards, find schools integration
- AI explanations, match detail drawer, rerun recommendations, school comparison

### Multi-Tenant Organization Architecture (DONE - March 10, 2026)
- Organizations CRUD, role standardization, access control, independent families

### Director-Specific Actions V1 (DONE - March 10, 2026)
- Review requests, pipeline escalations, lightweight lifecycle, notifications

### User Onboarding Flow (DONE - March 11, 2026)
- Volleyball quiz, empty board state, auto-redirect

### Full Admin User & Subscription Management (DONE - March 11, 2026)
- Admin users page, user detail, subscriptions page, audit logging

### Intelligence Pipeline Phase 1 (DONE - March 11, 2026)
- Payload builder, School Insight Agent, Timeline Agent

### Schema V2: Structured Signals (DONE - March 11, 2026)
- Athletes, Programs, Interactions structured signal fields
- program_stage_history, program_signals, program_outcomes collections

### Derived Program Metrics Layer (DONE - March 11, 2026)
- 17 derived metrics, meaningful engagement tracking, pipeline health state
- Batch metrics endpoint, pipeline health badges, engagement outlook card

### Hero Carousel Priority System (DONE - March 11, 2026)
- Priority-ordered alerts, filter pills, pulsing dots, supportive framing

### Performance: Smart Match Caching (DONE - March 11, 2026)
- 1-hour cache, 76x faster dashboard load

### Public Athlete Profile V1 (DONE - March 11, 2026)
- **Backend:** Slug-based public profile endpoint (`GET /api/public/profile/{slug}`), privacy-filtered response respecting athlete visibility settings. Auto-generates URL-friendly slugs (e.g., `emma-chen-2026-oh`). Profile completeness scoring (12 fields). Deterministic coach summary generation.
- **Settings Endpoints:** `GET /api/athlete/public-profile/settings` (settings + completeness + slug), `PUT /api/athlete/public-profile/settings` (update visibility toggles), `POST /api/athlete/public-profile/generate-slug` (regenerate slug).
- **Privacy Controls:** `is_published` (default: false — opt-in), `show_contact_email` / `show_contact_phone` (default: false — safe defaults), `show_academics`, `show_measurables`, `show_club_coach`, `show_bio`, `show_events` (all default: true).
- **Frontend Public Page:** Updated `/p/:slug` route with Coach Summary section, conditional sections based on privacy, legacy `/s/:shortId` fallback maintained.
- **Frontend Settings UI:** New `PublicProfileSettings` component in Settings page Profile tab — publish toggle, share link with copy/preview, profile completeness bar with missing fields, coach summary preview, 7 visibility toggles.
- **New files:** `/app/backend/routers/public_profile.py`, `/app/frontend/src/components/settings/PublicProfileSettings.js`
- **Modified files:** `server.py` (router registration), `App.js` (new route), `SettingsPage.js` (import), `AthletePublicProfile.js` (rewritten for slug support)
- **Testing:** 100% pass rate (iteration_98: 15/15 backend, all frontend verified)

## Key API Endpoints
- `GET /api/subscription` — Current user's tier, limits, usage
- `GET /api/subscription/tiers` — All available tiers for comparison
- `POST /api/knowledge-base/add-to-board` — Add school (enforces limit)
- `PUT /api/athlete/programs/{id}` — Update program (used by DnD)
- `POST /api/gmail-intelligence/scan` — Trigger Gmail scan
- `GET /api/gmail-intelligence/insights` — Fetch AI insights
- `GET /api/athlete/tasks` — Auto-generated upcoming tasks from pipeline state
- `GET /api/public/profile/{slug}` — Public athlete profile (no auth)
- `GET /api/athlete/public-profile/settings` — Public profile settings (auth required)
- `PUT /api/athlete/public-profile/settings` — Update visibility settings (auth required)
- `POST /api/athlete/public-profile/generate-slug` — Regenerate slug (auth required)

## Credentials
- **Platform Admin:** douglas@capymatch.com / 1234
- **Director:** director@capymatch.com / director123
- **Club Coach (Williams):** coach.williams@capymatch.com / coach123
- **Club Coach (Garcia):** coach.garcia@capymatch.com / coach123
- **Athlete (Emma):** emma.chen@athlete.capymatch.com / password123

## P0 In Progress
- (None — all P0 items completed)

## P1 Upcoming
- Club Billing (subscription billing and management for organizations)

## P2 Future/Backlog
- Intelligence Pipeline Phase 2: Roster Stability agent, Scholarship Structure agent, NIL Readiness agent
- Coach Scraper Health Report V1 (dashboard health card, weekly digest)
- Parent/Family Experience
- Coach Probability / Program Receptivity Feature
- Community contributions & import analytics
- Engagement analytics
