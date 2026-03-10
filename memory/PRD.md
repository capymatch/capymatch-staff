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
- **Subscription system** matching capymatch repo exactly:
  - Starter (Free): 5 schools, 3 AI drafts/month, basic features
  - Pro ($12/mo): 25 schools, 50 AI drafts, Gmail, analytics, insights
  - Premium ($29/mo): Unlimited everything, priority support
- **School limit enforcement**: Backend 403 with subscription_limit error type
- **Upgrade modal**: 3-tier comparison, "Most Popular" badge on Pro, "Current Plan" indicator
- **Frontend integration**: SubscriptionProvider context, useSubscription hook, canAccess/getUsage helpers
- **Drag-and-drop Kanban**: @hello-pangea/dnd library, 5 columns (Added → Offered)
  - Optimistic UI updates on drag
  - Backend persistence via PUT /api/athlete/programs/{id}
  - Toast notifications on stage change
  - Visual feedback (shadow, outline) during drag
- **Note:** Stripe checkout is MOCKED — shows toast instead of redirecting

### Phase 12 — Upcoming Tasks Feature (DONE - March 10, 2026)
- **Replaced "Upcoming Events" with "Upcoming Tasks"** on My Schools (Pipeline) page
- **Backend endpoint** `GET /api/athlete/tasks`: returns only follow-ups due in 1-3 days
- **Hero card expanded**: Now includes overdue, due-today, AND needs-outreach schools
- **Upcoming Tasks section**: Shows only forward-looking items (1-3 day follow-ups), hides when empty
- **Testing:** 100% pass rate (backend 10/10, frontend all verified - iteration_68)

### Phase J1 — Journey Page: High-Impact UX + Trust (DONE - March 10, 2026)
- **Match Score badge**: Shows "X% Match" in header with color coding (green >=80, amber >=60, gray <60)
- **Risk Badges + Explainer Drawer**: Clickable pills (Roster Tight, Timeline Awareness, Funding Dependent, Academic Reach) with slide-in explainer panel
- **Overdue Follow-Up Card**: Rich dark card with orange accent, "X DAYS OVERDUE" label, "Send Email" + "Reschedule" CTAs
- **Upcoming Follow-Up Card**: Teal accent card for follow-ups due within 5 days, with action buttons
- **Questionnaire Section + Nudge**: Persistent section with "Open Form" + "Mark Complete" toggle; dismissable amber nudge for incomplete questionnaires
- **Real University Logos**: Uses shared UniversityLogo component (KB logo → Google favicon → letter avatar)
- **New component**: `/app/frontend/src/components/RiskBadges.js`
- **Testing:** 100% pass rate (backend 13/13, frontend all verified - iteration_69)

## Key API Endpoints
- `GET /api/subscription` — Current user's tier, limits, usage
- `GET /api/subscription/tiers` — All available tiers for comparison
- `POST /api/knowledge-base/add-to-board` — Add school (enforces limit)
- `PUT /api/athlete/programs/{id}` — Update program (used by DnD)
- `POST /api/gmail-intelligence/scan` — Trigger Gmail scan
- `GET /api/gmail-intelligence/insights` — Fetch AI insights
- `GET /api/athlete/tasks` — Auto-generated upcoming tasks from pipeline state

## Credentials
- **Athlete:** emma.chen@athlete.capymatch.com / password123
- **Director:** director@capymatch.com / director123

### Phase J2 — Journey Page: Coach Relationship Depth (DONE - March 10, 2026)
- **Coach Watch Alert**: Green "Staff Stable" badge in coaches card header (MOCKED — real detection requires background job)
- **Engagement Stats Strip**: Opens/Clicks/Unique counts inside coaches card from `GET /api/athlete/engagement/{programId}`
- **Coach Social Links**: `CoachSocialLinks` component renders social media links matched from `kb_coaches` data
- **ConversationBubble Enrichment**: "YOU"/"COACH" labels, engagement badges on sent emails, show more/less with Gmail body fetch, HTML entity decoding
- **New components**: `CoachSocialLinks.js`, enriched `ConversationBubble.js`
- **New endpoint**: `GET /api/athlete/engagement/{program_id}`
- **Testing:** 100% pass rate (backend 16/16, frontend all verified - iteration_70)

