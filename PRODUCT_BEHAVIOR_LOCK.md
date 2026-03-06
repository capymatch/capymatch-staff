# Product Behavior Lock - Summary

## What Was Completed

### 1. ✅ DECISION_ENGINE_SPEC.md (NEW)
**Purpose:** Concrete specification of Decision Engine behavior before implementation

**Contents:**
- **6 Intervention Categories** with specific triggers
  1. Momentum Drop (no activity, declining engagement)
  2. Blocker (missing documents, overdue actions)
  3. Deadline Proximity (events, applications, visits)
  4. Engagement Drop (athlete/family/coach inactivity)
  5. Ownership Gap (unclear responsibility)
  6. Readiness Issue (misalignments, gaps)

- **Priority Scoring Algorithm**
  - Formula: (Urgency × 40) + (Impact × 30) + (Actionability × 20) + (Ownership × 10)
  - Each factor scored 0-10 → total 0-100
  - Priority tiers: Critical (90-100), High (70-89), Medium (50-69), Low (0-49)

- **Surfacing Logic**
  - Top 2-4 items (score ≥70) → Priority Alerts
  - Up to 12 items (score ≥50) → Athletes Needing Attention
  - Consolidation rules (avoid duplicates, same athlete max 2 in alerts)

- **Explainability Structure**
  - WHY: Short reason (1 sentence)
  - WHAT CHANGED: Specific trigger
  - RECOMMENDED ACTION: Clear next step
  - OWNER: Specific role/name

- **4 Detailed Examples** with full scoring breakdown
  - Critical (92/100): Event tomorrow, no prep
  - High (74/100): No activity 18 days
  - Medium (67/100): Target list too narrow
  - Low (44/100): No events scheduled (2027 grad)

- **Quality Rules**
  - Every item must score ≥50 to surface
  - Every item must have actionability ≥5
  - Every item must have owner
  - No duplicate issues for same athlete
  - Resolved items disappear immediately

- **Routing to Support Pod**
  - Context preserved when navigating
  - Issue highlighted in pod
  - Action pre-loaded
  - Owner visible

### 2. ✅ MISSION_CONTROL_SPEC.md (V2 - UPDATED)
**Purpose:** Screen specification with explainability integrated throughout

**Major Updates:**

**Explainability UI Pattern:**
```
┌─────────────────────────────────────┐
│ [Badge] Athlete Name | Grad Year    │
│                                      │
│ Short reason (1 line, bold)         │ ← WHY
│ Context detail (1 line, subtle)     │ ← WHAT CHANGED
│                                      │
│ [?] More details                     │ ← Expandable
│                                      │
│ [Primary Action Button]              │ ← RECOMMENDED ACTION
│ Owner: Coach Name                    │ ← OWNER
└─────────────────────────────────────┘
```

**Design Principles:**
- Keep visible reason to 1 sentence (8-12 words max)
- Use bold for main reason, regular weight for context
- Show owner name clearly
- Make action button text specific
- Use progressive disclosure for details

**Updated Sections:**

1. **Priority Alerts**
   - 2-4 cards with full explainability
   - Red (critical) or Amber (high) badges
   - Expandable details with checklist/timeline
   - Examples provided for all 4 intervention types

2. **What Changed Today**
   - Timeline feed with "why this matters" context
   - Icons by sentiment (✅ green, ⚠️ amber, ↗️ blue)
   - Expandable details with suggested next steps
   - 3 example feed items

3. **Athletes Needing Attention**
   - Up to 12 cards with explainability
   - Momentum badges (↑ rising, → stable, ↓ declining)
   - Quick action icons (📝 log, 💬 message)
   - Expandable details with timeline
   - 3 example cards

4. **Critical Upcoming**
   - Added prep status explainability
   - "Why: Targets not set" context

5. **Routing to Support Pod**
   - Context preservation via URL params
   - Issue highlighted at top of pod
   - Action pre-loaded with quick buttons
   - Timeline context shown
   - Seamless flow: Identify → Coordinate → Resolve

**API Structure Updated:**
- Added explainability fields to all objects
- `why`, `whatChanged`, `recommendedAction`, `owner` required
- `details` object for expansion content
- `actionLink` for routing with context

**Visual Design Guidelines:**
- Typography specs for each explainability field
- Spacing rules (16px padding, 8px gaps)
- Color palette for badges and momentum
- Mobile responsive patterns

**Success Metrics:**
- 95%+ coaches understand why items surfaced
- <5% "why is this here?" questions
- 80%+ trust system recommendations
- 70%+ click-through to Support Pod

---

## Key Decisions Locked

### 1. Explainability is Not Optional
Every surfaced item MUST include WHY, WHAT CHANGED, ACTION, OWNER.
No exceptions. This builds trust and makes the system transparent.

### 2. Lightweight by Design
- 1 sentence for WHY (8-12 words max)
- 1 sentence for WHAT CHANGED
- Progressive disclosure for details (expandable, not required)
- Keep cards calm, premium, scannable

### 3. Priority Scoring is Transparent
- Formula is documented and explainable
- Scores not shown to users (confusing)
- Tiers are intuitive (critical, high, medium, low)
- Rule-based in V1 (AI/ML in V3)

### 4. Maximum 4 Priority Alerts
Never overwhelm coaches. If 10 things are urgent, show top 4 and make the rest accessible in Athletes Needing Attention.

### 5. Consolidation Rules
- Same athlete max 2 issues in Priority Alerts
- Avoid duplicates in same section
- Make consolidated view clear ("+ 2 more issues")

### 6. Routing Preserves Context
When navigating Mission Control → Support Pod, the specific issue is highlighted and actionable immediately. No "starting over" in the pod.

