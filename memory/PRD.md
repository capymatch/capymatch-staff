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
- **Dark Card (action hero only)**: `bg: #161921`, shadow: `0 8px 32px rgba(0,0,0,0.18)`
- **Header Bar**: Matches SupportPod — `bg-white/95 border-b border-gray-100/80`, subtle box-shadow, inline layout
- **Signal Chips**: `text-[10px]`, lighter borders/colors, `gap-1.5`
- **Hero Title**: `text-xl sm:text-2xl font-bold`, white
- **Hero CTA**: `text-[14px] sm:text-[15px] py-3 px-5`, accent glow shadow
- **Floating Action Bar**: white pill, backdrop-blur, upward shadow anchoring
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
- Journey Page Final UI Polish (8-point refinement) — DONE Mar 2026:
  1. Header subtle shadow separation
  2. Signal chips reduced visual weight (10px, lighter colors)
  3. Hero title prominence (xl/2xl bold)
  4. Urgency line readability (13px)
  5. Message preview softened contrast + padding
  6. CTA button enlarged with glow
  7. Metadata pills reduced dominance
  8. Hero card depth shadow + FAB anchoring
- Railway production deployment fix

## Pending Issues
- P0: Update Vercel REACT_APP_BACKEND_URL to `https://capymatch-staff-production.up.railway.app` (user manual step)

## Upcoming Tasks (P1)
- CSV Import Tool: Bulk import for school/coach data
- Bulk Approve Mode: Director Inbox multi-select and bulk approve

## Future Tasks (P2)
- Parent/Family Experience
- AI-Powered Coach Summary
- Multi-Agent Intelligence Pipeline

## Demo Accounts
- Athlete: emma.chen@athlete.capymatch.com / athlete123
