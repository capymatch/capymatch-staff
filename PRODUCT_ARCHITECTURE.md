# CapyMatch Coach/Club Operating System - Product Architecture

## Vision

CapyMatch is building a **recruiting operating system** for clubs, coaches, families, and athletes.

This is not a traditional recruiting CRM or generic coach dashboard. This is a new category of product designed to actively coordinate support, surface priorities, identify blockers, and help coaches and families know what to do next.

## Strategic Positioning

### What CapyMatch Is NOT:
- Traditional recruiting CRM
- Generic admin portal
- Profile management system
- Activity tracking dashboard
- Message inbox

### What CapyMatch IS:
- Recruiting operating system
- Support coordination platform
- Coach advocacy tool
- Athlete momentum tracker
- Program intelligence center

## Platform Architecture

CapyMatch is designed as an **integrated role-based platform**, not separate disconnected products.

### Three-Layer Architecture

#### 1. Core Data Layer (Shared)
Shared across all roles:
- Athlete profiles & recruiting data
- School targets & opportunities  
- Events & activities
- Support relationships
- Communication threads
- Documents & clips
- Recruiting timeline & stages

#### 2. Role-Based Experience Layer

**Athlete/Parent Workspace** (existing)
- Personal recruiting management
- College target lists
- Task management
- Progress tracking
- Communication hub

**Coach/Club Operating System** (new - this product)
- Support coordination
- Advocacy tools
- Program intelligence
- Event workflows
- Mission control

#### 3. Intelligence Layer (AI-Ready)
Designed to support future AI capabilities:
- Momentum detection
- Support gap identification
- Priority surfacing
- Recommendation engine
- Event intelligence
- Advocacy matching
- Next action suggestions

## Five Operating Modes

The coach/club experience is organized around **5 operating modes**, not traditional module navigation.

### 1. Mission Control
**Purpose:** Command center for coaches and directors

**Core Questions Answered:**
- Which athletes need help right now?
- What changed today?
- Which athletes are losing momentum?
- Where are the support bottlenecks?
- Which opportunities need action soon?

**Key Features:**
- Priority alerts for athletes needing attention
- Momentum change feed
- Critical upcoming dates
- Quick action panel
- Program health snapshot

### 2. Support Pod
**Purpose:** Collaborative athlete support coordination

**Core Concept:**  
Each athlete has a support pod that may include:
- Athlete
- Parent(s)
- Club coach
- High school coach
- Optional recruiting advisor

**Key Features:**
- Pod member visibility
- Ownership mapping (who owns next step)
- Blocker identification
- Recent changes & momentum
- Support misalignment detection
- Weekly priorities

### 3. Event Mode
**Purpose:** Live recruiting workflow for tournaments, showcases, camps

**Key Features:**
- Event preparation
- Quick notes during events
- Schools spotted
- Interest logging
- Voice-style fast capture
- Clip follow-up
- Post-event summaries
- Follow-up generation

### 4. Advocacy Mode
**Purpose:** Coach-to-college promotion and strategic athlete support

**Key Features:**
- Recommend athletes to college coaches
- Attach fit notes and clips
- Package coach-backed introductions
- Track responses and follow-ups
- Preserve relationship context over time
- School relationship management

### 5. Program Intelligence
**Purpose:** Strategic layer for club directors and program leaders

**Core Questions Answered:**
- Readiness by team
- Momentum by grad year
- Support gaps across program
- Under-supported athletes
- Outcomes and commitments
- Where staff attention is most needed

## Information Architecture

### Navigation Model: Contextual Mode Switching

Not traditional left nav with static menu items.

Instead: **Mode-based navigation** with contextual workspaces.

**Primary Navigation:**
- Top-level mode switcher (horizontal tabs or pill navigation)
- Mission Control (default/home)
- Support Pods
- Events
- Advocacy  
- Program

**Secondary Navigation:**
Contextual within each mode
- Mission Control: filters (grad year, team, priority level)
- Support Pods: athlete list → individual pod workspace
- Events: upcoming → live → past
- Advocacy: active recommendations, school relationships
- Program: teams, grad years, metrics

**Global Elements:**
- Mode switcher (always accessible)
- Search (find athlete, event, school)
- Quick actions (log interest, create note, start recommendation)
- User profile & settings
- Notifications (momentum alerts, blockers, responses)

## Design Philosophy

**Think Apple-level clarity and restraint.**  
**Think SpaceX mission control, but human-centered.**  
**Think premium, focused, high-signal, low-noise.**

This product must feel modern, intelligent, and different from standard sports SaaS platforms.

### Hybrid Aesthetic
- Apple-level clarity, restraint, and calm
- Mission-control focus, prioritization, and high-signal surfaces
- Premium, modern, spacious
- Emotionally clear and warm enough for human support
- Sharp enough to feel like a true command center
- Avoid generic enterprise SaaS aesthetics
- Avoid looking too dark, heavy, or overly technical

## Core Product Principles

1. **Proactive, not reactive** - Surface what needs attention
2. **Calm, clear, emotionally intelligent UX** - Human-centered design
3. **Family-aware, not athlete-only** - Support pod coordination
4. **AI should coordinate action, not just generate text** - Intelligence layer
5. **Minimize clutter** - High signal, low noise
6. **Avoid generic enterprise patterns** - Premium, focused experience
7. **Prioritize mission-critical decisions** - Not raw information density
8. **Support quick daily use by busy coaches** - Mobile-ready operations

## Platform Integration

### Role-Based Data Sharing

**What Coaches See:**
- All athletes in their program/assignment
- Support pod compositions
- Momentum signals and priorities
- Event participation
- Advocacy opportunities
- Program-wide intelligence

**What Athletes/Parents See:**
- Their own recruiting workspace (existing)
- Their support pod membership
- Visibility into who is supporting them
- Coach recommendations on their behalf
- Event context and follow-ups

**Shared Objects:**
- Athlete profiles
- School targets
- Events
- Communication threads
- Documents & clips

**Role-Specific Views:**
- Different UI/UX by role
- Different priorities by role
- Different workflows by role
- Unified data underneath

## Success Metrics

### Coach/Program Metrics
- Time to identify athlete needing support
- Support coordination effectiveness
- Coach advocacy volume
- Event workflow efficiency
- Program outcome improvement

### Athlete/Family Metrics  
- Support pod engagement
- Momentum maintenance
- Commitment rate improvement
- Time to resolution for blockers

### Platform Metrics
- Daily active coaches
- Mission Control usage
- Support Pod coordination activity
- Event mode adoption
- Advocacy recommendation volume
