# Athlete App Migration Plan

> Companion to `ATHLETE_APP_AUDIT.md`
> Goal: Port the real athlete/parent experience from `capymatch/capymatch` into the unified platform.

---

## Principles

1. **Additive, not destructive.** Staff features must keep working throughout the migration. Every migration step is scoped so that director/coach flows are unaffected.
2. **Athlete routes live under `/api/athlete/*`.** No collision with existing staff routes.
3. **Shared JWT auth.** All athlete endpoints use the unified JWT middleware. No session tables.
4. **`tenant_id` is the athlete scope key.** Already assigned during the claim flow (Step 1.4). It uniquely identifies one athlete's data universe.
5. **Port code, don't rewrite.** Copy the athlete app's logic and adapt only what's necessary (auth, scoping, naming). Don't redesign features during migration.

---

## Pre-Migration: Adapter Layer

Before porting any features, build a thin compatibility layer that lets athlete app code work with the unified auth:

### Backend: `athlete_auth.py`

```python
# Replaces athlete app's auth.get_current_user() and get_tenant_id()
# Uses unified JWT middleware, resolves tenant_id from athletes collection

async def get_athlete_tenant(current_user: dict) -> str:
    """JWT user → tenant_id via athletes collection."""
    if current_user["role"] not in ("athlete", "parent"):
        raise HTTPException(403, "Athlete/parent access only")
    athlete = await db.athletes.find_one(
        {"user_id": current_user["id"]}, {"_id": 0, "tenant_id": 1}
    )
    if not athlete or not athlete.get("tenant_id"):
        raise HTTPException(404, "No claimed athlete profile")
    return athlete["tenant_id"]
```

This single function replaces the athlete app's two-step `get_current_user()` + `get_tenant_id()` pattern and is the only adaptation needed for every backend route.

### Frontend: Shared API client

The athlete app's `api.js` pattern (centralized Axios instance with interceptors) is already compatible with JWT. The only change: read `token` from localStorage instead of `session_token`.

### Collection Renames

| Athlete App Name | Unified Name | Reason |
|---|---|---|
| `coaches` | `college_coaches` | Avoid collision with staff `coaches` (club staff) |
| `events` | `athlete_events` | Avoid collision with staff events |
| `tenants` | Reuse existing | Already created in claim flow (Step 1.4) |
| All others | Same name | No collision |

---

## Migration Phases

### Phase A: Core Pipeline (the "killer feature")

The school pipeline is the reason athletes use CapyMatch. Port it first so athletes can immediately start tracking schools.

#### A.1 — Programs CRUD + Board Grouping

**What**: Port `programs.py` (CRUD, board grouping, interaction signals, journey rail computation).

**Backend**:
- New file: `routers/athlete_programs.py`
- Endpoints: `GET/POST/PUT/DELETE /api/athlete/programs`, `GET /api/athlete/programs/{id}`
- Copy: `categorize_program()`, `compute_journey_rail()`, `compute_interaction_signals()`, `batch_compute_signals()`
- Collection: `programs` (new, tenant_id-scoped)
- Auth: Replace `get_current_user(request)` → `get_current_user_dep()` + `get_athlete_tenant()`

**Frontend**:
- Port `RecruitingBoard.js` → `pages/athlete/Pipeline.js`
- Route: `/pipeline` (within athlete layout)
- Adapt `api.get("/programs")` → `axios.get(API + "/athlete/programs")`

**What can be ported directly**: ~95% of `programs.py` logic. Only auth/tenant derivation changes.
**What needs adaptation**: Auth middleware swap. `coaches` → `college_coaches` in queries.
**What conflicts**: None. New collections, new routes.

**Tests**: CRUD operations, grouped board view, board categories.

#### A.2 — College Coaches CRUD

**What**: Port coaches CRUD (the college coaching staff tracked per school).

