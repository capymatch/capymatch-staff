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

## 4. Target Unified Data Model

### 4.1 Users (Unified)
```
users {
  id: string (uuid)
  email: string (unique)
  password_hash: string (optional — null for Google OAuth users)
  name: string
  picture: string
  role: "director" | "coach" | "athlete" | "parent"
  org_id: string (links to organization/club)
  tenant_id: string (for athlete data isolation)
  google_id: string (optional)
  created_at: datetime
  last_active: datetime
  onboarding: object
  profile: object (role-specific profile data)
}
```

### 4.2 Organizations (New)
```
organizations {
  id: string
  name: string (e.g., "Munciana Volleyball Club")
  owner_id: string (director user id)
  plan: "free" | "basic" | "premium"
  created_at: datetime
}
```

### 4.3 Athletes (Unified)
```
athletes {
  id: string
  user_id: string (nullable — linked when athlete has their own account)
  org_id: string (the club they belong to)
  
  // Identity
  full_name: string
  email: string
  phone: string
  grad_year: string
  position: string
  team: string
  
  // Physical (from athlete app)
  height: string
  weight: string
  standing_reach: string
  approach_touch: string
  block_touch: string
  
  // Academic
  gpa: string
  high_school: string
  
  // Club info
  club_team: string
  city: string
  state: string
  
  // Recruiting intel (from staff app)
  recruiting_stage: string
  momentum_score: number
  momentum_trend: string
  school_targets: number
  active_interest: number
  
  // Media
  hudl_url: string
  video_link: string
  photo_url: string
  bio: string
  
  // Staff-managed fields
  primary_coach_id: string (club coach)
  days_since_activity: number
  last_activity: datetime
  
  created_at: datetime
  updated_at: datetime
}
```

### 4.4 College Coaches (from athlete app)
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

### 4.5 Programs / Schools (from athlete app)
```
programs {
  id: string
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

### 4.6 Events (Unified)
```
events {
  id: string
  org_id: string (nullable — org-wide events)
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

## 5. Target Auth System

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
                                                        ↓
                              role === "director"  → /mission-control
                              role === "coach"     → /mission-control  
                              role === "athlete"   → /board (dashboard)
                              role === "parent"    → /board (dashboard)
```

---

## 6. Role-Based Frontend Experiences

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

---

## 7. Phased Implementation Plan

### Phase 1: Foundation (Current Priority)
- [x] Create this architecture document
- [ ] Add `athlete` and `parent` roles to auth system
- [ ] Create athlete/parent registration flow
- [ ] Build role-based routing (land on different dashboards per role)
- [ ] Migrate athletes from in-memory mock data to real MongoDB collection

### Phase 2: Athlete Dashboard
- [ ] Build athlete dashboard (recruiting stats, follow-ups)
- [ ] Build athlete profile page (self-managed)
- [ ] Build public profile page
- [ ] Port school knowledge base

### Phase 3: Pipeline & Communication
- [ ] Build recruiting pipeline/board
- [ ] Port Gmail integration
- [ ] Port AI email drafts
- [ ] Build calendar page

### Phase 4: Connected Experiences
- [ ] Director can see athlete's recruiting pipeline progress
- [ ] Coach sees athlete's school list and engagement
- [ ] Athlete sees their coach's notes and recommendations
- [ ] Shared event calendar across roles
- [ ] Notifications that cross role boundaries

### Phase 5: Advanced Features
- [ ] Port Stripe subscriptions
- [ ] Port engagement tracking / analytics
- [ ] Smart Match (AI school-athlete pairing)
- [ ] Parent-specific experience

---

## 8. Migration Strategy

### Data Migration (when ready)
1. Athletes: Convert `ATHLETES` mock array → real MongoDB `athletes` collection with unified schema
2. Users: Extend `users` collection to support all 4 roles
3. Events: Merge event schemas
4. Notes: Unify note systems

### What stays separate (for now)
- Gmail integration (only relevant for athlete-facing features)
- Stripe (only relevant for athlete/parent subscriptions)
- Admin panel (only in athlete app)
- College coach database (only relevant for athletes)

### What gets shared immediately
- Auth system (unified JWT)
- User collection (all roles in one collection)
- Athlete data (one source of truth)
- Events (visible to relevant roles)

---

## 9. Naming Clarification

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

## 10. Files of Reference

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
- `backend/mock_data.py` — In-memory ATHLETES data
- `backend/routers/roster.py` — Roster management + bulk actions
- `frontend/src/pages/RosterPage.js` — Roster UI
- `frontend/src/pages/MissionControlPage.js` — Director/Coach dashboards
