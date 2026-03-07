# CapyMatch Merge Assessment Plan

## Purpose
Systematic comparison checklist for evaluating the main CapyMatch app against this coach/club OS prototype, to determine the fastest safe path toward one unified CapyMatch platform.

---

## Part 1: Comparison Checklist

Fill in the "Main App" column for each row. The "Prototype" column is already populated.

### 1. Frontend Stack

| Dimension | Main App | Prototype (This Pod) |
|---|---|---|
| Framework | ? | React 18 (CRA) |
| Language | ? | JavaScript |
| UI library | ? | Tailwind CSS + Shadcn/UI |
| State management | ? | React Context (AuthContext) |
| Routing | ? | react-router-dom v6 |
| Component pattern | ? | Pages + domain components |
| Build tool | ? | CRA (webpack) |

**Key question:** If both are React, merge is straightforward. If the main app uses Next.js, Vue, or another framework, one side needs adaptation.

### 2. Backend Stack

| Dimension | Main App | Prototype (This Pod) |
|---|---|---|
| Framework | ? | FastAPI (Python) |
| Language | ? | Python 3.11 |
| Architecture | ? | APIRouter modules per domain |
| API style | ? | REST (JSON) |
| Async model | ? | async/await (native FastAPI) |
| Process manager | ? | Supervisor + uvicorn |

**Key question:** If both are FastAPI/Python, routers can be merged directly. If the main app is Express/Node or Django, the backend merge becomes a rewrite of one side.

### 3. Auth / Session Model

| Dimension | Main App | Prototype (This Pod) |
|---|---|---|
| Auth type | ? | JWT (Bearer token) |
| Token storage (client) | ? | localStorage |
| Token library | ? | PyJWT + passlib/bcrypt |
| Session duration | ? | 72 hours |
| User model fields | ? | id, email, password_hash, name, role, team |
| Roles defined | ? | director, coach |
| Role enforcement | ? | Per-route middleware (get_current_user_dep) |
| Registration model | ? | Open (coach-only) + invite system |
| Password hashing | ? | bcrypt via passlib |

**Key question:** If both use JWT with similar claims, token format can be unified. If the main app uses session cookies or a third-party auth provider (Auth0, Firebase, Clerk), the auth unification strategy changes significantly.

### 4. Database / Storage

| Dimension | Main App | Prototype (This Pod) |
|---|---|---|
| Database | ? | MongoDB (motor async) |
| ORM / driver | ? | motor (async pymongo) |
| ID strategy | ? | UUID strings (not ObjectId) |
| Schema validation | ? | Pydantic models (app-level) |
| Migrations | ? | Seed-if-empty on startup |
| Key collections | ? | users, invites, athletes, events, event_notes, recommendations, program_snapshots |

**Key question:** If both use MongoDB, merge is a collection reconciliation exercise. If the main app uses PostgreSQL or another DB, a data layer abstraction or migration is needed.

### 5. Core Shared Objects

These are the domain objects that likely exist in both systems and must be reconciled.

| Object | Main App Schema | Prototype Schema |
|---|---|---|
| User / Account | ? | {id, email, password_hash, name, role, team, invited_by, created_at} |
| Athlete / Player | ? | {id, name, grad_year, club, position, owner} |
| Event / Tournament | ? | {id, name, location, start_date, end_date, attendees, checklist} |
| Note / Observation | ? | {event_id, athlete_id, created_by, note, interest_level, needs_follow_up} |
| Recommendation | ? | {athlete_id, school, coach_name, created_by, status, status_history} |
| School / Program | ? | {id, name, division, location, coach_name} |
| Invite | ? (may not exist) | {id, email, name, team, token, status, invited_by, expires_at} |

**Key question:** How much overlap exists? Identical fields can share collections directly. Conflicting fields need a reconciliation schema.

### 6. API Surface

