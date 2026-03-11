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
- Structured signals, program_metrics, priority alerts, smart-match caching (11s->1s)

### Public Athlete Profile V1 (DONE - March 11, 2026)
- Slug-based public profile (`/p/{slug}`), privacy-filtered by `profile_visible` + section toggles
- Settings UI with publish toggle, share link, completeness bar, coach summary preview

### Internal Staff Profile + Dual-Mode Profiles (DONE - March 11, 2026)
- Two profile modes: public `/p/{slug}` + staff-only `/internal/athlete/:athleteId/profile`
- Internal recruiting context panel, quick actions, profile completeness

### Public Profile V2 — Coach Scan Mode + Dynamic Recruiting Snapshot (DONE - March 11, 2026)
- Coach Scan Mode redesigned hero, Dynamic Recruiting Snapshot privacy-safe signal pills

### Pipeline Command Center — Phase A+B+C (DONE - March 11, 2026)
- Top Action Engine, School Card Enhancement, Hero Card Enhancement
- Owner inference, dual CTAs, keyboard shortcuts

### Coach Dashboard Restructure — Phase 1-2 (DONE - March 11, 2026)
- Hero KPIs, Today's Priorities work queue, My Roster with next steps

### Coach Area Overhaul — Phases 3-5 (DONE - March 11, 2026)
- Support Pod Refinement, Events/Prep, Language & UX Polish

### Real-Time Notifications V1 (DONE - March 11, 2026)
- Background polling, live indicators, KPI pulse, quiet toasts

### NCAA Timeline on Calendar Page (DONE - March 11, 2026)
- Tab Switcher, Division selector, horizontal timeline bar with NOW marker

### Support Pod V2 — Intervention Console (DONE - March 11, 2026)
**10-point upgrade transforming the Support Pod into a "Diagnose -> Decide -> Act" workflow:**

1. **Active Issue Banner Enhancement (Point 1):** Emphasized primary action with larger text (text-xl), urgency "ACT NOW" badge for high-score interventions, stronger visual contrast on recommended action box.

2. **Athlete Snapshot — Recruiting Context (Point 2):** Added Recruiting Progress bar (Exploring -> Contacted -> Engaged -> Committed step indicator), Coach Engagement metric (X/Y engaged with health bar and response rate percentage).

3. **Support Team — Quick Contact (Point 3):** Message and Call buttons per pod member, inline message form on click, call logging to timeline. Primary coach gets filled teal action buttons.

4. **Next Actions — Top 3 Priority (Point 4):** Top 3 highest-priority actions shown prominently with numbered badges (1, 2, 3). Remaining actions collapsed under "Show X more actions" expandable. Priority order: Overdue > Ready > Upcoming.

5. **Coaching Suggestions (Point 5):** Renamed AI button from "Suggest Actions" to "Get Coaching Suggestions". Added helper text: "AI will analyze this athlete's situation and suggest next steps".

6. **Treatment History — Enhanced Scannability (Point 6):** Colored left borders per event type, type label badges (Note, Resolved, Message, Call, Reassignment, Blocker, Stage Change), expanded filter options including Calls, Blockers, Stage Changes.

7. **Recruiting Timeline (Point 7 - NEW):** Compact vertical timeline showing key milestones: Profile Created, Schools Added, Outreach Sent, Coach Responded, Last Activity. Color-coded by milestone type. Deterministic data from athlete profile.

8. **Recruiting Intelligence (Point 8 - NEW):** Rule-based signal detection panel with priority-ranked cards (Critical, High, Medium, Low). Each signal: icon, title, description, recommended intervention. Signals: Low Response Rate, No D1 Engagement, Extended Inactivity, Momentum Low, Event Prep, Profile Incomplete, Strong Engagement (positive). Backend: `generate_recruiting_signals()` in `support_pod.py`.

9. **Intervention Playbook (Point 9 - NEW):** Single playbook displayed matching the active intervention category. Expandable with checkable steps, progress bar, estimated timeline, owner per step, success criteria. 6 playbooks: Momentum Recovery, Blocker Resolution, Event Prep, Re-engagement, Ownership Assignment, Readiness Improvement. Backend: `INTERVENTION_PLAYBOOKS` + `get_intervention_playbook()`.

10. **Quick Actions Bar (Point 10 - NEW):** Sticky bar below header with 4 actions: Send Message, Log Interaction, Schedule Check-in, Escalate to Director. Inline text form on click. Responsive with horizontal scroll on mobile.

**Page Layout Order:** Header -> Quick Actions Bar -> Active Issue Banner -> Athlete Snapshot + Support Team -> Next Actions -> Recruiting Intelligence -> Intervention Playbook -> Coaching Suggestions -> Recruiting Timeline -> Quick Note -> Treatment History

**P0 Bug Fix:** DirectorActionsCard disappearing items on Acknowledge/Resolve — fixed with optimistic UI update + delayed re-fetch (2.5s timeout).

**New Backend Fields:** `recruiting_timeline`, `recruiting_signals`, `intervention_playbook` added to `GET /api/support-pods/:athleteId` response.

**Testing:** 100% (iteration_107: 21/21 backend, all 10 frontend points + P0 bug fix verified)

## Key API Endpoints
- `GET /api/coach/mission-control` — Coach dashboard data
- `GET /api/support-pods/:athleteId` — Full Support Pod with V2 fields (recruiting_timeline, recruiting_signals, intervention_playbook)
- `POST /api/support-pods/:athleteId/actions` — Create action item
- `PATCH /api/support-pods/:athleteId/actions/:actionId` — Update action
- `POST /api/support-pods/:athleteId/resolve` — Resolve active issue
- `GET /api/subscription` — Current user's tier
- `GET /api/public/profile/{slug}` — Public athlete profile
- `GET /api/internal/athlete/{athlete_id}/profile` — Staff-only full profile

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
