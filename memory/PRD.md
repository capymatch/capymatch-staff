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
- **Create Event**: Dialog modal on Events page with name, type, date, location, expected schools
- **Manage Athletes**: Dialog on Prep page to add/remove athletes with photo roster, toggle buttons, MongoDB persistence
- **Manage Schools**: Dialog on Prep page to add/remove schools from events. Shows 10 predefined D1 schools with toggle Add/Remove. Supports custom school names. Persists to MongoDB.
- Event cards with athlete photo stacks and school counts
- Event Prep with athlete photos, status dots, prep checklist, target schools ranked by athlete overlap
- **Live Signal Capture**: Structured recruiting signals with 6 types. Auto pipeline updates.
- **Post-Event Summary**: Dual action paths, athlete-centric grouping, routing progress tracker.
- **Responsive Live Event Page**: Mobile tabbed interface.

### Advocacy
- Recommendation cards with athlete photos

## Data Seeder
`backend/seed_fresh.py` — 5 athlete personas with AI-generated photos, 20 programs, 11 actions, 9 notes, 3 events, 6 event notes, 4 message threads

## Test Status
- Create Event: Backend 12/12, Frontend 100% (iteration_133)
- Manage Athletes: Backend 15/15, Frontend 100% (iteration_134)
- Manage Schools: Backend 20/20, Frontend 100% (iteration_135)

## Future/Backlog
- Parent/Family Experience (P1)
- AI-Powered Coach Summary (P2)
- Club Billing (Stripe)
- Multi-Agent Intelligence Pipeline
- Close the Action Loop (on hold)

## 3rd Party Integrations
- MongoDB, Resend (email), Stripe (payments)
