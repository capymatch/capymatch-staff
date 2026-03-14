# CapyMatch — Product Requirements Document

## Overview
CapyMatch is a full-stack recruiting platform for volleyball coaches and athletes. Built with React + FastAPI + MongoDB.

## Core Users
- **Coaches**: Manage athletes, track school engagement, prepare for events, assign actions
- **Athletes**: Manage profiles, respond to coach actions, track school pipeline
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
- School cards with status badges, action items, coach-assigned tasks with ATHLETE badge

### Athlete Journey Page
- Getting Started Checklist with profile completion check
- **Coach-Assigned Actions Hero Card**: Shows pending tasks from coach with title, due date, assigner, and "Take Action" button
- Progress rail, timeline, coaching staff section, coach flags

### Messages / Inbox
- **Gmail-style inbox**: 3-column layout (Sender | Subject - snippet | Time)
- Unread/read grouping with teal dot indicators
- Click-to-open thread detail with message cards and reply box
- Coach and athlete can both see and reply to threads
- Coach sidebar includes Messages link with unread badge

### Events System
- Create Event dialog, manage athletes and schools on Prep page
- Live Signal Capture with structured recruiting signals
- Post-Event Summary with dual action paths
- Responsive Live Event Page

### Coach School Pod
- **Assign to Athlete toggle**: When creating action items, coach can assign to athlete
- **"Sent to Athlete" badge**: Visual indicator on assigned actions
- Action bar: Log, Email, Follow-up, Notes, Escalate

### Coach → Athlete Action Flow
- Coach creates action in School Pod with "Assign to Athlete" toggle ON
- Action stored in `pod_actions` with `assigned_to_athlete: true`
- **Pipeline hero card**: Top Action Engine picks up assigned actions as Priority 2
- **Journey hero card**: Dedicated card shows pending coach tasks per school
- **Kanban cards**: Show "Complete Coach's Task" with ATHLETE badge

### Advocacy
- Recommendation cards with athlete photos

## Key API Endpoints
- `POST /api/support-pods/{athlete_id}/school/{program_id}/actions` — Create action (with assigned_to_athlete)
- `GET /api/athletes/me/school/{program_id}/assigned-actions` — Athlete's assigned actions per school
- `GET /api/athletes/me/assigned-actions` — All athlete assigned actions
- `GET /api/support-messages/inbox` — Gmail-style inbox (coach + athlete)
- `POST /api/support-messages/{thread_id}/reply` — Reply to thread
- `GET /api/support-messages/unread-count` — Unread message count

## Bug Fixes Applied
- Messages `thread_id` vs `id` field inconsistency across inbox, reply, thread detail, and unread count endpoints
- Coach inbox query now includes `created_by` to show threads they created
- Top Action Engine template variables now correctly replaced (coach_name, action_title)
- Hero card carousel: filters top-left, arrows top-right (same line)
- Progress rail: separated dots/lines from labels row for clean alignment

## Future/Backlog
- Parent/Family Experience (P1)
- AI-Powered Coach Summary (P2)
- Club Billing (Stripe)
- Multi-Agent Intelligence Pipeline
- Close the Action Loop (on hold)

## 3rd Party Integrations
- MongoDB, Resend (email), Stripe (payments)

## Test Credentials
- Coach: coach.williams@capymatch.com / coach123
- Athlete: emma.chen@capymatch.com / athlete123
