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
- **Hero Card Carousel**: Filter pills (top-left), carousel controls (top-right, same line), compact card with progress rail dots
- Kanban board with drag-and-drop
- School cards with coach-assigned tasks shown with ATHLETE badge

### Athlete Journey Page
- **Coach-Assigned Actions Hero Card**: Context-aware CTAs based on action type
  - send_email → "Compose Email"
  - log_visit → "Log Visit"
  - log_interaction → "Log It"
  - preparation → "Mark Done"
  - research → "Mark Done"
  - profile_update → "Update Profile"
  - reply → "Reply"
  - general → "Mark Done"
- **Coach Messages in Timeline**: Support messages from coaches appear as timeline entries with "Coach Message" label
- Progress rail, coach flags, school intelligence

### Messages / Inbox
- Gmail-style inbox: 3-column layout (Sender | Subject - snippet | Time)
- Unread/read grouping, click-to-open thread detail
- Coach and athlete can both see and reply
- Coach sidebar includes Messages link with unread badge

### Events System
- Create Event, manage athletes/schools on Prep page
- Live Signal Capture, Post-Event Summary
- Responsive Live Event Page

### Coach School Pod
- **Smart Action Types**: When assigning to athlete, coach picks action type (Send Email, Log Visit, Log Interaction, Preparation, Profile Update, Research, Reply, General)
- **"Assign to Athlete" toggle** with action type dropdown
- **"Sent to Athlete" badge** on assigned actions
- Action bar: Log, Email, Follow-up, Notes, Escalate

### Coach → Athlete Action Flow (Complete End-to-End)
1. Coach creates action in School Pod with "Assign to Athlete" ON + selects action type
2. Action stored in `pod_actions` with `assigned_to_athlete: true` and `action_type`
3. **Pipeline hero card**: Top Action Engine picks up assigned actions as Priority 2
4. **Journey hero card**: Context-aware CTA based on action type
5. **Athlete completes**: "Mark Done" updates status to "completed" in pod_actions
6. **Coach sees**: Completed status in school pod

### Advocacy
- Recommendation cards with athlete photos

## Key API Endpoints
- `POST /api/support-pods/{athlete_id}/school/{program_id}/actions` — Create action (with assigned_to_athlete, action_type)
- `GET /api/athletes/me/school/{program_id}/assigned-actions` — Athlete's assigned actions per school
- `PATCH /api/athletes/me/assigned-actions/{action_id}/complete` — Mark action as done
- `GET /api/support-messages/inbox` — Gmail-style inbox
- `POST /api/support-messages/{thread_id}/reply` — Reply to thread
- `GET /api/athlete/programs/{program_id}/journey` — Journey data (now includes coach messages in timeline)

## Key Collections
- `pod_actions`: `{id, athlete_id, program_id, title, owner, assigned_to_athlete, action_type, status, due_date, created_by, completed_at, completed_by}`
- `support_threads`: `{id/thread_id, athlete_id, subject, participant_ids, created_by, last_message_at, last_snippet}`
- `support_messages`: `{id, thread_id, body, sender_id, sender_name, sender_role, read_by, created_at}`

## Future/Backlog
- Parent/Family Experience (P1)
- AI-Powered Coach Summary (P2)
- Club Billing (Stripe)
- Multi-Agent Intelligence Pipeline
- Close the Action Loop

## 3rd Party Integrations
- MongoDB, Resend (email), Stripe (payments)

## Test Credentials
- Coach: coach.williams@capymatch.com / coach123
- Athlete: emma.chen@capymatch.com / athlete123
