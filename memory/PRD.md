# CapyMatch — Product Requirements Document

## Original Problem Statement
CapyMatch is a React + FastAPI + MongoDB athlete pipeline management tool for college-bound student-athletes. The platform helps athletes manage their recruiting pipeline, track coach engagement, and make data-driven decisions about which schools to pursue.

## Core Architecture
- **Frontend**: React (CRA) + TailwindCSS + Shadcn/UI → **Vercel** (app.capymatch.com)
- **Backend**: FastAPI + MongoDB (Motor async driver) → **Railway** (api.capymatch.com)
- **Database**: MongoDB Atlas (capymatch-prod.63nymfu.mongodb.net)
- **AI**: Claude Sonnet via Emergent LLM Key
- **Auth**: JWT-based custom authentication (access + refresh tokens)

## What's Been Implemented

### Login Page Redesign V3 (Mar 26, 2026)
- Pixel-perfect implementation from user's HTML mockup
- Full-page grid background (#f7f3ec, 44px squares)
- Glass-morphism auth card (backdrop-filter blur, semi-transparent white, radius 28px)
- Rounded-square orange gradient logo (border-radius 16px)
- Large typography (34px headings, 18px inputs, 20px button)
- Uppercase field labels with letter-spacing
- Custom checkbox, error styling (#fff0ee), orange CTA with glow shadow
- Demo accounts with "Quick Access" card layout and "Use" buttons
- Feature pill chips, gradient social proof avatars
- Mobile responsive, all auth flows working

### Production Deployment Fixes (Mar 26, 2026)
- Fixed Dockerfile: added `libmagic1` system dependency (was causing crashes)
- Fixed nixpacks.toml: added `--extra-index-url` for emergentintegrations and `file` package
- Added `/api/health` endpoint for Railway health check probes
- Updated DEPLOYMENT.md with Railway troubleshooting guide
- Railway backend confirmed operational at `capymatch-staff-production.up.railway.app`
- Custom domain `api.capymatch.com` SSL still validating (Railway plan limit resolved)

### Production Deployment Prep (Mar 25, 2026)
- Created `DEPLOYMENT.md` with full Vercel + Railway deployment guide
- Created `.env.production` templates for backend and frontend
- Created `Procfile` for Railway
- Audited codebase: no hardcoded preview URLs in source code
- CORS properly reads from env vars for production
- Pre-production smoke test: 100% pass (17/17 tests)
- Fixed minor KeyError bug in `athlete_tasks.py`

### MongoDB Production Setup (Mar 25, 2026)
- Connected to Atlas cluster `capymatch-prod.63nymfu.mongodb.net` (v8.0.20)
- Migrated all 69 collections from dev to production
- Added MongoDB admin card with Test + Migrate buttons

### Resend Email Integration (Mar 25, 2026)
- Admin UI for API key management, test email sending
- Config stored in MongoDB `app_config`, not .env
- Verified: emails delivered successfully

### Gmail OAuth Admin Config (Mar 25, 2026)
- Admin UI for Client ID, Secret, Redirect URI
- Config stored in DB for environment portability
- Production redirect: `https://api.capymatch.com/api/gmail/callback`

### Coaching Stability Feature (Mar 25, 2026)
- Backend: DuckDuckGo web search + Claude Sonnet AI analysis
- Cached in `coach_watch_alerts` for 7 days
- Frontend: Collapsed card with badge + "Learn more" expand
- Inline mini-badge on coach contact cards

### Previous Work (Mar 23-25, 2026)
- Journey Card → Email Modal Integration
- Pipeline Hero UI, Mark Done bug fix
- Profile Completeness & Validations
- Where You Are rail (simple dot-and-line style)
- Coach Watch Card fallback logic
- Permanent libmagic backend crash fix
- Stripe subscription billing (5 tiers)
- Club Billing V2 with entitlements
- Premium dark theme across all pages

## Prioritized Backlog

### P0 — Production Live
- ✅ Deploy backend to Railway (capymatch-staff-production.up.railway.app)
- ✅ Deploy frontend to Vercel (app.capymatch.com)
- ⏳ Custom domain SSL for api.capymatch.com (validating)
- Update Vercel REACT_APP_BACKEND_URL to Railway default URL
- Switch Stripe to live keys
- Verify Gmail OAuth in production

### P1 — Post-Deploy
- CSV Import Tool for bulk school/coach data
- Bulk Approve Mode in Director Inbox

### P2 — Future
- Parent/Family Experience
- AI-Powered Coach Summary
- Multi-Agent Intelligence Pipeline
- V2 page-level route gating
- Usage-based/metered billing for AI features

## Key Files
- `/app/frontend/src/pages/LoginPage.js` — Redesigned login/signup page
- `/app/DEPLOYMENT.md` — Full deployment guide with troubleshooting
- `/app/backend/Dockerfile` — Railway deployment config (with libmagic)
- `/app/backend/nixpacks.toml` — Railway builder config (with emergentintegrations)
- `/app/backend/.env.production` — Railway env template
- `/app/frontend/.env.production` — Vercel env template
- `/app/backend/Procfile` — Railway startup
- `/app/backend/config.py` — Environment config
- `/app/backend/routers/admin_integrations.py` — All integration management

## Test Credentials
- **Athlete**: emma.chen@athlete.capymatch.com / athlete123
- **Director**: director@capymatch.com / director123
- **Platform Admin**: douglas@capymatch.com / capymatch2026

## 3rd Party Integrations
- OpenAI/Claude via Emergent LLM Key
- DuckDuckGo Search (coaching news)
- Stripe Payments (test → switch to live)
- Resend (transactional email)
- Gmail OAuth (athlete email)
- MongoDB Atlas (production database)
