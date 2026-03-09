# CapyMatch — Unified Platform Architecture Plan

## 1. Vision

CapyMatch becomes **one platform** where Directors, Coaches, Athletes, and Families all log in to the same app but land in **different role-based experiences**.

- One shared backend / source of truth
- One shared data model
- One shared auth system
- Role-specific UI surfaces

---

## 2. Current State — Two Separate Apps

### App A: Athlete/Parents App (`capymatch/capymatch`)
| Aspect | Details |
|--------|---------|
| **Purpose** | Athletes/parents manage college recruiting journey |
| **Auth** | Session-based (email/password + Google OAuth) |
| **Users** | Athletes, Parents, Admin |
| **Data isolation** | Tenant-scoped (`tenant_id` per user/family) |
| **Database** | MongoDB — fully persistent, real data |
| **AI** | Claude Sonnet 4.5 (email drafts, coach watch) |
| **Payments** | Stripe subscriptions (free/premium) |
| **Gmail** | Full integration (send/receive, auto-detect replies) |
| **Key pages** | Dashboard, Pipeline/Board, Calendar, Inbox, Schools DB, Profile, Analytics, Public Profile, Journey, Settings |
| **Routes** | 25+ modules |
| **Background tasks** | Coach reply checker (10min), Inbound email scanner (2hr), Coach Watch (weekly), GPA refresh (monthly) |

### App B: Coach/Director App (`capymatch/capymatch-staff`) — THIS WORKSPACE
| Aspect | Details |
|--------|---------|
| **Purpose** | Club directors/coaches manage athletes and recruiting operations |
| **Auth** | JWT-based (email/password, role field: director/coach) |
| **Users** | Directors, Coaches |
| **Data isolation** | Single org, role-based access |
| **Database** | MongoDB + in-memory mock data (ATHLETES array) |
| **AI** | GPT 5.2 (program briefs, roster insights) |
| **Email** | Resend (nudges to coaches) |
| **Key pages** | Mission Control, Roster, Support Pods, Events, Advocacy, Program Intelligence |
| **Routes** | 10+ routers |
| **Background tasks** | None |

---

## 3. Entity Mapping — Same Concepts, Different Names

| Unified Concept | Athlete App | Staff App | Conflict? |
|----------------|-------------|-----------|-----------|
| **User account** | `users` (user_id, email, session-based) | `users` (id, email, JWT, role) | YES — different auth, different ID format |
| **Athlete** | `athlete_profiles` (tenant-scoped, self-managed) | `ATHLETES` (in-memory mock, staff-managed) | YES — different schemas, different ownership |
| **College coach** | `coaches` (targets to recruit from) | N/A | Unique to athlete app |
| **Club coach** | N/A | `users` where role=coach | Unique to staff app |
| **Director** | N/A (admin is different) | `users` where role=director | Unique to staff app |
| **School/Program** | `programs` (pipeline tracking) | N/A | Unique to athlete app |
| **Events** | `events` (camps, showcases, visits) | In-memory events | Different schemas |
| **Notifications** | `notifications` (coach_reply, follow_up, profile_view) | N/A (toast only) | Different systems |
| **Notes** | `notes` (per-program) | `athlete_notes`, `coach_notes` | Different contexts |
| **Email** | Gmail API integration | Resend (outbound only) | Different purposes |
| **AI** | Claude (email drafts, coach watch) | GPT 5.2 (briefs, insights) | Can coexist |
| **Payments** | Stripe (subscriptions) | N/A | Unique to athlete app |

---

## 4. Data Isolation Model

### Definitions

| Scope Key | What it represents | Who it belongs to | Survives unification? |
|-----------|--------------------|-------------------|-----------------------|
| **`org_id`** | A club or organization (e.g., "Munciana Volleyball Club") | The director who created it | **YES** — scopes all staff-side data |
| **`tenant_id`** | A single athlete/family's private data space | An athlete or parent account | **YES** — scopes all athlete-side personal data |

### Why both survive

`org_id` and `tenant_id` solve different isolation problems:

