# CapyMatch — Product Requirements Document

## Original Problem Statement
CapyMatch is a full-stack athlete management platform (React + FastAPI + MongoDB) for student-athletes and their families to manage college recruiting.

## Architecture
- **Frontend**: React (CRA), Tailwind CSS, Shadcn/UI
- **Backend**: FastAPI, MongoDB Atlas
- **AI**: OpenAI GPT-4o / Claude via Emergent LLM Key
- **Deployment**: Railway (backend), Vercel (frontend)

## Design System
- **Page Background**: `#F7FAFC`
- **Hero Card**: `bg: #1a1e28`, shadow `0 6px 24px rgba(0,0,0,0.14)`
- **Progress Rail**: 4px track, 16px active dot w/glow, font-weight 800 active label
- **Hero Chips**: gap-1, px-1.5, py-px, accent 0.12 alpha, pills 0.26 alpha
- **Hero Title**: 22/26px font-extrabold, line-height 1.15
- **Message Preview**: bg 0.018 alpha, borderless, line-height 1.8
- **CTA**: 14px 24px, font-bold, glow, mt-4. Helper text 11px 0.85 alpha
- **Why This**: 11px label 0.60, text 0.70 alpha, line-height 1.65, mt-4 pt-12
- **Timeline Cards**: border #ddd5c8, text var(--cm-text), shadow 0.04
- **Floating Action Bar**: bg 0.95, shadow 28px blur, backdrop-blur 16px

## Completed Work
- Login page redesign
- Pipeline/Priority page premium UI
- Journey page visual alignment & neutral timeline
- Journey Page UI Polish (8-point refinement)
- Hero Card Deep Refinement (command center polish)
- Header Progress Rail (light-mode)
- Final Visual Refinement pass
- **Final Visual Polish** (Mar 2026): progress bar 4px/16px, chip tightening, message softness, CTA spacing, WHY THIS contrast, timeline card borders, action bar anchoring

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
