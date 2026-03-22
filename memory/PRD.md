# CapyMatch — Product Requirements Document

## Original Problem Statement
CapyMatch is an athlete pipeline management tool (Recruiting Operating System) with a React frontend, FastAPI backend, and MongoDB. It supports multiple user roles: Athletes, Directors, and Coaches, with a sophisticated "Risk Engine v3" driving prioritization.

## Core Architecture
- **Frontend**: React (CRA) with Shadcn/UI components
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Key Libraries**: @hello-pangea/dnd (drag-and-drop), sonner (toasts), lucide-react (icons)

## User Roles & Credentials
- **Athlete (Full Data):** emma.chen@athlete.capymatch.com / athlete123
- **Director:** clara.morgan@director.capymatch.com / director123
- **Coach:** coach.williams@capymatch.com / coach123

## Completed Features

### Priority Board Redesign
- Rich, elevated cards with clear status indicators and contextual actions
- Swipeable cards with right-swipe (action) and left-swipe (snooze)
- Three priority sections: Next Actions (high), Coming Up (medium), On Track (low)

### Journey Page Light Theme (Mar 2026)
- **Status**: COMPLETE & VERIFIED (18/18 frontend tests, iteration 231)
- Converted Journey page from dark theme to Pipeline-matching light design
- Header card: white with teal accent bar, dark text
- PrimaryHeroCard: white with colored left accent border
- ProgressRail: light track, colored stage dots
- RadarStrip: white with subtle border
- FloatingActionBar: white pill with teal Email CTA
- Sidebar cards: CSS variables already light, no changes needed
- No logic/data changes — purely visual
- Enhanced Pipeline Summary card: headline, 3 status chips (live data), 1-2 momentum signals (risk + positive), "View full breakdown →" CTA
- New right-side BreakdownDrawer: Pipeline Narrative (AI), Momentum Breakdown (gaining/cooling/holding), Per-School Explanation (max 3 reasons, plain language), Coaching Insights (max 3), freshness timestamp
- Design principle: Main page = action, Drawer = explanation
- No scoring logic changed
- Replaced deterministic attention-engine items with AI-generated recommendations from `/api/athlete/momentum-recap` priorities
- Single unified list with tier badges: NEEDS YOUR ATTENTION NOW (red), SECONDARY (orange), WATCH (gray)
- Cards show: colored left borders, tier-specific icons (AlertCircle/ChevronRight/Eye), action title, reason, urgency note
- "Where you're gaining traction" section: Heated Up + Holding Steady momentum groups with stage labels
- "What's driving your pipeline right now" section: AI insight bullet points
- Matches user-provided design spec exactly

### Loop Analytics Instrumentation (Feb 2026)
- **Status**: COMPLETE & VERIFIED (9/9 backend, 14/14 all events)
- Frontend: trackEvent() with 5s batch flush (analytics.js)
- Backend: POST /api/analytics/events (batch ingest), GET /api/analytics/loop-metrics (aggregation)
- Events: hero_viewed, hero_expanded_why, hero_action_clicked, reinforcement_shown, recap_teaser_viewed, recap_opened, recap_section_viewed, recap_priority_clicked
- Metrics: hero_click_rate, why_expand_rate, avg_time_to_action, priority_source_breakdown, completions_by_source, actions_after_why_expand
- Collection: loop_analytics in MongoDB
- Files: loop_analytics.py, analytics.js + instrumentation in PipelineHero, ReinforcementToast, RecapTeaser, RecapPage

### Loop Polish Pass (Feb 2026)
- **Status**: COMPLETE & VERIFIED (13/13 frontend tests)
- Hero wording: concise merged copy ("Overdue 3d — also your recap's top focus")
- Priority source tracking: "live", "recap", or "merged" drives hero position
- Reinforcement continuity: recap-aware messages ("Recap priority handled", "Top priority cleared")
- "Why this?" expandable: colored factor dots (red=overdue, purple=recap, blue=stale), auto-collapse on slide
- explainFactors array in attention results for structured explainability

