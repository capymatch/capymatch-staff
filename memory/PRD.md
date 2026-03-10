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

## P1 Upcoming — Journey Migration Phases
- **Phase J2**: Coach Watch alert, Engagement stats strip, Coach social links, ConversationBubble enrichment
- **Phase J3**: Send Profile card, Gmail connect nudge, Archive confirmation dialog, Notes sidebar, School intel link alignment
- **Phase J4**: Subscription gating, AI premium gating, Compare button, Committed toggle, School social links

## P2 Technical Debt
- Normalize camelCase → snake_case in database fields

## P2 Future/Backlog
- Stripe integration for real payment processing
- Connected Experiences (Director ↔ Athlete visibility)
- Engagement analytics
- Smart Match AI (advanced matching)
- Parent/Family experience
- Coach Watch scheduled auto-scanning
