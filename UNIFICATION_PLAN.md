# CapyMatch — Unified Platform Architecture Plan
**Last revised:** 2026-02-13
**Status:** Phase 1 implementation beginning

---

## 1. Vision

One platform. Four roles. Role-based experiences on a shared foundation.

- Directors, Coaches, Athletes, and Parents log into the same app
- Each role lands on a different home screen with different navigation
- One MongoDB database, one auth system, one athlete record

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

### Final Decision

Both `org_id` and `tenant_id` survive in the unified platform. They solve different problems and do not overlap.

**`org_id`** = The club. One club has one `org_id`. Everything the staff (directors and coaches) touches is scoped by `org_id`.

**`tenant_id`** = The family. One athlete (or their parent) has one `tenant_id`. Everything private to a family's recruiting journey is scoped by `tenant_id`.

These are not interchangeable. An athlete belongs to an org (the club manages them) AND has a tenant (their private recruiting data). A director has an `org_id` but never a `tenant_id`. A parent has a `tenant_id` but never an `org_id`.

### Scope Assignment Per Role

| Role | Has `org_id`? | Has `tenant_id`? | Why |
|------|--------------|-------------------|-----|
| **Director** | YES | NO | Operates within a club |
| **Coach** | YES | NO | Operates within a club |
| **Athlete** | YES (club membership) | YES (private data) | Member of a club AND has private recruiting data |
| **Parent** | NO | YES (via linked athlete) | Only accesses family data, not club operations |

### Entity Scoping — Final Rules

Every collection in the database is scoped by exactly one of: `org_id`, `tenant_id`, `user_id`, or global (no scope).

| Collection | Scoped by | Who can read | Who can write |
|------------|-----------|-------------|---------------|
| `users` | Global (unique email) | Self + org admins | Self |
| `organizations` | N/A (top-level) | Members of that org | Director (owner) |
| `athletes` | `org_id` | Director, assigned Coach, self (if `user_id` set), linked Parent | Staff: recruiting fields. Self: profile fields |
| `family_links` | `athlete_id` | Linked parent, athlete (if has account), director | Director, athlete |
| `programs` | `tenant_id` | Athlete, linked parent, assigned coach (read-only), director (read-only) | Athlete only |
| `college_coaches` | `tenant_id` | Athlete, linked parent | Athlete only |
| `events` (org-wide) | `org_id` | All org members | Director, Coach |
| `events` (athlete-private) | `tenant_id` | Athlete, linked parent | Athlete, parent |
| `gmail_tokens` | `user_id` | Self only | Self only |
| `notifications` | `user_id` | Self only | System-generated |
| `athlete_notes` (staff-written) | `org_id` + `athlete_id` | Director, assigned Coach | Director, Coach |
| `coach_notes` | `org_id` | Director | Director |
| `recommendations` | `org_id` + `athlete_id` | Director, Coach, athlete (read-only) | Director, Coach |
| `profile_views` | `tenant_id` | Athlete, linked parent | System-generated |
| `payment_transactions` | `tenant_id` | Athlete, linked parent | System (Stripe webhook) |
| `reassignment_log` | `org_id` | Director | System |
| `nudges` | `org_id` | Director | Director |

### Cross-Boundary Visibility

These are the only cases where data crosses the `org_id` / `tenant_id` boundary:

1. **Director views athlete's pipeline** (Phase 4): Director queries `programs` by `athlete_id` where the athlete is in their `org_id`. Read-only. The director never has a `tenant_id` — the query joins through the `athletes` collection.
2. **Coach views assigned athlete's schools** (Phase 4): Same pattern, filtered to athletes assigned to that coach.
3. **Athlete sees staff notes** (Phase 4): Athlete queries `athlete_notes` where `athlete_id` matches their record. Read-only.

Until Phase 4, `org_id` data and `tenant_id` data are completely separate with no cross-reads.

---

## 5. Account Model

### V1 Rules (Final)

