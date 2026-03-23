# CapyMatch — Product Requirements Document

## Original Problem Statement
CapyMatch is a React + FastAPI + MongoDB athlete pipeline management tool for college-bound student-athletes. The platform helps athletes manage their recruiting pipeline, track coach engagement, and make data-driven decisions about which schools to pursue.

## Core Architecture
- **Frontend**: React (CRA) + TailwindCSS + Shadcn/UI
- **Backend**: FastAPI + MongoDB (Motor async driver)
- **AI**: Claude Sonnet via Emergent LLM Key
- **Auth**: JWT-based custom authentication

## What's Been Implemented

### P0 Cache Staleness Fix — Systemic Data Synchronization (Mar 23, 2026)
- **Problem**: `athlete_store.py` in-memory cache was not refreshed when athletes completed tasks, marked replies, sent follow-ups, or resolved blockers. Coach and Director dashboards showed stale/ghost data.
- **Fix**: Added `await recompute_derived_data()` to ALL write endpoints across the backend:
  - `athlete_dashboard.py`: create_interaction, mark_as_replied, mark_follow_up_sent, create_program, update_program, delete_program
  - `coach_inbox.py`: coach_escalate
  - `athletes.py`: assign_owner, send_message
  - `athlete_onboarding.py`: save_recruiting_profile
  - Previously patched: athlete_profile.py, school_pod.py, coach_flags.py, support_pods.py, director_actions.py, roster.py, invites.py
- **Testing**: 100% pass rate (iteration_237) — 11/11 backend tests + frontend verification

### Authentication & Security Hardening (Mar 23, 2026)
- **Refresh tokens**: Short-lived access tokens (1h) + long-lived refresh tokens (7d) with rotation. Frontend axios interceptor auto-refreshes on 401. `POST /api/auth/refresh` + `POST /api/auth/logout` endpoints.
- **Rate limiting**: IP-based rate limiting middleware — login (10/min), register (5/min), forgot-password (3/min), file upload (20/min). Uses X-Forwarded-For for proxy environments.
- **CORS**: Configurable via `CORS_ORIGINS` env var (default `*` for dev, lock to domain in production).
- **Input sanitization**: All user text (message body, subject) stripped of HTML tags via `bleach`. Prevents XSS.
- **File upload content validation**: Magic byte header checks for PDF/PNG/JPG/GIF + extension whitelist + python-magic MIME detection. Blocks disguised executables.

### File Upload in Messages (Mar 23, 2026)
- **Backend**: `POST /api/files/upload` (multipart, 10MB max, images/PDF/docs/CSV/TXT) + `GET /api/files/{file_id}/download`
- **Storage**: Emergent Object Storage via `services/storage.py`
- **Messages**: `attachments` array added to reply and send models — stored as `[{file_id, filename, content_type, size}]`
- **Frontend**: Paperclip button in reply box, file preview chips before send, `AttachmentBubble` in messages with click-to-download
- **Verified**: All 3 roles (athlete, coach, director), upload/download/validation/display — 16/16 backend + all frontend tests pass

### Pipeline & Journey UI Refinements (Mar 23, 2026)
- Pipeline summary rewritten: action-driven ("Emory needs immediate attention — 5 others need follow-up") instead of generic counts
- Hero card refined: "Follow up with X now" action, merged context line, COACH WAITING chip, risk context, action-aligned CTA
- Vertical "Where you are" rail added to both Pipeline hero and Journey header (replacing horizontal rail)
- Hero card hidden in Pipeline (kanban) view, only shows in Priority view
- "Why this matters" panel redesigned: top 3 reasons, merged momentum, 2 reasons per school max, simplified language
- Toggle buttons moved to right, white background removed

### SchoolPod.js Refactor (Mar 23, 2026)
- **Before**: 1070-line monolith with 9 internal sub-components
- **After**: Main page reduced to 441 lines, 9 extracted components in `/components/school-pod/`
  - `constants.js` (32 lines) — shared configs, API helpers, stage/severity constants
  - `SignalCard.js` (28 lines) — signal severity card
  - `TaskItem.js` (203 lines) — task with edit/nudge/reassign/menu
  - `AddTaskModal.js` (129 lines) — task creation modal
  - `TimelineItem.js` (14 lines) — timeline event row
  - `Section.js` (39 lines) — section wrapper + AddNoteForm
  - `PipelineStatus.js` (35 lines) — pipeline stage bar
  - `RelationshipTracker.js` (98 lines) — relationship strength tracker
  - `PlaybookSection.js` (59 lines) — collapsible playbook
- **Zero logic changes** — exact same behavior, props, and data-testid attributes preserved
- **Verified**: Screenshot confirms all sections render correctly

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
- CSV Import Tool for bulk school/coach data
- Bulk Approve Mode in Director Inbox

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
- **Coach**: coach.williams@capymatch.com / coach123
- **Director**: director@capymatch.com / director123

## 3rd Party Integrations
- OpenAI/Claude via Emergent LLM Key
- Stripe (Payments) — requires User API Key