### Phase J3 — Journey Page: Communication + Workflow (DONE - March 10, 2026)
- **Send Profile Card**: Opens email composer with pre-filled recruiting profile template; shows when school has coaches
- **Gmail Connect Nudge**: Teal banner above timeline when Gmail not connected, links to /settings
- **Archive Confirmation Dialog**: AlertDialog from shadcn/ui replaces instant toggle; navigates to /pipeline after archiving
- **Notes Sidebar**: Slide-in panel from right edge with full CRUD (create, pin, edit, delete notes per program)
- **School Intelligence Link**: Uses domain when available (`/school/${domain}`)
- **New endpoint**: `GET/POST /api/athlete/programs/{id}/notes`, `PUT/DELETE /api/athlete/notes/{noteId}`
- **New component**: `NotesSidebar.js`
- **Testing:** 100% pass rate (backend 15/15, frontend all verified - iteration_71)

### Phase J4 — Journey Page: Monetization + Polish (DONE - March 10, 2026)
- **Subscription Gating**: Basic tier email actions show upgrade toast; School Intelligence link hidden for basic
- **AI Premium Gating**: Non-premium users see lock icon + "Upgrade to Premium" CTA; premium users get full AI buttons
- **Compare Button**: Header button linking to `/compare?selected={programId}` (hidden on mobile)
- **Committed Toggle**: CommittedHero + "View full journey" button toggles content visibility for committed schools
- **School Social Links**: `SchoolSocialLinks` component renders Twitter/Instagram/etc when `program.social_links` exists (data-ready, no current data)
- **Bug Fix**: Overdue follow-up card Send Email button now properly gated by subscription
- **Testing:** 95% → 100% after bug fix (iteration_72)

### Unmocking Sprint (DONE - March 10, 2026)
- **Coach Watch Alert**: Wired real backend API (`GET /api/ai/coach-watch/alert/{university_name}`). Dynamic green/yellow/red badge based on severity.
- **School Social Links**: KB social_links (862 entries) now piped to programs during fetch. Twitter/Instagram/Facebook/YouTube icons render in Journey header.
- **Stripe Checkout**: Real Stripe integration via `emergentintegrations`. Creates real checkout sessions, redirects to stripe.com, handles return with status polling. Settings page processes the redirect.
- **New endpoints**: `POST /api/checkout/create-session`, `GET /api/checkout/status/{session_id}`, `POST /api/webhook/stripe`
- **Testing:** 100% pass (backend 12/12, frontend all verified - iteration_73)

### Enhanced Settings Page (DONE - March 10, 2026)
- **Two-tab layout**: Refactored `/athlete-settings` into "Profile" and "Plan & Billing" tabs using shadcn Tabs component
- **Profile tab**: Personal Information (name/email), Change Password, Notifications (follow-up reminders, email notifications), Appearance (dark/light/system theme), Gmail Integration (connect/disconnect/import)
- **Plan & Billing tab**: Current Plan card (tier name, badge, price, features list), Usage bars (Schools, AI Drafts) with color-coded progress bars, Upgrade button opening UpgradeModal, Compare Plans CTA, "Unlock More with Pro" highlights for basic tier users, Data & Privacy (export data, delete account)
- **Stripe Customer Portal**: Backend endpoint `POST /api/checkout/create-portal-session` creates a Stripe billing portal session. The checkout status endpoint now also saves `stripe_customer_id` from raw Stripe session data for portal access.
- **Billing History**: Transaction table with Date, Plan, Amount, Status columns. Data pulled from `payment_transactions` collection via `GET /api/stripe/billing-history`.
- **Cancel Subscription**: `POST /api/stripe/cancel` schedules cancellation at billing period end. Shows confirmation dialog. Cancellation banner with reactivate option appears when pending.
- **Reactivate Subscription**: `POST /api/stripe/reactivate` undoes a pending cancellation. "Keep My Plan" button in the cancellation banner.
- **New endpoints**: `POST /api/checkout/create-portal-session`, `GET /api/stripe/billing-history`, `POST /api/stripe/cancel`, `POST /api/stripe/reactivate`
- **Testing:** 100% pass rate (iteration_74: 23/23, iteration_75: 12/12)