| Rule | Decision | Rationale |
|------|----------|-----------|
| **One user = one role** | YES | JWT contains a single `role` field. No role-switching in V1. |
| **Can a user have multiple roles?** | NO in V1 | A coach who is also a parent creates two accounts with different emails. This avoids UI ambiguity, dual-home-screen logic, and permission edge cases. |
| **Can an athlete exist without a login?** | YES | A director or coach creates the athlete record in the roster. The `athletes.user_id` field is `null`. The athlete is fully manageable by staff but cannot self-serve. When the athlete registers, they claim the record. |
| **Can a parent manage multiple athletes?** | YES | A parent account links to multiple `athletes` records via `family_links`. Parent UI shows an athlete selector. |
| **Can a parent exist without a linked athlete?** | NO | A parent account is only created through a linking flow. No orphan parent accounts. |
| **Can a coach also be a parent in V1?** | NO, two accounts | Coach uses `coach@email.com` (role=coach, has org_id). Same person uses `personal@email.com` (role=parent, has tenant_id). |

### Registration Flows (V1)

| Role | How they get an account | Home screen after login |
|------|------------------------|------------------------|
| **Director** | Self-registers, creates an org | `/mission-control` |
| **Coach** | Invited by director (existing invite system) | `/mission-control` |
| **Athlete** | (a) Self-registers and claims record via invite code or email match, OR (b) invited by coach/director via email | `/board` |
| **Parent** | (a) Invited by athlete via share link, OR (b) Self-registers and links to athlete via invite code from director/coach | `/board` |

### Routing Rules

```
POST /api/auth/login → { token, user: { id, role, org_id?, tenant_id? } }

Frontend reads user.role:
  "director"  → sidebar shows: Mission Control, Roster, Intelligence, Events, Advocacy
  "coach"     → sidebar shows: Mission Control, My Athletes, Events
  "athlete"   → sidebar shows: Dashboard, Pipeline, Schools, Calendar, Profile, Settings
  "parent"    → sidebar shows: Dashboard, Pipeline, Schools, Calendar, Profile, Settings
                               (same as athlete, with athlete selector + read-heavy permissions)
```

---

## 6. Family Relationship Model

### The `family_links` Collection

This is an explicit, confirmed relationship. Not inferred from shared emails or names.

```
family_links {
  id: string (uuid)
  parent_user_id: string          // references users.id where role="parent"
  athlete_id: string              // references athletes.id
  relationship: string            // "mother" | "father" | "guardian" | "other"
  permission_level: string        // "full" | "read_only"
  status: string                  // "active" | "pending" | "revoked"
  invited_by: string              // user_id of whoever initiated the link
  created_at: datetime
  confirmed_at: datetime          // null until status becomes "active"
}
```

### Cardinality

- **One parent → many athletes**: A parent can be linked to multiple athlete records (siblings on the same club, or across clubs). The parent dashboard shows an athlete selector dropdown.
- **One athlete → many parents**: Both parents/guardians can have separate accounts linked to the same athlete.
- **Links are per-athlete, not per-family**: There is no "family" object. The parent-athlete link IS the relationship.

### Permission Levels

| Level | Can view pipeline? | Can edit profile? | Can manage events? | Can send emails? |
|-------|-------------------|------------------|-------------------|-----------------|
| `full` | Yes | Yes | Yes | Yes (when Gmail is migrated) |
| `read_only` | Yes | No | No | No |

Default: The first parent linked gets `full`. Additional parents get `read_only` unless the athlete (or director) upgrades them.

### Link Lifecycle

| Step | Trigger | What happens |
|------|---------|--------------|
| **Created** | Director adds parent email to athlete record, OR athlete sends invite link | `family_links` inserted with `status: "pending"` |
| **Confirmed** | Parent registers and clicks confirm, OR parent already has account and accepts | `status → "active"`, `confirmed_at` set |
| **Revoked** | Athlete or director revokes access | `status → "revoked"`, parent loses access immediately |

### What a Parent Sees

When a parent logs in:
1. System queries `family_links` where `parent_user_id = user.id AND status = "active"`
2. Returns list of linked athletes
3. If one athlete → go straight to that athlete's dashboard
4. If multiple athletes → show athlete selector, then dashboard for the selected one
5. All data shown is scoped by the selected athlete's `tenant_id`

