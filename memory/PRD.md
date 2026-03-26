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
- **Header Bar**: `bg-white/95 border-b border-gray-100/80`, subtle box-shadow, includes compact progress rail
- **Header Progress Rail**: Light-mode, 8px/12px dots, teal fill line, stage-colored glow, 9px labels, hidden on mobile
- **Hero Card Hierarchy**: metadata chips → extrabold title → urgency → message preview → CTA
- **Floating Action Bar**: white pill, backdrop-blur(12px), upward shadow

## Completed Work
- Login page redesign
- Pipeline/Priority page premium UI
- Journey page visual alignment & neutral timeline
- Journey Page UI Polish (8-point refinement)
- Hero Card Deep Refinement (8-point command center polish)
- **Header Progress Rail** — compact light-mode stage indicator (Added → Outreach → Talking → Visit → Offer → Committed) integrated into header bar (Mar 2026)
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
