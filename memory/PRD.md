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
- **Dark Hero Card**: `bg: #161921`, shadow: `0 8px 32px rgba(0,0,0,0.18)`
- **Header Bar**: `bg-white/95 border-b border-gray-100/80`, subtle box-shadow
- **Signal Chips**: `text-[10px]`, lighter borders/colors, `gap-1.5`
- **Hero Card Hierarchy**:
  - Metadata chips: 9px, rounded-md, muted colors (alpha 0.15/0.32)
  - Title: 22px/26px font-extrabold, line-height 1.15
  - Icon: w-11 h-11 with accent glow
  - Urgency: 13px font-bold, rgba(248,113,113,0.9)
  - Message preview: borderless, bg 0.03 alpha, px-6 py-5, line-height 1.7
  - CTA: 14px/15px font-bold, padding 14px 24px, glow shadow
  - Why This: 10px label (0.50 alpha), 12-13px text (0.60 alpha)
- **Floating Action Bar**: white pill, backdrop-blur(12px), upward shadow
- **Text**: gray-900 (heading), gray-500 (subtext), gray-400 (icons)

## Completed Work
- Login page redesign (pixel-perfect from HTML mockup)
- Pipeline/Priority page premium UI
- Journey page complete visual alignment
- Journey Page Final UI Polish — 8-point refinement (Mar 2026)
- **Hero Card Deep Refinement** — 8-point command center polish (Mar 2026):
  1. Metadata row: compact chips (9px, rounded-md, reduced dominance)
  2. Title: extrabold 22/26px, line-height 1.15
  3. Icon: w-11 h-11 with glow, aligned with title
  4. Urgency line: font-bold, improved contrast
  5. Message preview: borderless, airy padding, line-height 1.7
  6. CTA button: 14px 24px padding via inline style (CSS override fix), stronger glow
  7. Internal spacing: tighter metadata→title→reason flow
  8. Why This: improved contrast (0.50/0.60), better spacing
- Railway production deployment fix

## Pending Issues
- P0: Update Vercel REACT_APP_BACKEND_URL to `https://capymatch-staff-production.up.railway.app`

## Upcoming Tasks (P1)
- CSV Import Tool: Bulk import for school/coach data
- Bulk Approve Mode: Director Inbox multi-select and bulk approve

## Future Tasks (P2)
- Parent/Family Experience
- AI-Powered Coach Summary
- Multi-Agent Intelligence Pipeline

## Demo Accounts
- Athlete: emma.chen@athlete.capymatch.com / athlete123