---

## 7. Target Unified Data Model

### 7.1 Users
```
users {
  id: string (uuid)
  email: string (unique)
  password_hash: string (null for Google OAuth users)
  name: string
  picture: string
  role: "director" | "coach" | "athlete" | "parent"
  org_id: string (set for director, coach, athlete; null for parent)
  google_id: string (null if email/password auth)
  created_at: datetime
  last_active: datetime
  onboarding: object
  profile: object (role-specific)
}
```

Note: `tenant_id` is NOT stored on the user record. For athletes, `tenant_id` is derived from the `athletes` collection (`athletes.tenant_id` where `athletes.user_id = user.id`). For parents, `tenant_id` is resolved through `family_links → athletes.tenant_id`.

### 7.2 Organizations
```
organizations {
  id: string (uuid)
  name: string
  owner_id: string (director user id)
  plan: "free" | "basic" | "premium"
  created_at: datetime
}
```

### 7.3 Athletes — Canonical Record (PHASE 1 PREREQUISITE)

**This is the foundational data structure of the unified platform.** Nothing else moves forward until this collection exists, is populated, and all staff features read/write from it.

It replaces:
- The in-memory `ATHLETES` array in `mock_data.py` (staff app)
- The `athlete_profiles` collection (athlete app, migrated later)

**Phase 1 keeps existing camelCase field names.** See Migration Risk #1 in Section 15 for why. Unified snake_case field names are a Phase 2 task that pairs with the athlete-facing UI build.

```
athletes {
  id: string (uuid)
  user_id: string              // null = staff-created, not yet claimed
                               // set = athlete has an account and can self-serve
  org_id: string               // which club this athlete belongs to
  tenant_id: string            // null = no self-service yet
                               // set = private data space created (pipeline, Gmail, etc.)

  // ── Identity (camelCase in Phase 1, matching existing frontend contracts) ──
  firstName: string
  lastName: string
  fullName: string
  email: string                // nullable (staff may not have it yet)
  phone: string
  gradYear: number
  position: string
  team: string                 // e.g., "U16 Elite"

  // ── Physical (added when athlete claims record or staff enters) ──
  height: string
  weight: string
  standing_reach: string
  approach_touch: string
  block_touch: string

  // ── Academic ──
  gpa: string
  high_school: string

  // ── Recruiting Intel (staff-managed) ──
  recruitingStage: string      // "exploring" | "actively_recruiting" | "narrowing" | "committed"
  momentumScore: number
  momentumTrend: string        // "rising" | "stable" | "declining"
  lastActivity: datetime (ISO string)
  daysSinceActivity: number    // recomputed on startup
  schoolTargets: number
  activeInterest: number

  // ── Media ──
  hudl_url: string
  video_link: string
  photo_url: string
  bio: string

  // ── Parent/Guardian Contact ──
  parent_name: string
  parent_email: string
  parent_phone: string

  // ── Staff-Managed ──
  primary_coach_id: string     // club coach user id
  archetype: string            // internal classification, not shown to athletes

  // ── Metadata ──
  created_at: datetime
  updated_at: datetime
  created_by: string           // user_id of who created (director, coach, or self)
}
```

**Field ownership rules:**

| Fields | Who can write | When |
|--------|--------------|------|
| Recruiting intel: `recruitingStage`, `momentumScore`, `momentumTrend`, `schoolTargets`, `activeInterest`, `daysSinceActivity`, `lastActivity` | Director, Coach | Always |
| Staff fields: `primary_coach_id`, `team` | Director | Always |
| Identity, Physical, Academic, Media, Contact | Athlete (self) | Only when `user_id` is set |
| Identity, Physical, Academic, Media, Contact | Director, Coach | Only when `user_id` is null (staff-created, not yet claimed) |
| `user_id`, `tenant_id` | System | Set during claim/registration flow |

**Claim flow:**
1. Staff creates athlete → `user_id: null`, `tenant_id: null`
2. Athlete registers with matching email (or uses invite code) → system sets `user_id` to new user's ID, generates `tenant_id`
3. From that point, athlete can self-edit profile fields and access private features (pipeline, etc.)
4. Staff retains write access to recruiting intel and assignment fields regardless

