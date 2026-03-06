# CapyMatch Coach/Club Operating System - Product Architecture

## Vision

CapyMatch is building the first **Recruiting Operating System** for clubs, coaches, families, and athletes.

This is not a traditional recruiting CRM or generic coach dashboard. This is a new category of product designed to actively coordinate support, surface priorities, identify blockers, and help coaches and families know what to do next.

**Category Definition:** A Recruiting Operating System coordinates the entire support infrastructure around every athlete in a program—making recruiting less chaotic, more transparent, and more successful.

---

## Strategic Positioning

### What CapyMatch Is NOT:
- Traditional recruiting CRM (sales pipeline for athletes)
- Generic admin portal (team management software)
- Profile management system (athlete database)
- Activity tracking dashboard (log of what happened)
- Message inbox (communication tool)
- Athlete-only recruiting tool (self-service platform)

### What CapyMatch IS:
- **Recruiting Operating System** (coordination infrastructure)
- **Support coordination platform** (multi-stakeholder orchestration)
- **Coach advocacy tool** (relationship memory + promotion)
- **Athlete momentum tracker** (proactive intervention system)
- **Program intelligence center** (strategic visibility for directors)

### Core Insight
Recruiting is a **coordination problem**, not just a data problem.

Success requires:
- Athlete + Family + Coach + High School Coach + Advisor working together
- Visibility into who needs help, what changed, and what to do next
- Structured workflows for recruiting contexts (events, advocacy, support)
- Proactive intelligence, not reactive reporting

**CapyMatch makes coordination visible, systematic, and scalable.**

---

## Platform Architecture

CapyMatch is designed as an **integrated role-based platform**, not separate disconnected products.

### Three-Layer Architecture

#### 1. Core Data Layer (Shared)
Shared across all roles:
- Athlete profiles & recruiting data
- School targets & opportunities  
- Events & activities
- Support relationships (pods)
- Communication threads
- Documents & clips
- Recruiting timeline & stages
- Momentum signals & history

#### 2. Role-Based Experience Layer

**Athlete/Parent Workspace** (existing)
- Personal recruiting management
- College target lists
- Task management
- Progress tracking
- Communication hub
- Support Pod visibility

**Coach/Club Operating System** (new - this product)
- Support coordination
- Advocacy tools
- Program intelligence
- Event workflows
- Mission control
- Proactive intervention

#### 3. Intelligence Layer (Decision Engine)
The brain that determines what surfaces, why, and what to do.

**Inputs:**
- Momentum signals (activity, interest, responses)
- Blocker detection (missing documents, overdue actions)
- Deadline tracking (events, applications, visits)
- Engagement patterns (athlete, family, coach activity)
- Ownership gaps (unassigned tasks, inactive pods)
- Readiness issues (stage misalignment, target gaps)

**Outputs:**
- Priority alerts (2-4 urgent items)
- Momentum feed (what changed today)
- Athletes needing attention (ranked by severity)
- Recommended actions (with owner assignment)
- Explainability (why this surfaced, what changed)

**Core Principle:** Every surfaced item is explainable.
- Why did this surface?
- What changed that triggered it?
- What action is recommended?
- Who should act?

**AI-Ready Design:**
Future: Machine learning for momentum prediction, support gap detection, and outcome optimization.
V1: Rule-based intelligence with clear, explainable logic.

---

## Five Operating Contexts

The coach/club experience is organized around **5 focused operating contexts**, not traditional module navigation.

**Operating Context:** A mode of work with its own priorities, workflows, and intelligence tailored to a specific type of recruiting activity.

### 1. Mission Control
**Operating Context:** Command center for daily priorities and intervention

**Purpose:**  
The nerve center where coaches start every day. Answers the critical questions: Who needs help? What changed? What should I do first?

**Core Questions Answered:**
- Which athletes need help right now?
- What changed in the last 24 hours?
- Which athletes are losing momentum?
- Where are the support bottlenecks?
- Which opportunities need action today?

**Why This is an Operating Context (Not a Module):**
- Surfaces dynamic, time-sensitive priorities
- Changes daily based on momentum signals
- Requires immediate decision-making and action
- Optimized for fast morning check-ins (5-10 min)
- Mobile-first for coaches on the go

**Key Features:**
- Priority alerts (2-4 urgent items with explainability)
- Momentum change feed (what happened, why it matters)
- Athletes needing attention (ranked by decision engine)
- Critical upcoming dates (7-14 day window)
- Quick action panel (fast logging and task creation)
- Program health snapshot (high-level context)

