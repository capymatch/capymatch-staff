# CapyMatch — Product Requirements Document

## Overview
CapyMatch is a full-stack sports recruiting platform connecting athletes, coaches, and club directors. Built with React (frontend) + FastAPI (backend) + MongoDB.

## Architecture
```
/app/
├── backend/
│   ├── routers/          (API endpoints)
│   ├── services/         (Business logic)
│   ├── pod_issues.py     (Issue lifecycle management)
│   ├── support_pod.py    (Pod data aggregation)
│   └── tests/
└── frontend/
    ├── src/pages/
    ├── src/components/
    │   ├── support-pod/  (PodHeroCard, NextActions, etc.)
    │   ├── coach/
    │   ├── athlete/
    │   └── layout/
    └── src/lib/
```

## Issue Lifecycle System (Implemented — Mar 2026)

### Mental Model
Issues are discrete **incidents/episodes**, not static labels. Each issue has a lifecycle: created → active → resolved. If a problem recurs, a NEW issue instance is created.

### Issue Types
| Type | Severity | Auto-Resolve Trigger |
|---|---|---|
| missing_blocker | critical | Manual only |
| momentum_drop | critical | Check-in or interaction logged |
| overdue_actions | critical | Overdue count drops to 0 |
| deadline_proximity | high | Prep task completed |
| engagement_drop | high | Interaction or outreach sent |
| follow_up_overdue | high | Outreach or follow-up logged |
| ownership_gap | medium | Actions assigned |
| readiness_issue | medium | Manual only |

### Pod Hero States
1. **Active Issue (Critical)** — Red bar, urgency badge, title, description, Log Check-In / Escalate / Resolve
2. **Active Issue (High/Medium)** — Amber/blue bar, softer urgency, same layout
3. **Healthy / On Track** — Green check, "No urgent intervention needed", Log Interaction / Add Note

### Key Behaviors
- **Idempotent creation**: One active issue per athlete + type (unique partial index)
- **24h cooldown**: Resolved issues don't re-create for 24 hours
- **Source context**: Each issue stores trigger details (days_inactive, count, etc.)
- **Resolution timeline**: Every resolution logs an event with how it was resolved

### Key Endpoints
- `GET /api/support-pods/{athlete_id}` — Returns `current_issue` and `all_active_issues`
- `POST /api/support-pods/{athlete_id}/issues/{issue_id}/resolve` — Manual resolution
- Auto-resolution hooks in `POST /api/athletes/{id}/notes` and `POST /api/athletes/{id}/messages`

## Support Pod Structure (Journey Model)
1. **Pod Hero** — Current active issue or healthy state
2. **Key Signals** — Compact diagnostic section (always expanded)
3. **Action Plan** — Playbook for active intervention (always expanded)
4. **Next Actions** — Pending tasks only (coach, system, playbook)
5. **Timeline** — All historical events (always expanded)
6. **Athlete Context** — Snapshot + Pod Members (collapsed)
7. **Recruiting Timeline** — Milestones (collapsed)
8. **Completed Actions** — Done tasks (collapsed)

## Task Lifecycle
- **Open/Ready** → **Completed** (moves to timeline, logged)
- **Open/Ready** → **Escalated** (creates Director Action, logged)
- **Open/Ready** → **Cancelled** (logged)
- System tasks auto-resolve when coach logs interaction

## 3rd Party Integrations
MongoDB, Resend, Stripe, Emergent LLM Key, Gmail API

## Test Credentials
- **Coach:** coach.williams@capymatch.com / coach123
- **Athlete:** emma.chen@athlete.capymatch.com / password123
- **Test Athlete ID:** athlete_3 (Emma Chen)

## Backlog
### P1 — In-App Messaging & Notifications
### P2 — Club Billing (org subscriptions)
### P3 — AI Coach Summary, Intelligence Pipeline Phase 2, Parent/Family Experience