### 7.4 Family Links
(Defined in Section 6)

### 7.5 College Coaches
```
college_coaches {
  id: string
  tenant_id: string            // scoped to athlete/family
  program_id: string
  university_name: string
  coach_name: string
  role: string                 // "Head Coach" | "Assistant Coach" | "Recruiting Coordinator"
  email: string
  phone: string
  notes: string
  created_at: datetime
}
```

### 7.6 Programs / Schools
```
programs {
  id: string
  tenant_id: string            // scoped to athlete/family
  athlete_id: string
  university_name: string
  division: string
  conference: string
  region: string
  recruiting_status: string    // "Researching" | "Contacted" | "Responded" | "Visited" | "Applied" | "Committed"
  reply_status: string         // "No Reply" | "Awaiting Reply" | "Reply Received"
  priority: string             // "Low" | "Medium" | "High" | "Very High"
  journey_stage: string
  initial_contact_sent: string
  last_follow_up: string
  follow_up_days: number
  next_action: string
  next_action_due: string
  notes: string
  created_at: datetime
  updated_at: datetime
}
```

### 7.7 Events
```
events {
  id: string
  org_id: string               // set for org-wide events (visible to all org members)
  tenant_id: string            // set for athlete-private events (camps, visits they're tracking)
  athlete_id: string           // nullable — links to specific athlete
  created_by: string
  title: string
  event_type: string           // "Camp" | "Showcase" | "Tournament" | "Visit" | "Tryout" | "Meeting" | "Deadline"
  location: string
  start_date: string
  end_date: string
  start_time: string
  end_time: string
  description: string
  linked_program_id: string    // nullable — ties event to a school in pipeline
  created_at: datetime
}
```

Rule: An event has EITHER `org_id` (org-wide) OR `tenant_id` (athlete-private). Never both. Org-wide events are visible to all roles within that org. Athlete-private events are visible only to the athlete and linked parents.

---

## 8. Target Auth System

### Unified approach: JWT for all roles, optional Google OAuth

| Feature | Implementation |
|---------|---------------|
| **Login** | `POST /api/auth/login` with email/password → returns JWT |
| **Register** | `POST /api/auth/register` with email/password/name/role → returns JWT |
| **Google OAuth** | `GET /api/auth/google` → callback returns JWT (role determined during onboarding) |
| **JWT payload** | `{ user_id, role, org_id }` |
| **Route protection** | Backend middleware reads JWT, checks `role` against endpoint requirements |
| **Frontend routing** | `AuthContext` stores user object, routes render based on `user.role` |

### Login → Home Screen

| Role | Home route | Sidebar sections |
|------|-----------|-----------------|
| `director` | `/mission-control` | Mission Control, Roster, Intelligence, Events, Advocacy |
| `coach` | `/mission-control` | Mission Control, My Athletes, Events |
| `athlete` | `/board` | Dashboard, Pipeline, Schools, Calendar, Profile, Settings |
| `parent` | `/board` | Dashboard, Pipeline, Schools, Calendar, Profile, Settings + Athlete Selector |

---

## 9. Role-Based Frontend Experiences

### Director (exists today)
- Mission Control (KPIs, AI Brief, Needs Attention, Coach Health)
- Roster (athlete management, bulk actions)
- Program Intelligence
- Coach activation & nudging
- Events, Advocacy

