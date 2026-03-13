# CapyMatch — Product Requirements Document

## Vision
Sports recruiting platform connecting athletes, coaches, and schools with intelligent workflow management.

## Core Architecture
- **Frontend**: React + Tailwind + Shadcn/UI
- **Backend**: FastAPI + MongoDB
- **Auth**: JWT-based with role-based access

## Coach Workflow
```
Mission Control → Athlete Overview → School Pod
Events: Event Home → Event Prep → Live Mode → Post-Event Summary
```

## Events System (Refined Mar 2026)
### Event Home Cards (Phase 1 ✅)
- Action-oriented cards with athlete count, school count, readiness pills, prep progress
- Dynamic CTA: Go Live / Start Prep / Finish Prep / Review Summary / View Summary
- Backend computes athlete readiness (blockers/needs_attention/ready) per event

### Event Prep (Phase 2 - NEXT)
- Prioritize not-ready athletes, highest-value schools, blockers at top

### Live Mode (Phase 3)
- Speed optimization: fewer taps, likely athletes first, save confirmation, repeat shortcuts

### Post-Event Summary (Phase 4)
- Structured follow-ups: athlete × school, recommended next step, owner, due date

### System Integration (Phase 5)
- Event outcomes influence School Pod actions, pipeline, support messages, athlete priorities

## School Pod
- Auto-generated playbooks from signals (4 types), step persistence
- School-scoped actions, notes, timeline
- Event-routed actions with correct program_id

## Profile Completeness
- Unified 12-field formula, coach-visible alert with "Send Reminder"

## Test Credentials
- **Coach:** coach.williams@capymatch.com / coach123
- **Athlete:** emma.chen@athlete.capymatch.com / athlete123

## Completed
- School Pod architecture, notes, playbooks, step persistence
- Profile completeness alignment & coach visibility
- Event Route-to-Pod fix (program_id scoping)
- **Event Home Cards redesign** (Phase 1, Mar 13, 2026)

## Backlog
- P1: Event Prep (Phase 2), Live Mode (Phase 3), Post-Event Summary (Phase 4), System Integration (Phase 5)
- P2: Club Billing
- P3: AI Coach Summary, Intelligence Pipeline Phase 2, Parent/Family Experience
