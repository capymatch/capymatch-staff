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

### Athlete Pipeline (My Schools)
- **Hero Card Carousel**: Compact card with filter pills (top-left), carousel arrows + counter (top-right, same line). School-first layout with logo, progress rail dots (no labels), metadata badges, "What to do next" advice box, CTA button.
- Kanban board with drag-and-drop (Added, Outreach, Talking, Visit, Offered)
- School cards with status badges, action items

### Athlete Journey Page
- Getting Started Checklist with profile completion check (reads actual profile data)
- Progress rail, timeline, coaching staff section, coach flags

### Events System
- **Create Event**: Dialog modal on Events page
- **Manage Athletes**: Dialog on Prep page to add/remove athletes
- **Manage Schools**: Dialog on Prep page to add/remove schools (predefined + custom)
- Event Prep with checklist, target schools
- **Live Signal Capture**: Structured recruiting signals
- **Post-Event Summary**: Dual action paths
- **Responsive Live Event Page**: Mobile tabbed interface

### Advocacy
- Recommendation cards with athlete photos

## Bug Fixes
- Journey profile checklist: Fixed to read actual profile API data
- Hero card layout: Fixed filter pills + carousel controls on same line, compact card design
- Filter count: Fixed "All" filter showing total schools count

## Test Status
- Create Event: Backend 12/12, Frontend 100% (iteration_133)
- Manage Athletes: Backend 15/15, Frontend 100% (iteration_134)
- Manage Schools: Backend 20/20, Frontend 100% (iteration_135)
- Hero card carousel: Verified - filters top-left, arrows top-right (same line), navigation working, filter switching working

## Future/Backlog
- Parent/Family Experience (P1)
- AI-Powered Coach Summary (P2)
- Club Billing (Stripe)
- Multi-Agent Intelligence Pipeline
- Close the Action Loop (on hold)

## 3rd Party Integrations
- MongoDB, Resend (email), Stripe (payments)
