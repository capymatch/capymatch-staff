# CapyMatch - Primary User Roles

## Overview

CapyMatch serves multiple user roles across the recruiting ecosystem. Each role has distinct goals, primary actions, and access levels.

## Role Hierarchy

```
Club/Program
├── Club Director (full program access)
├── Club Coaches (assigned athletes)
└── Athletes
    └── Support Pod
        ├── Athlete (center)
        ├── Parent(s)
        ├── Club Coach
        ├── High School Coach (optional)
        └── Recruiting Advisor (optional)
```

---

## Club Director

### Profile
- Program leader
- Oversees multiple teams and coaches
- Responsible for program outcomes
- Resource allocator

### Goals
- Program-wide visibility into recruiting progress
- Resource allocation and coach assignment
- Outcome tracking and program success
- Identify support gaps across athletes
- Ensure no athlete falls through cracks

### Primary Actions
- Review program health in Mission Control
- Identify under-supported athletes
- Assign coaches to athletes
- Monitor momentum across grad years
- Analyze program intelligence metrics
- Review staff effectiveness
- Allocate resources to critical needs

### Access Level
- All 5 operating modes
- Full program visibility (all athletes, all teams)
- Staff management
- Program settings and configuration

### Primary Screens
- Mission Control (program-wide view)
- Program Intelligence dashboard
- Support Pod overview (all athletes)
- Event calendar (program-wide)
- Advocacy tracking (all coaches)

---

## Club Coach

### Profile
- Assigned to specific athletes
- Day-to-day support and advocacy
- Event attendance
- College coach relationships

### Goals
- Support assigned athletes through recruiting
- Coordinate with families and high school coaches
- Advocate to college coaches
- Track athlete momentum and progress
- Log event activity and follow-up
- Build and maintain college coach relationships

### Primary Actions
- Review athlete priorities in Mission Control
- Coordinate support in Support Pods
- Log event notes and interest
- Create athlete recommendations to colleges
- Communicate with pod members
- Track follow-ups and next actions
- Identify and resolve blockers

### Access Level
- All 5 operating modes
- Filtered to assigned athletes
- Can view related athletes for context
- Event mode for attended events
- Advocacy for their recommendations

### Primary Screens
- Mission Control (filtered to their athletes)
- Support Pod workspaces (assigned athletes)
- Event Mode (events they attend)
- Advocacy dashboard (their recommendations)
- Individual athlete drill-downs

---

## High School Coach

### Profile
- School-based coach
- Supporting student-athletes
- Different organizational context than club
- Often coordinating with club coaches

### Goals
- Support student-athletes in recruiting
- Coordinate with club coaches
- Advocate to college coaches
- Stay informed on athlete progress
- Provide school context and academic info

### Primary Actions
- Participate in Support Pods
- Log event notes and observations
- Communicate with pod members
- Create athlete recommendations
- Track athlete progress

### Access Level
- Support Pod (for their athletes)
- Event Mode (for events they attend)
- Advocacy Mode (their recommendations)
- Limited program intelligence (their athletes only)

### Primary Screens
- Support Pod workspaces
- Event Mode
- Advocacy dashboard
- Athlete progress views

---

## Parent

### Profile
- Athlete's guardian
- Key support pod member
- Coordinator of athlete logistics
- Decision-maker for recruiting choices

### Goals
- Understand recruiting progress
- Coordinate with coaches
- Support athlete through process
- Stay informed on opportunities
- Track next steps and responsibilities

### Primary Actions
- View Support Pod activity
- Communicate with coaches
- Track athlete progress
- Review opportunities and targets
- Complete assigned tasks
- Coordinate event logistics

### Access Level
- Athlete/Parent Workspace (existing)
- Support Pod visibility (their athlete)
- Read access to pod activity
- Communication with pod members
- Task management

### Primary Screens
- Athlete recruiting workspace (existing experience)
- Support Pod view (visibility into coordination)
- Communication hub
- Event schedule
- College target lists

---

## Athlete

### Profile
- Center of the recruiting process
- Student and competitor
- Support pod recipient
- Task executor

### Goals
- Manage recruiting process
- Stay organized
- Understand next steps
- Track progress toward goals
- Communicate with supporters

### Primary Actions
- Manage college target list
- Complete tasks and to-dos
- Communicate with coaches and family
- Update profile and achievements
- Log self-reported activity
- Review opportunities

### Access Level
- Athlete Workspace (existing - full access)
- Support Pod visibility (their own pod)
- View who is supporting them
- Communication with pod members
- Task management

### Primary Screens
- Athlete dashboard (existing experience)
- Support Pod view (visibility into their support)
- College target manager
- Task list
- Communication hub
- Profile and achievements

---

## Recruiting Advisor (Optional)

### Profile
- Third-party recruiting consultant
- Strategic advisor to athlete and family
- Often works with multiple athletes
- Provides specialized recruiting expertise

### Goals
- Provide strategic guidance
- Coordinate with coaches and family
- Help athlete navigate recruiting
- Optimize school targets and strategy
- Monitor progress and adjust approach

### Primary Actions
- Participate in Support Pods
- Provide strategic recommendations
- Review athlete strategy and targets
- Communicate with pod members
- Track progress against plan

### Access Level
- Support Pod (invited athletes only)
- Limited program intelligence (their athletes)
- Communication with pod members
- Strategic planning tools

### Primary Screens
- Support Pod workspaces
- Athlete strategy views
- Communication hub
- Progress tracking

---

## Role-Based Experience Design

### Shared Data, Different Views

All roles interact with the same core data objects:
- Athletes
- Schools
- Events
- Support Pods
- Communication
- Tasks

But each role sees **different UX, priorities, and workflows**.

### Example: Same Athlete, Different Views

**Club Director sees:**
- Athlete as part of program metrics
- Support pod health status
- Resource allocation needs
- Outcomes tracking

**Club Coach sees:**
- Athlete momentum and priorities
- Support coordination workspace
- Action items and blockers
- Advocacy opportunities

**Parent sees:**
- Athlete progress and next steps
- Who is supporting their child
- Communication hub
- Task responsibilities

**Athlete sees:**
- Personal recruiting workspace
- College targets and opportunities
- To-do list
- Support team visibility

---

## Access Control Matrix

| Role | Mission Control | Support Pod | Event Mode | Advocacy | Program Intelligence |
|------|----------------|-------------|------------|----------|---------------------|
| Club Director | Full (program) | All athletes | All events | All recs | Full access |
| Club Coach | Assigned athletes | Assigned athletes | Attended events | Their recs | Limited view |
| HS Coach | No access | Their athletes | Attended events | Their recs | No access |
| Parent | No access | Their athlete (view) | No access | No access | No access |
| Athlete | No access | Their pod (view) | No access | No access | No access |
| Advisor | No access | Invited athletes | No access | No access | Limited view |

---

## Design Implications

### For V1 (Mission Control)
- Focus on Club Director and Club Coach experience
- Mock realistic program data (director view)
- Mock assigned athlete data (coach view)
- Demonstrate role-based filtering

### For Future Phases
- Build Support Pod with multi-role coordination
- Add parent/athlete visibility into pods
- Create role-specific dashboards
- Enable role switching for staff users
