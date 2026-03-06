# CapyMatch - UX Principles & Design System Guidelines

## Core Mission

CapyMatch is a **recruiting operating system**, not a traditional dashboard or CRM.

Every design decision should support:
- **Athlete momentum** (not just data collection)
- **Support coordination** (not just information display)
- **Coach advocacy** (not just tracking)
- **Proactive intelligence** (not just reporting)

---

## 10 UX Principles

### 1. Proactive, Not Reactive

**What This Means:**
- Surface what needs attention
- Don't make coaches hunt for problems
- Prioritize ruthlessly
- Push insights, don't wait for queries

**In Practice:**
- Priority alerts at top of Mission Control
- Notifications for momentum changes
- "Needing Attention" surfaces issues automatically
- AI-ready architecture for intelligent recommendations

**Anti-Patterns to Avoid:**
- Passive dashboards that just show data
- Reports that require interpretation
- Hidden insights buried in menus
- Waiting for user to ask questions

---

### 2. Action-Oriented

**What This Means:**
- Every screen should make the next action clear
- No dead ends
- Buttons and CTAs suggest what to do
- Minimize decision paralysis

**In Practice:**
- Every athlete card has "View Support Pod" button
- Momentum signals include quick actions
- Blockers show resolution paths
- Empty states suggest next steps

**Anti-Patterns to Avoid:**
- Screens that only display information
- Unclear next steps
- Missing CTAs
- Forcing users to figure out what to do

---

### 3. High Signal, Low Noise

**What This Means:**
- Prioritize ruthlessly
- Only show what matters
- Avoid information overload
- Quality over quantity

**In Practice:**
- Limit priority alerts to 2-4 items
- "What Changed Today" shows 5-8 items, not 50
- Filter out low-priority information
- Progressive disclosure: overview first, details on demand

**Anti-Patterns to Avoid:**
- Dense data tables with 20+ columns
- Showing everything "just in case"
- No filtering or prioritization
- Wall of text

---

### 4. Calm Clarity

**What This Means:**
- Use whitespace generously
- Clear typography hierarchy
- Minimal color palette
- Apple-level restraint
- Emotionally clear, not anxious

**In Practice:**
- Generous padding and margins
- Clean sans-serif fonts (see Font Guidelines)
- Color used for meaning, not decoration
- Subtle animations, not flashy
- Professional, premium feel

**Anti-Patterns to Avoid:**
- Cramped layouts
- Excessive colors and gradients (follow gradient restrictions)
- Busy backgrounds
- Cluttered interfaces
- Aggressive, anxious design

---

### 5. Human-Centered Language

**What This Means:**
- Write for support coordination, not data management
- Use empathetic, clear language
- Avoid jargon and database labels
- Speak like a coach, not a system

**In Practice:**
- "Sarah needs follow-up" not "Task overdue: ID 4829"
- "No activity in 18 days" not "Last modified: 2024-12-15"
- "Athletes needing attention" not "High-priority records"
- "Support Pod" not "Stakeholder group"

**Anti-Patterns to Avoid:**
- Technical database language
- Jargon ("stakeholders", "entities", "records")
- Cold, transactional tone
- System-speak

---

### 6. Contextual Depth

**What This Means:**
- Start with overview
- Allow drill-down for details
- Progressive disclosure
- Don't flatten everything

**In Practice:**
- Mission Control shows priorities → click to Support Pod for details
- Athlete cards show summary → expand or navigate for full context
- "View all activity" links for deeper exploration
- Tooltips and expandable sections

**Anti-Patterns to Avoid:**
- Everything at same depth
- Forcing all details upfront
- No way to get more context
- Flat, single-level interfaces

---

### 7. Coordinated Intelligence

**What This Means:**
- Make relationships visible
- Show who owns what
- Identify blockers and dependencies
- Coordinate support across pod members

**In Practice:**
- Support Pod shows member roles and ownership
- Actions show assignee and status
- Blockers are visible and contextualized
- Communication is threaded and visible to pod

**Anti-Patterns to Avoid:**
- Siloed information
- Unclear ownership
- Hidden dependencies
- No coordination visibility

---

### 8. Mobile-Ready Operations

**What This Means:**
- Coaches work on the go
- Design for quick mobile check-ins
- Event Mode especially mobile-critical
- Touch-friendly interactions

**In Practice:**
- Responsive design for all screens
- FAB for quick actions on mobile
- Swipe gestures for cards
- Large tap targets
- Fast loading on mobile networks

**Anti-Patterns to Avoid:**
- Desktop-only design
- Tiny touch targets
- Slow mobile performance
- Non-responsive layouts

---

