# CapyMatch — Product Requirements Document

## Original Problem Statement
CapyMatch is a React + FastAPI + MongoDB athlete pipeline management tool for college-bound student-athletes. The platform helps athletes manage their recruiting pipeline, track coach engagement, and make data-driven decisions about which schools to pursue.

## Core Architecture
- **Frontend**: React (CRA) + TailwindCSS + Shadcn/UI
- **Backend**: FastAPI + MongoDB (Motor async driver)
- **AI**: Claude Sonnet via Emergent LLM Key
- **Auth**: JWT-based custom authentication

## What's Been Implemented

### Coach Watch V2 — Unified Intelligence Card (Mar 22, 2026)
- **New endpoint**: `POST /api/ai/auto-insight` — computes Coach Watch state + calls LLM for explanation
- **Response contract**: `{ state, headline, recommended_action, recommended_action_text, confidence, ai: { insight, urgency }, signals[] }`
- **Caching**: Per (athlete + school) with 2hr TTL, invalidated on new interactions/replies/follow-ups
- **Updated existing endpoints**: `ai/next-step` and `ai/journey-summary` now inject Coach Watch context (state, headline, recommended_action, confidence, signals) into LLM prompts
- **LLM Rule**: "Explain, don't decide" — AI aligns with Coach Watch, never contradicts
- **New component**: `CoachWatchCardV2.js` — unified card replacing old CoachWatchCard + separate AI buttons
- **Layout**: Status Chip + Confidence → Headline → Recommended Action → AI Insight → Why Signals
- **Motion**: Skeleton shimmer on load, fade-in + de-blur for AI insight
- **Testing**: 100% pass rate (iteration_236)

### Event Signal in Journey Timeline (Mar 22, 2026)
- Backend fetches `athlete_notes` tagged `event_signal`, renders as `coach_signal` in timeline
- Frontend `ConversationBubble.js` renders blue center-aligned bubbles with Radio icon

### Coach Photo Upload (Mar 22, 2026)
- `POST /api/profile/photo` endpoint for base64 photo upload
- Clickable avatar on coach profile page with camera hover overlay
- Photo propagates to sidebar + top bar via auth context

### Notification Redirect Fix (Mar 22, 2026)
- Fixed `action_url` from non-existent `/my-schools` to `/messages`

### Preview Public Profile Fix (Mar 22, 2026)
- Backend accepts `staff_preview` param to bypass published check
- Frontend forwards `?staff_preview=true` to API call

### Previous Session Work (Completed)
- Breakdown Drawer refinement (progressive reveal, AI narrative)
- Live Event Capture V2 (full-screen, multi-select, Live Impact Panel)
- Event Summary "Post-Tournament Control Center"
- SchoolPod mobile responsiveness
- Event Signal data routing (pipeline priority + journey tasks)

## Prioritized Backlog

### P1 — Upcoming
- "Next best move" fallback card when no schools are heroEligible
- CSV Import Tool for bulk school/coach data
- Bulk Approve Mode in Director Inbox
- Refactor `SchoolPod.js` (1000+ line component)

### P2 — Future
- Parent/Family Experience
- AI-Powered Coach Summary
- Club Billing (Stripe)
- Multi-Agent Intelligence Pipeline
- Cross-school AI prioritization ("2 need attention now, 1 safe to wait")

## Key API Endpoints
- `POST /api/ai/auto-insight` — Unified Coach Watch + AI insight (cached)
- `POST /api/ai/next-step` — AI next step (Coach Watch aligned)
- `POST /api/ai/journey-summary` — AI journey summary (Coach Watch aligned)
- `GET /api/athlete/programs/{program_id}/journey` — Timeline events
- `POST /api/events/{event_id}/signals` — Live event signals
- `POST /api/profile/photo` — Coach photo upload
- `GET /api/public/profile/{slug}` — Public athlete profile

## Key Files
- `/app/backend/routers/ai_features.py` — All AI endpoints
- `/app/backend/routers/athlete_dashboard.py` — Coach Watch engine, journey timeline
- `/app/frontend/src/components/journey/CoachWatchCardV2.js` — Unified intelligence card
- `/app/frontend/src/pages/athlete/JourneyPage.js` — Journey page
- `/app/frontend/src/pages/ProfilePage.js` — Coach profile with photo upload

## Test Credentials
- **Athlete**: emma.chen@athlete.capymatch.com / athlete123
- **Director**: director@capymatch.com / director123

## 3rd Party Integrations
- OpenAI/Claude via Emergent LLM Key
- Stripe (Payments) — requires User API Key