- **`org_id`** answers: "Which club does this data belong to?" Staff (directors, coaches) operate within an org. The roster, coach assignments, bulk actions, program intelligence — all scoped by `org_id`.
- **`tenant_id`** answers: "Which family's private data is this?" An athlete's recruiting pipeline, Gmail threads, school notes, profile views — all scoped by `tenant_id`. No other family can see this data, and staff see only what's explicitly shared.

### Entity scoping rules

| Entity | Scoped by | Reasoning |
|--------|-----------|-----------|
| `users` | Global (unique email) | A user exists once in the system regardless of role |
| `organizations` | N/A (top-level) | Each club is its own org |
| `athletes` | `org_id` | Athletes belong to a club. Staff queries filtered by their org |
| `programs` (school pipeline) | `tenant_id` | Private to the athlete/family tracking schools |
| `college_coaches` | `tenant_id` | Private to the athlete/family's pipeline |
| `events` | `org_id` + optional `athlete_id` | Org-wide events visible to all; athlete-specific events private |
| `gmail_tokens` | `tenant_id` | Gmail is personal, not org-wide |
| `notifications` | `user_id` | Per-user, role-appropriate |
| `athlete_notes` (staff-written) | `org_id` + `athlete_id` | Staff notes about an athlete within the club |
| `coach_notes` | `org_id` | Director notes to/about coaches |
| `recommendations` | `org_id` + `athlete_id` | Staff recommendations for an athlete |
| `profile_views` | `tenant_id` | Public profile analytics, private to athlete |
| `payment_transactions` | `tenant_id` | Subscriptions are per-family |

### Cross-boundary visibility

| Actor | Can see | Cannot see |
|-------|---------|------------|
| **Director** | All athletes in their `org_id`, coach data, org events, staff notes | Athlete's private pipeline, Gmail, family payment info |
| **Coach** | Athletes assigned to them within `org_id`, their own notes | Other coaches' athletes (unless director grants), private pipelines |
| **Athlete** | Own `tenant_id` data (pipeline, profile, Gmail), coach notes about them (read-only) | Other athletes' data, staff-internal discussions |
| **Parent** | Everything the linked athlete can see (read-heavy) | Other families' data |

---

## 5. Account Model

### 5.1 One user = one role (V1)

In V1, each user record has exactly one `role`. This keeps auth middleware simple and avoids ambiguous UI states.

```
users.role ∈ { "director", "coach", "athlete", "parent" }
```

### 5.2 Can a coach also be a parent?

**V1: No.** A person who is both a club coach and a parent of an athlete would need **two separate accounts** with different emails. This is an intentional V1 simplification.

**V2 (future):** Introduce a `roles[]` array and a role-switcher in the UI (like Slack workspace switching). Not needed until there's real user demand.

### 5.3 Can one parent manage multiple athletes?

**Yes.** The `family_links` collection (see Section 6) supports one parent linked to multiple athlete records. The parent's dashboard shows a selector to switch between their children.

### 5.4 Can an athlete exist without a login?

**Yes.** This is critical. The workflow is:

1. **Director/coach creates the athlete record** in the roster (no `user_id` yet). The athlete exists as a row in the `athletes` collection with `user_id: null`.
2. **Later, the athlete (or parent) registers** and claims the record. The system matches by email or an invite code, and sets `athletes.user_id` to the new user's ID.
3. **Until claimed**, the athlete record is fully manageable by staff but has no self-service capabilities (no pipeline, no profile editing, no Gmail).

### 5.5 Can a parent exist without a linked athlete?

**No.** Parent accounts are created through an invite or linking flow. A parent must be linked to at least one athlete record to have a meaningful experience.

### 5.6 Registration flows

| Role | How they get an account |
|------|------------------------|
| **Director** | Self-registers (creates org) or is added by platform admin |
| **Coach** | Invited by director (existing flow) |
| **Athlete** | Self-registers and claims athlete record, OR invited by coach/director |
| **Parent** | Invited by athlete, OR self-registers and links to athlete via invite code |

---

## 6. Family Relationship Model

### The `family_links` collection

Parents and athletes are connected through an explicit relationship record. This is **not** implicit from shared emails or last names — it is a declared, confirmed link.

