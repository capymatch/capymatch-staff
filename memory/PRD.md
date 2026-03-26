# CapyMatch — Product Requirements Document

## Original Problem Statement
CapyMatch is a full-stack athlete management platform (React + FastAPI + MongoDB) for student-athletes and their families to manage college recruiting. The platform helps track schools, manage coach communication, and know what to do next.

## Architecture
- **Frontend**: React (CRA), Tailwind CSS, Shadcn/UI
- **Backend**: FastAPI, MongoDB Atlas
- **AI**: OpenAI GPT-4o / Claude via Emergent LLM Key
- **Deployment**: Railway (backend), Vercel (frontend)
- **Auth**: JWT-based (athlete, coach, director roles)

## Design System (Unified Pipeline + Journey)
- **Page Background**: `var(--cm-bg)` = `#F7FAFC` (global light theme)
- **Light Card**: `bg: #fff`, `border: 1px solid #e7dfd4`, `radius: 18px`, `shadow: 0 2px 8px rgba(80,60,30,0.03)`
- **Dark Card (hero)**: `bg: #161921` (navy gradient), `radius: 18px-22px`
- **Text**: `#1a1a1a` (primary), `#3d3830` (body), `#6b6358` (muted)
- **Accent**: Teal `#0d9488`, Ochre `#c75000`, Thistle `#5e9470`

## Completed Work
- Login page redesign (pixel-perfect from HTML mockup)
- Pipeline/Priority page premium UI (urgency tiers, warm palette, P tokens)
- Journey page structural + visual alignment (matches Pipeline):
  - Background: `var(--cm-bg)` matching Pipeline
  - Hero stack: Reduced spacing, aligned card system
  - Signal chips: Replaced RadarStrip + SI preview with inline `[Last activity] [Match score] [Stage]`
  - Card system: Unified light cards (18px radius, #e7dfd4 border, Pipeline shadow tokens)
  - Sidebar: Tightened spacing (space-y-4)
  - CoachWatchCardV2: "Why this matters" label
  - Timeline: Feed-style ConversationBubbles (rounded-2xl, warm borders)
  - Improved PrimaryHeroCard message preview readability
- Railway production deployment fix

## Pending Issues
- P0: Update Vercel REACT_APP_BACKEND_URL to `capymatch-staff-production.up.railway.app`
- P1: Stale service worker cache (user verification pending)

## Upcoming Tasks (P1)
- CSV Import Tool: Bulk import for school/coach data
- Bulk Approve Mode: Director Inbox multi-select and bulk approve

## Future Tasks (P2)
- Parent/Family Experience
- AI-Powered Coach Summary
- Multi-Agent Intelligence Pipeline

## 3rd Party Integrations
- OpenAI GPT-4o / Claude — Emergent LLM Key
- Stripe (Payments) — requires User API Key
- Resend (Email) — requires User API Key
- Gmail OAuth — requires User Client ID/Secret

## Key Files
- `/app/frontend/src/pages/athlete/JourneyPage.js` — Journey page (unified design)
- `/app/frontend/src/components/journey/CoachWatchCardV2.js` — Coach Watch + "Why this matters"
- `/app/frontend/src/components/journey/ConversationBubble.js` — Feed-style timeline bubbles
- `/app/frontend/src/components/journey/PrimaryHeroCard.js` — Dark hero card with message preview
- `/app/frontend/src/components/pipeline/PriorityBoard.js` — Pipeline priority board (P tokens)
- `/app/frontend/src/components/pipeline/PipelineHero.js` — Pipeline hero card

## Demo Accounts
- Athlete: emma.chen@athlete.capymatch.com / athlete123
