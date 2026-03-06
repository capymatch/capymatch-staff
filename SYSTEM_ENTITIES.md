# CapyMatch - Core System Entities

## Overview

These are the major data objects that power the CapyMatch coach/club operating system. They are shared across role-based experiences and form the foundation of the platform.

---

## Athlete

**Primary Entity:** The center of all recruiting activity

### Core Attributes
```javascript
{
  id: string,
  firstName: string,
  lastName: string,
  email: string,
  phone: string,
  
  // Athletic Info
  gradYear: number, // 2025, 2026, 2027, etc.
  sport: string,
  position: string,
  secondaryPosition: string (optional),
  
  // Academic Info
  gpa: number,
  testScores: { sat: number, act: number },
  academicInterests: string[],
  
  // Program Assignment
  clubId: string,
  teamId: string,
  primaryCoachId: string,
  highSchool: string,
  
  // Recruiting Status
  recruitingStage: enum [
    'exploring',
    'actively_recruiting',
    'narrowing',
    'committed',
    'signed'
  ],
  commitmentDate: date (optional),
  committedSchool: string (optional),
  
  // Momentum & Intelligence
  momentumScore: number, // -10 to +10
  momentumTrend: enum ['rising', 'stable', 'declining'],
  lastActivity: date,
  daysSinceActivity: number,
  
  // Support Pod
  supportPodMembers: array<PodMember>,
  
  // Related Objects
  schoolTargets: array<SchoolTarget>,
  events: array<Event>,
  clips: array<Clip>,
  notes: array<Note>,
  
  // Metadata
  createdAt: date,
  updatedAt: date
}
```

### Key Relationships
- Has one Support Pod
- Has many School Targets
- Attends many Events
- Has many Momentum Signals
- Has many Clips and Documents
- Assigned to Club, Team, Coach

---

## Support Pod

**Purpose:** Collaborative support structure around each athlete

### Core Attributes
```javascript
{
  id: string,
  athleteId: string,
  
  // Pod Members
  members: [
    {
      userId: string,
      role: enum ['athlete', 'parent', 'club_coach', 'hs_coach', 'advisor'],
      isPrimary: boolean,
      joinedDate: date,
      status: enum ['active', 'inactive']
    }
  ],
  
  // Pod Health
  lastCoordination: date,
  coordinationFrequency: number, // days between check-ins
  activeBlockers: number,
  overdueActions: number,
  
  // Current State
  currentPriorities: array<string>,
  activeBlockers: array<Blocker>,
  upcomingMilestones: array<Milestone>,
  
  // Ownership Map
  nextActions: [
    {
      ownerId: string,
      action: string,
      dueDate: date,
      status: enum ['pending', 'in_progress', 'completed', 'blocked']
    }
  ],
  
  // Metadata
  createdAt: date,
  updatedAt: date
}
```

### Key Relationships
- Belongs to one Athlete
- Has many Pod Members (Users)
- Has many Actions
- Has many Blockers

---

## Momentum Signal

**Purpose:** Track positive and negative recruiting momentum indicators

### Core Attributes
```javascript
{
  id: string,
  athleteId: string,
  
  // Signal Details
  signalType: enum [
    // Positive
    'new_interest',
    'coach_response',
    'camp_invite',
    'unofficial_visit',
    'official_visit',
    'offer_received',
    'increased_communication',
    
    // Negative
    'no_activity',
    'missed_deadline',
    'ghosting',
    'decreased_communication',
    'lost_interest',
    'removed_from_board'
  ],
  
  sentiment: enum ['positive', 'neutral', 'negative'],
  impactScore: number, // -10 to +10
  
  // Context
  description: string,
  schoolId: string (optional),
  eventId: string (optional),
  
  // Action Needed
  requiresAction: boolean,
  actionType: string (optional),
  actionDueDate: date (optional),
  actionOwnerId: string (optional),
  
  // Metadata
  detectedBy: enum ['system', 'coach', 'athlete', 'parent'],
  detectedAt: date,
  resolvedAt: date (optional),
  
  createdAt: date
}
```

### Key Relationships
- Belongs to one Athlete
- May relate to School Target
- May relate to Event
- May generate Action/Task

---

## School Target

**Purpose:** Track schools athlete is targeting and school interest level

### Core Attributes
```javascript
{
  id: string,
  athleteId: string,
  
  // School Info
  schoolId: string,
  schoolName: string,
  division: enum ['D1', 'D2', 'D3', 'NAIA', 'NJCAA'],
  conference: string,
  
  // Interest Levels
  athleteInterest: enum ['high', 'medium', 'low', 'reach', 'safety'],
  schoolInterest: enum [
    'unknown',
    'no_interest',
    'watching',
    'recruiting',
    'strong_interest',
    'offer_extended'
  ],
  
  // Fit Assessment
  fitLevel: enum ['excellent', 'good', 'moderate', 'poor'],
  fitNotes: string,
  academicFit: boolean,
  athleticFit: boolean,
  culturalFit: boolean,
  financialFit: boolean,
  
  // Coaches
  primaryCoach: {
    name: string,
    email: string,
    phone: string
  },
  
  // Communication History
  lastContact: date,
  contactFrequency: string,
  communicationLog: array<Communication>,
  
  // Relationship Context
  relationshipStrength: enum ['cold', 'warm', 'hot'],
  coachRelationshipOwner: string, // which CapyMatch coach has relationship
  
  // Next Steps
  nextAction: string,
  nextActionDate: date,
  nextActionOwner: string,
  
  // Status
  status: enum [
    'researching',
    'initial_contact',
    'active_communication',
    'visit_scheduled',
    'offer_received',
    'declined',
    'committed'
  ],
  
  // Metadata
  addedDate: date,
  updatedAt: date
}
```

