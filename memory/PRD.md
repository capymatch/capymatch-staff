# CapyMatch — Product Requirements Document

## Original Problem Statement
Unify `capymatch-staff` (director/coach) and `capymatch` (athlete/parent) into a single platform with shared auth, data model, and role-based experiences.

## Core Architecture
- **Backend:** FastAPI, Motor (async MongoDB)
- **Frontend:** React, Tailwind CSS, Shadcn/UI
- **Database:** MongoDB
- **Auth:** JWT (director, coach, athlete, parent roles)

---

## Completed Work

### Phase 1: Unified Foundation — COMPLETE
Steps 1.1–1.6: Canonical athletes, org scoping, auth expansion, claim flow, role-based routing

### Phase A: Core Pipeline + Real Dashboard — COMPLETE
- Programs CRUD, Interaction signals, College Coaches, Events

### Phase B: Profile & Calendar — COMPLETE
- Athlete Profile Editor, Public Profile Page, Calendar

### Phase C: School Knowledge Base — COMPLETE
- Backend KB search + seeder, Frontend search/detail pages

### Pipeline Page — REBUILT
- List-based pipeline matching original capymatch design

### Journey Page — REBUILT (2026-03-09)
- 14 journey components: ProgressRail, PulseIndicator, GettingStartedChecklist, CommittedHero, CelebrationHero, NextStepCard, ConversationBubble, FloatingActionBar, StageLogModal, LogInteractionForm, MarkAsRepliedModal, CoachForm, FollowUpScheduler, EmailComposer
- **Tested: 25/25 backend, 20/20 frontend — 100% pass (iteration_56)**

### Athlete Onboarding Quiz — COMPLETE
- 6-step quiz with matching algorithm, forced redirect for new athletes

### Settings Page + Gmail Integration — COMPLETE (2026-03-09)
- Full settings: Personal Info, Gmail Integration, Notifications, Appearance, Change Password, Data & Privacy
- Gmail OAuth flow, encrypted token storage, real email sending, inbox import with 4-stage modal
- **Tested: 28/28 backend, all frontend — 100% pass (iteration_57)**

### Dashboard — REBUILT (2026-03-09)
- **Completely rewritten** `pages/AthleteDashboard.js` to match original capymatch design
- Dark theme throughout (no white backgrounds)
- **Section 1: Greeting + Pulse** — Dark card with teal accent line, time-based greeting with name, 4 PulseStat components (Schools Tracked, Response Rate, Replies This Week, Awaiting Reply)
- **Section 2: Today's Actions** — Split left/right: Follow-ups Due (with red badges) | Needs First Outreach (with purple badges). ActionRow components navigate to `/pipeline/:programId`
- **Section 3: School Spotlight** — Horizontal scrollable SpotlightCards with status badges (Active Conversation/Contacted/Awaiting Reply/Committed gold glow), Overdue badges, "Next step:" text, + "Browse Schools" add card → `/schools`
- **Section 4: Who's Watching** — Engagement metrics (Email Opens, Link Clicks, Profile Views) with empty state (engagement tracking not yet implemented)
- **Section 5: Recent Activity** — FeedItem timeline with colored dots, teal-highlighted school names, clickable navigation
- **Section 6: Coming Up** — EventCard with date blocks (MAR/15 format), type badges, duration info
- **Architecture change**: Dashboard now fetches from 5 parallel API calls (programs, events, interactions, profile, gmail/status) and computes all stats client-side, matching the original app
- **All navigation working**: Pipeline, Calendar, Schools, Journey pages
- **Tested: 15/15 frontend features verified — 100% pass (iteration_58)**

---

## Routes (cumulative)

### Frontend Routes (Athlete)
| Route | Page |
|---|---|
| /onboarding | OnboardingQuiz |
| /board | AthleteDashboard (rebuilt) |
| /pipeline | PipelinePage |
| /pipeline/:programId | JourneyPage |
| /schools | SchoolsPage |
| /schools/:domain | SchoolDetailPage |
| /calendar | CalendarPage |
| /athlete-profile | ProfilePage |
| /athlete-settings | SettingsPage |
| /s/:shortId | PublicProfilePage |

---

## Upcoming Tasks

### P1 — Remaining Migration Items
- AI-powered email drafting from Journey page (requires LLM integration)
- Inbox page (email threads view when Gmail connected)

### P2 — Technical Debt
- Normalize camelCase to snake_case in DB fields

### Future
- Connected Experiences: Director ↔ Athlete visibility
- Advanced Features: Stripe subscriptions, engagement analytics (Who's Watching), Smart Match AI
- Parent/Family experience

## Key Credentials
- Director: director@capymatch.com / director123
- Athlete: emma.chen@athlete.capymatch.com / password123
- Gmail OAuth: Stored in app_config collection (key: gmail_oauth)
