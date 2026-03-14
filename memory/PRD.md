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
- Athlete photo in header, profile completeness scoring
- Hero card with contextual action buttons (Send Message, Log Check-In, Escalate, Resolve)
- Target school list with health classifications

### School Pod (Detail)
- School-specific health signals and engagement metrics
- Dynamic playbooks, school-scoped notes, actions, timeline

### Events System
- **Create Event**: Dialog modal on Events page
- **Manage Athletes**: Dialog on Prep page to add/remove athletes
- **Manage Schools**: Dialog on Prep page to add/remove schools (predefined + custom)
- Event Prep with checklist, target schools ranked by athlete overlap
- **Live Signal Capture**: Structured recruiting signals with 6 types
- **Post-Event Summary**: Dual action paths, routing progress tracker
- **Responsive Live Event Page**: Mobile tabbed interface

### Athlete Journey Page
- Getting Started Checklist with profile completion check (fixed: now reads actual profile data)
- Progress rail, timeline, coach watch, risk badges

### Advocacy
- Recommendation cards with athlete photos

## Data Seeder
`backend/seed_fresh.py` — 5 athlete personas, 20 programs, 11 actions, 9 notes, 3 events

## Bug Fixes
- **Journey profile checklist** (Mar 14, 2026): Fixed `profileComplete` to read from actual profile API (`/api/athlete/profile`) instead of program object which lacked the fields.

## Test Status
- Create Event: Backend 12/12, Frontend 100% (iteration_133)
- Manage Athletes: Backend 15/15, Frontend 100% (iteration_134)
- Manage Schools: Backend 20/20, Frontend 100% (iteration_135)
- Journey checklist bug: Screenshot verified ✅

## Future/Backlog
- Parent/Family Experience (P1)
- AI-Powered Coach Summary (P2)
- Club Billing (Stripe)
- Multi-Agent Intelligence Pipeline
- Close the Action Loop (on hold)

## 3rd Party Integrations
- MongoDB, Resend (email), Stripe (payments)
