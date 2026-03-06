# Decision Engine Specification

## Overview

The Decision Engine is the intelligence layer that determines what surfaces in Mission Control, in what order, and with what recommended actions.

**Core Principle:** Every surfaced item must be explainable, actionable, and owned.

---

## The 6 Intervention Categories

### 1. Momentum Drop
**What it detects:** Athletes whose recruiting activity or engagement has stalled or declined

**Triggers:**
- No recruiting activity logged in 14+ days
- No coach contact in 7+ days  
- Declining school response rate (3+ schools not responding)
- Stage regression detected (e.g., "actively recruiting" → "exploring")
- Event attendance down vs. expected pattern

**Priority Factors:**
- Days since last activity (higher = more urgent)
- Grad year proximity (2025 > 2026 > 2027)
- Number of target schools (fewer targets = higher risk)
- Previous momentum score (steep drop = higher priority)

**Example:**
```
WHY: No activity in 18 days
WHAT CHANGED: Last logged activity was Dec 18 (UCLA email)
ACTION: Check in with family about engagement
OWNER: Coach Martinez
```

---

### 2. Blocker
**What it detects:** Obstacles preventing progress on recruiting actions

**Triggers:**
- Missing required documents (transcript, test scores, highlight reel)
- Overdue action items (task past due date by 2+ days)
- Unanswered athlete/family question (>3 days old)
- Event prep incomplete (<48 hours before event)
- Support pod gap (no primary coach assigned, parent not in pod)

**Priority Factors:**
- Impact on athlete (high = missing transcript for target school)
- Time sensitivity (event tomorrow > general prep)
- Ease of resolution (can coach fix it vs. requires external party)
- Number of affected items (blocked from 5 schools vs. 1)

**Example:**
```
WHY: Transcript missing for 3 target schools
WHAT CHANGED: Application deadlines in 10-14 days
ACTION: Request transcript from high school counselor
OWNER: Parent + Coach (coordinate)
```

---

### 3. Deadline Proximity
**What it detects:** Time-sensitive opportunities or requirements approaching

**Triggers:**
- Event in next 48 hours without prep completed
- Application deadline within 14 days
- Scheduled call/visit in next 72 hours without prep
- Commitment decision deadline within 7 days
- Financial aid/scholarship deadline approaching

**Priority Factors:**
- Hours/days until deadline (sooner = higher priority)
- Importance of opportunity (official visit > general camp)
- Prep status (not started > in progress)
- Number of athletes affected (team event > individual)

**Example:**
```
WHY: SoCal Showcase in 24 hours
WHAT CHANGED: Event starts tomorrow at 9am
ACTION: Set target schools and review prep checklist
OWNER: Coach Martinez
```

---

### 4. Engagement Drop
**What it detects:** Stakeholders who have become inactive or disengaged

**Triggers:**
- Athlete hasn't logged in 10+ days
- Parent hasn't viewed updates in 14+ days
- Coach hasn't checked athlete's Support Pod in 7+ days
- Support Pod communication thread inactive >10 days
- Family stopped responding to coach outreach (3+ missed contacts)

**Priority Factors:**
- Role criticality (parent disengagement > athlete login gap)
- Length of inactivity (3 weeks > 1 week)
- Historical pattern (sudden drop > gradual decline)
- Recruiting stage (actively recruiting > exploring)

**Example:**
```
WHY: Family hasn't engaged in 12 days
WHAT CHANGED: No logins, no message responses since Dec 15
ACTION: Personal phone call to check in
OWNER: Coach Martinez
```

---

### 5. Ownership Gap
**What it detects:** Actions or responsibilities with unclear or missing ownership

**Triggers:**
- Action item exists with no assigned owner
- Support Pod has no primary coach assigned
- Follow-up needed but unclear who owns it
- Blocker identified but no resolution owner assigned
- College coach response received, no athlete response plan

**Priority Factors:**
- Time since gap identified (older = more urgent)
- Importance of action (school response > general task)
- Risk of dropping through cracks (high-priority school)
- Ease of assignment (clear owner available)

**Example:**
```
WHY: Boston College coach responded 3 days ago
WHAT CHANGED: No follow-up owner assigned
ACTION: Assign owner and draft response strategy
OWNER: Coach (needs to assign to athlete or parent)
```

---

### 6. Readiness Issue
**What it detects:** Misalignments between athlete's current state and recruiting best practices

