# CapyMatch - Athlete Pipeline Management Platform

## Original Problem Statement
Build and iteratively refine an athlete pipeline management application with Director Mission Control, Coach Dashboard, and School Pods — all powered by a unified Risk Engine v3.

## Architecture
- **Frontend**: React + Tailwind + Shadcn/UI
- **Backend**: FastAPI + MongoDB
- **Key Libraries**: @hello-pangea/dnd, sonner, lucide-react

## What's Been Implemented

### Kanban Board
- Redesigned with colored headers, drag-and-drop animations, mobile responsiveness

### Director Mission Control (Phases 1-5)
- Aggregated inbox, Top Priority card, Autopilot nudges, Compose Modal, school context

### Risk Engine v3
- `/app/backend/risk_engine.py` — severity scoring, stage-aware weighting, compound risk, trajectory, intervention types, role-aware actions
- Director UI: severity labels, trajectory indicators, whyNow, intervention CTAs
- Coach Dashboard: Top Priority + unified Needs Attention (scoped to coach's athletes)
- School Pod Risk: contextual risk card in pod hero
- Coach Escalation: POST /api/coach/escalate creates flag visible in Director Inbox

### Coach Dashboard Unification (March 19, 2026)
- Removed duplicate "Needs Attention" section from RosterSection
- Single unified list driven by Risk Engine v3 (CoachInbox)
- Removed non-actionable journey chips (Visiting Schools, Offer Received)
- Blockers rendered as standard rows with severity=critical/high
- RosterSection simplified to "All Clear" + "Events Requiring Prep" only
- Testing: 100% pass rate (iteration_200)

### UI Cleanup — SupportPod (March 19, 2026)
- Removed duplicate ActionBar card from athlete profile page (SupportPod.js)
- The card repeated the same issue info already shown in StatusIntelligence Attention section
- Cleaned up unused imports (MessageSquare) and destructured variables (current_issue, recruiting_signals)

### Onboarding Flow — Profile → Pipeline Return (March 19, 2026)
- Added onboarding progress banner to ProfilePage.js that shows when `?from=onboarding` is in the URL or when the user has 0 tracked schools
- Banner shows 3-step progress strip (Create Profile → Gmail → Add Schools)
- Before profile is complete: shows "Complete your profile to continue — Fill in X more fields" with essential field counter (X/5)
- After 5+ essential fields filled: shows "Profile looks great!" with green checkmark and prominent "Continue →" button back to /pipeline
- Banner does NOT show for athletes who already have schools tracked (completed onboarding)
- Fixed `_get_athlete` → `_get_or_create_athlete` in athlete_onboarding.py to auto-create athlete records during onboarding instead of 404ing
- Wiped all athlete/event/action data and created 10 interconnected athletes
- Each athlete designed to trigger a specific Risk Engine v3 scenario:
  1. Emma Chen — Hot prospect, improving trajectory (recent actions)
  2. Olivia Anderson — Missing docs blocker (2025 grad, transcript missing)
  3. Marcus Johnson — Critical/worsening (25d inactive, stalled at Campus Visit)
  4. Sarah Martinez — Early stage, narrow list (2027 grad, exploring)
  5. Lucas Rodriguez — Healthy, all clear (has USC offer, strong momentum)
  6. Ava Thompson — Escalation + awaiting reply compound risk
  7. Noah Davis — Event blocker + missing docs compound risk (2025 grad)
  8. Isabella Wilson — No activity + awaiting reply compound, worsening
  9. Liam Moore — No coach assigned + no activity compound, worsening
  10. Sophia Garcia — Follow-up + no activity but improving (recent action)
- Created 40 programs, 22 pod actions, 2 escalations, 4 recommendations, 3 events, 5 event notes
- Testing: 100% frontend, 87.5%+ backend (all critical paths pass)

## Key API Endpoints
- `GET /api/director-inbox` — Director-scoped risk inbox
- `GET /api/coach-inbox` — Coach-scoped risk inbox
- `GET /api/school-pod-risk/{program_id}` — School pod risk context

### Database Reset & Comprehensive Seed Data (March 19, 2026)
- `POST /api/coach/escalate` — Coach → Director escalation
- `POST /api/autopilot/execute` — One-click approval actions

## Key Files
- `/app/backend/risk_engine.py` — Risk Engine v3 core
- `/app/backend/routers/director_inbox.py`, `coach_inbox.py`, `school_pod.py`
- `/app/frontend/src/components/mission-control/DirectorInbox.js`, `CoachInbox.js`, `SchoolPodRisk.js`
- `/app/frontend/src/components/mission-control/CoachView.js`, `RosterSection.js`

## Test Credentials
- **Director**: director@capymatch.com / director123
- **Coach Williams**: coach.williams@capymatch.com / coach123

## Backlog (Prioritized)

### P1 - Upcoming
- CSV Import Tool: Bulk importing school/coach data
- Bulk Approve mode for Director Inbox
- Refactor DirectorInbox.js into smaller components

### P2 - Future
- Parent/Family Experience (family view of risk)
- AI-Powered Coach Summary
- Club Billing (Stripe)
- Multi-Agent Intelligence Pipeline
- Kanban Keyboard Shortcuts
