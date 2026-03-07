# CapyMatch — Product Requirements Document

## Original Problem Statement
Build CapyMatch, a "recruiting operating system" for clubs, coaches, families, and athletes. The vision is to create a system that actively coordinates support, surfaces priorities, and helps users know what to do next, moving beyond a traditional CRM.

## Tech Stack
- **Backend:** FastAPI (Python), MongoDB (motor async driver)
- **Frontend:** React, Tailwind CSS, Shadcn/UI
- **Auth:** JWT-based (PyJWT, bcrypt/passlib)
- **Email:** Resend (transactional invite emails)
- **Architecture:** Service-oriented backend with APIRouter modules

## What's Been Implemented

### Phase 1-2: Core Features & Persistence
- All 5 operating modes (Mission Control, Support Pod, Event, Advocacy, Program Intelligence)
- Decision Engine with intervention detection and ranking
- Full MongoDB persistence, seed-if-empty strategy
- Backend refactored to modular routers

### Phase 3: Program Intelligence Enhancements
- Historical trending via snapshot system
- Coach-specific views with filtered data

### Phase 4: JWT Authentication
- Login, register, /me endpoints
- 3 seeded accounts (1 Director, 2 Coaches)
- Frontend AuthContext, protected routes, role-based UI

### Phase 5: Route Protection + Invite Coach
- All API routes require JWT auth (401 without token)
- Director-only routes (admin, debug, invites) return 403 for coaches
- Invite system: create, validate, accept, cancel, copy-link

### Phase 6: Stabilization + RBAC
- Hardcoded "Coach Martinez" replaced with current_user["name"] in all routers
- Director self-registration blocked
- Models consolidated in central models.py

### Phase 7: Invite Email Delivery (2026-03-07)
- **Resend integration** for transactional invite emails
- Auto-send on invite creation with HTML template
- **Delivery tracking:** delivery_status (pending/sent/failed), sent_at, last_error, resend_count
- **Resend endpoint:** POST /api/invites/{id}/resend (director-only)
- **Graceful failure:** if email fails, invite still exists with copy-link fallback
- **Frontend:** delivery badges (Email sent/Send failed/Sending...), resend button with spinner, resend count display
- **Sandbox note:** Resend account is in test mode — emails only deliver to verified addresses. Verify domain at resend.com/domains for production use.

## Environment Variables
```
MONGO_URL          # MongoDB connection
DB_NAME            # Database name
JWT_SECRET         # JWT signing key
RESEND_API_KEY     # Resend email API key (re_...)
RESEND_FROM_EMAIL  # Sender address (default: onboarding@resend.dev)
CORS_ORIGINS       # Allowed origins
```

## RBAC Permission Matrix
| Route | Director | Coach | Public |
|---|---|---|---|
| POST /api/auth/login, /register | - | coach-only reg | Yes |
| GET/POST/DELETE /api/invites | Yes | 403 | 401 |
| POST /api/invites/{id}/resend | Yes | 403 | 401 |
| GET/POST /api/invites/validate,accept/{token} | - | - | Yes |
| /api/mission-control, events, advocacy, athletes, support-pods | Yes | Yes | 401 |
| /api/program/intelligence | Full + filter | Auto-filtered | 401 |
| /api/admin, /api/debug | Yes | 403 | 401 |

## Invite Schema
```
{
  id, email, name, team, role, token,
  status: pending | accepted | expired | cancelled,
  delivery_status: pending | sent | failed,
  sent_at, last_error, resend_count,
  invited_by, invited_by_name,
  created_at, expires_at, accepted_at
}
```

## Prioritized Backlog

### Completed
- [x] Core modes + persistence
- [x] JWT auth + route protection
- [x] Invite Coach + email delivery
- [x] RBAC stabilization + model consolidation

### P1 — Next Up
- [ ] Per-coach data ownership (coaches see only their athletes)
- [ ] Deeper AI/Intelligence Layer (V3)
- [ ] Merge assessment with main CapyMatch app (Option B → A path)

### P2 — Future
- [ ] Forgot Password flow
- [ ] Verify Resend domain for production email delivery
- [ ] Platform integrations (calendars, messaging)
- [ ] User management admin panel
- [ ] Full merge to unified CapyMatch platform
