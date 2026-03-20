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

## Upcoming Tasks (P1)
- CSV Import Tool for bulk school/coach data
- Bulk Approve Mode for Director Inbox
- Refactor DirectorInbox.js (700+ lines)
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
