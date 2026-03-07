# CapyMatch — Product Requirements Document

## Original Problem Statement
Build CapyMatch, a "recruiting operating system" for clubs, coaches, families, and athletes. The system actively coordinates support, surfaces priorities, and helps users know what to do next.

## Tech Stack
- **Backend:** FastAPI (Python), MongoDB (motor async driver)
- **Frontend:** React, Tailwind CSS, Shadcn/UI
- **Auth:** JWT-based (PyJWT, bcrypt/passlib)
- **Email:** Resend (transactional invite emails)

## What's Been Implemented

### Core Features (Phase 1-3)
- 5 operating modes: Mission Control, Support Pod, Event, Advocacy, Program Intelligence
- Decision Engine, historical trending, coach-specific views
- Full MongoDB persistence

### Auth & Security (Phase 4-6)
- JWT auth (login, register, /me), 3 seeded accounts
- All routes protected, director-only admin/debug/invites
- RBAC stabilization, hardcoded names replaced with current_user
- Director self-registration blocked

### Invite Email Delivery (Phase 7)
- Resend integration with delivery tracking (sent/failed/pending)
- Resend endpoint, copy-link fallback, resend count

### Per-Coach Data Ownership (Phase 8 — 2026-03-07)
- **primary_coach_id** field added to athletes
- 25 athletes split: 13 to Coach Williams (odd), 12 to Coach Garcia (even)
- **Ownership service** (`services/ownership.py`): cached coach→athlete mapping
- **Filtered views across all modes:**
  - Athletes: coaches see only their athletes; 403 for others
  - Mission Control: alerts, signals, events, snapshot all filtered
  - Events: filtered to events containing coach's athletes
  - Advocacy: recommendations filtered by athlete ownership
  - Support Pods: 403 boundary for non-owned athletes
  - Program Intelligence: already filtered (from Phase 3)
- **Directors see everything** — no filtering applied
- **Unassigned athletes:** visible to directors only

## Ownership Model V1
```
Athlete.primary_coach_id → Users.id

Director: sees all athletes, all data, global view
Coach: sees only athletes where primary_coach_id == coach's user.id
  - Mission Control: filtered alerts, signals, events, snapshot
  - Events: only events with their athletes attending
  - Advocacy: only recommendations for their athletes
  - Support Pods: 403 for non-owned athletes
  - Program Intelligence: auto-filtered (existing)
```

## Default Credentials
- Director: director@capymatch.com / director123
- Coach Williams: coach.williams@capymatch.com / coach123 (athletes 1,3,5,7,9,11,13,15,17,19,21,23,25)
- Coach Garcia: coach.garcia@capymatch.com / coach123 (athletes 2,4,6,8,10,12,14,16,18,20,22,24)

## Environment Variables
```
MONGO_URL, DB_NAME, JWT_SECRET, RESEND_API_KEY, RESEND_FROM_EMAIL, CORS_ORIGINS
```

## Prioritized Backlog

### Completed
- [x] Core modes + persistence
- [x] JWT auth + route protection + RBAC
- [x] Invite Coach + email delivery
- [x] Per-coach data ownership boundaries

### P1 — Next Up
- [ ] AI/Intelligence Layer (V3): cross-object analysis, predictive analytics
- [ ] Merge assessment with main CapyMatch app

### P2 — Future
- [ ] Forgot Password flow
- [ ] Multi-coach support (secondary coach field)
- [ ] Coach-to-athlete reassignment UI
- [ ] Verify Resend domain for production
- [ ] Full merge to unified CapyMatch platform