### 7. V1 is Rule-Based
Decision Engine uses documented rules and scoring, not AI/ML. This ensures explainability works correctly before adding black-box intelligence.

---

## What This Enables

### For Implementation (Next Steps):
1. **Backend developers** have exact scoring formula and rules
2. **Frontend designers** have exact card layouts and patterns
3. **Mock data creators** know what fields are required
4. **Testers** have clear success criteria (95% comprehension)

### For Product:
1. **Coaches trust the system** - they understand why things surface
2. **No mystery alerts** - every item is explainable
3. **Action is clear** - every card tells you what to do next
4. **Ownership is explicit** - no "someone should handle this"

### For Future Phases:
1. **Support Pod** knows what context to expect from Mission Control
2. **Event Mode** knows how to generate momentum signals
3. **Advocacy Mode** knows how to surface recommendations
4. **Program Intelligence** knows what metrics to track

---

## Implementation Checklist

### Must Build for V1:

**Backend:**
- [ ] 6 intervention category detection logic
- [ ] Priority scoring algorithm (urgency × impact × actionability × ownership)
- [ ] Surfacing logic (top 2-4, consolidation rules)
- [ ] Explainability field generation (why, whatChanged, action, owner)
- [ ] Mock data with realistic examples for all 6 categories
- [ ] API endpoint returning structured explainability

**Frontend:**
- [ ] Alert card component with explainability pattern
- [ ] Expandable details component (progressive disclosure)
- [ ] Momentum feed item with "why this matters"
- [ ] Athlete card with issue reason and context
- [ ] Owner label component
- [ ] Badge component (critical/high/medium, rising/declining)
- [ ] Navigation to Support Pod with context params
- [ ] Skeleton loading states

**Testing:**
- [ ] User testing: Do coaches understand why items surfaced? (target: 95%+)
- [ ] Explainability text is clear and concise
- [ ] Cards feel calm, not cluttered
- [ ] Progressive disclosure works smoothly
- [ ] Mobile touch targets work well
- [ ] Support Pod context routing works correctly

### Can Defer to V1.5+:
- [ ] Machine learning for scoring
- [ ] Personalized scoring per coach
- [ ] Historical pattern recognition
- [ ] Multi-athlete consolidation alerts
- [ ] Coach effectiveness impact on scoring

---

## Quality Bar

### Before Shipping V1:
1. **Every coach in testing** (5-10 people) must understand why every item surfaced
2. **Zero "mystery" alerts** - if we can't explain it, don't show it
3. **Action buttons are specific** - no generic "View" or "Action"
4. **Owner is always clear** - never "Coach" without name, never "TBD"
5. **Cards stay lightweight** - if a card feels cluttered, simplify

### User Testing Script:
```
Show coach Mission Control with 3 priority alerts.

For each alert, ask:
1. "Why is this athlete showing up here?"
2. "What should you do about it?"
3. "Who should do it?"
4. "Does this feel urgent/important?"

Target: 100% correct answers to questions 1-3.
```

---

## Documents Ready for Review

### ✅ Complete Specifications:
1. **CATEGORY_POSITIONING.md** - What we're building and why
2. **PRODUCT_ARCHITECTURE.md** - Operating contexts + Decision Engine
3. **DECISION_ENGINE_SPEC.md** - Concrete behavior rules ← NEW
4. **MISSION_CONTROL_SPEC.md V2** - Screen spec with explainability ← UPDATED
5. **UX_PRINCIPLES.md** - 11 principles including "Explain the Why"
6. **MVP_RECOMMENDATION.md** - Realistic timelines and phases

### 📋 Implementation Ready:
- Backend team can build Decision Engine from spec
- Frontend team can build UI from screen spec
- Design team has clear patterns and guidelines
- Product team has quality bar and success metrics

---

## Next Actions

### 1. Review & Validate (This Session)
- [ ] Review DECISION_ENGINE_SPEC.md - Are the 6 categories right?
- [ ] Review scoring formula - Does urgency × impact × actionability × ownership make sense?
- [ ] Review explainability pattern - Is it lightweight enough?
- [ ] Review examples - Do they feel realistic and clear?

### 2. Refine if Needed
- [ ] Adjust any category triggers if needed
- [ ] Tweak scoring weights if needed
- [ ] Simplify explainability language if too verbose
- [ ] Add any missing intervention categories

### 3. Lock & Implement
- [ ] Mark specs as "locked" (no further changes without review)
- [ ] Begin backend implementation (Decision Engine)
- [ ] Begin frontend implementation (explainability UI)
- [ ] Create realistic mock data
- [ ] Schedule user testing sessions

### 4. Prepare for Support Pod (V1.5)
- [ ] Document how Support Pod receives context from Mission Control
- [ ] Define Support Pod workspace with issue highlighting
- [ ] Plan action buttons and ownership assignment
- [ ] Consider how blockers are resolved in pod

---

## Summary

**What's Locked:**
- Decision Engine behavior (6 categories, scoring, surfacing)
- Explainability structure (WHY, WHAT CHANGED, ACTION, OWNER)
- UI patterns (lightweight cards with progressive disclosure)
- Quality bar (95%+ comprehension, no mystery alerts)

**What's Flexible:**
- Visual design details (colors, fonts already specified)
- Animation and interaction details
- Copy/language tweaks based on user testing
- Edge cases and error states

**Ready to Build:**
Backend and frontend teams have everything they need to implement Mission Control V1 with full explainability.

**Next Milestone:**
Ship Mission Control V1 with Decision Engine, get coach feedback, validate explainability works, then proceed to V1.5 (Support Pod).

---

The product behavior is locked. Implementation can begin.
