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
- Athletes grouped by "Need Attention" and "On Track" with photos and status overlays

### Athlete Support Pod (Overview)
- Athlete photo in header
- Profile completeness scoring
- Hero card with contextual action buttons (Send Message, Log Check-In, Escalate, Resolve)
- Target school list with health classifications

### School Pod (Detail)
- School-specific health signals and engagement metrics
- Dynamic playbooks, school-scoped notes, actions, timeline

### Events System
- Event cards with athlete photo stacks and school counts
- Event Prep with athlete photos + status dot overlays
- **Live Signal Capture (Phase 5)**: Structured recruiting signals with 6 types. Auto pipeline updates, auto school pod routing, Add School button, grouped recent panel by athlete+school
- **Post-Event Summary (Phase 4)**: Dual action paths, athlete-centric grouping, routing progress tracker, school engagement heatmap, complete debrief button
- **Responsive Live Event Page**: Mobile-friendly with tabbed interface. VERIFIED

### Advocacy
- Recommendation cards with athlete photos

## Data Seeder
`backend/seed_fresh.py` — 5 athlete personas with AI-generated photos, 20 programs, 11 actions, 9 notes, 3 events, 6 event notes, 4 message threads

## Test Status
- Full regression: 25/25 PASS
- Hero card buttons: 12/12 PASS
- Live Mode Phase 3: 12/12 PASS
- Post-Event Summary Phase 4: 15/15 PASS
- Live Signal Capture Phase 5: 23/23 PASS
- Responsive Live Event Desktop: VERIFIED
- Post-Cleanup Smoke Test: PASS (dashboard + backend healthy)

## Codebase Cleanup (Mar 14, 2026)
Removed 30 unused frontend components, 26 stale planning docs, 42MB old codebase copy, and misc empty files. Zero regressions.

## Future/Backlog
- Parent/Family Experience (P1)
- AI-Powered Coach Summary (P2)
- Club Billing (Stripe)
- Multi-Agent Intelligence Pipeline
- Close the Action Loop (on hold)

## 3rd Party Integrations
- MongoDB, Resend (email), Stripe (payments)
