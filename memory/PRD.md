# CapyMatch — Product Requirements Document

## Overview
CapyMatch is a full-stack recruiting platform for volleyball coaches and athletes. Built with React + FastAPI + MongoDB.

## Core Users
- **Coaches**: Manage athletes, track school engagement, prepare for events, handle blockers
- **Athletes**: Manage profiles, respond to coach actions
- **Directors**: Organizational oversight (future)
- **Parents/Family**: Family experience (future)

## Architecture
- **Frontend**: React (port 3000) with Shadcn UI components
- **Backend**: FastAPI (port 8001) with MongoDB
- **Auth**: JWT-based authentication

## Current Features (Implemented)

### Dashboard / Mission Control
- Coach overview with athlete counts, attention flags, event prep alerts
- Athletes grouped by "Need Attention" and "On Track"
- Event prep reminders

### Athlete Support Pod (Overview)
- Profile completeness scoring
- Active issue detection (blockers, momentum drops, overdue actions)
- Target school list with health classifications
- Profile alert card with "Send Reminder" button

### School Pod (Detail)
- School-specific health signals and engagement metrics
- Dynamic playbooks based on school stage/health
- School-scoped notes and actions
- Timeline events and coach contact info

### Events System
- Event cards with prep status, athlete counts, school counts
- Event Prep page with checklists, athlete profiles, blockers, and target schools
- Event Summary page with captured notes, interest levels, follow-up tracking
- "Route to Pod" functionality for event notes → School Pod actions

### Profile Completeness
- Computed from 12 fields: full_name, photo_url, position, grad_year, height, bio, video_link, email, team, city, state, gpa
- Alert card on athlete overview when profile < 100%

## Data Seeder
**Status: COMPLETE (March 2026)**

`backend/seed_fresh.py` creates a clean, interconnected dataset:
- 5 athlete personas with distinct archetypes:
  - Emma Chen (hot_prospect) - 5 schools, strong pipeline
  - Olivia Anderson (blocked_docs) - missing transcript blocker
  - Marcus Johnson (gone_dark) - 22 days inactive
  - Sarah Martinez (narrow_list) - exploring, 3 schools
  - Lucas Rodriguez (healthy) - has USC offer, 100% profile
- 20 programs (target schools) with varied statuses
- 11 pod actions, 9 school-scoped notes, 8 timeline events
- 3 events (1 past, 2 upcoming) with 6 event notes
- 4 message threads

Test credentials:
- Coach: coach.williams@capymatch.com / coach123
- Athletes: [first].[last]@athlete.capymatch.com / athlete123

## Test Status
- Full regression: 25/25 backend tests PASS, all frontend flows PASS (March 2026)

## Pending Issues
- P1: Hero Card on Athlete Overview page lacks action buttons (Resolve, Escalate, Message)

## Upcoming Tasks (P1)
- Event "Live Mode" refinement (Phase 3)
- Event "Post-Event Summary" enhancement (Phase 4)

## Future/Backlog
- Close the Action Loop (athlete actions → program_metrics updates)
- Club Billing (Stripe subscriptions)
- Multi-Agent Intelligence Pipeline (Roster Stability, Scholarship, NIL Readiness)
- AI-Powered Coach Summary (LLM-generated recruiting pitches)
- Parent/Family Experience

## 3rd Party Integrations
- MongoDB
- Resend (email)
- Stripe (payments)
