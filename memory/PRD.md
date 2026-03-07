# CapyMatch — Product Requirements Document

## Original Problem Statement
Build CapyMatch, a "recruiting operating system" for clubs, coaches, families, and athletes. The system actively coordinates support, surfaces priorities, and helps users know what to do next.

## Core Architecture
- **Backend:** FastAPI (Python), Motor (async MongoDB)
- **Frontend:** React, Tailwind CSS, Shadcn/UI
- **Database:** MongoDB
- **AI:** emergentintegrations (GPT 5.2)
- **Auth:** JWT with passlib (director + coach roles)
- **Email:** Resend API

## User Roles
- **Director:** Full access, manages coaches, athletes, invites, roster
- **Coach:** Sees only assigned athletes, can use AI features for their athletes

## Completed Features

### Core Platform
- JWT-based auth (director/coach roles)
- Mission Control dashboard with priority alerts, momentum signals
- Athlete profiles with recruiting stages, momentum scores
- Decision Engine with intervention detection and ranking
- Support Pod with action management
- Event Mode with notes, schools, follow-ups
- Advocacy Mode with recommendations, intro messages
- Program Intelligence with metrics, trending

### AI Layer V1
- Mission Control Briefing
- Support Pod Insights
- Program Intelligence Analysis
- Advocacy Assistant

### AI Layer V2
- Suggested Next Actions
- Support Pod Brief
- Program Strategic Insights
- Event Follow-Up Suggestions
- AI Confidence Indicators on all V2 features

### Coach Invite System
- Director-only invite creation with email delivery (Resend)
- Token-based invite acceptance flow
- Resend, cancel, copy-link functionality
- Delivery tracking (sent/failed status)

### Roster Management
- Director-only roster page with coach-athlete grouping
- Athlete reassignment between coaches
- Unassignment with reason tracking
- Audit trail (reassignment_history)

### Team-Aware Invite Suggestions (Completed 2026-03-07)
- When a coach accepts an invite with a team context, the director sees a suggestion banner on the Invites page
- Banner shows unassigned athletes on that team with checkboxes
- Director can bulk-assign selected athletes or dismiss the suggestion
- Assignment is recorded in reassignment_log with team onboarding reason

### Documentation
- Auto-generated pages.html and gallery.html

## Key Credentials
- Director: director@capymatch.com / director123
- Coach Williams: coach.williams@capymatch.com / coach123
- Coach Garcia: coach.garcia@capymatch.com / coach123

## DB Schema (Key Collections)
- **users**: {id, email, password_hash, name, role, team, invited_by, created_at}
- **athletes**: {id, fullName, gradYear, position, team, primary_coach_id, unassigned_reason, ...}
- **invites**: {id, email, name, team, token, status, delivery_status, accepted_user_id, assignment_reviewed, ...}
- **reassignment_log**: {id, athlete_id, type, from_coach_id, to_coach_id, reason, ...}

## Upcoming Tasks (Prioritized Backlog)
- P1: Forgot Password Flow (secure password reset via Resend email)
- P2: Platform Integrations (calendars, messaging)
- P2: Smart Match Build (AI school-athlete pairing — concept at /app/SMART_MATCH_CONCEPT.md)
- P2: Unified Platform Merge (plan at /app/MERGE_ASSESSMENT_PLAN.md)