### Key Relationships
- Belongs to one Athlete
- References School (master data)
- Has many Communication records
- May have Advocacy Recommendations

---

## Event

**Purpose:** Track tournaments, showcases, camps, and recruiting events

### Core Attributes
```javascript
{
  id: string,
  
  // Event Details
  name: string,
  eventType: enum [
    'tournament',
    'showcase',
    'camp',
    'combine',
    'unofficial_visit',
    'official_visit'
  ],
  
  // Date & Location
  startDate: date,
  endDate: date,
  location: {
    venue: string,
    city: string,
    state: string
  },
  
  // Participants
  athletes: array<{
    athleteId: string,
    status: enum ['registered', 'confirmed', 'attended', 'no_show']
  }>,
  
  attendingCoaches: array<string>, // coach user IDs
  
  // Expected Schools
  expectedSchools: array<{
    schoolId: string,
    schoolName: string,
    coaches: array<string>,
    priority: enum ['high', 'medium', 'low']
  }>,
  
  // Event Intelligence
  schoolsSpotted: array<{
    schoolId: string,
    coachNames: array<string>,
    spottedBy: string,
    timestamp: date
  }>,
  
  // Event Activity
  interestLogged: array<{
    athleteId: string,
    schoolId: string,
    interestLevel: enum ['high', 'medium', 'low'],
    notes: string,
    loggedBy: string,
    timestamp: date
  }>,
  
  notes: array<{
    athleteId: string,
    note: string,
    createdBy: string,
    timestamp: date
  }>,
  
  // Pre-Event
  prepStatus: enum ['not_started', 'in_progress', 'ready'],
  targetsSet: boolean,
  
  // Post-Event
  eventComplete: boolean,
  followUpsGenerated: boolean,
  summaryCreated: boolean,
  
  // Metadata
  createdAt: date,
  updatedAt: date
}
```

### Key Relationships
- Has many Athletes
- Has many attending Coaches
- Has many expected Schools
- Generates many Momentum Signals
- Generates many Follow-up Actions

---

## Recommendation (Advocacy)

**Purpose:** Coach-to-college athlete recommendations

### Core Attributes
```javascript
{
  id: string,
  
  // Recommendation Details
  athleteId: string,
  recommendingCoachId: string,
  targetSchoolIds: array<string>,
  
  // Recommendation Package
  fitNotes: string,
  athleticStrengths: array<string>,
  academicHighlights: string,
  characterNotes: string,
  
  // Supporting Materials
  clips: array<{
    clipId: string,
    title: string,
    url: string
  }>,
  
  stats: object,
  transcript: boolean,
  
  // Introduction
  introductionText: string, // coach-written introduction
  personalizedBySchool: object, // school-specific customization
  
  // Delivery
  sentDate: date,
  deliveryMethod: enum ['email', 'phone', 'in_person', 'platform'],
  
  // Response Tracking
  responses: array<{
    schoolId: string,
    responseDate: date,
    responseType: enum ['interested', 'not_interested', 'need_more_info'],
    notes: string,
    followUpNeeded: boolean
  }>,
  
  // Status
  status: enum [
    'draft',
    'ready',
    'sent',
    'response_received',
    'follow_up_needed',
    'closed'
  ],
  
  // Relationship Context
  coachRelationshipNotes: string,
  relationshipStrength: enum ['strong', 'moderate', 'new'],
  
  // Metadata
  createdAt: date,
  sentAt: date,
  updatedAt: date
}
```

### Key Relationships
- Belongs to one Athlete
- Created by one Coach (recommending)
- Targets multiple Schools
- May generate Momentum Signals
- May generate Follow-up Actions

---

## Action / Task

**Purpose:** Track actionable items across support pod

### Core Attributes
```javascript
{
  id: string,
  
  // Action Details
  title: string,
  description: string,
  actionType: enum [
    'follow_up',
    'prepare_materials',
    'schedule_call',
    'attend_event',
    'update_profile',
    'send_email',
    'complete_application',
    'coordinate_support',
    'resolve_blocker'
  ],
  
  // Context
  athleteId: string,
  supportPodId: string,
  relatedSchoolId: string (optional),
  relatedEventId: string (optional),
  
  // Ownership
  ownerId: string,
  ownerRole: enum ['coach', 'parent', 'athlete', 'advisor'],
  assignedBy: string,
  
  // Priority & Timing
  priority: enum ['critical', 'high', 'medium', 'low'],
  dueDate: date,
  reminderDate: date (optional),
  
  // Status
  status: enum ['pending', 'in_progress', 'blocked', 'completed', 'cancelled'],
  
  // Blocker Info
  isBlocked: boolean,
  blockerReason: string (optional),
  blockerResolvedBy: string (optional),
  
  // Completion
  completedDate: date (optional),
  completedBy: string (optional),
  completionNotes: string (optional),
  
  // Metadata
  createdAt: date,
  updatedAt: date
}
```

