# Athlete App Audit — capymatch/capymatch

> Audited against: `capymatch/capymatch` (GitHub, main branch, Feb 2026)
> Audited by: comparison with unified platform at `/app`

---

## 1. Overview

The athlete app ("Recruiting HQ") is a fully functional AI-powered CRM for high-school volleyball athletes navigating the college recruiting process. It has 19+ frontend pages, 28 backend route modules, 5 background tasks, and deep integrations with Gmail, Stripe, Claude AI, and Google OAuth.

**Tech stack**: React + Tailwind + Shadcn/UI / FastAPI + Motor (async MongoDB) / Claude Sonnet 4.5.

---

## 2. Auth System

| Aspect | Athlete App | Unified Platform |
|---|---|---|
| Mechanism | Session-based (`user_sessions` collection) | JWT (signed token, no DB lookup) |
| Token storage | `localStorage.session_token` | `localStorage.token` |
| Header | `Authorization: Bearer <session_token>` | `Authorization: Bearer <jwt>` |
| User ID field | `user_id` (e.g. `user_abc123`) | `id` (UUID) |
| Roles | None (single-role: athlete) | `role` field: director, coach, athlete, parent |
| OAuth | Google OAuth via Emergent → session exchange | N/A (local auth only) |
| Middleware | `auth.get_current_user(request)` — reads header/cookie, looks up session in DB | `auth_middleware.get_current_user_dep()` — decodes JWT, no DB lookup |

**Conflict**: Session-based auth cannot coexist with JWT without a compatibility shim.
**Resolution**: All athlete routes must use the unified JWT middleware. The session model is dropped.

---

## 3. Data Scoping

| Aspect | Athlete App | Unified Platform |
|---|---|---|
| Scope key | `tenant_id` (auto-created per user, e.g. `tenant_user_abc`) | `org_id` (shared org, e.g. `org-capymatch-default`) |
| Derivation | `get_tenant_id(user)` → checks `tenants` collection → creates if missing | From user record, set during registration/claim |
| Multi-tenancy | Each athlete = 1 tenant. Family sharing via `team_members`. | Each club = 1 org. Athletes belong to an org via claim. |

**Key insight**: In the athlete app, `tenant_id` is an *athlete-level* scope. In the staff app, `org_id` is a *club-level* scope. These are **not equivalent** — they operate at different levels.

**Resolution**: For migrated athlete routes, the scope key is the athlete's `tenant_id` (set during claim flow in `auth.py:register`). The `org_id` remains for club-level staff data. Both keys can coexist on the same user/athlete record.

---

## 4. Database Collections

### Collections that DON'T exist in the unified platform (must be created)

| Collection | Purpose | Records | Tenant-scoped |
|---|---|---|---|
| `programs` | School pipeline — the core CRM entity | ~5-50 per athlete | Yes (tenant_id) |
| `college_coaches` | Coaching staff at universities (NOT club coaches!) | ~1-5 per program | Yes (tenant_id) |
| `interactions` | Activity timeline (emails sent, replies, visits, camps) | ~5-200 per athlete | Yes (tenant_id) |
| `athlete_events` | Calendar events (camps, showcases, deadlines) | ~5-30 per athlete | Yes (tenant_id) |
| `notifications` | In-app notifications (coach replies, follow-ups) | Rolling 7-day window | Yes (tenant_id) |
| `profile_views` | Public profile analytics | Unbounded | Yes (tenant_id) |
| `university_knowledge_base` | Pre-loaded school database (40+ D1/D2/D3 programs) | ~40-100 total | No (global) |
| `inbound_contacts` | Auto-detected coach outreach | ~0-10 per athlete | Yes (tenant_id) |
| `gmail_tokens` | Gmail OAuth tokens (encrypted) | 1 per user | Yes (user_id) |
| `payment_transactions` | Stripe checkout sessions | Per purchase | Yes (tenant_id) |
| `subscription_logs` | Plan change history | Per change | Yes (tenant_id) |
| `coach_watch_alerts` | AI coaching change alerts | Per scan | Yes (tenant_id) |

### Collections that EXIST but need reconciliation

