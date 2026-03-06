# CapyMatch - Screen Map & Priorities

## Overview

This document maps all screens for the CapyMatch coach/club operating system, organized by priority and operating mode.

---

## Priority Structure

- **P0 = V1 - Mission Control** (Current Phase)
- **P1 = V1.5 - Support Pod**
- **P2 = V2 - Event Mode + Advocacy**
- **P3 = V2.5 - Program Intelligence**
- **P4 = Ongoing - Settings & Admin**

---

## P0: Mission Control (V1 - Current Phase)

### 1. Mission Control Dashboard
**Route:** `/mission-control` (default home)

**Purpose:**  
Command center that answers:
- Which athletes need help right now?
- What changed today?
- Which athletes are losing momentum?
- Where are the support bottlenecks?
- Which opportunities need action soon?

**Key Sections:**
- Priority alerts (athletes needing attention)
- What changed today (momentum feed)
- Athletes needing attention (card-based)
- Critical upcoming dates
- Quick actions panel
- Program snapshot

**User Roles:** Club Director, Club Coach (filtered)

**Why P0:**  
Mission Control defines the tone, intelligence, and differentiation of the entire product. It's the entry point that proves this is an operating system, not a dashboard.

---

## P1: Support Pod (V1.5)

### 2. Support Pod List
**Route:** `/support-pods`

**Purpose:**  
Overview of all athletes with support pod status

**Key Features:**
- Card or list view of all athletes
- Pod health indicators
- Active blockers count
- Last coordination date
- Filter by grad year, team, pod health
- Search athletes

**User Roles:** Club Director (all), Club Coach (assigned)

**Why P1:**  
Bridge between Mission Control and individual athlete coordination. Helps coaches navigate to specific Support Pod workspaces.

---

### 3. Individual Support Pod Workspace
**Route:** `/support-pods/:athleteId`

**Purpose:**  
Collaborative support center for a single athlete

