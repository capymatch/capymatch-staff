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
- **Coach (Williams):** coach.williams@capymatch.com / coach123
- **Coach (Garcia):** coach.garcia@capymatch.com / coach123

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

### Coach-to-Athlete Flag for Follow-Up (DONE - March 10, 2026)
- **Backend endpoints:**
  - `POST /api/roster/athlete/{athlete_id}/flag-followup` — Coach flags a school (enforces coach-only + assignment check)
  - `GET /api/athlete/flags` — Athlete gets active flags
  - `POST /api/athlete/flags/{flag_id}/complete` — Athlete marks flag as done
  - `GET /api/athlete/tasks` — Updated to include coach flags alongside system tasks (coach flags sorted first)
- **Preset reasons:** reply_needed, followup_overdue, strong_interest, review_school
- **Due options:** today, this_week, none
- **Coach UI (AthletePipelinePanel):** Flag icon on school rows (hover-revealed), FlagModal with reason selection, optional note, due picker
- **Athlete UI (PipelinePage):** "Flagged by Coach" section with amber border, flag icon, coach name, due label, "Done" button
- **Timeline (JourneyPage):** "Coach Directive" (amber, flag icon) and "Flag Completed" (green, checkmark) rendered as distinct center-aligned events
- **Notifications:** Athlete notified on flag creation; coach notified on flag completion
- **Files:** `/app/backend/routers/coach_flags.py`, `/app/backend/routers/athlete_tasks.py`, `/app/frontend/src/components/mission-control/AthletePipelinePanel.js`, `/app/frontend/src/pages/athlete/PipelinePage.js`, `/app/frontend/src/components/journey/ConversationBubble.js`, `/app/frontend/src/components/journey/constants.js`
- **Testing:** 100% pass rate (iteration_79: 15/15 backend, all frontend verified)

### Subscription Tier Fix (DONE - March 10, 2026)
- **Aligned SUBSCRIPTION_TIERS** with capymatch repo: Basic=$0/5schools/0AI, Pro=$29/25schools/10AI, Premium=$49/unlimited
- **Updated Stripe checkout** prices: Pro $29, Premium $49
- **Updated feature access**: Basic now includes gmail_integration, public_profile, analytics. Pro/Premium recruiting_insights and auto_reply_detection aligned
- **Over-limit upgrade banner** on Pipeline page when schools exceed plan limit
- **Files:** `/app/backend/subscriptions.py`, `/app/backend/routers/stripe_checkout.py`, `/app/frontend/src/pages/athlete/PipelinePage.js`

### Automation Rules (DONE - March 10, 2026)
- **Email Sent → Contacted/Awaiting Reply**: Auto-updates recruiting_status, reply_status, initial_contact_sent, next_action_due +14d
- **Reply Received → Very High Priority**: Auto-updates reply_status, priority, next_action_due +2d
- **Implemented in**: `athlete_dashboard.py` (create_interaction + mark_as_replied), `athlete_gmail.py` (send_email)
- **Testing:** 100% (iteration_80: 15/15 backend, all frontend)

### UI Polish (DONE - March 10, 2026)
- Journey hero: Solid #1e1e2e, 10px corners, teal bar (matching Pipeline)
- CelebrationHero: Dark card style, green accent bar
- GettingStartedChecklist: Light theme, positioned right under hero
- Global: borderRadius 18→10px, consistent mb-4 spacing, 1120px width
- Removed: Redundant "NEXT FOLLOW-UP" sidebar widget

### Smart Match Phase 1 (DONE - March 10, 2026)
- **Rule-Based Scoring Engine**: Backend `GET /api/smart-match/recommendations` scores ~953 schools across 5 categories (Athletic 30%, Academic 25%, Preference 20%, Geographic 15%, Opportunity 10%)
- **Dashboard "Top Matches" Card**: 3-column card showing top recommended schools with match score circles, reason chips, "Add to Pipeline" CTA, and "Upgrade for more" badge for basic tier
- **Find Schools "Recommended for You"**: Grid of smart match cards at top of the schools page with score circles, reason chips, AI summaries (Pro+), pipeline status, and "Unlock X+ matches" button for basic tier
- **AI Explanations**: Pro/Premium users get Claude Sonnet-generated summaries, next steps, and verification points via `emergentintegrations`
- **Subscription Gating**: Basic=3 results (no AI), Pro=unlimited with 5 AI, Premium=unlimited with 10 AI
- **Navigation Fix**: Smart match cards navigate to `/schools/{domain}` correctly
- **Testing:** 100% pass rate (iteration_81: 14/14 backend, all frontend verified)