### Recap → Hero Card Integration (Feb 2026)
- **Status**: COMPLETE & VERIFIED (100% all tests)
- computeAttention.js: Recap Top Priority boosts score +65, Secondary +25, Watch +5
- Freshness decay: full weight ≤3d, 75% ≤7d, 40% ≤14d, 0 after 14d
- Hero Card shows recap-driven action text + purple reason subtitle
- Live urgent blockers (overdue, coach flags) override recap priorities
- RecapTeaser receives pre-fetched data (no double API call)
- Full loop connected: Recap → Hero → Action → Reinforcement

### Momentum Recap (Feb 2026)
- **Status**: COMPLETE & VERIFIED (19/19 backend, 14/14 frontend)
- Post-event analysis: Recap Hero, Momentum Shift (Heated/Steady/Cooling), Priority Reset (Top/Secondary/Watch), AI narrative
- Time window: Since last past event, fallback 7 days
- Entry points: RecapTeaser card on pipeline (Priority view only) + full /recap page
- AI used only for narrative — all data computed from structured DB
- Stored in momentum_recaps collection for Hero Card integration
- Files: momentum_recap.py, RecapPage.js, RecapTeaser.js

### Hero Carousel Touch Swipe (Feb 2026)
- **Status**: COMPLETE & VERIFIED
- Added touch swipe support to PipelineHero carousel
- Swipe left → next card, swipe right → prev card
- 50px threshold with vertical rejection to prevent accidental triggers