**Triggers:**
- Target school list too narrow (<4 schools) or too broad (>12 schools)
- Stage misalignment (behavior doesn't match declared stage)
- No events scheduled in next 60 days (for actively recruiting athletes)
- No film/highlight materials available for sharing
- Recruiting timeline misaligned with grad year norms

**Priority Factors:**
- Impact on outcomes (narrow target list = high risk)
- Grad year urgency (2025 > 2026)
- Ease of correction (add schools vs. create film)
- Coach capacity to help

**Example:**
```
WHY: Only 2 target schools for 2025 grad
WHAT CHANGED: Critical recruiting window (spring 2025)
ACTION: Expand target list to 5-8 schools, research fit
OWNER: Coach + Athlete (collaborative)
```

---

## Priority Scoring Algorithm

### Formula
```
Priority Score = (Urgency × 40) + (Impact × 30) + (Actionability × 20) + (Ownership × 10)
```

Each factor scored 0-10, resulting in total score 0-100.

### Urgency (40% weight)
**What it measures:** Time sensitivity of the issue

**Scoring:**
- 10: Immediate (deadline today, event tomorrow)
- 8-9: Very urgent (deadline 1-3 days, critical window)
- 6-7: Urgent (deadline 4-7 days, momentum dropping)
- 4-5: Important (deadline 8-14 days, engagement declining)
- 2-3: Notable (deadline 15-30 days, early warning)
- 0-1: Monitoring (no specific deadline, background issue)

**Examples:**
- Event tomorrow, no prep: **10**
- No activity in 18 days: **7**
- Application deadline in 10 days: **6**
- Target list too narrow (2025 grad): **8**
- Target list too narrow (2027 grad): **4**

---

### Impact (30% weight)
**What it measures:** Consequence if unaddressed

**Scoring:**
- 10: Critical (miss commitment opportunity, lose top choice)
- 8-9: Severe (miss multiple opportunities, recruiting stalls)
- 6-7: Significant (miss one opportunity, momentum declines)
- 4-5: Moderate (inefficiency, delayed progress)
- 2-3: Minor (small gap, limited consequence)
- 0-1: Negligible (nice to have, low stakes)

**Examples:**
- Top choice school responded, no follow-up: **10**
- Missing transcript blocks 3 schools: **8**
- No activity in 2 weeks: **6**
- Parent not in Support Pod: **5**
- Highlight reel outdated: **3**

---

### Actionability (20% weight)
**What it measures:** How easily/quickly this can be resolved

**Scoring:**
- 10: Immediate action possible (5-10 min task)
- 8-9: Fast resolution (15-30 min, single owner)
- 6-7: Moderate effort (1-2 hours, clear path)
- 4-5: Requires coordination (multiple people, 1-2 days)
- 2-3: Complex (unclear path, external dependencies)
- 0-1: Difficult (long-term, many blockers)

**Examples:**
- Assign follow-up owner: **10**
- Set event prep plan: **9**
- Request transcript from school: **6**
- Expand target school list (research needed): **5**
- Create new highlight reel: **3**

---

### Ownership (10% weight)
**What it measures:** Clarity of who should act

**Scoring:**
- 10: Clear single owner, active and available
- 8-9: Clear owner, may need reminder
- 6-7: Collaborative (2-3 people, roles clear)
- 4-5: Unclear owner, needs assignment
- 2-3: Multiple possible owners, unclear responsibility
- 0-1: No obvious owner, orphaned task

**Examples:**
- Coach check-in call: **10**
- Parent request transcript: **9**
- Coach + athlete expand school list: **7**
- No owner assigned (needs assignment): **4**
- External dependency (counselor, college): **2**

---

## Priority Tiers

Based on total score (0-100):

### Critical (90-100) - Red Alert
- Show at top of Priority Alerts
- Red badge, prominent placement
- Push notification (optional)
- Immediate action expected

**Typical scenarios:**
- Event tomorrow, no prep
- Top school responded, no follow-up
- Commitment deadline in 2 days

### High (70-89) - Amber Alert
- Show in Priority Alerts section
- Amber badge
- Address today
- Action within 24 hours expected

**Typical scenarios:**
- No activity in 14+ days
- Application deadline in 7 days
- Family disengaged for 2 weeks

### Medium (50-69) - Blue Opportunity
- Show in Athletes Needing Attention
- Blue or neutral badge
- Address this week
- Action within 3-5 days

**Typical scenarios:**
- Target list too narrow
- Missing non-critical document
- Event prep starts in 4 days

### Low (0-49) - Background
- May appear in Athletes Needing Attention
- Neutral badge
- Monitor, no immediate action
- Background tracking

**Typical scenarios:**
- Early warning (2027 grad readiness)
- Minor engagement dip
- Non-urgent optimization

---

## Surfacing Logic

### What Appears in Mission Control

**Priority Alerts (2-4 items):**
- Top 2-4 items with score ≥70 (Critical or High)
- Never more than 4 (avoid overwhelming)
- If <2 critical items, show high-priority items
- If 0 critical/high, section hidden

**What Changed Today (5-8 items):**
- Momentum signals from last 24-48 hours
- Positive and negative signals
- Sorted by recency and relevance
- Shows context for why it matters

**Athletes Needing Attention (up to 12):**
- Items with score ≥50 (Medium+)
- May include items already shown in Priority Alerts
- Sorted by score descending
- Filterable by grad year, issue type

**Critical Upcoming (5-8 items):**
- Events, deadlines, milestones in next 7-14 days
- Sorted by date ascending
- Shows prep status
- Not scored (always shows upcoming items)

---

### What Should NOT Appear

**Excluded from Priority Alerts:**
- Items with score <70 (not urgent enough)
- Items with unclear actionability (<5)
- Items with no possible owner
- Duplicate issues for same athlete (consolidate)
- Resolved items (even if recently)

**Excluded from Mission Control entirely:**
- Positive momentum with no action needed (background)
- Routine activities (logged contact, normal engagement)
- Low-impact readiness issues (2027 grad minor gaps)
- System/admin tasks (not athlete-focused)

**Consolidation Rules:**
- If same athlete has 3+ issues, show top 2, note "+ 2 more"
- If same issue affects 5+ athletes, consider program-level alert
- Don't surface same athlete in both Priority Alerts and top of Attention list

---

## Explainability Structure

Every surfaced item includes:

### 1. WHY (Required)
**Short reason:** 1 sentence, plain language
- "No activity in 18 days"
- "Transcript missing for 3 schools"
- "Event tomorrow, no prep plan"

### 2. WHAT CHANGED (Required)
**Specific trigger:** What event or pattern triggered this
- "Last activity was Dec 18"
- "Application deadlines in 10 days"
- "Event starts tomorrow at 9am"

### 3. RECOMMENDED ACTION (Required)
**Clear next step:** What should be done
- "Check in with family about engagement"
- "Request transcript from high school"
- "Set target schools and review checklist"

### 4. OWNER (Required)
**Who should act:** Specific role or name
- "Coach Martinez"
- "Parent + Coach (coordinate)"
- "Coach (needs to assign)"

---

## Example Scored Alerts

### Example 1: Critical
```
Athlete: Emma Chen, 2026, Forward
Category: Deadline Proximity
Trigger: SoCal Showcase in 24 hours, no prep

Scoring:
- Urgency: 10 (event tomorrow)
- Impact: 8 (major showcase, 12 schools attending)
- Actionability: 9 (can set targets now)
- Ownership: 10 (clear coach ownership)
Total: (10×40) + (8×30) + (9×20) + (10×10) = 400 + 240 + 180 + 100 = 920/1000 = 92

Tier: Critical (Red Alert)

Explainability:
WHY: SoCal Showcase in 24 hours
WHAT CHANGED: Event starts tomorrow at 9am
ACTION: Set target schools and review prep checklist
OWNER: Coach Martinez
```

---

### Example 2: High Priority
```
Athlete: Sarah Martinez, 2026, Midfielder
Category: Momentum Drop
Trigger: No activity logged in 18 days

Scoring:
- Urgency: 7 (concerning gap, not immediate deadline)
- Impact: 7 (momentum declining, opportunities may be lost)
- Actionability: 8 (coach can call family today)
- Ownership: 9 (clear coach responsibility)
Total: (7×40) + (7×30) + (8×20) + (9×10) = 280 + 210 + 160 + 90 = 740/1000 = 74

Tier: High (Amber Alert)

Explainability:
WHY: No activity in 18 days
WHAT CHANGED: Last activity was Dec 18 (UCLA email)
ACTION: Check in with family about engagement
OWNER: Coach Martinez
```

---

### Example 3: Medium Priority
```
Athlete: Ryan Thomas, 2025, Defender
Category: Readiness Issue
Trigger: Only 2 target schools, should have 5-8

Scoring:
- Urgency: 8 (2025 grad, critical window)
- Impact: 6 (limits opportunities, but correctable)
- Actionability: 5 (requires research and athlete buy-in)
- Ownership: 7 (coach + athlete collaborative)
Total: (8×40) + (6×30) + (5×20) + (7×10) = 320 + 180 + 100 + 70 = 670/1000 = 67

Tier: Medium (Blue Opportunity)

Explainability:
WHY: Only 2 target schools for 2025 grad
WHAT CHANGED: Critical recruiting window (spring season)
ACTION: Expand target list to 5-8 schools, research fit
OWNER: Coach + Athlete
```

---

### Example 4: Low Priority (Background)
```
Athlete: Jake Williams, 2027, Forward
Category: Readiness Issue
Trigger: No events scheduled in next 60 days

Scoring:
- Urgency: 3 (2027 grad, early recruiting)
- Impact: 4 (exposure helpful but not critical yet)
- Actionability: 6 (can register for showcases)
- Ownership: 8 (clear coach guidance needed)
Total: (3×40) + (4×30) + (6×20) + (8×10) = 120 + 120 + 120 + 80 = 440/1000 = 44

Tier: Low (Background monitoring)

Explainability:
WHY: No events scheduled in next 2 months
WHAT CHANGED: Early exposure recommended for 2027 grads
ACTION: Review spring showcase calendar, select 2-3 events
OWNER: Coach + Athlete

Note: May appear in Athletes Needing Attention list, but NOT in Priority Alerts
```

---

## Decision Engine Rules Summary

### Surfacing Rules
1. **Top 2-4 critical/high items** → Priority Alerts (score ≥70)
2. **5-8 recent changes** → What Changed Today (last 24-48 hours)
3. **Up to 12 medium+ items** → Athletes Needing Attention (score ≥50)
4. **Consolidate duplicates** for same athlete (max 2 in Priority Alerts)
5. **Never overwhelm** with too many alerts (cap at 4)

### Explainability Requirements
1. **Always include** WHY, WHAT CHANGED, ACTION, OWNER
2. **Keep it short** - one sentence per field
3. **Use plain language** - no jargon, no scores shown to user
4. **Make it actionable** - every alert has a clear next step
5. **Assign ownership** - never "someone should do this"

### Quality Checks
1. **Every item must score ≥50** to surface in Mission Control
2. **Every item must have actionability ≥5** (must be resolvable)
3. **Every item must have an owner** (or path to assignment)
4. **Never show duplicate issues** for same athlete in same section
5. **Resolved items disappear immediately** from all views

---

## Routing to Support Pod

When a coach clicks on any Mission Control item, they navigate to the athlete's Support Pod with:
- **Context preserved:** The specific issue highlighted in the pod
- **Action pre-selected:** Recommended action ready to take
- **Owner visible:** Clear who should do what
- **History shown:** Timeline of what led to this moment

**Example routing:**
```
Mission Control Alert:
"Sarah Martinez - No activity in 18 days"
  ↓
Support Pod (Sarah Martinez):
- Issue highlighted: "Momentum Drop (18 days inactive)"
- Suggested action: "Schedule family check-in call"
- Owner: Coach Martinez
- Timeline: Last 30 days of activity shown
- Quick actions: [Log Call] [Send Message] [Create Task]
```

This creates a seamless flow:
**Mission Control** (identify) → **Support Pod** (coordinate) → **Action** (resolve)

---

## V1 Implementation Notes

### What to Build First (V1):
1. **6 detection categories** with rule-based triggers
2. **Priority scoring** algorithm (urgency × impact × actionability × ownership)
3. **Explainability fields** in data model (why, what changed, action, owner)
4. **Surfacing logic** (top 2-4 alerts, consolidation rules)
5. **Mock data** demonstrating all 6 categories with realistic scores

### What to Defer (V1.5+):
6. **Machine learning** for momentum prediction (V3)
7. **Personalized scoring** based on coach preferences (V2)
8. **Historical pattern recognition** (V2)
9. **Multi-athlete consolidation** alerts (V2.5)
10. **Coach effectiveness** impact on scoring (V2.5)

### Quality Bar for V1:
- Coaches should understand why every item surfaced (95%+ comprehension)
- No "mystery" alerts that coaches can't explain
- Every alert should feel relevant and actionable
- Scoring should feel fair and sensible (even if simple)

The Decision Engine in V1 is rule-based and transparent. AI/ML comes later after we prove the core logic works.
