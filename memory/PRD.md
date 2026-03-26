# CapyMatch — Product Requirements Document

## Original Problem Statement
CapyMatch is a full-stack athlete management platform (React + FastAPI + MongoDB) for student-athletes and their families to manage college recruiting. The platform helps track schools, manage coach communication, and know what to do next.

## Architecture
- **Frontend**: React (Vite-less CRA), Tailwind CSS, Shadcn/UI
- **Backend**: FastAPI, MongoDB Atlas
- **AI**: OpenAI GPT-4o / Claude via Emergent LLM Key
- **Deployment**: Railway (backend), Vercel (frontend)
- **Auth**: JWT-based (athlete, coach, director roles)

## User Personas
- **Athletes/Families**: Track schools, manage emails, follow AI-guided next steps
- **Coaches**: Assign tasks, flag athletes, view pipeline
- **Directors**: Oversight, approve actions, bulk operations

## Core Features (Implemented)
- Dashboard with recruiting overview
- School pipeline with priority/urgency tiers (Premium UI)
- Journey page per school (Premium UI — warm bone palette)
- Coach Watch intelligence engine
- Email composer with Gmail integration
- Match scoring and risk badges
- School Intelligence drawer
- Coaching Stability tracking
- Progress Rail (recruiting stage tracker)
- Floating action bar (Email, Call, Log, Follow-up)
- Getting Started checklist for new schools
- Notes sidebar
- Highlight videos
- Analytics page
- Social Spotlight
- Calendar integration
- Coach/Director views

## Design System (Premium)
- **Page Background**: Warm bone `#faf8f5`
- **Card Background**: White `#ffffff`
- **Card Borders**: `rgba(209,199,186,0.35)`
- **Card Radius**: `20px`
- **Card Shadow**: `0 2px 12px rgba(19,33,58,0.05)`
- **Primary Text**: `#1a1a1a`
- **Secondary Text**: `#3d3830`
- **Muted Text**: `#6b6358`
- **Hero Header**: Deep navy `#161921` with `#0b1730` gradient
- **Accent**: Teal `#0d9488`
- **Urgency**: Ochre `#ff5a1f`
- **On Track**: Thistle green `#6b9e7a`

## Production Deployment
- **Backend**: `capymatch-staff-production.up.railway.app` (Railway default domain)
- **Frontend**: Vercel (REACT_APP_BACKEND_URL needs updating to Railway URL)
- **Database**: MongoDB Atlas

## Completed Work
- Login page redesign (pixel-perfect from HTML mockup)
- Pipeline/Priority page premium UI (urgency tiers, warm palette)
- Journey page premium UI refactor (warm bone palette, unified cards, feed-style timeline)
- Railway production deployment fix (libmagic1, nixpacks config)
- Coach Watch V2 with "Why this matters" consolidated insight section
- PrimaryHeroCard with improved message preview

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

## Key API Endpoints
- `/api/athlete/momentum-recap` — AI recap for Priority cards
- `/api/athlete/programs/{id}` — Program details
- `/api/athlete/programs/{id}/journey` — Timeline data
- `/api/coach-watch/{id}` — Coach Watch intelligence
- `/api/coaching-stability/{id}` — Coaching stability data
- `/api/match-scores` — Match scoring
- `/api/ai/auto-insight` — AI insight generation

## Demo Accounts
- Athlete: emma.chen@athlete.capymatch.com / athlete123
- Coach: available via login page
- Director: available via login page