### AI Draft Email Fix (Feb 2026)
- **Status**: COMPLETE & VERIFIED
- Fixed "Please set up your athlete profile first" error — AI features now query `athletes` collection instead of empty `athlete_profiles` collection
- Fixed JSON parsing of LLM responses with unescaped quotes (e.g. 5'10") via regex fallback
- All 4 AI endpoints fixed: draft-email, next-step, journey-summary, school-insights

### Athlete Profile Photos (Feb 2026)
- **Status**: COMPLETE & VERIFIED
- Seeded 10 athletes with Unsplash headshot photos (face-cropped)
- Photos now show in: Events Home avatars, Live Event Capture chips, Athlete Profile page
- Upload flow: Profile page → click photo → file picker → base64 upload → stored in athletes collection
- Seed script updated with photo URLs for future re-seeds

### Mobile Kanban Card Redesign (Feb 2026)
- **Status**: COMPLETE & VERIFIED
- Combined status + timing into single line ("Needs attention · 3d overdue")
- Owner tag moved to compact inline badge in header row (saves full row)
- Improved card padding (12px 14px on mobile vs 9px 10px before)
- Better border radius (12px cards, 10px columns on mobile)
- Wider mobile columns (280px vs 256px)
- Last activity row hidden on mobile to reduce card height
- Cards reduced from 5-6 content rows to 3 rows

### Action Reinforcement System (Feb 2026)
- **Status**: COMPLETE & VERIFIED
- Event-driven feedback on task completion (swipe) and stage changes (drag-and-drop)
- ParticleBurst animation: soft glow + particle burst on relevant card
- ReinforcementToast: dark glass toast at bottom-center with colored indicator dot
- Context-aware messages tied to Hero Card priority system
- Debounced event bus prevents rapid-fire feedback
- Files: reinforcement.js, ParticleBurst.js, ReinforcementToast.js

### Onboarding Flow
- Persistent banner on profile page guiding new users to pipeline setup
- Fixed onboarding quiz bug (auto-create athlete record)

### Data Seeding
- Comprehensive seed_fresh.py with 10+ realistic athlete profiles
- All athletes upgraded to Premium subscription tier
- Consistent interactions data for journey UI

### Demo Account Access
- One-click demo account buttons on login page for all key roles

### Stale Recap Freshness Indicator (Feb 2026)
- **Status**: COMPLETE & VERIFIED (6/6 checkpoints, frontend screenshots confirmed)
- When recap freshness < 75%, "Why this?" factors show staleness: *"Top priority in Momentum Recap (fading — 40% weight)"*
- New factor type `recap-stale`: italic, dimmed purple, same secondary styling as `recap-outranked`
- Freshness schedule: 0-3d=100%, 4-7d=75%, 8-14d=40%, 14d+=0%
- Files: `computeAttention.js` (freshness-aware factor labeling), `PipelineHero.js` (recap-stale styling)

### Recap-Outranked Explainability (Feb 2026)
- **Status**: COMPLETE & VERIFIED (13/13 frontend tests passed)
- When Hero Card is live-urgent AND a recap top priority exists for a different school, the "Why this?" panel now shows a secondary factor: *"Recap suggested {school} — this is more urgent"*
- Styled subtly: italic, 10px font, soft purple at 50% opacity (#a594f9), not visually dominant
- Logic: only fires when `prioritySource='live'` AND another program has `recapRank='top'` — does NOT fire for `merged` or `recap` sources
- Files: `computeAttention.js` (post-sort injection), `PipelineHero.js` (styled rendering)

### Loop Insights Dashboard (Feb 2026)
- **Status**: COMPLETE & VERIFIED (8/8 backend, 7/7 frontend)
- Admin-only panel at `/internal/loop-insights` (director + platform_admin)
- Backend: `GET /api/analytics/admin/loop-metrics` — aggregates ALL user events with `?days=` filter (7/14/30)
- Frontend: 5 sections — Core Loop Funnel, Source Comparison, Trust & Explainability, Reinforcement Effectiveness, Activity Trend
- Calm, premium design with metric cards, comparison bars, daily sparkline
- Time period toggle (7d/14d/30d) + manual refresh
- Empty state when no events exist
- Route protected — athletes redirected to `/board`
- Files: `loop_analytics.py` (admin endpoint + helper), `LoopInsightsPage.js`

### Behavioral Loop QA — All 6 Scenarios (Feb 2026)
- **Status**: COMPLETE & VERIFIED (all 6 scenarios pass)
- **Scenario 1**: Strong post-event momentum — recap boosts hero correctly
- **Scenario 2**: Live blocker overrides recap — `recap-outranked` UI indicator shown
- **Scenario 3**: Merged priority — live + recap converge on same school
- **Scenario 4**: Stale recap degraded by freshness — `recap-stale` UI indicator shown
- **Scenario 5**: No recap exists — system falls back gracefully to live-only signals
- **Scenario 6**: User ignores Hero and acts elsewhere — soft reinforcement ("Momentum building"), NO false hero-level praise ("Top priority handled")
- **Bug fixed in Scenario 6**: `isHeroPriority` now uses exact `programId === heroProgramId` instead of `attentionLevel === "high"`, preventing false praise leakage
- Test scripts: `/app/backend/tests/qa_scenario{1-6}_validate.py`

### Pipeline Premium Design Refactor (Feb 2026)
- **Status**: COMPLETE & VERIFIED (14/14 frontend tests pass, 0 issues)
- Applied new premium design system to the full pipeline page:
  - **Hero Card**: Navy gradient bg with teal/purple glow orbs, badge row (status/timing/why), 30px school name, inline dot progress track (6 stages), gradient CTA buttons
  - **Recap Teaser**: Dark gradient card, sparkle icon, 26px summary headline, trend pills (heated/steady/cooling), top priority callout
  - **Priority Board**: Glass cards with 22px radius, inset 4px accent borders (red=critical, orange=grow, gray=monitor), "ACT NOW"/"KEEP MOMENTUM" labels, gradient/secondary CTA buttons
  - **Page Header**: "RECRUITING INTELLIGENCE" eyebrow, 36px title, colored summary chips, glass toggle
  - **Committed Banner**: Gold gradient card with 22px radius
  - **Upcoming Tasks**: Glass card with 22px radius, icon badges
- New CSS: `pipeline-premium.css` (design tokens + utility classes)
- All business logic, data, interactions, API calls preserved

### Pipeline Production Spec Implementation (Mar 2026)
- **Status**: COMPLETE & VERIFIED (18/18 features pass, iteration_213, 100%)
- Implemented strict 5-section Priority view layout per user spec:
  1. **Header**: "Your recruiting right now" + plain text counts (no colored dots/badges)
  2. **Hero Card**: Carousel, filter pills, swipe ALL preserved. Removed "View details" + "Also" peek row. Added "WHERE YOU ARE IN THE PROCESS" rail label. [View School] + [Why this?] CTAs.
  3. **Momentum Insight**: Decision sentence + soft pills + "View full breakdown" CTA
  4. **What to do next**: ACT NOW (red) / KEEP MOMENTUM (orange) / MONITOR (neutral)
  5. **Pipeline List**: "All programs" — visually secondary
- **Priority/Pipeline toggle** preserved — Kanban board fully functional in Pipeline view
- Font: `-apple-system, SF Pro Text, Inter` — titles 600, body 400-500
- Files: `PipelineHero.js`, `PipelinePage.js`, `MomentumInsight.js`, `PriorityBoard.js`, `PipelineList.js`

### PipelineHero Restoration (Mar 2026)
- **Status**: COMPLETE & VERIFIED (100% frontend all 12 features, iteration_224)
- Restored original PipelineHero component (dark navy gradient, filter pills, carousel, journey rail, badges, CTAs)
- Hero school (Emory) excluded from "Next actions" list (deduplication maintained)
- Flow: Context → Hero → Next actions → Keep things moving → Just keep an eye

### Dark Hero + Next Actions Refactor (Mar 2026)
- **Status**: COMPLETE & VERIFIED (100% frontend all 12 features, iteration_223)
- Dark navy hero card = sole representation of top priority (Emory)
- "Act now" section removed, replaced by inline dark hero card
- "Next actions" section for remaining urgents (Stanford, Florida) — hero excluded
- Flow: Context → Hero → Next actions → Keep things moving → Just keep an eye
- No duplication between hero and lists
- Files: `PriorityBoard.js` (new HeroPriorityCard component, filtered high list)

### Primary Card Emphasis (Mar 2026)
- **Status**: COMPLETE & VERIFIED (100% frontend all 10 features, iteration_222)
- Top priority card: 5px border, red bg tint (0.02), 24px padding, 17px title, 15px action text
- Added "This is your most important action right now" context line with subtle separator
- Secondary cards: standard 3px border, white bg, 18px padding, 15px title, no context line
- Visual hierarchy instantly recognizable: Primary > Secondary > Monitor

### Hero+Pipeline Unification (Mar 2026)
- **Status**: COMPLETE & VERIFIED (100% backend 10/10, 100% frontend, iteration_221)
- Removed PipelineHero from render — top priority now the first card in pipeline with prominent styling
- Moved MomentumInsight ("What changed since your last update") to top as context layer
- New flow: Context → Top priority (prominent: red tint, 4px border, 22px padding, badges row) → Next actions → Supporting → Monitor
- No duplication between context and pipeline cards
- Section: "YOUR PIPELINE" → Act Now → Keep things moving → Just keep an eye
- Files: `PipelinePage.js`, `PriorityBoard.js`, `MomentumInsight.js`

### Pipeline Card Redesign (Mar 2026)
- **Status**: COMPLETE & VERIFIED (100% backend 10/10, 100% frontend, iteration_220)
- Removed system language ("Flagged in recap", "No action needed" → "On track", human guidance)
- Stronger action copy: "Overdue 4d" → "4 days overdue" badge + "No response for 4 days — send a follow-up now"
- Fixed contradictions: no "On track" + "Follow up" on same card
- Card structure: school name + stage context + ONE status + ONE action + "View school →" CTA
- Section labels: "Act now", "Keep things moving", "Just keep an eye"
- Stage context under progress rail: "Outreach — waiting for response", "Talking — momentum building", etc.
- Files: `computeAttention.js`, `PriorityBoard.js`, `KanbanBoard.js`, `PipelineHero.js`

### Recap Page Release Polish (Mar 2026)
- **Status**: COMPLETE & VERIFIED (100% backend 30/30, 100% frontend, iteration_219)
- Confidence signal: teal dot + more visible text (rgba 0.40)
- Top priority label: "Needs your attention now" (human, not robotic)
- Spacing: +8px between summary card and next moves section
- Insight card: lighter bg (0.45 opacity), smaller text (12px bullets, 10px title)
- Action verbs standardized: Re-engage / Follow up with / Keep pushing / Monitor

### Recap Page Production Finalization (Mar 2026)
- **Status**: COMPLETE & VERIFIED (100% backend 25/25, 100% frontend, iteration_218)
- Section label: "Your next moves" (replaced "WHAT TO DO")
- Top priority border: softer rgba(239,68,68,0.55) instead of solid red
- Arrows (→) only on actionable items — removed from Watch card
- Watch reason: "Check in within the next few days to maintain momentum"
- Emory insight bullet emphasized (darker #334155, fontWeight 500)
- "Confidence: High" trust signal added under hero summary

### Recap Page Production Polish (Mar 2026)
- **Status**: COMPLETE & VERIFIED (100% backend 24/24, 100% frontend, iteration_217)
- Title: "Re-engage Emory University" (removed redundant "with")
- Top priority: 3-line hierarchy — action (bold) → instruction (timeframe) → reinforcement (gray italic)
- Secondary reasons: cleaned redundant context prefixes (just the instruction)
- Section label: "Where you're gaining traction" (replaced "MOMENTUM SHIFT")
- Insight bullets: contextual per school ("through active conversations", "after being recently added")
- Urgency note: soft gray italic (#94a3b8) — coaching tone, not alarming

### Recap Page Final Polish (Mar 2026)
- **Status**: COMPLETE & VERIFIED (100% backend 20/20, 100% frontend, iteration_216)
- Hero names specific school ("...but Emory University requires immediate attention")
- Biggest shift: conversational ("Emory University has gone quiet (9 days)")
- Top priority: specific timeframe reason + urgency note ("This is your most important action right now")
- Secondary actions: contextual variations (no repeated phrasing across cards)
- Momentum guidance: varied per item (visit→"Keep conversation active", new→"Send first follow-up", active→"Follow up within 48 hours")
- Insight title: "What's driving your pipeline right now" (replaced generic "INSIGHT")
- Visual: Priority cards 5px border + 20px padding (strongest), Momentum 2px + 10px (lightest)

### Recap Page Content Architecture Refinement (Mar 2026)
- **Status**: COMPLETE & VERIFIED (100% backend 16/16, 100% frontend, iteration_215)
- Eliminated duplication: Top priority school excluded from Momentum Shift
- Reordered sections: Summary → Priority Reset (What To Do) → Momentum Shift → AI Insight
- New hero: Action-oriented headline + "Biggest shift" callout
- Priority Reset: Strongest visual weight (4px border, bold action text, arrow reasons)
- Momentum Shift: Lighter cards, action guidance text (e.g., "Follow up within 48 hours")
- AI Insight: Converted from paragraph to data-driven bullet points (no LLM dependency)
- Backend: Added `biggest_shift`, `ai_insights` (array), `top_priority_program_id`, `action_guidance` fields
- Removed LLM call from recap computation (instant response, no 8s latency)
- Files: `momentum_recap.py`, `RecapPage.js`

### Recap Page Premium Redesign (Mar 2026)
- **Status**: COMPLETE & VERIFIED (100% backend 12/12, 100% frontend desktop+mobile, iteration_214)
- Applied same premium design system as Pipeline page to RecapPage.js:
  - Hero: Navy gradient card with teal glow orb, "PIPELINE SUMMARY" eyebrow, stat counters
  - Momentum Shift: White cards with colored left-border accents (orange=heated, gray=steady, blue=cooling)
  - Priority Reset: Icon-badged cards with rank labels (Top Priority, Secondary, Watch)
  - AI Insight: White card with teal sparkle icon and full narrative
- Sticky header with blur backdrop, back navigation to /pipeline
- All logic preserved: API fetch, click handlers, analytics tracking, IntersectionObserver section tracking
- Mobile responsive at 390px width verified
- Files: `RecapPage.js`

### Momentum Recap Caching (Feb 2026)
- **Status**: COMPLETE & VERIFIED
- Root cause: `GET /api/athlete/momentum-recap` called Claude LLM (~8s) on every pipeline page load
- Fix: Cache full recap response in `momentum_recaps` collection. Return cached version if same event period and < 60 minutes old
- Added `POST /api/athlete/momentum-recap/refresh` for manual cache bypass
- Pipeline page load: **8.3s → 1.35s** (6x improvement)

### DirectorInbox Refactor (Feb 2026)
- **Status**: COMPLETE & VERIFIED (screenshot confirmed, 0 regressions)
- Split 801-line monolith into 6 focused modules:
  - `DirectorInbox.js` (203 lines) — orchestrator: data fetching, layout, CSS
  - `inbox-utils.js` (162 lines) — constants (NUDGE_MAP, TRAJECTORY), helpers (getNudge, generateWhy, scoreItem, ctaWithContext, buildTitle)
  - `TopPriorityCard.js` (187 lines) — featured priority card with autopilot CTA
  - `ComposeModal.js` (129 lines) — dark glass compose modal
  - `InboxRow.js` (99 lines) — inbox row + group label
  - `TrajectoryHint.js` (15 lines) — shared trajectory indicator
- Default export unchanged — `DirectorView.js` required zero changes

### Coach Signals Activation (Mar 2026)
- **Status**: COMPLETE & VERIFIED (18/18 backend, 100% frontend, iteration_225)
- **Root cause**: Coach signals code was 100% present (identical to capymatch-staff repo) but appeared dead due to 3 data/parsing issues
- **Fix 1**: `top_action_engine.py` — ISO timestamps (`2026-03-17T20:51:37+00:00`) were failing `strptime('%Y-%m-%d')`. Fixed by extracting first 10 chars (`next_due[:10]`)
- **Fix 2**: Seed data `pod_actions` lacked `assigned_to_athlete: True` — added to all ready/open actions
- **Fix 3**: No `coach_flags` documents existed — added 4 realistic flags (Emma: Emory reply_needed + Stanford strong_interest, Ava: UGA followup_overdue, Isabella: Texas A&M review_school)
- Now active priority levels: P1 coach flags, P2 coach assigned actions, P3 director actions, P4 overdue follow-ups, P6 first outreach
- Files: `top_action_engine.py` (date parsing fix), `seed_fresh.py` (coach flags + assigned_to_athlete)
- **Analysis**: The `capymatch-staff` repo and this repo share identical backend/frontend code for coach signals. The only file differences are in files we've customized (PipelinePage, RecapPage, computeAttention, etc.)

### Attention System Overhaul — Classification Integrity (Mar 2026)
- **Status**: COMPLETE & VERIFIED (100% — 9/9 tests, iteration_226)
- **Problem**: Hero carousel was absorbing medium-tier items, leaving "Keep things moving" empty. UI broke classification integrity.
- **Solution**: Expanded SchoolAttention model with `tier`, `heroEligible`, `urgency`, `momentum`, `hardTriggers`, `reasons`
- **Classification logic**:
  - `tier = 'high'` if overdue || coachFlag || escalation || score >= 80; `'medium'` if score >= 40; else `'low'`
  - `heroEligible` = overdue || dueSoon (72hrs) || coachFlag || escalation || score >= 80
  - Hero carousel ONLY shows heroEligible items (max 3, never medium-tier filler)
  - "Keep things moving" ALWAYS shows medium-tier items
  - "Just keep an eye" shows low-tier items (collapsed if > 4)
- **Scoring updates**: Added `daysUntil 4-7 → +15`, `outreach stage → +5`, fallback `board_group` for missing `journey_stage`
- **Seed fixes**: Spread due dates by priority (Top Choice → 3d, stale 5+ → 5d, stale 3+ → 7d, else 10d) instead of defaulting all to from_now(3)
- **Dynamic summary**: "Emory University and Stanford University need action first" (names pulled from actual high-tier items)
- **Files**: `computeAttention.js`, `PipelinePage.js`, `PriorityBoard.js`, `PipelineHero.js`, `MomentumInsight.js`, `seed_fresh.py`

### Attention UI Refinement — Clarity, Hierarchy, Trust (Mar 2026)
- **Status**: COMPLETE & VERIFIED (100% — 14/14 frontend tests, iteration_227)
- Hero card: visible reason stack (top 3), calm factual subtext, verb-first action ("Reply Now — Emory"), coach flag priority over recap text
- Medium cards: ranked accent bar (stronger = higher), "Next best move" label on rank 0, time-based actions ("Follow up in 7 days"), momentum signal ("Talking · Steady momentum")
- Section hierarchy: +24px hero spacing, passive low-tier (reduced opacity, link-style CTA, smaller font), removed strong borders
- Summary card: "You're in a good position — 2 schools need attention" + breakdown pills (needs attention / follow-up soon / on track) + insight naming urgent schools
- Carousel dot indicators, hover elevation on medium cards, standardized language (Follow up now / Follow up in X days / No action needed)
- Files: `computeAttention.js`, `PipelineHero.js`, `PriorityBoard.js`, `MomentumInsight.js`

### Pipeline + Recap Merge — Unified Page (Mar 2026)
- **Status**: COMPLETE & VERIFIED (100% — 10/10 tests, iteration_228)
- Merged Pipeline Priority and Momentum Recap into a single unified page
- **Architecture**: Live layer (computeAttention.js) = source of truth for scoring/tiers/hero. AI layer (recap API) = explanation only.
- **Page structure**: [1] Live Summary → [2] Hero Card → [3] Keep things moving → [4] Just keep an eye → [5] What changed recently (AI) → [6] AI coaching insights (AI)
- /recap now redirects to /pipeline (standalone Recap page removed from navigation)
- AI sections show freshness timestamp ("Insights updated Xh ago")
- No duplication: live sections decide placement, AI sections explain context
- Files: `PipelinePage.js`, `MomentumInsight.js` (now pure live), `PriorityBoard.js` (added AI sections), `App.js` (redirect)

### Breakdown Drawer Refinement (Mar 2026)
- **Status**: COMPLETE & VERIFIED (100% — 8/8 backend, 16/16 frontend, iteration_232)
- Narrative section now uses `recap_hero` + `biggest_shift` + period context (no duplication with insights)
- Backend `_build_insight_bullets` generates coaching-focused actionable tips instead of status descriptions
- Progressive reveal shows 3 schools initially (up from 2), with "Show N more" toggle
- Max 3 coaching insights (pattern observation, risk mitigation, strategic guidance)
- No system terminology ("score", "priority factor") exposed in UI
- Stagger animations (slide-in panel, staged content reveal, expand animations)
- Files: `BreakdownDrawer.js`, `momentum_recap.py`

### Live Event Full-Screen Mode (Mar 2026)
- **Status**: COMPLETE & VERIFIED (screenshot confirmed)
- Live Event Capture page (`/events/:id/live`) now launches in full-screen mode (no sidebar/topbar)
- Added hamburger menu (☰) toggle in header → slide-out navigation overlay with key pages (Dashboard, Events, Event Prep, Roster, Advocacy, Insights)
- Overlay dismissible via X button or backdrop click, with slide-in/fade animations
- Route set to `useLayout={false}` for auto full-screen on entry
- Files: `App.js` (route config), `LiveEvent.js` (nav overlay + menu toggle)

## Upcoming Tasks (P1)
- CSV Import Tool for bulk school/coach data
- Bulk Approve Mode for Director Inbox
- Refactor SchoolPod.js (1000+ lines)

## Future/Backlog Tasks (P2)
- Parent/Family Experience
- AI-Powered Coach Summary
- Club Billing (Stripe)
- Multi-Agent Intelligence Pipeline
- Kanban Keyboard Shortcuts

## Key API Endpoints
- POST /api/athlete/recruiting-profile — Onboarding quiz save
- GET /api/athlete/programs — Fetch pipeline programs
- PUT /api/athlete/programs/:id — Update program stage/status
- GET /api/athlete/tasks — Fetch tasks
- GET /api/internal/programs/top-actions — Priority actions (now returns real coach flags, overdue, etc.)
- GET /api/athlete/flags — Active coach flags for athlete
- POST /api/roster/athlete/{id}/flag-followup — Coach creates flag
- POST /api/athlete/flags/{flag_id}/complete — Athlete marks flag complete

## File Structure
```
frontend/src/
  lib/reinforcement.js          — Feedback logic engine
  lib/computeAttention.js       — Risk/attention computation (consumes coach_flag category from top-actions)
  components/reinforcement/
    ParticleBurst.js             — Particle animation
    ReinforcementToast.js        — Dark glass toast (portal)
  components/pipeline/
    PriorityBoard.js             — Priority view with swipe cards
    KanbanBoard.js               — Pipeline drag-and-drop view
    SwipeableCard.js             — Swipe interaction handler
  components/journey/
    heroOrchestrator.js          — Hero card priority system (coach tasks, flags, watch, overdue)
    CoachWatchCard.js            — Coach watch UI
    HeroCard.js (pipeline/)      — Dark hero card with coach_flag accent colors
  pages/athlete/
    PipelinePage.js              — Main pipeline page
    ProfilePage.js               — Profile with onboarding banner
  pages/LoginPage.js             — Login with demo accounts
backend/
  services/top_action_engine.py  — 8-priority cascade engine (coach flags → overdue → on_track)
  routers/coach_flags.py         — Coach flag CRUD endpoints
  seed_fresh.py                  — Database seeding (now includes coach flags)
  routers/athlete_onboarding.py  — Onboarding endpoints
```
