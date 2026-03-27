# CapyMatch — Product Requirements Document

## Original Problem Statement
CapyMatch is a full-stack athlete management platform (React + FastAPI + MongoDB) for student-athletes and their families to manage college recruiting.

## Architecture
- **Frontend**: React (CRA), Tailwind CSS, Shadcn/UI
- **Backend**: FastAPI, MongoDB Atlas
- **AI**: OpenAI GPT-4o / Claude via Emergent LLM Key
- **Deployment**: Railway (backend), Vercel (frontend)

## Design System — Color Rules
- **Brand accent**: Warm Ochre `#8B3F1F` for text accents and borders
- **CTA buttons**: Orange `#ff5a1f` (login, primary actions)
- **Active states** (filters, chips, tabs): `text-gray-900 bg-gray-100 border-gray-300`
- **Tags** (D1, D2, D3): `bg-gray-100 text-gray-600`
- **School logos (fallback)**: Neutral gray gradient `#64748b -> #94a3b8`
- **Card borders**: `border-gray-100`, hover: `border-gray-200`
- **Apply/Compare buttons**: Dark slate `#1e293b`

## Completed Work
- Login page redesign (premium aesthetic, grid background)
- Pipeline/Priority page, Journey page, hero card, progress rail
- TopBar + Pipeline header unified styling
- Schools Page Full Redesign (premium layout, ochre accents)
- Schools Page Green Reduction (Mar 2026): Neutralized all non-CTA green usage
- Login page role selector removed, defaulting to "athlete"
- **Google OAuth Integration (Mar 2026)**: Backend `/api/auth/google` endpoint, frontend `GoogleLogin` button (conditionally rendered when `REACT_APP_GOOGLE_CLIENT_ID` is set). Graceful fallback — preview env works without Google keys. Production keys configured in Vercel.

## Google OAuth Setup (Production)
- Frontend env: `REACT_APP_GOOGLE_CLIENT_ID` (set in Vercel)
- Backend env: `GOOGLE_CLIENT_ID` (set in Railway)
- No Emergent branding — standard Google OAuth button

## Pending Issues
- P0: Update Vercel REACT_APP_BACKEND_URL to `https://capymatch-staff-production.up.railway.app`

## Upcoming Tasks (P1)
- CSV Import Tool for bulk school/coach data
- Bulk Approve Mode in Director Inbox
- School Detail Page Redesign with premium ochre aesthetic

## Future Tasks (P2)
- Parent/Family Experience
- AI-Powered Coach Summary
- Multi-Agent Intelligence Pipeline

## Demo Accounts
- Athlete: emma.chen@athlete.capymatch.com / athlete123
- Coach: coach.williams@capymatch.com / coach123
- Director: director@capymatch.com / director123

## Key API Endpoints
- `POST /api/auth/login` — Email/password login
- `POST /api/auth/register` — Registration (athlete/parent/coach)
- `POST /api/auth/google` — Google OAuth (returns 503 if not configured)
- `POST /api/auth/refresh` — Token refresh
- `GET /api/auth/me` — Current user
- `POST /api/auth/forgot-password` — Password reset request
- `POST /api/auth/reset-password` — Password reset

## 3rd Party Integrations
- OpenAI GPT-4o / Claude — Emergent LLM Key
- Stripe (Payments) — User API Key
- Resend (Email) — Configured
- Google OAuth — User Client ID/Secret (Vercel/Railway production only)
