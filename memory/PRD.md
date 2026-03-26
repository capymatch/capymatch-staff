# CapyMatch — Product Requirements Document

## Original Problem Statement
CapyMatch is a full-stack athlete management platform (React + FastAPI + MongoDB) for student-athletes and their families to manage college recruiting.

## Architecture
- **Frontend**: React (CRA), Tailwind CSS, Shadcn/UI
- **Backend**: FastAPI, MongoDB Atlas
- **AI**: OpenAI GPT-4o / Claude via Emergent LLM Key
- **Deployment**: Railway (backend), Vercel (frontend)

## Design System — Color Rules
- **Green/Teal**: ONLY for primary CTA buttons ("+ Add") and positive match signals (score numbers)
- **Active states** (filters, chips, tabs): `text-gray-900 bg-gray-100 border-gray-300`
- **Tags** (D1, D2, D3): `bg-gray-100 text-gray-600`
- **School logos (fallback)**: Neutral gray gradient `#64748b → #94a3b8`
- **Card borders**: `border-gray-100`, hover: `border-gray-200`
- **Apply/Compare buttons**: Dark slate `#1e293b`

## Completed Work
- Login page redesign
- Pipeline/Priority page, Journey page, hero card, progress rail
- TopBar + Pipeline header unified styling
- Schools Page Full Redesign (premium layout)
- **Schools Page Green Reduction** (Mar 2026): Neutralized all non-CTA green usage — logos, tags, filters, chips, borders, backgrounds. Green limited to primary CTAs and match scores only.

## Pending Issues
- P0: Update Vercel REACT_APP_BACKEND_URL to `https://capymatch-staff-production.up.railway.app`

## Upcoming Tasks (P1)
- CSV Import Tool, Bulk Approve Mode

## Future Tasks (P2)
- Parent/Family Experience, AI Coach Summary, Multi-Agent Pipeline

## Demo Accounts
- Athlete: emma.chen@athlete.capymatch.com / athlete123
