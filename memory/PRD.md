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