### 9. No Generic Tables

**What This Means:**
- Avoid enterprise data grids
- Use cards, lists, visual hierarchy
- Tables only when truly needed (rare)
- Prioritize scanability over density

**In Practice:**
- Athletes Needing Attention: cards, not rows
- What Changed Today: timeline feed, not table
- Events: calendar/list view, not grid
- Support Pod: sections and cards, not spreadsheet

**Anti-Patterns to Avoid:**
- Default to tables for everything
- Dense grids with 15+ columns
- Sortable column headers as primary UI
- Excel-style interfaces

---

### 10. Premium Feel

**What This Means:**
- This is a professional tool for high-stakes work
- Design should feel premium, not generic SaaS
- Attention to detail matters
- Quality over speed (but both matter)

**In Practice:**
- Smooth animations and transitions
- Thoughtful micro-interactions
- High-quality typography
- Consistent design system
- Polish and refinement

**Anti-Patterns to Avoid:**
- Generic Bootstrap/Material UI defaults
- Inconsistent styling
- Janky animations
- "Good enough" mindset

---

## Design System Guidelines

### Color Palette

**Philosophy:**
- Use color for meaning, not decoration
- Minimal, intentional palette
- Accessible contrast ratios

**Color Usage:**

**Momentum/Priority Colors:**
- **Green/Teal:** Positive momentum, success, on track
- **Amber/Yellow:** Caution, needs attention, medium priority
- **Red/Coral:** Critical, blocker, high priority
- **Blue:** Opportunity, information, neutral

**UI Colors:**
- **Background:** Light (white, off-white, subtle gray)
- **Text:** Dark gray/charcoal (not pure black)
- **Primary Action:** Blue or teal
- **Secondary:** Gray or muted blue
- **Borders:** Light gray, subtle

