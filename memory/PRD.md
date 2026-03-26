# CapyMatch — Product Requirements Document

## Original Problem Statement
CapyMatch is a full-stack athlete management platform (React + FastAPI + MongoDB) for student-athletes and their families to manage college recruiting.

## Architecture
- **Frontend**: React (CRA), Tailwind CSS, Shadcn/UI
- **Backend**: FastAPI, MongoDB Atlas
- **AI**: OpenAI GPT-4o / Claude via Emergent LLM Key
- **Deployment**: Railway (backend), Vercel (frontend)

## Design System (Unified)
- **Page Background**: `var(--cm-bg)` = `#F7FAFC`
- **Light Card**: `bg: #fff`, `border: 1px solid #e7dfd4`, `radius: 18px`, `shadow: 0 2px 8px rgba(80,60,30,0.03)`
- **Dark Card (action hero only)**: `bg: #161921`
- **Header Bar**: Light/transparent bg, school info left, icon controls right
- **Text**: `#1a1a1a` (primary), `#3d3830` (body), `#6b6358` (muted), `#9c917f` (secondary)
- **Green**: Only for small status indicators — NOT card backgrounds

## Completed Work
- Login page redesign (pixel-perfect from HTML mockup)
- Pipeline/Priority page premium UI (urgency tiers, P tokens)
- Journey page structural + visual alignment:
  - Light header bar (matches coach view) replacing dark school card
  - Background: `var(--cm-bg)` matching Pipeline
  - Signal chips replacing RadarStrip + SI preview
  - Unified light card system (18px radius, #e7dfd4 border)
  - Feed-style timeline (white cards, neutral borders)
  - "Why this matters" consolidated insight section
  - All green-tinted backgrounds removed
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

## Demo Accounts
- Athlete: emma.chen@athlete.capymatch.com / athlete123