```
family_links {
  id: string
  parent_user_id: string          // The parent's user account ID
  athlete_id: string              // The athlete record ID (in athletes collection)
  relationship: string            // "mother" | "father" | "guardian" | "other"
  permission_level: string        // "full" | "read_only"
  status: string                  // "active" | "pending" | "revoked"
  invited_by: string              // user_id of whoever created the link
  created_at: datetime
}
```

### Rules

1. **One parent → many athletes.** A parent can be linked to multiple athlete records (siblings).
2. **One athlete → many parents.** Both parents/guardians can have accounts linked to the same athlete.
3. **Athletes control the link.** If the athlete has an account, they can approve/revoke parent access. If the athlete has no account, the director or coach who created the athlete record controls the link.
4. **Permission levels:**
   - `full` — Parent can view pipeline, edit profile, manage events on behalf of the athlete. This is the default for the parent who created the link.
   - `read_only` — Parent can view but not modify. Useful for secondary guardians.
5. **Parent dashboard:** When a parent logs in, they see a list of their linked athletes and can switch between them. Each athlete view shows the same data the athlete would see, filtered by `permission_level`.

### Link creation flows

| Scenario | Flow |
|----------|------|
| Director creates athlete, adds parent email | System creates `family_links` entry with `status: "pending"`. When parent registers, link activates. |
| Athlete registers, invites parent | Athlete generates an invite code/link. Parent registers using it. Link created as `status: "active"`. |
| Parent registers, claims athlete | Parent enters athlete's email or invite code. If athlete has an account, athlete must approve. If not, auto-links. |

---

## 7. Target Unified Data Model

### 7.1 Users (Unified)
```
users {
  id: string (uuid)
  email: string (unique)
  password_hash: string (optional — null for Google OAuth users)
  name: string
  picture: string
  role: "director" | "coach" | "athlete" | "parent"
  org_id: string (nullable — null for athletes/parents not yet in a club)
  google_id: string (optional)
  created_at: datetime
  last_active: datetime
  onboarding: object
  profile: object (role-specific profile data)
}
```

### 7.2 Organizations
```
organizations {
  id: string
  name: string (e.g., "Munciana Volleyball Club")
  owner_id: string (director user id)
  plan: "free" | "basic" | "premium"
  created_at: datetime
}
```

### 7.3 Athletes (Canonical Record — PHASE 1 CORE)

This is the **single source of truth** for every athlete in the system. It replaces both the in-memory `ATHLETES` mock array in the staff app and the `athlete_profiles` collection in the athlete app.

```
athletes {
  id: string
  user_id: string (nullable — null until athlete creates their own account)
  org_id: string (the club they belong to)
  tenant_id: string (nullable — set when athlete has an account, for private data isolation)

  // Identity
  full_name: string
  email: string (nullable — may not have email if staff-created)
  phone: string
  grad_year: string
  position: string
  team: string
  jersey_number: string

  // Physical
  height: string
  weight: string
  standing_reach: string
  approach_touch: string
  block_touch: string
  wingspan: string
  handed: string

  // Academic
  gpa: string
  high_school: string

  // Club info
  club_team: string
  city: string
  state: string

  // Recruiting intel (staff-managed — populated by director/coach)
  recruiting_stage: string       // "exploring" | "actively_recruiting" | "narrowing" | "committed"
  momentum_score: number
  momentum_trend: string         // "rising" | "stable" | "declining"
  school_targets: number
  active_interest: number
  days_since_activity: number
  last_activity: datetime

  // Media
  hudl_url: string
  video_link: string
  photo_url: string
  bio: string

  // Contact
  contact_email: string
  contact_phone: string
  parent_name: string
  parent_email: string
  parent_phone: string

  // Staff-managed
  primary_coach_id: string (club coach user id)
  unassigned_reason: string (nullable)

  created_at: datetime
  updated_at: datetime
  created_by: string (user_id of who added this athlete — director, coach, or self)
}
```

**Key behaviors:**
- When `user_id` is null: athlete was created by staff, not yet self-service
- When `user_id` is set: athlete has claimed the record, can edit their own profile fields, build pipeline
- When `tenant_id` is set: athlete's private data (pipeline, Gmail, etc.) is isolated under this key
- Staff can always edit staff-managed fields (recruiting_stage, momentum, coach assignment) regardless of `user_id`
- Athlete can edit identity/physical/academic/media fields when `user_id` is set