**Avoid:**
- Pure black (#000000) — use dark charcoal instead
- Bright, saturated colors everywhere
- Rainbow color schemes
- Dark backgrounds as default (hybrid approach: light UI with focused zones)

### GRADIENT RESTRICTIONS (CRITICAL)

**NEVER:**
- Use dark/saturated gradient combos (purple/pink, deep blue/red)
- Let gradients cover more than 20% of viewport
- Apply gradients to text-heavy content or reading areas
- Use gradients on small UI elements (<100px width)
- Stack multiple gradient layers in same viewport

**ALLOWED:**
- Hero/landing sections (background only, ensure text readability)
- Section backgrounds (not content blocks)
- Large CTA buttons / major interactive elements (light/simple gradients only)
- Decorative overlays and accent visuals

**ENFORCEMENT:**
If gradient area exceeds 20% of viewport OR impacts readability, fallback to solid colors or simple two-color gradients.

---

### Typography

**Font Selection Philosophy:**
- Enhance distinctiveness
- Avoid generic outputs
- Randomize font choices for freshness
- Match font to product category

**For CapyMatch Coach/Club (Apps/Dashboards Category):**

**Primary Heading Font:**
- **Manrope** or **Work Sans** (modern, professional, clean)

**Body/Subheading Font:**
- **Inter** (highly readable, excellent for UI)

**Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap');
```

**Type Scale:**

```css
/* Headings */
H1 (Page Title): text-4xl sm:text-5xl lg:text-6xl (Manrope, font-weight: 700)
H2 (Section): text-2xl sm:text-3xl (Manrope, font-weight: 600)
H3 (Subsection): text-xl sm:text-2xl (Manrope, font-weight: 600)

/* Body */
Body Large: text-lg (Inter, font-weight: 400)
Body: text-base (Inter, font-weight: 400)
Body Small: text-sm (Inter, font-weight: 400)

/* UI Elements */
Button: text-base (Inter, font-weight: 500)
Label: text-sm (Inter, font-weight: 500)
Caption: text-xs (Inter, font-weight: 400)
```

**Hierarchy Rules:**
- H1 for page title only
- H2 for major sections
- H3 for subsections
- Body for content
- Use font-weight for emphasis, not just size

---

### Spacing

**Philosophy:**
- Use 2-3x more spacing than feels comfortable
- Cramped designs look cheap
- Whitespace creates premium feel

**Spacing Scale (Tailwind-based):**

```
XS: 4px (spacing-1)
S:  8px (spacing-2)
M:  16px (spacing-4)
L:  24px (spacing-6)
XL: 32px (spacing-8)
2XL: 48px (spacing-12)
3XL: 64px (spacing-16)
```

**Usage:**
- **Between sections:** 3XL or 2XL
- **Between cards:** L or XL
- **Card padding:** L or XL
- **Between elements in card:** M or L
- **Button padding:** M
- **Icon margins:** S or M

**Avoid:**
- Cramped 8px spacing everywhere
- Inconsistent spacing
- No breathing room

---

### Layout & Grid

**Grid System:**
- 12-column grid (standard)
- Responsive breakpoints:
  - Mobile: < 768px
  - Tablet: 768px - 1199px
  - Desktop: 1200px+

**Content Width:**
- Maximum content width: 1400px
- Center content for ultra-wide screens
- Full-width sections for backgrounds

**Card Layouts:**
- Desktop: 2-3 cards per row
- Tablet: 2 cards per row
- Mobile: 1 card per row
- Use CSS Grid or Flexbox, not floats

---

### Components

#### Buttons

**Primary Button:**
- Bold, prominent
- Solid background color
- Clear label
- Hover state (slight darken)
- Focus state (ring)
- Disabled state (muted)

**Secondary Button:**
- Outlined or ghost style
- Less prominent than primary
- Clear hierarchy

**Button Sizes:**
- Large: Padding 12px 24px, text-base
- Medium: Padding 10px 20px, text-sm
- Small: Padding 8px 16px, text-xs

**Icon Buttons:**
- Square or circular
- Clear hover/active states
- Tooltips for clarity

**Avoid:**
- Too many primary buttons
- Unclear button hierarchy
- Generic default buttons

---

#### Cards

**Card Style:**
- Subtle shadow or border
- Rounded corners (8px or 12px)
- Generous padding (24px or 32px)
- Clear visual separation from background
- Hover state (subtle lift or border change)

**Card Anatomy:**
- Header (title, optional badge)
- Body (content)
- Footer (actions, metadata)

**Avoid:**
- Flat cards that blend into background
- Over-styled cards (heavy shadows, gradients)
- Inconsistent card styles

---

#### Badges & Labels

**Usage:**
- Status indicators
- Momentum signals
- Priority levels
- Grad year, position, stage

**Style:**
- Small, pill-shaped or rounded rectangle
- Background color + text (ensure contrast)
- Compact padding

**Color Mapping:**
- Green: Positive, success, on track
- Yellow: Caution, attention needed
- Red: Critical, blocker
- Blue: Information, opportunity
- Gray: Neutral, inactive

---

#### Forms & Inputs

**Input Fields:**
- Clear labels above or inside
- Placeholder text for guidance
- Focus states (border color change, ring)
- Error states (red border, error message below)
- Disabled states (muted, cursor not-allowed)

**Form Layout:**
- Single column for mobile
- Multi-column for desktop (if space allows)
- Group related fields
- Clear submit button

**Validation:**
- Inline validation (as user types or on blur)
- Clear error messages
- Success states (green check)

---

#### Icons

**Icon Library:**
- Use FontAwesome (CDN) or Lucide React (already installed)
- Consistent icon style throughout
- 16px or 20px for inline icons
- 24px for standalone icons
- 32px+ for large feature icons

**NEVER use AI assistant emojis:**
❌ 🤖🧠💭💡🔮🎯📚🎭🎬🎪🎉🎊🎁🎀🎂🍰🎈🎨🎰💰💵💳🏦💎🪙💸🤑📊📈📉💹🔢🏆🥇

**Use proper icon libraries instead.**

---

### Animations & Transitions

**Philosophy:**
- Smooth, subtle animations
- Not flashy or distracting
- Enhance usability, don't hinder

**Transition Guidelines:**
- **Hover states:** 150-200ms ease
- **Page transitions:** 300ms ease-in-out
- **Modals/drawers:** 250-300ms
- **Loading states:** Smooth fade or skeleton screens

**DO NOT:**
- Use universal transitions like `transition: all`
- This breaks transforms and causes jank
- Always specify specific properties: `transition: background-color 200ms, transform 200ms`

**Micro-interactions:**
- Button hover (slight scale or color change)
- Card hover (lift with shadow)
- Success animations (check mark, green flash)
- Loading spinners (subtle, branded)

**Avoid:**
- Slow, sluggish animations (>500ms)
- Janky, inconsistent timing
- Over-animated interfaces
- Distracting motion

---

### Data Visualization

**When to Use:**
- Program Intelligence dashboards
- Momentum trends over time
- Outcomes and metrics

**Chart Types:**
- **Bar charts:** Comparisons (athletes by stage, grad year)
- **Line charts:** Trends over time (momentum, activity)
- **Pie/Donut charts:** Proportions (stage distribution)
- **Sparklines:** Inline mini-trends

**Style:**
- Clean, minimal design
- Use brand colors
- Clear labels and legends
- Interactive tooltips
- Responsive sizing

**Avoid:**
- 3D charts (hard to read)
- Overly complex visualizations
- Chart junk (unnecessary decorations)
- Too many data series

---

### Accessibility

**Requirements:**

1. **Color Contrast**
   - WCAG AA minimum (4.5:1 for normal text)
   - AAA preferred (7:1)
   - Test with contrast checker tools

2. **Keyboard Navigation**
   - All interactive elements keyboard accessible
   - Visible focus states
   - Logical tab order

3. **Screen Readers**
   - Semantic HTML
   - ARIA labels where needed
   - Alt text for images

4. **Text Sizing**
   - Respect user font size preferences
   - Use relative units (rem, em) not px
   - Minimum 16px base font size

5. **Data Test IDs**
   - Every interactive element must have data-testid
   - Clear, kebab-case naming
   - Example: `data-testid="athlete-card-view-pod-button"`

---

## Component Library (Shadcn/UI)

**Use Shadcn/UI as primary component library:**
- Located in `/app/frontend/src/components/ui/`
- Pre-built, accessible components
- Customizable with Tailwind

**Key Components to Use:**
- Button
- Card
- Badge
- Dialog (modals)
- Dropdown Menu
- Input
- Select
- Tabs
- Toast (use Sonner for toasts)
- Tooltip

**Import Pattern:**
```javascript
import { Button } from './components/ui/button'
import { Card } from './components/ui/card'
```

**DO NOT:**
- Use HTML-based components (dropdowns, calendars, etc.)
- Reinvent components already in Shadcn

---

## Mobile Design Guidelines

### Key Principles

1. **Touch Targets**
   - Minimum 44px x 44px
   - Generous spacing between targets
   - Thumb-friendly zones

2. **Navigation**
   - Sticky header
   - Bottom navigation (optional)
   - FAB for quick actions
   - Swipe gestures

3. **Content**
   - Single column layouts
   - Larger text (minimum 16px)
   - Shorter sentences
   - Scannable content

4. **Performance**
   - Fast loading (<3 seconds)
   - Optimized images
   - Minimal JavaScript
   - Progressive enhancement

---

## Design Review Checklist

Before finalizing any screen:

☐ **Is this proactive?** Does it surface priorities automatically?  
☐ **Is this action-oriented?** Are next steps clear?  
☐ **Is this high-signal?** Is information prioritized and filtered?  
☐ **Is this calm?** Generous whitespace, clear hierarchy?  
☐ **Is language human?** Empathetic, clear, coach-like?  
☐ **Is depth contextual?** Overview first, details on demand?  
☐ **Are relationships visible?** Ownership, coordination clear?  
☐ **Is this mobile-ready?** Works on phone, touch-friendly?  
☐ **Are there no tables?** Cards, lists, visual hierarchy instead?  
☐ **Does this feel premium?** Polished, thoughtful, differentiated?  
☐ **Gradient restrictions followed?** No dark/saturated, <20% viewport, readability preserved?  
☐ **Data test IDs added?** Every interactive element tagged?  

---

## Anti-Pattern Gallery

### What NOT to Build

❌ **Generic SaaS Dashboard**
- Static widgets
- Data tables everywhere
- No prioritization
- Reactive, not proactive

❌ **Traditional CRM**
- Contact list with columns
- Generic "Activities" log
- Transactional language
- No intelligence layer

❌ **Enterprise Portal**
- Dense, cramped layouts
- 20+ column tables
- Database terminology
- Heavy, slow, complex

❌ **Sports Stats Platform**
- Stats-focused, not support-focused
- No coordination features
- Athlete-only view
- No coaching workflows

### What TO Build

✅ **Recruiting Operating System**
- Intelligent, proactive
- Action-oriented
- Support coordination
- Coach advocacy
- Calm, clear, premium

---

## Design System Maintenance

### As Product Evolves

1. **Document new patterns** as they emerge
2. **Update guidelines** based on user feedback
3. **Maintain consistency** across all screens
4. **Refine components** based on usage
5. **Test accessibility** continuously
6. **Gather coach feedback** regularly

### Living Document

This UX principles document should evolve with the product. Review and update quarterly or after major releases.

---

## Summary

CapyMatch coach/club operating system should feel like:
- **Apple** (clarity, restraint, premium)
- **SpaceX Mission Control** (intelligent, focused, high-signal)
- **Linear** (fast, modern, action-oriented)

Not like:
- Salesforce (too enterprise)
- Generic SaaS dashboards (too static)
- Traditional CRMs (too transactional)
- Hudl (too stats-focused)

Every design decision should support athlete momentum, support coordination, and coach advocacy.