**Success Metric:**  
Time to identify athlete needing support: < 10 seconds

---

### 2. Support Pod
**Operating Context:** The core operational unit of athlete support

**Purpose:**  
Support Pod is not just a collaboration workspace—it's the fundamental unit of how recruiting support is organized, coordinated, and delivered at scale.

**Core Concept:**  
Every athlete has a Support Pod—the group of people responsible for their recruiting success.

Pod members may include:
- Athlete (center)
- Parent(s)
- Club coach (primary supporter)
- High school coach (coordination partner)
- Optional recruiting advisor (strategic guidance)

**Why This is an Operating Context (Not a Module):**
- Requires context-switching to a specific athlete
- Different mental model: coordination, not information lookup
- Optimized for deep work (15-30 min sessions)
- Relationship-focused, not task-focused
- Multi-stakeholder visibility and ownership

**Key Features:**
- Pod member map (roles, responsibilities, ownership)
- Momentum timeline (what's changed for this athlete)
- Current blockers (what's stuck and why)
- Next actions by owner (who does what, when)
- Communication feed (threaded, visible to all pod members)
- Coordination tools (assign tasks, flag blockers, request updates)

**Support Pod as Operational Unit:**
- Clear ownership (every action has an assigned owner)
- Visible gaps (missing pod members, inactive participants)
- Explainable status (why this athlete needs attention)
- Coordinated action (not siloed coach work)
- Accountability (families see the support in action)

**Success Metric:**  
Blocker resolution time < 48 hours  
Coach-family coordination: 2x per week per athlete

---

### 3. Event Mode
**Operating Context:** Converting live recruiting moments into structured momentum

**Purpose:**  
Event Mode transforms chaotic tournament/showcase activity into systematic momentum and follow-up. It's the system that ensures no recruiting opportunity falls through the cracks.

**Core Insight:**  
Showcases, tournaments, and camps are high-stakes moments where opportunities are created or lost in real-time. Traditional tools (notes apps, spreadsheets) can't keep up. Coaches need a system designed for speed, capture, and structured follow-up.

**Why This is an Operating Context (Not a Module):**
- Time-bound and high-pressure (live event happening now)
- Optimized for mobile and voice capture
- Requires fast logging with minimal friction
- Automatically generates follow-up actions post-event
- Different mental model: capture first, structure later

**Key Features:**

**Pre-Event (Preparation):**
- Event roster (which athletes attending)
- Target schools per athlete (who to watch for)
- Expected college coaches (relationship context)
- Prep checklist (materials, strategy, logistics)

**Live Event (Fast Capture):**
- Quick athlete selector
- Schools spotted logger (which coaches are here)
- Interest level capture (high/medium/low per school)
- Fast notes (voice-optimized, timestamp everything)
- Clip tagging (link video to athlete + school)

**Post-Event (Structured Follow-Up):**
- Auto-generated event summary
- Interest logged by athlete (schools to follow up with)
- Follow-up actions created automatically (with owners assigned)
- Momentum signals generated (new interest, increased engagement)
- Support Pod notifications (family sees event outcomes)

**Event Mode as Momentum Converter:**
- Live moments → Structured data
- Observations → Actionable follow-ups
- Interest → Momentum signals
- Context → Relationship memory

**Success Metric:**  
80% of events have post-event summaries  
Follow-up completion rate: 70%+ within 1 week

---

### 4. Advocacy Mode
**Operating Context:** Relationship memory and trusted coach-to-college promotion

**Purpose:**  
Advocacy Mode is the system for coaches to actively promote athletes to college coaches they have relationships with. It's not just sending recommendations—it's preserving relationship context, tracking responses, and building trust over time.

**Core Insight:**  
A coach recommendation carries more weight than a cold email from an athlete. But coaches can't scale personal advocacy without a system that:
- Remembers which coaches they have relationships with
- Packages athlete introductions professionally
- Tracks responses and follow-ups
- Preserves relationship history over time

**Why This is an Operating Context (Not a Module):**
- Relationship-first, not transactional
- Requires thoughtfulness and personalization
- Optimized for quality over quantity
- Long-term relationship memory (not one-off sends)
- Trust-based (coach's reputation on the line)

**Key Features:**

**Create Recommendation:**
- Select athlete(s) to promote
- Select target schools (filtered by coach relationships)
- Write fit notes (why this athlete, why this school)
- Attach clips and materials
- Personalize by school (relationship context matters)
- Preview and send (or schedule)

**Relationship Memory:**
- Schools coach has relationships with
- Relationship strength (strong, moderate, new)
- Athletes previously recommended to each school
- Response history (what happened last time)
- Last contact date (relationship freshness)
- Notes on preferences (what this coach values)

**Response Tracking:**
- When college coach responds
- Response type (interested, not interested, need more info)
- Follow-up needed (who, when, what)
- Outcome tracking (did it lead to offer, visit, etc.)

**Advocacy Dashboard:**
- Active recommendations (sent, awaiting response)
- Follow-ups needed (coach or athlete action)
- School relationships (prioritize by strength)
- Success tracking (recommendation → outcome)

**Advocacy as Trust System:**
- Coaches protect their reputation
- Recommendations are thoughtful, not spammy
- Schools trust coach-backed introductions
- Athletes benefit from coach's network
- Relationships are preserved and grown

**Success Metric:**  
Coaches send 3+ recommendations per month  
Response rate from college coaches: 40%+

---

### 5. Program Intelligence
**Operating Context:** Strategic visibility and resource allocation

**Purpose:**  
Program Intelligence is the director's view—program-wide visibility into momentum, support gaps, outcomes, and coach effectiveness. It's not operational (like Mission Control), it's strategic.

**Why This is an Operating Context (Not a Module):**
- Used weekly/monthly, not daily
- Optimized for strategic decision-making
- Director-focused (resource allocation, program health)
- Long-term trends, not immediate actions
- Different audience (directors, not coaches)

**Core Questions Answered:**
- Which grad year needs the most attention?
- Are there athletes without active support?
- How is each coach performing?
- What's our commitment rate this year vs. last year?
- Where should I allocate coaching resources?
- Which athletes are under-supported?

**Key Features:**
- Program overview (athletes by stage, grad year, momentum)
- Readiness by team/grad year (who's on track, who's not)
- Support gap analysis (athletes without pods, inactive coaches)
- Coach effectiveness (support quality, athlete outcomes)
- Outcome tracking (commitments, schools, trends)
- Resource allocation insights (where to focus staff time)

**Success Metric:**  
Directors review weekly  
Support gaps addressed within 1 week of identification

---

## Information Architecture

### Navigation Model: Operating Context Switching

Not traditional left nav with static menu items.

Instead: **Context-based navigation** optimized for different types of work.

**Primary Navigation:**
- Top-level context switcher (horizontal pills or tabs)
- Mission Control (default/home)
- Support Pods
- Events
- Advocacy  
- Program

**Visual Design:**
- Persistent top bar (always accessible)
- Active context highlighted
- Context-specific actions in header
- Smooth transitions (preserve mental model)

**Secondary Navigation:**
Contextual within each operating context:
- Mission Control: filters (grad year, priority, issue type)
- Support Pods: athlete list → drill into specific pod
- Events: upcoming → live → past
- Advocacy: active recommendations → school relationships
- Program: teams → grad years → metrics

**Global Elements (Always Present):**
- Context switcher (navigate between contexts)
- Global search (find athlete, event, school)
- Quick actions (fast logging from anywhere)
- Notifications (momentum alerts, responses)
- User profile & settings

**Key Principle:**  
Each operating context has its own workflow, priorities, and visual design optimized for that type of work. No generic "one size fits all" layout.

---

## Decision Engine (Intelligence Layer)

### Purpose
The Decision Engine determines what surfaces in Mission Control, in what order, and with what recommended actions. It's the brain of the operating system.

### Core Principle: Explainability
Every item surfaced by the Decision Engine includes:
- **Why it surfaced:** What triggered this to appear
- **What changed:** Specific event or pattern that caused it
- **Recommended action:** What should be done next
- **Who should act:** Owner assignment (coach, parent, athlete)

**No black boxes.** Coaches should always understand why the system is showing them something.

---

### Detection Categories

#### 1. Momentum Drop Detection
**Triggers:**
- No recruiting activity in 14+ days
- No coach contact in 7+ days
- Declining response rate from schools
- Stage regression (e.g., from "actively recruiting" to "exploring")
- Event attendance down compared to peers

**Example Alert:**
- **Athlete:** Sarah Martinez, 2026
- **Why:** No recruiting activity in 18 days
- **What changed:** Last activity was 18 days ago (UCLA coach email)
- **Recommended action:** Check in with family, review target schools
- **Owner:** Coach Martinez

---

#### 2. Blocker Detection
**Triggers:**
- Missing documents (transcript, test scores, highlight reel)
- Overdue actions (task past due date)
- Unresolved communication (athlete question unanswered >3 days)
- Event prep incomplete (<48 hours before event)
- Support pod gap (missing key member like parent)

**Example Alert:**
- **Athlete:** Jake Williams, 2025
- **Why:** Transcript not submitted to 3 target schools
- **What changed:** Application deadline in 10 days
- **Recommended action:** Request transcript from high school
- **Owner:** Parent + Coach (coordinate)

---

#### 3. Deadline Proximity
**Triggers:**
- Event in next 48 hours without prep plan
- Application deadline within 2 weeks
- Scheduled call/visit in next 72 hours
- Commitment decision date approaching
- Financial aid deadline

**Example Alert:**
- **Athlete:** Emma Chen, 2026
- **Why:** SoCal Showcase tomorrow, no target schools set
- **What changed:** Event is in 24 hours
- **Recommended action:** Set target schools and prep strategy
- **Owner:** Coach Martinez

---

#### 4. Engagement Drop
**Triggers:**
- Athlete hasn't logged in 10+ days
- Parent hasn't viewed updates in 14+ days
- Coach hasn't checked athlete's pod in 7+ days
- Support pod communication inactive >10 days
- Family stopped responding to outreach

**Example Alert:**
- **Athlete:** Marcus Johnson, 2027
- **Why:** Family hasn't engaged in 12 days
- **What changed:** No logins, no responses to messages
- **Recommended action:** Personal check-in call with family
- **Owner:** Coach Martinez

---

#### 5. Ownership Gap
**Triggers:**
- Action item with no assigned owner
- Support pod with no primary coach
- Follow-up needed but unclear who owns it
- Blocker identified but no resolution owner
- College response but no athlete/parent response plan

**Example Alert:**
- **Athlete:** Olivia Anderson, 2026
- **Why:** Boston College coach responded, no follow-up assigned
- **What changed:** Response received 3 days ago
- **Recommended action:** Assign follow-up owner and draft response
- **Owner:** Coach (to assign)

---

#### 6. Readiness Issues
**Triggers:**
- Stage misalignment (athlete behavior doesn't match stage)
- Target school list too narrow (<4 schools) or too broad (>12 schools)
- No events scheduled in next 60 days
- No film/materials available for sharing
- Recruiting timeline misaligned with grad year

**Example Alert:**
- **Athlete:** Ryan Thomas, 2025
- **Why:** Only 2 target schools, should have 5-8
- **What changed:** Grad year 2025, critical recruiting period
- **Recommended action:** Expand target school list, research fit
- **Owner:** Coach + Athlete

---

### Priority Scoring

**How the Decision Engine ranks items:**

Each detected item receives a priority score (0-100) based on:
- **Urgency:** Time sensitivity (deadline proximity, days since last activity)
- **Impact:** Potential consequence if unaddressed (lost opportunity, missed deadline)
- **Actionability:** Can it be resolved quickly? Is there a clear next step?
- **Ownership:** Is an owner assigned? Is the owner active?

**Priority Tiers:**
- **Critical (90-100):** Show as red alert, immediate action needed
- **High (70-89):** Show as amber alert, address today
- **Medium (50-69):** Show as blue opportunity, address this week
- **Low (<50):** Background monitoring, no alert

**Top 2-4 highest-scoring items surface as Priority Alerts in Mission Control.**

---

### Explainability in Practice

Every card in Mission Control includes:

**Priority Alert Card:**
```
[Red Badge: Critical]

Sarah Martinez | 2026 | Forward

No recruiting activity in 18 days

Context:
- Last activity: UCLA coach email (Dec 18)
- Momentum score: -3 (declining)
- Expected activity: Weekly updates

Why this surfaced:
Activity gap >14 days triggers momentum drop alert

Recommended action:
1. Check in with family (phone call preferred)
2. Review target school list for engagement
3. Log update after conversation

[View Support Pod] [Log Update]
```

**Momentum Feed Item:**
```
2 hours ago

Emma Chen received camp invite from Stanford

Why this matters:
- Emma is targeting Stanford (high interest)
- Coach-initiated contact (strong signal)
- Response needed within 48 hours

Recommended action:
Review invite with family, confirm attendance

[View Details] [Log Response]
```

**Athlete Card:**
```
Jake Williams | 2025 | Midfielder

Follow-up needed: Boston College coach responded

Context:
- Boston College response received 3 days ago
- Jake hasn't responded yet
- BC is Jake's top choice (high priority)

Why this surfaced:
High-priority school + delayed response >2 days

Recommended action:
Draft follow-up email with Jake today

[View Support Pod] [Draft Email]
```

---

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

### Explainability as Design Principle
- Every surfaced item shows why it's important
- No black box AI or unexplained scoring
- Transparency builds trust with coaches
- Clear reasoning helps coaches make decisions
- "Explain the why" should be visible, not hidden in tooltips

---

## Core Product Principles

1. **Proactive, not reactive** - Surface what needs attention before coaches ask
2. **Calm, clear, emotionally intelligent UX** - Human-centered design for high-stakes work
3. **Family-aware, not athlete-only** - Support pod coordination is central
4. **AI should coordinate action, not just generate text** - Intelligence with purpose
5. **Minimize clutter** - High signal, low noise, ruthless prioritization
6. **Avoid generic enterprise patterns** - Premium, focused, differentiated experience
7. **Prioritize mission-critical decisions** - Not raw information density
8. **Support quick daily use by busy coaches** - Mobile-ready operations
9. **Explainability always** - Never a black box, always show the why
10. **Operating contexts, not modules** - Different work modes, not navigation tabs

---

## Platform Integration

### Role-Based Data Sharing

**What Coaches See:**
- All athletes in their program/assignment
- Support pod compositions and health
- Momentum signals and priorities (with explanations)
- Event participation and outcomes
- Advocacy opportunities and relationships
- Program-wide intelligence (directors only)

**What Athletes/Parents See:**
- Their own recruiting workspace (existing)
- Their support pod membership (who's helping them)
- Visibility into coaching activity (transparency)
- Coach recommendations on their behalf
- Event context and follow-ups
- Momentum status (how they're doing)

**Shared Objects:**
- Athlete profiles
- School targets
- Events
- Communication threads
- Documents & clips
- Support pods

**Role-Specific Views:**
- Different UI/UX by role
- Different priorities by role
- Different workflows by role
- Unified data underneath

**Key Principle:**  
Families should see that they're supported. Transparency builds trust.

---

## Success Metrics

### Coach/Program Metrics
- Time to identify athlete needing support (< 10 seconds)
- Support coordination frequency (2x per week per athlete)
- Coach advocacy volume (3+ recommendations per month)
- Event workflow completion (80% with post-event summaries)
- Program outcome improvement (commitment rate +15-20%)

### Athlete/Family Metrics  
- Support pod engagement (families active weekly)
- Momentum maintenance (fewer athletes with declining momentum)
- Commitment rate improvement (+20% vs. baseline)
- Time to resolution for blockers (< 48 hours)
- Family satisfaction with support (Net Promoter Score 50+)

### Platform Metrics
- Daily active coaches (80%+ check Mission Control daily)
- Mission Control engagement (average 5-10 min per session)
- Support Pod coordination activity (15-30 min sessions)
- Event mode adoption (70%+ of events logged)
- Advocacy recommendation volume (growing month-over-month)

### Explainability Validation
- % of coaches who understand why items surface (target: 95%+)
- Feedback: "I trust the system to tell me what's important"
- Reduction in "why is this here?" questions

---

## Competitive Differentiation

### What Makes CapyMatch Unique

**1. Operating Contexts, Not Modules**
Traditional tools: navigation tabs that all feel the same  
CapyMatch: purpose-built contexts for different types of work

**2. Support Pod as Core Unit**
Traditional tools: athlete records in a database  
CapyMatch: athletes organized into support pods with visible coordination

**3. Decision Engine with Explainability**
Traditional tools: you query the database for information  
CapyMatch: the system tells you what needs attention and why

**4. Integrated Coach + Athlete System**
Traditional tools: separate tools for coaches and athletes  
CapyMatch: unified platform with role-based experiences

**5. Proactive Intelligence**
Traditional tools: dashboards that show status  
CapyMatch: operating system that coordinates action

**6. Event Mode as Momentum Converter**
Traditional tools: notes and logs  
CapyMatch: structured system that converts live moments into momentum

**7. Advocacy as Relationship Memory**
Traditional tools: send recommendations  
CapyMatch: preserve relationships, track outcomes, build trust

---

## Conclusion

CapyMatch is not building a better recruiting CRM.

CapyMatch is building the first **Recruiting Operating System**—a new category of product that coordinates support, surfaces priorities, and helps every athlete in a program move forward with less chaos and more success.

The foundation is:
- Operating contexts (not modules)
- Decision engine (not black box)
- Support pods (not athlete records)
- Explainability (not mystery)
- Coordination (not just information)

This is the architecture that makes it real.