| Collection | Athlete App Schema | Unified Platform Schema | Conflict |
|---|---|---|---|
| `users` | `{user_id, email, name, picture, password_hash, auth_provider}` | `{id, email, name, role, org_id, hashed_password}` | Different ID field name, different schema |
| `athletes` | Does not exist (uses `athlete_profiles` + `tenants`) | `{id, user_id, org_id, tenant_id, firstName, lastName, ...}` | Athlete app profile data lives in `athlete_profiles`, not `athletes` |
| `events` | `{event_id, tenant_id, title, event_type, ...}` | Mock data in `mock_data.py` (not a real collection) | Name collision — use `athlete_events` |

### CRITICAL: The `coaches` naming collision

- **Staff app `coaches`**: Club coaching staff (Coach Williams, Coach Garcia) — employees who manage athletes
- **Athlete app `coaches`**: College coaching staff at universities — people the athlete is recruiting to

These are **completely different entities**. The athlete app's coaches collection MUST be renamed to `college_coaches` to avoid collision.

---

## 5. Frontend Pages Inventory

### Core Surfaces (high usage, port first)

| Page | Route | Component | Backend Dependencies | Complexity |
|---|---|---|---|---|
| **Dashboard** | `/board` | `Dashboard.js` | `/programs`, `/events`, `/interactions`, `/athlete-profile`, `/gmail/status`, `/inbound-contacts`, `/engagement/summary` | HIGH — 7 API calls, 8 sections |
| **Pipeline/Board** | `/pipeline` | `RecruitingBoard.js` | `/programs?grouped=true`, `/coaches`, `/interactions` | HIGH — Kanban with drag-drop, 5-stage funnel |
| **Journey** | `/journey/:id` | `RecruitingJourney.js` | `/programs/:id`, `/programs/:id/journey`, Gmail integration | HIGH — Per-school timeline, email integration |
| **Profile Editor** | `/profile` | `ProfilePage.js` | `/athlete-profile` (GET/PUT), photo upload | MEDIUM |
| **Calendar** | `/calendar` | `CalendarPage.js` | `/events` (CRUD) | MEDIUM — Month/week views |
| **Knowledge Base** | `/knowledge-base` | `UniversityKnowledgeBase.js` | `/knowledge/search`, `/knowledge/:domain` | MEDIUM — Search + filter + add-to-board |

### Secondary Surfaces (port after core)

| Page | Route | Component | Complexity |
|---|---|---|---|
| Public Profile | `/s/:id` | `PublicSchedule.js` | MEDIUM — Public page, no auth |
| Analytics | `/analytics` | `Analytics.js` | LOW — Profile view charts |
| Settings | `/settings` | `SettingsPage.js` | LOW — Gmail connect, theme toggle |
| Account | `/account` | `AccountPage.js` | LOW — Name/email/password |
| Compare | `/compare` | `ComparePage.js` | MEDIUM — Side-by-side schools |
| School Info | `/school/:domain` | `SchoolInfoPage.js` | MEDIUM — KB detail page |

### Advanced Surfaces (port last)

| Page | Route | Component | External Dependency |
|---|---|---|---|
| Outreach Analysis | `/outreach-analysis` | `OutreachAnalysis.js` | Claude AI |
| Highlight Advisor | `/highlight-advisor` | `HighlightAdvisor.js` | Claude AI |
| Social Spotlight | `/spotlight` | `SocialSpotlight.js` | YouTube API |
| Billing | `/billing` | `BillingPage.js` | Stripe |
| Onboarding Quiz | `/onboarding` | `AthleteProfileQuiz.js` | N/A |

---

## 6. Backend Routes Inventory

### Priority 1: Core Data CRUD

| Route Module | Key Endpoints | Lines | Dependencies |
|---|---|---|---|
| `programs.py` | GET/POST/PUT/DELETE `/programs`, `/coaches`, `/interactions`, `/follow-ups`, `/programs/:id/journey` | ~550 | `subscriptions`, `knowledge` DB |
| `events.py` | GET/POST/PUT/DELETE `/events` | ~80 | None |
| `dashboard.py` | GET `/dashboard`, `/reminders` | ~120 | `programs`, `notifications` |
| `profile.py` | GET/PUT `/athlete-profile`, POST `/athlete-profile/photo`, GET `/share-link` | ~200 | Photo upload to base64 |

