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
