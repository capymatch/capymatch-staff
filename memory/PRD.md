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
- **Hero Card**: `bg: #1a1e28`, shadow `0 6px 24px rgba(0,0,0,0.14)`, rounded-28px
- **Progress Rail**: 3px track, 14px active dot with glow, 8px inactive, stage-colored
- **Hero Chips**: 9px, py-px, mb-1.5 before title, low-dominance
- **Hero Title**: 22/26px font-extrabold, line-height 1.15
- **Message Preview**: bg 0.025 alpha, borderless, line-height 1.75
- **CTA**: 14px 24px padding, font-bold, accent glow, mt-3
- **Why This**: label 0.55, text 0.65 alpha, line-height 1.65
- **Timeline**: space-y-3 consistent spacing
- **Floating Action Bar**: white pill, backdrop-blur, upward shadow

## Completed Work
- Login page redesign
- Pipeline/Priority page premium UI
- Journey page visual alignment & neutral timeline
- Journey Page UI Polish (8-point refinement)
- Hero Card Deep Refinement (command center polish)
- Header Progress Rail (light-mode)
- **Final Visual Refinement** (Mar 2026): progress bar weight, chip spacing, message preview softness, CTA spacing, WHY THIS contrast, timeline spacing, visual balance

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