**Backend**:
- Add to `athlete_programs.py`: `GET/POST/PUT/DELETE /api/athlete/college-coaches`
- Collection: `college_coaches` (renamed from athlete app's `coaches`)

**Frontend**: Coaches are displayed inline within the Pipeline and Journey pages, not as a standalone page.

**Tests**: CRUD, association with programs.

#### A.3 — Interactions + Journey Timeline

**What**: Port the activity timeline (emails sent, replies, visits, camps).

**Backend**:
- Add to `athlete_programs.py`: `GET/POST /api/athlete/interactions`, `GET /api/athlete/programs/{id}/journey`
- Collection: `interactions` (new, tenant_id-scoped)
- Initially: timeline only from logged interactions (no Gmail integration yet)

**Frontend**:
- Port `RecruitingJourney.js` → `pages/athlete/Journey.js`
- Route: `/journey/:programId`

**Tests**: Create interaction, timeline ordering, follow-up auto-set.

#### A.4 — Dashboard

**What**: Port the full athlete dashboard.

**Backend**:
- Expand `routers/athlete_dashboard.py` to aggregate: programs, events, interactions, profile data
- Endpoint: `GET /api/athlete/dashboard` (returns all dashboard data in one call)

**Frontend**:
- Port `Dashboard.js` → `pages/athlete/AthleteDashboard.js` (replace current placeholder)
- Sections: Greeting + Pulse, Today's Actions, School Spotlight, Recent Activity, Upcoming Events
- Defer: "Who's Watching" (needs engagement tracking), Inbound Contacts (needs Gmail)

**Tests**: Dashboard loads with data, empty states work, navigation works.

---

### Phase B: Profile & Calendar

#### B.1 — Athlete Profile Editor

**What**: Let athletes manage their own recruiting profile (stats, bio, media, contact info).

**Backend**:
- New file: `routers/athlete_profile.py`
- Endpoints: `GET/PUT /api/athlete/profile`, `POST /api/athlete/profile/photo`
- Data source: Update the existing `athletes` collection (canonical record) rather than creating a new `athlete_profiles` collection
- The profile fields from the athlete app (height, weight, reach, approach touch, GPA, Hudl link, video link, bio, etc.) get added to the `athletes` schema

**Frontend**:
- Port `ProfilePage.js` → `pages/athlete/Profile.js`
- Route: `/profile`

**What needs adaptation**: Write to `athletes` collection (unified canonical record) instead of `athlete_profiles` (athlete app's separate collection).

#### B.2 — Public Profile Page

**What**: Shareable profile page that coaches can view without logging in.

**Backend**:
- Endpoint: `GET /api/public/athlete/:tenantId` (no auth required)
- Reads from `athletes` collection + `athlete_events`

**Frontend**:
- Port `PublicSchedule.js` → `pages/public/AthleteProfile.js`
- Route: `/s/:shortId` (public, no auth)

#### B.3 — Calendar

**What**: Event management for camps, showcases, tournaments, visits.

**Backend**:
- Expand `athlete_dashboard.py` or new file: `routers/athlete_events.py`
- Endpoints: `GET/POST/PUT/DELETE /api/athlete/events`
- Collection: `athlete_events`

**Frontend**:
- Port `CalendarPage.js` → `pages/athlete/Calendar.js`
- Route: `/calendar`

---

### Phase C: Knowledge Base & Search

#### C.1 — University Knowledge Base

**What**: Pre-loaded database of volleyball programs that athletes can browse and add to their pipeline.

**Backend**:
- New file: `routers/athlete_knowledge.py`
- Endpoints: `GET /api/athlete/knowledge/search`, `GET /api/athlete/knowledge/:domain`
- Collection: `university_knowledge_base` (global, not tenant-scoped)
- Data: Needs to be seeded from the athlete app's existing KB (1.8MB JSON)

**Frontend**:
- Port `UniversityKnowledgeBase.js` → `pages/athlete/Schools.js`
- Port `SchoolInfoPage.js` → `pages/athlete/SchoolInfo.js`
- Routes: `/knowledge-base`, `/school/:domain`

#### C.2 — School Comparison

**Frontend**: Port `ComparePage.js` → `pages/athlete/Compare.js`
**Route**: `/compare`

---

### Phase D: AI Features

#### D.1 — AI Email Drafts

**Backend**: Port `ai.py` email draft generation. Uses Claude Sonnet 4.5.
**Dependency**: Needs `college_coaches` with email addresses, and athlete profile data.
**Note**: The unified platform already uses GPT 5.2 for staff AI features. We can either keep Claude for athlete features (as-is) or migrate to GPT 5.2 for consistency. Recommend keeping Claude initially for faithful port, unify LLM later.

#### D.2 — Outreach Analysis + Highlight Advisor

**Frontend**: Port `OutreachAnalysis.js`, `HighlightAdvisor.js`
**Backend**: Port relevant sections from `ai.py`

---

### Phase E: Gmail Integration

**This is the most complex migration.** The athlete app's Gmail integration includes:
- OAuth2 flow with Google
- Send/receive emails from within the app
- Auto-detect coach replies (background task)
- Inbound contact scanning (background task)
- Email tracking pixels for engagement analytics

**Dependency**: Requires a Google Cloud project with Gmail API enabled. This may need the user's own Google Cloud credentials.

#### E.1 — Gmail Connect + Send/Receive
#### E.2 — Auto-reply detection (background task)
#### E.3 — Inbound contact scanning (background task)

---

### Phase F: Notifications, Analytics, Settings

#### F.1 — Notification System
- Collection: `notifications`
- Bell icon in header with unread count
- Types: coach_reply, follow_up_due, profile_view_edu, weekly_summary

#### F.2 — Profile View Analytics
- Collection: `profile_views`
- Track views on public profile page, detect .edu visitors

#### F.3 — Settings Page
- Gmail connection management
- Theme toggle (dark/light)
- Onboarding tour replay

#### F.4 — Account Page
- Name/email update
- Password change

---

### Phase G: Billing & Subscriptions (Stripe)

Port the subscription tier system (Basic/Pro/Premium) with Stripe checkout.

---

### Phase H: Layout Unification

Once all athlete surfaces are ported, unify the layout:
- Replace the placeholder athlete sidebar with the real athlete `Layout.js` (adapted)
- Add notification bell to athlete header
- Add theme toggle
- Add profile dropdown with avatar

---

## Migration Order Summary

```
Pre-Migration: Adapter layer (athlete_auth, api client, collection renames)
     │
     ▼
Phase A: Core Pipeline                          ← START HERE
  A.1  Programs CRUD + Board Grouping
  A.2  College Coaches CRUD
  A.3  Interactions + Journey Timeline
  A.4  Dashboard (replace placeholder)
     │
     ▼
Phase B: Profile & Calendar
  B.1  Athlete Profile Editor
  B.2  Public Profile Page
  B.3  Calendar
     │
     ▼
Phase C: Knowledge Base
  C.1  University KB Search
  C.2  School Comparison
     │
     ▼
Phase D: AI Features
  D.1  Email Drafts (Claude)
  D.2  Outreach Analysis + Highlight Advisor
     │
     ▼
Phase E: Gmail Integration
  E.1  Connect + Send/Receive
  E.2  Auto-reply detection
  E.3  Inbound scanning
     │
     ▼
Phase F: Notifications, Analytics, Settings
     │
     ▼
Phase G: Billing (Stripe)
     │
     ▼
Phase H: Layout Unification
```

---

## Recommended First Feature to Port

### Phase A.1 + A.4: Programs CRUD + Dashboard

**Why this first:**
1. **Immediate value**: Athletes can start tracking schools on day one
2. **Foundation**: Programs are the core entity that everything else references
3. **Validates the adapter pattern**: If auth + tenant scoping works for programs, it works for everything
4. **Dashboard shows data**: Replaces the placeholder with a real, data-driven surface
5. **Self-contained**: No external dependencies (no Gmail, no AI, no Stripe)

**Scope**:
- Backend: `routers/athlete_programs.py` (~300 lines ported from `programs.py`)
- Backend: Expand `routers/athlete_dashboard.py` to aggregate real data
- Frontend: Port `RecruitingBoard.js` → `pages/athlete/Pipeline.js`
- Frontend: Port `Dashboard.js` → replace `pages/AthleteDashboard.js`
- Seed: Demo programs for claimed athletes
- Test: Full CRUD + dashboard rendering

**Estimated effort**: 1 session
**Risk**: Low — no external deps, well-understood code

---

## Risk Register

| Risk | Impact | Mitigation |
|---|---|---|
| Theme system mismatch (CSS vars vs Tailwind classes) | Visual inconsistency | Port athlete theme vars to unified CSS, use them in athlete pages only |
| `coaches` collection name collision | Data corruption | Rename to `college_coaches` from day 1 |
| Demo data vs real data | Empty dashboards confuse users | Seed demo pipeline data during claim flow |
| Gmail OAuth complexity | Blocks email features | Defer Gmail to Phase E, use manual interaction logging until then |
| Subscription tier gating | Features break without tier checks | Port `subscriptions.py` early but default all athletes to "premium" initially |
| Large KB dataset (1.8MB JSON) | Slow seed, large collection | Import once via migration script, index properly |

---

## Files to Port (Priority Order)

### Backend (from `capymatch/capymatch/backend/`)
1. `routes/programs.py` → `routers/athlete_programs.py` (adapted)
2. `routes/dashboard.py` → expand `routers/athlete_dashboard.py`
3. `routes/events.py` → `routers/athlete_events.py` (adapted)
4. `routes/profile.py` → `routers/athlete_profile.py` (adapted)
5. `routes/knowledge.py` → `routers/athlete_knowledge.py` (adapted)
6. `routes/notifications.py` → `routers/athlete_notifications.py` (adapted)
7. `routes/ai.py` → `routers/athlete_ai.py` (adapted, Phase D)
8. `routes/gmail.py` → `routers/athlete_gmail.py` (adapted, Phase E)
9. `models.py` → merge into unified `models.py`

### Frontend (from `capymatch/capymatch/frontend/src/`)
1. `pages/Dashboard.js` → `pages/athlete/AthleteDashboard.js`
2. `pages/RecruitingBoard.js` → `pages/athlete/Pipeline.js`
3. `pages/RecruitingJourney.js` → `pages/athlete/Journey.js`
4. `pages/CalendarPage.js` → `pages/athlete/Calendar.js`
5. `pages/ProfilePage.js` → `pages/athlete/Profile.js`
6. `pages/UniversityKnowledgeBase.js` → `pages/athlete/Schools.js`
7. `pages/Analytics.js` → `pages/athlete/Analytics.js`
8. `pages/SettingsPage.js` → `pages/athlete/Settings.js`
9. `components/Layout.js` → adapt into athlete layout variant
10. `lib/api.js` → create `lib/athleteApi.js` (JWT-adapted)