### Coach Watch Scheduled Auto-Scanning (DONE - March 10, 2026)
- **Real Web Search**: Replaced LLM-knowledge-only approach with DuckDuckGo real news search (`_search_coaching_news`) for each school in the pipeline
- **Weekly Background Task**: `coach_watch_weekly_scan()` asyncio task runs every 7 days, scanning all premium tenants' pipeline schools for coaching staff changes
- **AI Analysis**: Claude Sonnet analyzes DuckDuckGo news results and returns structured alerts (severity: red/yellow/green, change_type, recommendation)
- **Subscription Enforcement**: `POST /ai/coach-watch/scan` and `GET /ai/coach-watch/alerts` now require premium tier (auto_reply_detection feature flag). Individual alert endpoint (`/alert/{university_name}`) remains open for Journey page badges
- **Notifications**: Red/yellow severity alerts automatically create in-app notifications via `create_notification`
- **Testing:** 100% pass rate (iteration_76: 10/10)

### Database Normalization: camelCase → snake_case (DONE - March 10, 2026)
- **Migrated 25 athlete documents** in MongoDB — renamed 11 fields: `firstName→first_name`, `lastName→last_name`, `fullName→full_name`, `gradYear→grad_year`, `lastActivity→last_activity`, `daysSinceActivity→days_since_activity`, `momentumScore→momentum_score`, `momentumTrend→momentum_trend`, `recruitingStage→recruiting_stage`, `schoolTargets→school_targets`, `activeInterest→active_interest`
- **Updated 20+ backend Python files** including `mock_data.py`, `database.py`, `athlete_store.py`, `decision_engine.py`, `advocacy_engine.py`, `event_engine.py`, `program_engine.py`, `support_pod.py`, and all routers
- **Updated 8 frontend JS files** including `AthleteDashboard.js`, `MyRosterCard.js`, `AthleteSnapshot.js`, `PodHeader.js`, `EventPrep.js`, `LiveEvent.js`, `RecommendationBuilder.js`, `SupportPod.js`
- **API responses** now use 100% snake_case field names — zero camelCase athlete fields remain
- **Testing:** 100% pass rate (iteration_77: 8/8 backend, all frontend verified)

### Connected Experiences V1 (DONE - March 10, 2026)
- **New endpoint**: `GET /api/roster/athlete/{athlete_id}/pipeline` — staff-shaped pipeline summary for directors/assigned coaches
- **Response includes**: athlete header (name, position, year, team, momentum), top summary row (total schools, response rate, active conversations, overdue follow-ups), stage distribution (6-stage pipeline bar), schools grouped by stage (with risk badges, reply status, pulse indicators), recent recruiting activity (last 10 interactions)
- **Access control**: Directors can view any athlete; coaches can only view their assigned athletes
- **Graceful fallback**: Mock athletes without tenant return header + empty pipeline (no errors)
- **Frontend**: `AthletePipelinePanel` slide-over panel accessible from NeedsAttentionCard and MyRosterCard via "Pipeline" / ArrowUpRight button
- **Files**: `/app/backend/routers/connected.py`, `/app/frontend/src/components/mission-control/AthletePipelinePanel.js`
- **Testing:** 100% pass rate (iteration_78: 12/12 backend, all frontend verified)

### Pydantic Hardening Pass (DONE - March 10, 2026)
- **Response models added** to core endpoints:
  - `auth`: `TokenResponse` (typed `UserOut`), `MeResponse`
  - `athlete/me`: `AthleteClaimResponse` (typed `AthleteHeader`)
  - `subscription`: `SubscriptionResponse` (typed `UsageLimits`)
  - `athlete/settings`: `SettingsResponse` (typed `PreferencesOut`)
  - `roster/athlete/{id}/pipeline`: `PipelineResponse` (typed `PipelineHeader`, `PipelineSummary`, `StageCount`, `SchoolEntry`, `SchoolGroup`, `ActivityEntry`)
- All models defined in `/app/backend/models.py`
- All endpoints validated with real API calls — responses match contracts exactly

## P2 Future/Backlog
- Connected Experiences (Director ↔ Athlete visibility)
- Engagement analytics
- Smart Match AI (advanced matching)
- Parent/Family experience
- Coach Watch scheduled auto-scanning