| Dimension | Main App | Prototype (This Pod) |
|---|---|---|
| Base path | ? | /api/* |
| Auth endpoints | ? | /api/auth/login, /api/auth/register, /api/auth/me |
| Total endpoint count | ? | ~35 endpoints |
| API versioning | ? | None (v1 implicit) |
| Error format | ? | {detail: string} (FastAPI default) |
| Pagination | ? | None (small dataset) |

**Key question:** If API conventions match (path style, error format, auth header), a shared backend can serve both frontends immediately.

### 7. Role Model

| Dimension | Main App | Prototype (This Pod) |
|---|---|---|
| Roles | ? | director, coach |
| Permission model | ? | Route-level (middleware check) |
| Data scoping | ? | Director sees all; coach auto-filtered on Program Intelligence only |
| Admin access | ? | Director-only (/api/admin, /api/debug) |
| Future roles planned | ? | family, athlete (not yet implemented) |

**Key question:** If the main app has additional roles (family, athlete, admin), the unified role model needs to be a superset.

### 8. Routing / Navigation

| Dimension | Main App | Prototype (This Pod) |
|---|---|---|
| Top-level routes | ? | /login, /mission-control, /events, /advocacy, /program, /invites, /invite/:token, /admin |
| Route protection | ? | ProtectedRoute component (redirect to /login) |
| Navigation | ? | Header nav bar with mode switching |
| Deep linking | ? | Yes (event detail, athlete pod, recommendation detail) |

### 9. Deployment / Environment

| Dimension | Main App | Prototype (This Pod) |
|---|---|---|
| Hosting | ? | Emergent preview pod (Kubernetes) |
| Frontend port | ? | 3000 |
| Backend port | ? | 8001 |
| Env config | ? | .env files (frontend + backend) |
| CI/CD | ? | Emergent platform |
| Domain | ? | capy-match.preview.emergentagent.com |
| External services | ? | MongoDB (local), no email yet |

---

## Part 2: Decision Criteria

### Evidence that indicates Option B first (Shared Backend, Separate Frontends)

- [ ] **Different frontend frameworks.** Main app uses Next.js/Vue/Angular while prototype uses React CRA. Frontend merge would require a rewrite.
- [ ] **Same or compatible backend stack.** Both use FastAPI/Python (or at least both are Python). Backend merge is feasible.
- [ ] **Overlapping data model with schema differences.** Same core objects but different field names or structures. Need time to reconcile.
- [ ] **Main app has existing production users.** Cannot risk breaking their experience during a big-bang merge.
- [ ] **Different auth providers.** Main app uses Auth0/Firebase while prototype uses custom JWT. Auth unification needs careful migration.
- [ ] **Main app has features this prototype doesn't.** Need to preserve those while adding prototype's features.

**Option B sequence:**
1. Reconcile and merge the data model (shared MongoDB collections)
2. Unify the auth system (one JWT issuer, one users table)
3. Merge backend routers into one API server
4. Both frontends point at the shared API
5. Plan frontend merge as a separate phase

### Evidence that indicates Option A directly (Full Merge)

- [ ] **Same frontend framework.** Both React (or both Next.js). Components can be copied across.
- [ ] **Same backend framework.** Both FastAPI. Routers drop in directly.
- [ ] **Same database.** Both MongoDB with similar ID strategies.
- [ ] **Similar auth model.** Both custom JWT with compatible claims.
- [ ] **No production users yet** (or very few). Low risk of breakage.
- [ ] **Small codebase on both sides.** Total merge effort is days, not weeks.

**Option A sequence:**
1. Pick the stronger codebase as the base (likely this prototype — it has clean architecture, tested auth, modular routers)
2. Port unique features from the other app into it
3. Reconcile data model, run migration scripts
4. Unify auth, merge user tables
5. Deploy as one app

---

## Part 3: Migration Sequence Templates

### Option B Migration Sequence

```
Phase 1: Backend Unification (Week 1-2)
├── 1.1 Audit main app's backend (stack, routes, models)
├── 1.2 Create unified data model (superset of both schemas)
├── 1.3 Write collection migration scripts
├── 1.4 Merge auth into one system (one users table, one JWT issuer)
├── 1.5 Merge API routers into one backend
├── 1.6 Both frontends point at shared API
└── 1.7 Test all flows from both frontends

Phase 2: Frontend Unification (Week 3-4)
├── 2.1 Audit both frontends (components, routes, patterns)
├── 2.2 Pick target frontend architecture
├── 2.3 Port pages/components from secondary frontend
├── 2.4 Unify navigation and routing
├── 2.5 Remove duplicate frontend
└── 2.6 Full regression test
```

### Option A Migration Sequence

```
Full Merge (Week 1-3)
├── 1.1 Audit main app (full stack comparison using this checklist)
├── 1.2 Pick base codebase
├── 1.3 Reconcile data model + write migration
├── 1.4 Unify auth
├── 1.5 Port features (backend routes + frontend pages)
├── 1.6 Merge navigation and routing
├── 1.7 Deploy unified app
└── 1.8 Full regression test
```

---

## Part 4: Immediate Next Steps

To fill in this checklist, we need:

1. **Access or description of the main CapyMatch app's tech stack** — even a high-level answer (e.g., "It's also FastAPI + React" or "It's Next.js + Express + PostgreSQL") narrows the decision immediately.

2. **Main app's user/auth model** — how users log in, what roles exist, what tokens look like.

3. **Main app's core data objects** — what an "athlete" or "event" looks like in that system.

4. **Production status** — does the main app have real users? How many? This determines migration risk tolerance.

Once these four questions are answered, the Option A vs Option B decision becomes mechanical rather than strategic.