### "Why This School?" Detail Drawer (DONE - March 10, 2026)
- **MatchDetailDrawer component**: Slide-in drawer from right edge, triggered by clicking any Smart Match card on Dashboard or Find Schools page
- **Header**: School name, logo, division/conference/location, overall match score in rounded badge, fit label (Excellent Fit → Stretch), confidence badge (High/Medium/Low based on data completeness)
- **Score Breakdown**: 5 horizontal progress bars with category icons (Athletic 30%, Academic 25%, Preference 20%, Geographic 15%, Opportunity 10%), scores, and weight labels
- **Why This School Matches**: 2-4 strength bullet points derived from top-scoring categories
- **What Could Improve**: Contextual improvement suggestions (missing GPA, test scores, regions, priorities, or low-scoring categories) — hidden when none apply
- **AI Insight section**: Shows AI summary/next step/verify for Pro/Premium users
- **Actions**: "Add to Pipeline" CTA + "Details" navigation button
- **Mobile-friendly**: Max 420px width, scrollable, overlay close
- **New file**: `/app/frontend/src/components/MatchDetailDrawer.js`
- **Backend enhanced**: `compute_match_score` now returns `fit_label`, `confidence`, `strengths`, `improvements`
- **Testing:** 100% pass rate (iteration_82: 11/11 backend, all frontend verified)

### Smart Match Refinements: Rerun Recommendations + School Comparison (DONE - March 10, 2026)
- **Rerun Recommendations**: Manual refresh button on both Dashboard (icon) and Find Schools (text button). Shows "Updated [date]" timestamp. Profile change detection: if athlete updates GPA/scores/regions/priorities, a yellow banner prompts "Profile updated — refresh to see new recommendations" with one-click refresh. Backend stores `smart_match_runs` collection with `profile_hash` for change detection.
- **School Comparison**: Checkboxes on smart match cards (2-3 max). "Compare (N)" button opens side-by-side CompareDrawer. Cards show school name, score, fit label. 5-category horizontal bars with best score highlighted. Strengths and improvements per school. "Add to Pipeline" and "Details" actions per school.
- **New endpoint**: `GET /api/smart-match/status` — lightweight check for last_refreshed + profile_changed
- **New component**: `/app/frontend/src/components/CompareDrawer.js`
- **Testing:** 100% pass rate (iteration_84: 15/15 backend, all frontend verified)

### Multi-Tenant Organization Architecture (DONE - March 10, 2026)
- **Data Model**: `organizations` (id, name, slug, plan, billing), `athlete_user_links` (athlete_id, user_id, relationship_type, permissions), `org_invites` (codes for joining orgs). Users/athletes have nullable `org_id`.
- **Role Standardization**: `platform_admin` (superadmin, no org), `director` (club admin), `club_coach` (hard-renamed from coach), `athlete`, `parent`. College coach remains a KB data entity, not a user role.
- **Access Control** (`org_access.py`): Org-scoped queries, cross-org guards, per-athlete access checks. Platform admin bypasses all org checks.
- **Organizations CRUD** (`/api/organizations`): Create/list/get/update orgs, invite codes, join via code, athlete-user links.
- **Independent Families**: Athletes/parents with null `org_id` can use all features without a club.
- **Global KB**: University knowledge base remains global (not org-scoped).
- **Migration**: Idempotent startup: coach→club_coach rename, platform_admin creation, org_id backfill, athlete_user_links backfill.
- **Testing:** 100% pass rate (iteration_85: 24/24 backend, 6/6 frontend)

## Credentials
- **Platform Admin:** douglas@capymatch.com / 1234
- **Director:** director@capymatch.com / director123
- **Club Coach (Williams):** coach.williams@capymatch.com / coach123
- **Club Coach (Garcia):** coach.garcia@capymatch.com / coach123

### Stripe Customer Portal Verification (DONE - March 10, 2026)
- **Backend**: `POST /api/checkout/create-portal-session` creates Stripe billing portal session; requires `stripe_customer_id` on user doc
- **Access Control**: Returns 400 "No billing account found" for users without Stripe customer ID; 401 for unauthenticated requests
- **Frontend**: "Billing Portal" button gated to paid users only (`tier !== "basic"`); hidden for basic/free tier
- **Cancel/Reactivate**: Both endpoints properly validated (basic tier blocked from cancel, no-pending blocked from reactivate)
- **Billing History**: Loads and displays transaction table with date, plan, amount, status
- **Testing:** 100% pass rate (iteration_86: 15/15 backend, 8/8 frontend)

