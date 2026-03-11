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

### Public Profile V2 — Coach Scan Mode + Dynamic Recruiting Snapshot (DONE - March 11, 2026)
- **Coach Scan Mode:** Redesigned hero for 10-second coach comprehension — name + class year badge + position, key facts grid (Height/Weight/GPA), measurables row, prominent CTAs (Watch Highlights / Contact).
- **Dynamic Recruiting Snapshot:** Privacy-safe signal pills below hero — "Actively exploring D1, D2, and D3 opportunities", "Academic information available", "Profile updated this season". Deterministic, no LLM.
- **Backend:** New `recruiting_signals` field in public profile response. Computed from pipeline divisions/states, athlete data (video, GPA, coach), profile freshness.
- **Design:** Premium, clean, mobile-first. Dark slate photo placeholder, tight info-dense layout, no form-dump feel.
- **Testing:** 100% (iteration_100: 14/14 backend, all frontend verified)

### Roster "View Profile" Quick Action (DONE - March 11, 2026)
- Added teal "Profile" button to athlete rows on the Roster page (both desktop hover and mobile)
- Navigates directly to `/internal/athlete/:athleteId/profile` for quick staff access
- Stands out from other gray action buttons with teal accent color

### Support Pod "View Profile" Link (DONE - March 11, 2026)
- Added teal "View Profile" pill button in the Support Pod header bar
- Navigates to `/internal/athlete/:athleteId/profile` for seamless staff workflow
- Responsive: shows icon-only on mobile, full text on desktop

### Pipeline Command Center — Phase A+B+C (DONE - March 11, 2026)
- **Phase A — Top Action Engine (Backend):** New `top_action_engine.py` with centralized `ACTION_MAP` (8 priority levels, 14 action types). Deterministic rules engine computes one primary action per school with: `action_key`, `reason_code`, `priority`, `category`, `label`, `owner`, `explanation`, `cta_label`. Priority: coach_flag > director_action > overdue > reply_needed > due_today > first_outreach > cooling_off > on_track.
- **Phase B — School Card Enhancement:** Each Kanban card now shows: health badge + top action label + owner badge (Athlete/Parent/Coach/Shared with color coding) + contextual explanation. Cards feel like an operating system for recruiting, not a static tracker.
- **Phase C — Hero Card Enhancement:** Hero carousel now driven by Top Action Engine. Shows all actionable items with owner badges, expanded categories (Coach Flags, Director Actions, Reply Needed, Re-engage). Filter pills updated with new categories.
- **Owner inference:** Auto-inferred from action type (athlete for most, shared for director actions). No manual assignment yet.
- **New endpoints:** `GET /api/internal/programs/top-actions` (batch), `GET /api/internal/programs/{id}/top-action` (per-program)
- **Testing:** 100% (iteration_101: 18/18 backend, all frontend verified)

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

### Real-Time Notifications V1 (DONE - March 11, 2026)
- **Background Polling:** MissionControl.js polls `/api/mission-control` every 45s (background fetch). Director count polled separately in sync.
- **Live Indicators:** "Updated just now" / "Updated Xs ago" label with green pulse dot. 15s refresh for relative timestamp.
- **KPI Pulse:** When a KPI value changes between polls, the number briefly scales up with an animated ping dot (3s).
- **Quiet Toasts (high-priority only):** New Director Request, new Critical issue, major momentum drop (15+ points). No toast on initial load (isFirstLoad guard + prev.directorRequestCount > 0 check).
- **Bug Fixed:** Director request toast was firing on first load (0→5 comparison). Fixed by requiring prev count > 0.
- **Testing:** 100% backend (15/15), frontend bug fixed and self-verified (iteration_106)

### Coach Area Overhaul — Phases 3-5 (DONE - March 11, 2026)
- **Phase 3 — Support Pod Refinement:**
  - ActiveIssueBanner: "WHAT TO DO NOW" is the star element (16px bold), "WHAT IS WRONG"/"WHAT CHANGED" as two-column context cards. Log Check-in, Send Message, Mark Resolved CTAs.
  - NextActions: Grouped by OVERDUE (red) → READY (blue) → UPCOMING (purple) instead of by owner. Overdue counter in header.
  - AthleteSnapshot: Added Pipeline Health (% responding + engagement label), health bars, upcoming events list.
  - PodMembers: PRIMARY COACH badge with crown icon, teal background highlight, ownership task summary.
