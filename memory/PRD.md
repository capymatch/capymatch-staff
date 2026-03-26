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
- **Header Bar**: Inline row — back link + avatar + name/subtext | right controls. Bottom border `#ebebeb`
- **Text**: `#263238` (heading), `#757575` (subtext/muted), `#9E9E9E` (icon controls)

## Completed Work
- Login page redesign (pixel-perfect from HTML mockup)
- Pipeline/Priority page premium UI
- Journey page complete visual alignment:
  - Inline header bar matching coach view (← Pipeline + logo + name on one row)
  - Signal chips replacing floating blocks
  - Unified light card system
  - Feed-style neutral timeline
  - "Why this matters" consolidated insight section
  - Green-tinted backgrounds removed
- Railway production deployment fix

## Pending Issues
- P0: Update Vercel REACT_APP_BACKEND_URL to `capymatch-staff-production.up.railway.app`

## Upcoming Tasks (P1)
- CSV Import Tool: Bulk import for school/coach data
- Bulk Approve Mode: Director Inbox multi-select and bulk approve

## Future Tasks (P2)
- Parent/Family Experience
- AI-Powered Coach Summary
- Multi-Agent Intelligence Pipeline

## Demo Accounts
- Athlete: emma.chen@athlete.capymatch.com / athlete123