### Director-Specific Actions V1 (DONE - March 10, 2026)
- **Action Types**: `review_request` (Request Coach Review) and `pipeline_escalation` (Escalate Pipeline Risk)
- **Lightweight Lifecycle**: open -> acknowledged -> resolved. Directors see whether coaches saw and handled actions.
- **Backend**: 5 endpoints under `/api/director/actions` — create, list (with summary), per-athlete, acknowledge, resolve
- **List Summary**: `total_open`, `open_critical`, `open_warning`, `acknowledged`, `resolved_recently` for UI grouping
- **Preset Reasons**: Review (pipeline_stalling, high_value_recruit, scholarship_deadline, needs_guidance, other); Escalation (overdue_followups, no_responses, momentum_drop, deadline_risk, other)
- **Risk Levels**: Escalations require `warning` or `critical`
- **Access Control**: Directors create, coaches acknowledge/resolve. Coaches only see actions assigned to them. Athletes blocked (403).
- **Frontend — 3 integration points**:
  - `AthletePipelinePanel`: Director sees "Request Review" + "Escalate" buttons; Director Action Modal with reason picker + note; `AthleteActionsSection` shows active actions with coach Acknowledge/Resolve CTAs
  - `DirectorActionsCard`: Mission Control card for both directors (actions they created) and coaches (actions assigned). Collapsible resolved section. Status summary in header.
  - Coach-facing views prioritize open + acknowledged items; resolved collapsed at bottom.
- **Notifications**: Create -> coach, Acknowledge -> director, Resolve -> director (via existing `create_notification` system)
- **Staff-only**: Not exposed to athlete/family users. No threading, reminders, or complex workflows in V1.
- **New files**: `/app/backend/routers/director_actions.py`, `/app/frontend/src/components/mission-control/DirectorActionsCard.js`
- **Modified files**: `AthletePipelinePanel.js`, `DirectorView.js`, `CoachView.js`, `connected.py` (added primary_coach_id), `models.py`, `server.py`
- **Testing:** Backend 100% (23/23), Frontend 90% (9/10 — director buttons conditional on primary_coach_id, verified working)

### Director Actions Pulse Widget (DONE - March 10, 2026)
- Compact summary widget in Director Mission Control showing Open, Critical, Ack'd, Resolved This Week
- Context-aware one-line insight (e.g., "3 critical items still waiting on coach response" or "Coach responsiveness is healthy this week")
- Border color shifts based on urgency (red for critical, amber for open, default for clear)
- New file: `/app/frontend/src/components/mission-control/DirectorActionsPulse.js`

### User Onboarding Flow (DONE - March 11, 2026)
- **Volleyball Quiz**: 6-question onboarding quiz (position, division, priorities, regions, academics, academic interests) replicated from legacy capymatch repo
- **Quiz Completion**: Shows profile summary card with top suggested matches and "Start Recruiting" CTA
- **Pipeline EmptyBoardState**: Rich 3-step guided experience on the Pipeline page for athletes with no programs:
  - Step 1: Complete Profile (checks 6 essential fields: name, grad year, position, height, city/state, club/HS)
  - Step 2: Connect Gmail (with consent modal and OAuth flow)
  - Step 3: Add Schools (with AI suggestions grid and "Find Schools" button)
  - Ghost board preview showing what the pipeline will look like
- **Auto-redirect**: New athletes are redirected to `/onboarding` on login. After quiz, they go to `/pipeline` which shows the EmptyBoardState
- **Backend fixes**: Registration creates athlete doc for new users; onboarding-status returns `completed: false` (not 404) for new athletes; demo data not seeded for new accounts
- **Robustness**: Fixed KeyError crashes in decision_engine, mock_data, support_pod, program_engine, advocacy_engine for athletes without computed fields
- **New file**: `/app/frontend/src/components/onboarding/EmptyBoardState.js`
- **Modified files**: `auth.py` (registration), `athlete_onboarding.py` (status endpoint), `PipelinePage.js`, `decision_engine.py`, `mock_data.py`, `support_pod.py`, `program_engine.py`, `advocacy_engine.py`
- **Testing:** 8/8 backend, 1/1 E2E frontend (iteration_88)

## P0 In Progress
- User Onboarding Flow: DONE

## P1 Upcoming
- Smart Match recommendation history (timeline of past runs with score deltas)

## P2 Future/Backlog
- Smart Match Later Phases (deeper LLM reasoning, roster/need intelligence, coach engagement signals)
- Smart Match recommendation history (timeline of past runs with score deltas)
- Coach Scraper Health Report V1 (dashboard health card, weekly digest, stale/missing/failure signals, one-click re-scrape)
- Full Admin Users page (user management, plan changes)
- Full Admin Subscriptions page (subscription management with audit log)
- Advanced Features & Parent Experience (family experience)
- Multi-agent intelligence pipeline (NIL readiness, roster stability, scholarship analysis)
- Community contributions & import analytics
- Engagement analytics