- **Phase 4 — Events/Prep:**
  - UpcomingEventsCard: per-event athletes attending count, "need attention" count, prep steps remaining, amber badges for athletes with issues (e.g., "Emma — momentum drop").
  - Progress bars per event. Past events shown at reduced opacity.
- **Phase 5 — Language & UX Polish:**
  - Header: "need action" replaces "alerts". ActivityFeed: CSS variable theming replaces hardcoded colors.
  - Human-friendly action language: "Check in with athlete", "Re-engage athlete", "Remove blocker", "Review readiness gaps".
- **Testing:** 100% (iteration_105: 16/16 backend, all 15 frontend features verified)

### Coach Dashboard Restructure — Phase 1-2 (DONE - March 11, 2026)
- **Phase 1 — Dashboard Restructure:**
  - Hero KPIs refined: MY ATHLETES, NEED ACTION, EVENTS THIS WEEK, DIRECTOR REQUESTS (replaced vague "ALERTS")
  - Compact Summary Card: bullet points ("3 athletes have momentum drop", "1 athlete has a blocker", etc.) + "Review Priorities" CTA
  - Today's Priorities: deterministic work queue grouped by urgency (Critical / Follow-Up / Event Prep), each row: athlete, action, reason, CTA
  - Replaced AI-powered "What Should I Do Today?" with deterministic priorities engine
- **Phase 2 — My Roster Improvements:**
  - Each athlete row: name, grad year, position, issue type badge, short reason, NEXT step, "Open Pod" CTA on hover
  - "ON TRACK" separator between athletes needing action and healthy athletes
  - Backend enriched with `next_step`, `summary_lines`, `priorities` queue per coach response
- **Testing:** 100% (iteration_104: 18/18 backend, all frontend verified)

### NCAA Timeline on Calendar Page (DONE - March 11, 2026)
- **Ported from GitHub:** Brought the `NcaaTimeline.js` component from `github.com/capymatch/capymatch` repo, adapted CSS variables (`--t-*` → `--cm-*`).
- **Tab Switcher:** Added "My Calendar" / "NCAA Timeline" tab switcher to CalendarPage. NCAA tab uses teal active state.
- **Features:** Current period banner (with days remaining), Division selector (D1/D2/D3/NAIA), horizontal color-coded timeline bar with NOW marker, Key NCAA Dates & Deadlines cards with status tags (Passed/Xd away/Active Now/Info).
- **Testing:** 100% frontend (iteration_103: all 14 features verified)
- **Action-First Layout:** Flipped visual hierarchy — CTA label (e.g., "Reply Now") is the headline, school name is secondary context. Removed cluttered badges row (social links, fit labels, conference/events).
- **Directive Language:** Updated all ACTION_MAP labels in `top_action_engine.py` to be imperative (e.g., "Reply to Coach Now", "Send Your Intro Email", "Follow Up Now — {days}d Overdue"). Labels now support template variables.
- **Dual CTAs:** Primary action button (color-coded by urgency) + secondary "View School >" outline button, replacing single generic "Open School" CTA.
- **Compact Progress Rail:** Moved from full-width row to inline dots in the CTA row, saving vertical space.
- **Inline Explanation:** Replaced boxed "What to do next" card with clean inline text under the headline.
- **Keyboard Shortcuts:** Arrow keys navigate between actions, Enter executes the CTA. Subtle keyboard hint displayed on desktop. Uses ref-based callbacks for React hooks compliance.
- **Testing:** 100% (iteration_102: 15/15 backend, all frontend verified + keyboard self-tested)

## P1 Upcoming
- Club Billing (subscription billing and management for organizations)

## P2 Future/Backlog
- AI-powered coach summary (LLM-enhanced recruiting pitch using pipeline data)
- Intelligence Pipeline Phase 2: Roster Stability, Scholarship, NIL agents
- Coach Scraper Health Report V1
- Parent/Family Experience
- Coach Probability / Program Receptivity Feature
