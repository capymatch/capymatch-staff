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

### Pipeline Strict Layout & Font Unification (Mar 2026)
- **Status**: COMPLETE & VERIFIED (15/15 frontend tests pass, 100% success, iteration_210)
- Rewrote `PriorityBoard.js` with strict 3-group structure:
  - **ACT NOW** (red accent `#ef4444`): high-priority cards with reason + action + View CTA
  - **KEEP MOMENTUM** (orange accent `#f59e0b`): medium-priority cards with reason + action
  - **MONITOR** (green `#10b981`): compact collapsible rows for on-track programs
- Section header: "WHAT TO DO NEXT" above all 3 groups
- Unified fonts across all pipeline components to match app global:
  - Removed all hardcoded `fontFamily: '-apple-system, SF Pro Text, ...'` inline overrides
  - Body text now inherits **Inter** from `index.css`
  - Headings now inherit **Manrope** from `index.css`
- White cards, light UI, subtle shadows, max font-weight 500 for body text
- Layout hierarchy: Header → Hero Card → Momentum Insight → What to do next → Pipeline List
- Files modified: `PriorityBoard.js`, `PipelineHero.js`, `MomentumInsight.js`, `PipelineList.js`, `PipelinePage.js`

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
- GET /api/internal/programs/top-actions — Priority actions

## File Structure
```
frontend/src/
  lib/reinforcement.js          — Feedback logic engine
  lib/computeAttention.js       — Risk/attention computation
  components/reinforcement/
    ParticleBurst.js             — Particle animation
    ReinforcementToast.js        — Dark glass toast (portal)
  components/pipeline/
    PriorityBoard.js             — Priority view with swipe cards
    KanbanBoard.js               — Pipeline drag-and-drop view
    SwipeableCard.js             — Swipe interaction handler
  pages/athlete/
    PipelinePage.js              — Main pipeline page
    ProfilePage.js               — Profile with onboarding banner
  pages/LoginPage.js             — Login with demo accounts
backend/
  seed_fresh.py                  — Database seeding
  routers/athlete_onboarding.py  — Onboarding endpoints
```