### Priority 2: Supporting Systems

| Route Module | Key Endpoints | Lines | Dependencies |
|---|---|---|---|
| `knowledge.py` | GET `/knowledge/search`, `/knowledge/:domain`, `/knowledge/school-info/:domain` | ~700 | `university_knowledge_base` collection, College Scorecard API |
| `notifications.py` | GET/POST `/notifications`, mark read | ~150 | None |
| `engagement.py` | GET `/engagement/summary`, POST `/engagement/track` | ~200 | `profile_views`, email tracking pixels |

### Priority 3: Integrations

| Route Module | Dependencies | Can Be Deferred |
|---|---|---|
| `gmail.py` | Gmail OAuth2, token management | Yes — complex, needs Google Cloud project |
| `ai.py` | Claude Sonnet 4.5 | Partially — email drafts need Gmail first |
| `stripe.py` | Stripe API | Yes — monetization can come later |
| `coach_scraper.py` | Web scraping + AI | Yes |
| `intelligence/` | Claude AI agent pipeline | Yes |

---

## 7. Shared UI Infrastructure

### Theme System
The athlete app uses a custom CSS variable theme system (`--t-bg`, `--t-text`, `--t-border`, etc.) with dark/light mode toggle. The staff platform uses Tailwind's standard color classes. These need to be reconciled.

### Component Library
Both apps use Shadcn/UI from `components/ui/`. Shared components: Button, Card, Badge, Avatar, Select, Dialog, Sonner (toast). The athlete app also has custom components: `UpgradeModal`, `SubscriptionBadge`, `AIAssistantDrawer`, `InvitationBanner`, `FirstReplyCelebration`, `Tour`, `OnboardingChecklist`.

### Layout
- **Staff app**: `Sidebar.js` + `TopBar.js` wrapped in `AppLayout.js`
- **Athlete app**: `Layout.js` — a single component with sidebar, top bar, notifications, profile dropdown, and route outlet

The athlete app `Layout.js` is more feature-rich (notifications, theme toggle, AI assistant drawer, subscription banner). It should be adapted to work within the unified `AppLayout` wrapper, or the athlete layout should replace the generic athlete sidebar.

### API Client
- **Staff app**: Direct `axios.get(API + "/endpoint")` calls with JWT from `AuthContext`
- **Athlete app**: Centralized `api.js` with interceptors for auth and subscription error handling

The athlete app's `api.js` pattern is cleaner and should be adopted for athlete routes.

---

## 8. Background Tasks

| Task | Interval | Purpose | External Deps |
|---|---|---|---|
| Coach Reply Checker | 10 min | Scan Gmail for coach replies | Gmail API |
| Inbound Contact Scanner | 2 hours | Detect inbound coach emails | Gmail API |
| Coach Watch Weekly | 7 days | AI scan for coaching changes | Claude AI |
| GPA Refresh | 30 days | Scrape GPA data | Web scraping |
| Demo Date Refresh | 24 hours | Keep demo account dates fresh | None |

All background tasks depend on Gmail and/or AI. They can be deferred until those integrations are ported.

---

## 9. Third-Party Integrations

| Integration | Athlete App Usage | Already in Unified Platform |
|---|---|---|
| **Claude Sonnet 4.5** | Email drafts, outreach analysis, highlight advisor, coach watch, intelligence agents | No (staff uses GPT 5.2) |
| **Gmail API** | Send/receive emails, auto-detect replies, inbound scanning | No |
| **Google OAuth** | Primary sign-in method | No (unified uses local auth) |
| **Stripe** | Subscription billing (Basic/Pro/Premium tiers) | No |
| **YouTube** | Social Spotlight feed, highlight video embeds | No |
| **College Scorecard API** | University stats enrichment | No |
| **Resend** | Welcome emails, password reset emails | Yes (already in staff app) |

---

## 10. Summary Stats

| Metric | Count |
|---|---|
| Frontend pages | 19 |
| Backend route modules | 28 |
| Backend route files (lines) | ~3,500+ |
| MongoDB collections | 15+ |
| AI integration points | 6 |
| Background tasks | 5 |
| External API integrations | 6 |
