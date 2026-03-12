# CapyMatch — Product Requirements Document

## Overview
CapyMatch is a full-stack sports recruiting platform connecting athletes, coaches, and club directors. Built with React (frontend) + FastAPI (backend) + MongoDB.

## Architecture
```
/app/
├── backend/
│   ├── routers/
│   │   ├── support_messages.py  # NEW: Internal messaging system
│   │   ├── support_pods.py      # Support Pod + issue lifecycle
│   │   ├── athletes.py          # Athlete CRUD + notes
│   │   └── ...
│   ├── pod_issues.py            # Issue lifecycle management
│   ├── support_pod.py           # Pod data + parameterized playbooks
│   └── services/
└── frontend/
    ├── src/pages/
    │   ├── athlete/
    │   │   ├── MessagesPage.js  # NEW: Support messages inbox
    │   │   └── InboxPage.js     # School/recruiting emails (separate lane)
    │   └── coach/
    ├── src/components/
    │   └── support-pod/
    │       ├── CoachEmailComposer.js  # REWRITTEN: Uses support messages API
    │       ├── PodHeroCard.js         # 3-state issue hero
    │       └── ...
    └── src/lib/
```

## Two Communication Lanes

### Lane 1: School Communication (existing, unchanged)
- Athlete ↔ college coach email/outreach
- External, recruiting-facing
- Lives in InboxPage.js + school detail pages

### Lane 2: Support Messages (V1 — implemented Mar 2026)
- Club coach ↔ athlete/helper internal messaging
- CapyMatch is source of truth; replies happen in-app
- Email notification via Resend (noreply@capymatch.com) is ping only

#### Data Model: `support_messages` + `support_threads`
- Messages stored per-message with thread_id grouping
- Threads track last_message_at, participant_ids, unread tracking
- read_by array on each message for per-user read status

#### Key Endpoints
- `POST /api/support-messages` — Coach sends message (creates thread)
- `POST /api/support-messages/{thread_id}/reply` — In-app reply
- `GET /api/support-messages/inbox` — Threads with unread counts
- `GET /api/support-messages/thread/{thread_id}` — Full conversation
- `GET /api/support-messages/unread-count` — Badge count

#### Frontend
- Coach: "Send Message" modal in Support Pod action bar → selects recipients → writes message
- All roles: /messages page with thread list + conversation view + reply
- Sidebar: "Messages" item with unread badge (polls every 60s)

## Issue Lifecycle System
- Issues are discrete incidents (created → active → resolved)
- 3 Pod Hero states: Active Critical, Active High/Medium, Healthy/On Track
- Idempotent creation, 24h cooldown, auto-resolution on interactions

## Parameterized Deterministic Playbooks
- 6 playbooks adapt wording and steps based on athlete context
- Templates use days_inactive, pipeline size, response rate, profile gaps, video age, etc.
- Conditional steps appear/disappear based on relevance

## 3rd Party Integrations
MongoDB, Resend (noreply@capymatch.com), Stripe, Emergent LLM Key, Gmail API

## Test Credentials
- **Coach:** coach.williams@capymatch.com / coach123
- **Test Athlete ID:** athlete_3 (Emma Chen)

## Backlog
### P2 — Club Billing (org subscriptions)
### P3 — AI Coach Summary, Intelligence Pipeline Phase 2, Parent/Family Experience