**Key Sections:**
- Athlete overview header
- Pod member map (who's who)
- Recent momentum & changes
- Current blockers
- Next actions by owner
- Communication feed
- Quick coordination tools

**User Roles:** All pod members (coach, parent, hs coach, advisor, athlete)

**Why P1:**  
This is where support coordination happens. Critical for demonstrating family-aware, pod-based support model.

---

## P2: Event Mode (V2)

### 4. Event Calendar / List
**Route:** `/events`

**Purpose:**  
View upcoming, live, and past events with prep status

**Key Features:**
- Calendar and list view toggle
- Event cards with prep status
- Athletes attending
- Expected schools
- Coach assignments
- Filter by date range, event type

**User Roles:** Club Director, Club Coach

**Why P2:**  
Event intelligence is a key differentiator. Sets up the live recruiting workflow.

---

### 5. Event Prep View
**Route:** `/events/:eventId/prep`

**Purpose:**  
Pre-event planning and preparation

**Key Features:**
- Athletes attending
- Target schools set per athlete
- Expected college coaches
- Pre-event strategy notes
- Materials checklist
- Coach assignments

**User Roles:** Club Coach (primary)

**Why P2:**  
Ensures coaches go into events prepared with clear targets. Part of event intelligence.

---

### 6. Live Event Mode
**Route:** `/events/:eventId/live`

**Purpose:**  
Fast capture during tournaments and showcases

**Key Features:**
- Quick athlete selector
- Schools spotted logger
- Interest level capture (high/medium/low)
- Fast notes (voice-style)
- Clip tagging
- Timestamp everything
- Minimal UI, maximum speed

**User Roles:** Club Coach, HS Coach

**Why P2:**  
This is a mobile-first, high-pressure workflow. Differentiates CapyMatch with intelligent event capture.

---

### 7. Post-Event Summary
**Route:** `/events/:eventId/summary`

**Purpose:**  
Event recap and follow-up generation

**Key Features:**
- Auto-generated event summary
- Interest logged by athlete
- Schools spotted
- Follow-ups needed
- Generate follow-up tasks
- Share summary with pod members

**User Roles:** Club Coach (primary)

**Why P2:**  
Closes the event loop. Turns event activity into actionable follow-ups and momentum signals.

---

## P2: Advocacy Mode (V2)

### 8. Advocacy Dashboard
**Route:** `/advocacy`

**Purpose:**  
Track active recommendations and college coach relationships

**Key Features:**
- Active recommendations
- Recommendations by status (draft, sent, response received)
- School relationships
- Response tracking
- Follow-up needed

**User Roles:** Club Coach, Club Director

**Why P2:**  
Advocacy is a core differentiator. Helps coaches proactively promote athletes to colleges.

---

### 9. Create Recommendation
**Route:** `/advocacy/new` or `/athletes/:athleteId/recommend`

**Purpose:**  
Package athlete introduction for college coaches

**Key Features:**
- Select target schools
- Write fit notes
- Attach clips
- Add athletic strengths
- Academic highlights
- Character notes
- Customize by school
- Preview and send

**User Roles:** Club Coach, HS Coach

**Why P2:**  
This is where coach advocacy becomes structured and trackable. Premium workflow.

---

### 10. School Relationships
**Route:** `/advocacy/schools` or `/advocacy/schools/:schoolId`

**Purpose:**  
Manage relationships with college coaches

**Key Features:**
- Schools coach has relationships with
- Relationship strength
- Athletes recommended to each school
- Communication history
- Next contact date
- Relationship notes

**User Roles:** Club Coach, Club Director

**Why P2:**  
Helps coaches manage their network and track which schools they can effectively advocate to.

---

## P3: Program Intelligence (V2.5)

### 11. Program Overview
**Route:** `/program`

**Purpose:**  
Strategic metrics for program leaders

**Key Features:**
- Athletes by grad year
- Recruiting stage distribution
- Commitments and outcomes
- Support pod health across program
- Coach effectiveness
- Event participation

**User Roles:** Club Director (primary)

**Why P3:**  
Strategic layer for directors. Helps allocate resources and identify program-wide gaps.

---

### 12. Readiness by Team / Grad Year
**Route:** `/program/readiness`

**Purpose:**  
Understand which athletes are on track by cohort

**Key Features:**
- Grad year breakdown
- Recruiting stage by athlete
- Momentum trends
- Support pod health
- At-risk athletes

**User Roles:** Club Director

**Why P3:**  
Helps directors understand program readiness and identify athletes falling behind.

---

### 13. Support Gap Analysis
**Route:** `/program/support-gaps`

**Purpose:**  
Identify under-supported athletes

**Key Features:**
- Athletes without active support pods
- Athletes with overdue actions
- Athletes with declining momentum
- Coach workload distribution
- Recommended interventions

**User Roles:** Club Director

**Why P3:**  
Ensures no athlete falls through the cracks. Program-wide support intelligence.

---

## P4: Settings & Configuration (Ongoing)

### 14. User Profile & Preferences
**Route:** `/profile`

**Purpose:**  
User account management

**Key Features:**
- Profile info
- Notification preferences
- Email digest settings
- Role information

**User Roles:** All

**Why P4:**  
Standard account management. Build as needed.

---

### 15. Program Settings
**Route:** `/program/settings`

**Purpose:**  
Program configuration and administration

**Key Features:**
- Program details
- Team management
- Coach assignments
- Athlete roster
- Integration settings

**User Roles:** Club Director only

**Why P4:**  
Admin functionality. Build after core operating modes proven.

---

### 16. Support Pod Configuration
**Route:** `/support-pods/:athleteId/settings`

**Purpose:**  
Configure individual support pod

**Key Features:**
- Add/remove pod members
- Set primary coach
- Invite high school coach or advisor
- Pod preferences

**User Roles:** Club Coach, Club Director

**Why P4:**  
Pod administration. Build after Support Pod core experience validated.

---

## Additional Screens (Future Consideration)

### Athlete Profile Detail
**Route:** `/athletes/:athleteId`

Full athlete profile with all recruiting details. May be integrated into Support Pod Workspace rather than standalone screen.

### School Profile Detail
**Route:** `/schools/:schoolId`

School information, athletes targeting, relationship history. May be integrated into Advocacy Mode.

### Communication Hub
**Route:** `/messages`

Centralized messaging. May be integrated into each operating mode contextually rather than standalone inbox.

### Notifications Center
**Route:** `/notifications`

Alert history. May be surfaced through global notification panel rather than dedicated screen.

---

## Screen Map Summary

### V1 (P0) - Mission Control
1. Mission Control Dashboard ✓ (Current Phase)

### V1.5 (P1) - Support Pod
2. Support Pod List
3. Individual Support Pod Workspace

### V2 (P2) - Event Mode + Advocacy
4. Event Calendar / List
5. Event Prep View
6. Live Event Mode
7. Post-Event Summary
8. Advocacy Dashboard
9. Create Recommendation
10. School Relationships

### V2.5 (P3) - Program Intelligence
11. Program Overview
12. Readiness by Team / Grad Year
13. Support Gap Analysis

### Ongoing (P4) - Settings
14. User Profile & Preferences
15. Program Settings
16. Support Pod Configuration

---

## Navigation Flow

### Primary Entry Points

**For Club Director:**
Mission Control (default) → Support Pods → Program Intelligence → Events → Advocacy

**For Club Coach:**
Mission Control (default) → Support Pods → Events → Advocacy

**For HS Coach:**
Support Pods (default) → Events → Advocacy

**For Parent:**
Athlete Workspace (default) → Support Pod (view)

**For Athlete:**
Athlete Workspace (default) → Support Pod (view)

---

## Screen Design Principles

### 1. No Dead Ends
Every screen should have clear next actions. Never leave users wondering what to do.

### 2. Contextual Navigation
Navigation should change based on mode. Not static left nav.

### 3. Progressive Disclosure
Start with overview, allow drill-down. Don't overwhelm.

### 4. Action-Oriented
Buttons, cards, and interfaces should suggest actions, not just display data.

### 5. Mobile-First for Operational Screens
Mission Control, Event Mode, Support Pod coordination must work on mobile.

### 6. Desktop-Optimized for Strategic Screens
Program Intelligence, Advocacy Management benefit from larger screens.

---

## Implementation Priority for V1

**Must Build (P0):**
- Mission Control Dashboard

**Nice to Have (P0.5):**
- Basic athlete detail drill-down from Mission Control
- Quick action modals (log note, create task)

**Defer to V1.5:**
- Full Support Pod experience
- Communication threading
- All other modes