### Key Relationships
- Belongs to one Athlete
- Belongs to one Support Pod
- Assigned to one User (owner)
- May relate to School Target
- May relate to Event

---

## Program

**Purpose:** Club or organization containing teams and athletes

### Core Attributes
```javascript
{
  id: string,
  
  // Program Details
  name: string,
  sport: string,
  organizationType: enum ['club', 'high_school', 'academy'],
  
  // Leadership
  directorId: string,
  coaches: array<{
    coachId: string,
    role: enum ['director', 'head_coach', 'assistant_coach'],
    teams: array<string>
  }>,
  
  // Structure
  teams: array<{
    teamId: string,
    name: string,
    gradYear: number,
    headCoachId: string,
    athletes: array<string>
  }>,
  
  // Athletes
  totalAthletes: number,
  athletesByGradYear: object,
  athletesByStage: object,
  
  // Program Metrics
  activeSupport Pods: number,
  athletesNeedingAttention: number,
  upcomingEvents: number,
  activeRecommendations: number,
  
  // Outcomes
  commitments: array<{
    athleteId: string,
    schoolId: string,
    commitmentDate: date,
    division: string
  }>,
  
  // Settings
  settings: object,
  
  // Metadata
  createdAt: date,
  updatedAt: date
}
```

### Key Relationships
- Has many Teams
- Has many Athletes
- Has many Coaches
- Has one Director

---

## Communication Thread

**Purpose:** Track conversations within support pods and with college coaches

### Core Attributes
```javascript
{
  id: string,
  
  // Thread Type
  threadType: enum ['support_pod', 'college_coach', 'internal'],
  
  // Participants
  participants: array<string>, // user IDs
  
  // Context
  athleteId: string (optional),
  schoolId: string (optional),
  supportPodId: string (optional),
  
  // Messages
  messages: array<{
    messageId: string,
    senderId: string,
    content: string,
    timestamp: date,
    readBy: array<string>
  }>,
  
  // Status
  lastActivity: date,
  unreadCount: object, // by user ID
  
  // Metadata
  createdAt: date,
  updatedAt: date
}
```

### Key Relationships
- May belong to Support Pod
- May relate to Athlete
- May relate to School Target
- Has many Messages

---

## Clip / Document

**Purpose:** Store athletic clips, transcripts, test scores, other materials

### Core Attributes
```javascript
{
  id: string,
  
  // Content Details
  title: string,
  description: string,
  fileType: enum ['video', 'document', 'image', 'link'],
  
  // Storage
  url: string,
  thumbnailUrl: string (optional),
  fileSize: number,
  duration: number (optional, for video),
  
  // Ownership
  athleteId: string,
  uploadedBy: string,
  
  // Categorization
  category: enum [
    'highlight_reel',
    'game_film',
    'skill_video',
    'transcript',
    'test_scores',
    'resume',
    'reference_letter',
    'other'
  ],
  
  tags: array<string>,
  
  // Usage
  usedInRecommendations: array<string>, // recommendation IDs
  sharedWith: array<string>, // user or school IDs
  
  // Metadata
  createdAt: date,
  updatedAt: date
}
```

### Key Relationships
- Belongs to one Athlete
- May be included in Recommendations
- May be shared with Schools

---

## Data Model Summary

### Entity Relationship Diagram (Conceptual)

```
Program
  └── has many Teams
  └── has many Coaches
  └── has many Athletes

Athlete (center)
  ├── has one SupportPod
  ├── has many SchoolTargets
  ├── has many MomentumSignals
  ├── has many Events (attendance)
  ├── has many Actions/Tasks
  ├── has many Clips/Documents
  └── has many Recommendations

SupportPod
  ├── has many PodMembers (Users)
  ├── has many Actions
  └── has many CommunicationThreads

Event
  ├── has many Athletes
  ├── has many Coaches
  ├── has many Schools (expected/spotted)
  └── generates many MomentumSignals

Recommendation
  ├── belongs to Athlete
  ├── created by Coach
  ├── targets many Schools
  └── includes many Clips
```

---

## Implementation Notes

### For V1 (Mission Control)
Focus on these entities:
- Athlete (with momentum scoring)
- Momentum Signal
- School Target
- Event (upcoming)
- Action/Task
- Program (basic structure)

### For V1.5 (Support Pod)
Add:
- Support Pod (full implementation)
- Pod Members
- Communication Thread

### For V2 (Event Mode + Advocacy)
Add:
- Event (full workflow)
- Recommendation
- Clip/Document

### For V2.5 (Program Intelligence)
Expand:
- Program (full metrics)
- Team
- Advanced analytics objects
