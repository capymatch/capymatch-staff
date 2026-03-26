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
- **Light Card**: `bg: #fff`, `border: 1px solid #e7dfd4`, `radius: 18px`
- **Dark Card (action hero only)**: `bg: #161921`
- **Header Bar**: Matches SupportPod — `<header bg-white/95 border-b border-gray-100>`, inline back link + separator + avatar + name/subtext, right side icon controls
- **Text**: gray-900 (heading), gray-500 (subtext), gray-400 (icons)

## Completed Work
- Login page redesign (pixel-perfect from HTML mockup)
- Pipeline/Priority page premium UI
- Journey page complete visual alignment:
  - Header bar matches SupportPod exactly (bg-white/95, border-b, inline layout, health badge)
  - Signal chips replacing floating blocks
  - Unified light card system
  - Feed-style neutral timeline
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