### Coach (exists today)
- Coach Mission Control (Today's Actions, My Roster)
- Athlete support pods
- Event preparation

### Athlete (to build — features migrated from athlete app)
- Dashboard (recruiting stats, follow-up reminders)
- Pipeline/Board (school tracking, kanban)
- School Knowledge Base (search D1/D2/D3 programs)
- Profile (self-managed, public-facing)
- Calendar (personal events, linked to pipeline schools)
- Analytics (profile views — Phase 5)

### Parent (to build)
- Same surfaces as athlete
- Athlete selector dropdown (when linked to multiple athletes)
- Read-heavy: can view everything, write access governed by `permission_level` in `family_links`
- Receives notifications about coach activity and pipeline changes

---

## 10. Integration Dependencies

### Gmail

Gmail is deeply integrated into the athlete app. Until migrated, these features are **blocked** or **degraded** for athletes on the unified platform:

| Athlete Feature | Without Gmail | With Gmail (Phase 3) | User Impact |
|-----------------|--------------|---------------------|-------------|
| **Inbox page** | BLOCKED — page does not exist | Full send/receive | Athletes must use external email |
| **Pipeline auto-status** | BLOCKED — no auto "Contacted" when email sent | Automatic status transitions | Athletes manually update pipeline statuses |
| **Coach reply detection** | BLOCKED — no "Reply Received" notification | Background task auto-detects | Athletes manually mark replies |
| **AI email drafts** | DEGRADED — can generate text, must copy/paste | Full compose-and-send flow | Extra friction, but AI value still usable |
| **Inbound coach scanner** | BLOCKED — won't detect new schools emailing athlete | Auto-adds inbound school contacts | Athletes manually add schools |
| **Coach Watch** (news alerts) | UNAFFECTED — uses web scraping, not Gmail | Same | No impact |

**Migration phase:** Phase 3
**Workaround:** Athletes manage email externally. Pipeline statuses are manually updated. AI drafts can still be generated and copied.

### Stripe

Stripe powers subscription gating in the athlete app. Until migrated:

| Athlete Feature | Without Stripe | With Stripe (Phase 5) | User Impact |
|-----------------|---------------|----------------------|-------------|
| **Free/Premium tiers** | BLOCKED — no paywall | Tiered access control | All features ungated (acceptable for early testing) |
| **Payment page** | BLOCKED — no checkout flow | Stripe Checkout | No revenue collection |
| **Billing management** | BLOCKED — no plan changes | Self-service billing page | No billing UI |
| **Feature gating** (Coach Watch, advanced analytics) | UNAFFECTED — features available to all | Premium-only features gated | Early adopters get everything free |

**Migration phase:** Phase 5
**Workaround:** All athlete features available without limits. This is intentional during early unified platform adoption — removes friction for testing.

---

## 11. Surface-by-Surface Migration Map

### Staff Surfaces (already built — remain in place)

| # | Surface | Current Home | Future Home | Phase | Changes Required |
|---|---------|-------------|-------------|-------|-----------------|
| 1 | Director Mission Control | Staff app | Unified | Exists | Phase 1: reads from `db.athletes` instead of in-memory array |
| 2 | Coach Mission Control | Staff app | Unified | Exists | Phase 1: same data source change |
| 3 | Roster | Staff app | Unified | Phase 1 | Switch from `ATHLETES` mock array to `db.athletes` queries |
| 4 | Bulk Actions (Assign, Remind, Note) | Staff app | Unified | Phase 1 | Switch from mock array to `db.athletes` writes |
| 5 | Support Pods | Staff app | Unified | Exists | Phase 1: reads from DB. Phase 4: athlete can see coach notes |
| 6 | Program Intelligence | Staff app | Unified | Exists | Phase 1: reads from DB |
| 7 | Event Mode | Staff app | Unified | Exists | Phase 4: merge with unified events model |
| 8 | Advocacy Mode | Staff app | Unified | Exists | Phase 1: reads from DB |
| 9 | Coach Invitation / Onboarding | Staff app | Unified | Exists | None |
| 10 | Coach Nudge (Resend email) | Staff app | Unified | Exists | None |

### Athlete Surfaces (to migrate from athlete app)

| # | Surface | Current Home | Future Home | Phase | Key Dependencies |
|---|---------|-------------|-------------|-------|-----------------|
| 11 | Athlete Dashboard | Athlete app | Unified | Phase 2 | Canonical `athletes` collection, `programs` summary queries |
| 12 | Athlete Profile Editor | Athlete app | Unified | Phase 2 | Canonical `athletes` collection (self-edit fields) |
| 13 | Public Profile Page | Athlete app | Unified | Phase 2 | Canonical `athletes` collection, public route (`/s/:id`) |
| 14 | School Knowledge Base | Athlete app | Unified | Phase 2 | `university_knowledge_base` data import |
| 15 | Settings Page | Athlete app | Unified | Phase 2 | User preferences, Gmail connection status (shows "not connected" until Phase 3) |
| 16 | Recruiting Pipeline/Board | Athlete app | Unified | Phase 3 | `programs` + `college_coaches` collections, drag-and-drop UI |
| 17 | Journey Page (per-school) | Athlete app | Unified | Phase 3 | `programs`, `interactions`, `college_coaches` |
| 18 | Inbox (Gmail) | Athlete app | Unified | Phase 3 | Gmail OAuth integration, `gmail_tokens`, background reply checker |
| 19 | AI Email Drafts | Athlete app | Unified | Phase 3 | LLM integration (Claude), Gmail compose flow |
| 20 | Calendar | Athlete app | Unified | Phase 3 | Unified `events` model |
| 21 | Analytics (Profile Views) | Athlete app | Unified | Phase 5 | `profile_views` collection, tracking pixel |
| 22 | Social Spotlight | Athlete app | Unified | Phase 5 | Social media scraping infrastructure |
| 23 | Highlight Advisor | Athlete app | Unified | Phase 5 | AI video analysis |
| 24 | Outreach Analysis | Athlete app | Unified | Phase 5 | Engagement tracking system |
| 25 | Billing / Subscriptions | Athlete app | Unified | Phase 5 | Stripe integration, `payment_transactions` |

### New Surfaces (don't exist in either app)

| # | Surface | Future Home | Phase | Notes |
|---|---------|-------------|-------|-------|
| 26 | Unified Login / Register | Unified | Phase 1 | Single page, role selection during registration |
| 27 | Athlete Claim Flow | Unified | Phase 1 | Athlete registers → matches to staff-created record by email or invite code |
| 28 | Role-Based Sidebar | Unified | Phase 1 | Sidebar nav adapts based on `user.role` |
| 29 | Parent Dashboard | Unified | Phase 5 | Athlete selector + read-heavy views |
| 30 | Parent ↔ Athlete Linking | Unified | Phase 5 | Invite, confirm, revoke flows |
| 31 | Cross-Role Notifications | Unified | Phase 4 | Staff notes → athlete alert; reply received → director alert |
| 32 | Director Pipeline View | Unified | Phase 4 | Read-only view of athlete's school pipeline |
| 33 | Smart Match | Unified | Phase 5 | AI-powered school-athlete pairing suggestions |

---

## 12. Phase 1 Implementation — Ordered Steps

**The goal of Phase 1:** Any user with any role can log in, land on their home screen, and see data from the canonical `athletes` collection in MongoDB. All existing staff features continue working identically.

### Step 1.1 — Canonical `athletes` collection (FOUNDATION)

**What:** Make MongoDB `db.athletes` the single source of truth. Remove all runtime reads from the in-memory `ATHLETES` array.

**Current state:** Athletes ARE already in MongoDB (seeded on startup by `database.py`). But all runtime code reads from the in-memory `mock_data.ATHLETES` list, not from the DB. The startup flow is: generate mock → seed to DB if empty → load from DB back into in-memory list → all code reads the in-memory list.

**Target state:** All code reads directly from `db.athletes`. The in-memory `ATHLETES` list is eliminated as a runtime data source.

**Complication — Derived Data:** `ALL_INTERVENTIONS`, `ATHLETES_NEEDING_ATTENTION`, `MOMENTUM_SIGNALS`, and `PROGRAM_SNAPSHOT` are computed from the athletes list. These remain as in-memory caches (they are computed, not stored), but they are rebuilt from DB-loaded data on startup and refreshed when athletes change.

**Files to change (13 files import ATHLETES):**
- `routers/roster.py` — 6 references
- `routers/mission_control.py` — 4 references
- `routers/intelligence.py` — 7 references
- `routers/athletes.py` — 2 references
- `routers/invites.py` — 4 references
- `routers/digest.py` — 2 references
- `program_engine.py` — 2 references
- `event_engine.py` — 4 references
- `support_pod.py` — 1 reference
- `advocacy_engine.py` — 4 references
- `services/startup.py` — refactor to remove dual-write pattern
- `database.py` — update seed/load functions
- `mock_data.py` — retain as generator only (for initial seed), remove module-level ATHLETES global

**Validation:** Director logs in → Mission Control shows same KPIs → Roster shows same 25 athletes → Bulk actions work → All existing features unchanged.

### Step 1.2 — Add `org_id` to athletes and users

**What:** Add `org_id` field to all athlete documents and user documents. Create `organizations` collection with a default org for the existing club.

**Migration script:** Insert one org document, then `db.athletes.update_many({}, {"$set": {"org_id": "org-default"}})` and `db.users.update_many({}, {"$set": {"org_id": "org-default"}})`.

**Validation:** `db.athletes.find({"org_id": "org-default"})` returns all 25. `db.users.find({"org_id": "org-default"})` returns all staff users.

### Step 1.3 — Extend auth for athlete/parent roles

**What:** Update auth middleware to accept `role ∈ {director, coach, athlete, parent}`. Add `POST /api/auth/register` endpoint for athlete/parent self-registration.

**Changes:**
- `auth_middleware.py` — accept new roles in JWT validation
- `server.py` or new `routers/auth.py` — add register endpoint
- `services/startup.py` — seed a test athlete user for development

**Validation:** `POST /api/auth/register` with `role: "athlete"` succeeds. Login returns JWT with `role: "athlete"`. Existing director/coach login unchanged.

### Step 1.4 — Athlete claim flow

**What:** When an athlete registers, if their email matches an existing `athletes.email`, link the records: set `athletes.user_id` to the new user's ID and generate a `tenant_id`.

**Changes:**
- Register endpoint checks `db.athletes.find_one({"email": new_user.email, "user_id": null})`
- If match found: `db.athletes.update_one({"id": athlete.id}, {"$set": {"user_id": user.id, "tenant_id": generated_uuid}})`
- Return claim status in registration response

**Validation:** Register as `athlete_1`'s email → athlete record now has `user_id` set. Register with non-matching email → new unlinked athlete user (no athlete record claimed).

### Step 1.5 — Role-based routing (frontend)

**What:** After login, the frontend redirects based on `user.role`. Sidebar navigation shows role-appropriate items.

**Changes:**
- `frontend/src/components/layout/Sidebar.js` — render different nav items per role
- `frontend/src/App.js` — role-based route guards and default redirects
- `frontend/src/contexts/AuthContext.js` — store and expose `user.role`

**Validation:** Login as director → lands on `/mission-control` with staff sidebar. Login as athlete → lands on `/board` (placeholder page) with athlete sidebar.

### Step 1.6 — Athlete placeholder dashboard

**What:** Build a minimal placeholder page for athletes after login, confirming the role-based routing works end-to-end. Not the full athlete dashboard (that's Phase 2) — just a welcome screen showing the athlete's name, team, and a "coming soon" state for Pipeline, Schools, etc.

**Validation:** Login as athlete → see welcome page with athlete's name and team from the canonical `athletes` record.

---

## 13. Migration Strategy

### Phase 1 data work (immediate)
1. **Athletes**: Make `db.athletes` the runtime data source. Add `org_id`, `user_id` (null), `tenant_id` (null) fields.
2. **Organizations**: Create `organizations` collection with default org.
3. **Users**: Add `org_id` to existing user documents. Extend `role` enum.

### What stays separate (until migrated in later phases)
- **Gmail integration** → Phase 3
- **Stripe subscriptions** → Phase 5
- **Admin panel** → Not migrated (platform admin is a separate concern)
- **College coach database** → Phase 3
- **Background tasks** (reply checker, inbound scanner, coach watch) → Phase 3+

### What gets shared immediately (Phase 1)
- Auth system (unified JWT, all 4 roles)
- User collection (all roles in one collection)
- Athlete data (one canonical collection in MongoDB)
- Role-based routing

---

## 14. Naming Clarification

| Term in unified app | Meaning |
|---------------------|---------|
| **Coach** | Club/staff coach (manages athletes day-to-day) |
| **Director** | Club director (oversees coaches and program) |
| **Athlete** | The student athlete |
| **Parent / Family** | Parent or guardian of athlete |
| **College Coach** | Coach at a university program (recruiting target) |
| **Program** / **School** | A university volleyball program being tracked |

---

## 15. Migration Risks

### Risk 1: camelCase vs snake_case field names (HIGH IMPACT)

**Problem:** The entire existing codebase — 13 backend files and all frontend components — uses camelCase field names for athlete data (`fullName`, `gradYear`, `momentumScore`, etc.). The unified schema ideally uses snake_case. Converting now would require changing every field reference in 30+ files across backend and frontend simultaneously, with high regression risk.

**Decision:** Phase 1 keeps camelCase field names. The canonical `athletes` collection uses the same field names the frontend already expects. Schema normalization to snake_case is a Phase 2 task, done alongside the athlete-facing UI build when we're already touching all components.

**Risk level:** LOW (because we are deferring, not ignoring).

### Risk 2: Derived data cache coherence (MEDIUM IMPACT)

**Problem:** `ALL_INTERVENTIONS`, `ATHLETES_NEEDING_ATTENTION`, `MOMENTUM_SIGNALS`, and `PROGRAM_SNAPSHOT` are computed from the athletes list. Currently computed once on startup. After Phase 1, athlete data can change via API writes (bulk actions, reassignment). The in-memory caches will become stale unless we add a recompute trigger.

**Mitigation:** Add a `recompute_derived_data()` function called after any athlete write operation (reassignment, bulk update). This function reloads athletes from DB and recomputes all derived caches. For Phase 1, this is acceptable performance-wise (25 athletes, <100ms to recompute).

**Risk level:** MEDIUM — stale caches could show incorrect data if we forget to trigger recompute.

### Risk 3: Events and schools remain in-memory (LOW IMPACT)

**Problem:** `UPCOMING_EVENTS` and `SCHOOLS` are also generated by `mock_data.py` and follow the same seed→load→in-memory pattern. Phase 1 only migrates athletes. Events and schools continue using the existing pattern.

**Mitigation:** No action needed in Phase 1. Events already persist to MongoDB via `database.py`. The in-memory runtime pattern is acceptable until Phase 4 (unified events model).

**Risk level:** LOW — these are read-mostly data that change infrequently.

### Risk 4: Startup timing and order (LOW IMPACT)

**Problem:** `services/startup.py` has a specific dependency order: seed → load → assign coaches → recompute. Removing the in-memory ATHLETES array changes this flow.

**Mitigation:** Refactor startup to: seed if empty → assign coaches → recompute derived caches (loading directly from DB). The startup function becomes simpler, not more complex.

**Risk level:** LOW.

### Risk 5: Dual-write during transition (MEDIUM IMPACT)

**Problem:** Some current code writes to both MongoDB AND the in-memory array (e.g., `roster.py` coach reassignment). During migration, if we miss a write path, the DB and in-memory state diverge.

**Mitigation:** After Phase 1 Step 1.1, there IS no in-memory ATHLETES array. All reads come from DB. This risk exists only during the implementation of Step 1.1 — not after it's complete.

**Risk level:** MEDIUM during implementation, ZERO after completion.

---

## 16. Files of Reference

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
- `backend/mock_data.py` — In-memory ATHLETES data (**to be replaced in Phase 1, Step 1.1**)
- `backend/database.py` — Seed/load functions (**to be refactored in Phase 1**)
- `backend/services/startup.py` — Startup pipeline (**to be refactored in Phase 1**)
- `backend/services/ownership.py` — Coach→athlete mapping (already reads from DB)
- `backend/routers/roster.py` — Roster management + bulk actions
- `backend/routers/mission_control.py` — Mission Control endpoints
- `backend/routers/intelligence.py` — Program Intelligence endpoints
- `frontend/src/pages/RosterPage.js` — Roster UI
- `frontend/src/pages/MissionControlPage.js` — Director/Coach dashboards
- `frontend/src/components/layout/Sidebar.js` — Navigation (**to be extended in Phase 1**)