### 7.4 Family Links
```
family_links {
  id: string
  parent_user_id: string
  athlete_id: string
  relationship: "mother" | "father" | "guardian" | "other"
  permission_level: "full" | "read_only"
  status: "active" | "pending" | "revoked"
  invited_by: string
  created_at: datetime
}
```

### 7.5 College Coaches (from athlete app)
```
college_coaches {
  id: string
  program_id: string
  university_name: string
  coach_name: string
  role: string
  email: string
  phone: string
  notes: string
}
```

### 7.6 Programs / Schools (from athlete app)
```
programs {
  id: string
  tenant_id: string (scoped to athlete/family)
  athlete_id: string (which athlete is tracking this)
  university_name: string
  division: string
  conference: string
  recruiting_status: string
  reply_status: string
  priority: string
  journey_stage: string
  // ... (full schema from athlete app)
}
```

### 7.7 Events (Unified)
```
events {
  id: string
  org_id: string (nullable — org-wide events)
  tenant_id: string (nullable — athlete-private events)
  athlete_id: string (nullable — athlete-specific events)
  created_by: string (user id)
  title: string
  event_type: string
  location: string
  start_date: string
  end_date: string
  description: string
  linked_program_id: string (nullable)
}
```

---

## 8. Target Auth System

### Unified approach: JWT + optional Google OAuth

| Feature | Implementation |
|---------|---------------|
| **Login** | Email/password → JWT token |
| **Google OAuth** | Optional, returns JWT token |
| **Role detection** | JWT payload includes `role` field |
| **Route protection** | Middleware checks role for each endpoint |
| **Frontend routing** | After login, redirect based on role |

### Login Flow
```
User logs in → Server returns { token, user: { id, email, name, role } }
                                                        |
                              role === "director"  → /mission-control
                              role === "coach"     → /mission-control
                              role === "athlete"   → /board (dashboard)
                              role === "parent"    → /board (dashboard)
```

---

## 9. Role-Based Frontend Experiences

### Director Experience (existing)
- Mission Control (KPIs, AI Brief, Needs Attention, Coach Health)
- Roster (athlete management, bulk actions)
- Program Intelligence
- Coach activation & nudging

