# CapyMatch — Product Requirements Document

## Original Problem Statement
CapyMatch is a full-stack athlete management platform (React + FastAPI + MongoDB) for student-athletes and their families to manage college recruiting.

## Architecture
- **Frontend**: React (CRA), Tailwind CSS, Shadcn/UI
- **Backend**: FastAPI, MongoDB Atlas
- **AI**: OpenAI GPT-4o / Claude via Emergent LLM Key
- **Deployment**: Railway (backend), Vercel (frontend)

## Completed Work
- Login page redesign
- Pipeline/Priority page premium UI
- Journey page visual alignment, hero card, progress rail, final polish passes
- TopBar + Pipeline header unified styling (flush edge-to-edge)
- **Schools Page Full Redesign** (Mar 2026):
  - Hero section with "Find Schools" title + summary stats
  - Featured Match cards (6 max, editorial style)
  - Sticky search/filter bar with division quick-filters
  - Smart bucket chips (All, Dream D1, Strong Match 80%+, Close to Home, Academics)
  - Refined directory cards with premium spacing
  - Filter panel slide-in redesign
  - Intelligence copy (fit reason labels)
  - AppLayout overflow-x fix for sticky support

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