### Coach Experience (existing)
- Coach Mission Control (Today's Actions, My Roster)
- Athlete support pods
- Event preparation

### Athlete Experience (to build — migrated from athlete app)
- Dashboard (recruiting stats, follow-up reminders)
- Pipeline/Board (school tracking, kanban)
- School Knowledge Base
- Profile (self-managed, public-facing)
- Calendar
- Analytics (profile views)

### Parent Experience (to build)
- Same as athlete, but read-heavy with oversight capabilities
- Can view athlete's pipeline and progress
- Receives notifications about coach activity
- Athlete selector when linked to multiple athletes

---

## 10. Integration Dependency Notes

### Gmail Integration

Gmail is deeply embedded in the athlete app's value proposition. Until it is migrated to the unified platform, the following athlete-facing features are **partially functional or unavailable**:

| Feature | Status without Gmail | Impact |
|---------|---------------------|--------|
| **Inbox** | Not available | Athletes cannot send/receive coach emails from within the app |
| **Auto-status updates** | Not available | Pipeline cards won't auto-move to "Contacted" when emails are sent |
| **Coach reply detection** | Not available | No automatic "Reply Received" status or notifications |
| **AI email drafts** | Partially available | Can still generate drafts, but user must copy/paste to external email client |
| **Inbound contact scanner** | Not available | Won't auto-detect new schools emailing the athlete |

**Planned migration phase:** Phase 3 (Pipeline & Communication)
**Workaround until then:** Athletes manage email externally and manually update pipeline statuses.

### Stripe Integration

Stripe powers subscription gating in the athlete app. Until migrated:

| Feature | Status without Stripe | Impact |
|---------|----------------------|--------|
| **Free/Premium tiers** | Not available | All athlete features are ungated (no paywall) |
| **Payment page** | Not available | No way to upgrade within the app |
| **Feature gating** | Not available | Premium features (Coach Watch, AI drafts, advanced analytics) available to all |
| **Subscription management** | Not available | No billing page, no plan changes |

**Planned migration phase:** Phase 5 (Advanced Features)
**Workaround until then:** All athlete features are available without subscription limits. This is acceptable during early unified platform testing.

---

## 11. Surface-by-Surface Migration Map

### Staff Surfaces (already in this app)

| Surface | Current Home | Future Home | Phase | Notes |
|---------|-------------|-------------|-------|-------|
| Director Mission Control | Staff app | Unified (no change) | Exists | — |
| Coach Mission Control | Staff app | Unified (no change) | Exists | — |
| Roster | Staff app | Unified (no change) | Exists | Reads from canonical `athletes` collection after Phase 1 |
| Bulk Actions | Staff app | Unified (no change) | Exists | Writes to canonical `athletes` collection after Phase 1 |
| Support Pods | Staff app | Unified (no change) | Exists | — |
| Program Intelligence | Staff app | Unified (no change) | Exists | — |
| Event Mode | Staff app | Unified (no change) | Exists | Merges with unified events in Phase 4 |
| Advocacy Mode | Staff app | Unified (no change) | Exists | — |
| Coach Invitation | Staff app | Unified (no change) | Exists | — |
| Coach Nudge | Staff app | Unified (no change) | Exists | — |

### Athlete Surfaces (to migrate from athlete app)

| Surface | Current Home | Future Home | Phase | Dependencies |
|---------|-------------|-------------|-------|--------------|
| Athlete Dashboard | Athlete app | Unified | Phase 2 | Canonical athletes collection |
| Athlete Profile Editor | Athlete app | Unified | Phase 2 | Canonical athletes collection |
| Public Profile Page | Athlete app | Unified | Phase 2 | Canonical athletes collection |
| School Knowledge Base | Athlete app | Unified | Phase 2 | University KB data (import) |
| Recruiting Pipeline/Board | Athlete app | Unified | Phase 3 | `programs` collection, college_coaches |
| Journey Page (per-school) | Athlete app | Unified | Phase 3 | `programs`, `interactions` |
| Inbox (Gmail) | Athlete app | Unified | Phase 3 | Gmail OAuth integration |
| AI Email Drafts | Athlete app | Unified | Phase 3 | Gmail + LLM integration |
| Calendar | Athlete app | Unified | Phase 3 | Unified events model |
| Analytics (Profile Views) | Athlete app | Unified | Phase 5 | `profile_views` collection |
| Social Spotlight | Athlete app | Unified | Phase 5 | Social media scraping |
| Highlight Advisor | Athlete app | Unified | Phase 5 | AI analysis |
| Outreach Analysis | Athlete app | Unified | Phase 5 | Engagement tracking |
| Settings | Athlete app | Unified | Phase 2 | — |
| Billing / Subscriptions | Athlete app | Unified | Phase 5 | Stripe integration |

### New Surfaces (don't exist in either app yet)

| Surface | Future Home | Phase | Notes |
|---------|-------------|-------|-------|
| Role-based Login/Register | Unified | Phase 1 | Single login → role-based redirect |
| Athlete Registration + Claim Flow | Unified | Phase 1 | Athlete claims staff-created record |
| Parent Dashboard | Unified | Phase 5 | Read-heavy view of linked athlete(s) |
| Parent ↔ Athlete Linking | Unified | Phase 5 | Invite/approve family connections |
| Cross-role Notifications | Unified | Phase 4 | Coach note → athlete sees it, reply → director alerted |
| Director Pipeline Visibility | Unified | Phase 4 | Director sees athlete's school pipeline (read-only) |
| Smart Match | Unified | Phase 5 | AI school-athlete pairing suggestions |

---

## 12. Phased Implementation Plan

### Phase 1: Foundation (Current Priority)

**Core deliverables:**
- [ ] **Canonical `athletes` collection** — Migrate `ATHLETES` mock array to real MongoDB. All existing staff features (Roster, Mission Control, Support Pods, Bulk Actions) read/write from this collection. This is the single source of truth going forward.
- [ ] **Seed migration script** — One-time script that inserts current mock data into `athletes` collection and removes dependency on `mock_data.py`.
- [ ] **Add `athlete` and `parent` roles** to auth system (extend user model, update JWT payload).
- [ ] **Athlete/parent registration flow** — New registration endpoint and UI. Athletes can optionally claim an existing athlete record by invite code or email match.
- [ ] **Role-based routing** — After login, redirect to role-appropriate dashboard. Sidebar navigation adapts per role.
- [ ] **`organizations` collection** — Create org model. Link existing director/coach users to a default org.

### Phase 2: Athlete Dashboard
- [ ] Build athlete dashboard (recruiting stats, follow-up reminders)
- [ ] Build athlete profile page (self-managed, edits canonical `athletes` record)
- [ ] Build public profile page (shareable link)
- [ ] Port school knowledge base (university DB)
- [ ] Build athlete settings page

### Phase 3: Pipeline & Communication
- [ ] Build recruiting pipeline/board (kanban)
- [ ] Port Gmail integration (OAuth, send/receive)
- [ ] Port AI email drafts
- [ ] Build calendar page (unified events model)
- [ ] Build journey page (per-school detail and timeline)

### Phase 4: Connected Experiences
- [ ] Director can see athlete's recruiting pipeline progress (read-only)
- [ ] Coach sees athlete's school list and engagement
- [ ] Athlete sees their coach's notes and recommendations
- [ ] Shared event calendar across roles
- [ ] Cross-role notification system

### Phase 5: Advanced Features
- [ ] Port Stripe subscriptions (free/premium gating)
- [ ] Port engagement tracking / analytics
- [ ] Smart Match (AI school-athlete pairing)
- [ ] Parent experience (dashboard, family linking, athlete selector)
- [ ] Port Social Spotlight, Highlight Advisor, Outreach Analysis

---

## 13. Migration Strategy

### Phase 1 data work (immediate)
1. **Athletes**: Write a migration script that converts the `ATHLETES` in-memory array into MongoDB documents matching the canonical schema (Section 7.3). Update all staff-side code to query `db.athletes` instead of the in-memory array.
2. **Organizations**: Create an `organizations` document for the existing club. Link all director/coach users to it via `org_id`.
3. **Users**: Extend the `users` collection schema to accept `role ∈ {director, coach, athlete, parent}`. Existing users keep their roles.

### What stays separate (until migrated in later phases)
- **Gmail integration** → Phase 3
- **Stripe subscriptions** → Phase 5
- **Admin panel** → Not migrated (platform admin is a separate concern)
- **College coach database** → Phase 3
- **Background tasks** (reply checker, inbound scanner, coach watch) → Phase 3+

### What gets shared immediately (Phase 1)
- Auth system (unified JWT, all 4 roles)
- User collection (all roles in one collection)
- Athlete data (one canonical collection)
- Role-based routing

---

## 14. Naming Clarification

To avoid confusion between "college coaches" and "club coaches":

| Term in unified app | Meaning |
|---------------------|---------|
| **Coach** | Club/staff coach (manages athletes day-to-day) |
| **Director** | Club director (oversees coaches and program) |
| **Athlete** | The student athlete |
| **Parent/Family** | Parent or guardian of athlete |
| **College Coach** | Coach at a university program (recruiting target) |
| **Program** / **School** | A university volleyball program being tracked |

---

## 15. Files of Reference

### Athlete App (capymatch/capymatch)
- `backend/server.py` — 25+ route modules, background tasks, Stripe webhooks
- `backend/auth.py` — Session-based auth with tenant isolation
- `backend/models.py` — Pydantic models (programs, coaches, events, emails)
- `backend/database.py` — MongoDB connection
- `frontend/src/App.js` — Full routing with lazy loading, Google OAuth
- `DOCUMENTATION.md` — Complete API reference and DB schema

### Staff App (capymatch/capymatch-staff) — this workspace
- `backend/server.py` — FastAPI app with JWT auth
- `backend/auth_middleware.py` — JWT auth middleware
- `backend/mock_data.py` — In-memory ATHLETES data (to be replaced in Phase 1)
- `backend/routers/roster.py` — Roster management + bulk actions
- `frontend/src/pages/RosterPage.js` — Roster UI
- `frontend/src/pages/MissionControlPage.js` — Director/Coach dashboards
