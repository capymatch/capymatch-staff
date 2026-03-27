# CapyMatch — QA Testing Document

**Version**: 1.0
**Date**: March 23, 2026
**App URL**: https://athlete-integrity.preview.emergentagent.com

---

## 1. Overview

### What is CapyMatch?

CapyMatch is a recruiting pipeline management platform for college-bound student-athletes. Athletes use it to track which schools they're talking to, what stage each conversation is at, and what to do next. Coaches use it to monitor their athletes' pipelines and intervene when conversations stall. Directors oversee the full roster.

### What should QA focus on?

1. **Urgency accuracy** — The app's core value is telling the athlete exactly what to do next. If the priority system is wrong, the product fails.
2. **Signal consistency** — The same school must never show conflicting statuses across pages (e.g., "On Track" on one page, "Critical" on another).
3. **Actionability** — Every CTA must lead somewhere useful. No dead clicks, no broken navigation.
4. **Cross-role data sync** — When an athlete completes a task, it must disappear from the coach's dashboard immediately.
5. **Mobile usability** — The app is mobile-first. Everything must work at 375px width.

### Test Credentials

| Role     | Email                                | Password     | Home Page        |
|----------|--------------------------------------|--------------|------------------|
| Athlete  | emma.chen@athlete.capymatch.com      | athlete123   | /pipeline        |
| Coach    | coach.williams@capymatch.com         | coach123     | /mission-control |
| Director | director@capymatch.com               | director123  | /mission-control |

---

## 2. Test Scope

### Athlete Features

| Area                  | Route                          | Description                                              |
|-----------------------|--------------------------------|----------------------------------------------------------|
| Pipeline (My Schools) | /pipeline                      | Kanban + priority view of all schools                    |
| Hero Card             | /pipeline (Priority view)      | Top priority action card with carousel                   |
| Journey Page          | /pipeline/:programId           | Per-school detail: timeline, tasks, coach watch AI       |
| Dashboard             | /board                         | Overview with tasks, calendar, quick stats               |
| Find Schools          | /schools                       | School discovery and search                              |
| School Detail         | /schools/:domain               | Individual school info page                              |
| Calendar              | /calendar                      | Upcoming events and deadlines                            |
| Inbox                 | /inbox                         | Task inbox and notifications                             |
| Messages              | /messages                      | Threaded messaging with file attachments                 |
| Highlights            | /highlights                    | Video highlights management                              |
| Analytics             | /analytics                     | Outreach analytics and engagement stats                  |
| Profile               | /athlete-profile               | Athlete profile editor                                   |
| Settings              | /athlete-settings              | Account settings                                         |
| Onboarding            | /onboarding                    | First-time setup quiz                                    |
| Public Profile        | /p/:slug                       | Public-facing athlete profile                            |

### Coach/Director Features

| Area                  | Route                                          | Description                                    |
|-----------------------|------------------------------------------------|------------------------------------------------|
| Mission Control       | /mission-control                               | Roster overview, coach inbox, athlete signals  |
| Support Pod           | /support-pods/:athleteId                       | Per-athlete intervention dashboard             |
| School Pod            | /support-pods/:athleteId/school/:programId     | Per-school action center for coaches           |
| Events                | /events                                        | Event management (Prep → Live → Summary)       |
| Advocacy              | /advocacy                                      | Recommendation letters and outreach            |
| Program Intelligence  | /program                                       | Cross-program analytics                        |
| Roster                | /roster (Director only)                        | Full athlete roster management                 |
| Invites               | /invites (Director only)                       | Invite management                              |
| Profile               | /profile                                       | Coach profile with photo upload                |
| Messages              | /messages                                      | Threaded messaging with file attachments       |

### Cross-Cutting

| Area               | Description                                                   |
|--------------------|---------------------------------------------------------------|
| Authentication     | Login, logout, forgot/reset password, invite acceptance       |
| File Upload        | Attach files to messages (images, PDFs, docs — 10MB max)     |
| Notifications      | Bell icon, notification list, click-to-navigate               |
| Dark/Light Mode    | Theme toggle in top bar                                       |
| Sidebar Navigation | Collapse/expand, role-specific menu items                     |
| Cache Sync         | Data updates propagate across roles without page refresh      |

---

## 3. Test Environments

### Viewports

| Device           | Width   | Priority |
|------------------|---------|----------|
| iPhone SE        | 375px   | High     |
| iPhone 14 Pro    | 393px   | High     |
| iPad             | 768px   | Medium   |
| Desktop          | 1280px  | High     |
| Wide Desktop     | 1920px  | Medium   |

### Browsers

| Browser          | Priority |
|------------------|----------|
| Chrome (latest)  | High     |
| Safari (latest)  | High     |
| Firefox (latest) | Medium   |
| Mobile Safari    | High     |
| Chrome Android   | High     |

### Network Conditions

- Test on 3G throttling for mobile to verify loading states and skeleton screens.
- Verify that slow API responses show loaders, not blank screens.

---

## 4. Test Data Requirements

The following scenarios must exist or be creatable by the tester:

| Scenario                           | How to Set Up                                                 |
|------------------------------------|---------------------------------------------------------------|
| School with no activity for 9 days | Use Emory University (already in pipeline, no recent activity)|
| School with active conversation    | Stanford University (has recent interactions logged)          |
| School flagged by coach            | Coach Williams flags a school via School Pod                  |
| Multiple schools in different stages | Emma Chen's pipeline has 6 schools across stages            |
| Overdue task (4+ days)             | Check Emory — has overdue follow-up tasks                    |
| Mixed pipeline (hot/warm/cold)     | Default pipeline has schools in all temperature states        |
| Empty pipeline                     | Create new athlete account with no schools added             |
| Coach with multiple athletes       | Coach Williams has multiple athletes on roster               |
| Message with attachment            | Send message with file from Messages page                    |
| Completed tasks                    | Complete tasks as athlete, verify coach board updates         |

---

## 5. Functional Test Cases

### A. Hero Card (Pipeline Priority View)

| ID     | Scenario                                  | Steps                                                                                              | Expected Result                                                                                 |
|--------|-------------------------------------------|----------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------|
| HC-001 | Top priority school displayed             | 1. Login as athlete  2. Go to /pipeline  3. Ensure "Priority" view is active                      | Hero card shows the most urgent school (highest tier + most overdue)                            |
| HC-002 | Hero shows correct badges                 | 1. View hero card                                                                                  | Shows TOP PRIORITY badge, timing badge (e.g., "9D SINCE LAST ACTIVITY"), and COACH WAITING if flagged |
| HC-003 | Action text is direct                     | 1. View hero card action line                                                                      | Says "Follow up with [School] now" — not "Reply to" or generic text                            |
| HC-004 | Context line is merged                    | 1. View context below action                                                                      | Single line: "No response in X days · Coach is expecting a reply" — no stacked weak lines      |
| HC-005 | Risk context appears for stalled schools  | 1. View hero card for school with 7+ days inactivity                                              | Shows "This conversation is at risk of stalling" in red below context                          |
| HC-006 | CTA matches action                        | 1. View CTA button                                                                                | Says "Reply now →" or "Follow up now →" — NOT "Open school"                                    |
| HC-007 | CTA navigates correctly                   | 1. Click CTA button                                                                               | Navigates to /pipeline/:programId (Journey page for that school)                               |
| HC-008 | Carousel navigation works                 | 1. Click left/right arrows on hero  2. Check dot indicators                                       | Slides between schools, dots update, counter shows "2/6" etc.                                  |
| HC-009 | Vertical stage rail is visible            | 1. View hero card on desktop (>640px)                                                             | Right side shows "WHERE YOU ARE" vertical rail with correct active stage highlighted in teal    |
| HC-010 | Hero hidden in Pipeline/kanban view       | 1. Switch to "Pipeline" tab (kanban view)                                                         | Hero card is NOT visible — only kanban columns show                                            |
| HC-011 | Hero visible in Priority view             | 1. Switch to "Priority" tab                                                                       | Hero card appears above the school list                                                        |

### B. Pipeline Summary

| ID     | Scenario                                  | Steps                                                                                              | Expected Result                                                                                 |
|--------|-------------------------------------------|----------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------|
| PS-001 | Summary names top school                  | 1. View pipeline summary text above hero card                                                     | Says "[School] needs immediate attention — X others need follow-up"                            |
| PS-002 | Summary creates urgency                   | 1. Read summary                                                                                   | No generic counts like "6 now". Must name the specific school and be action-driven             |
| PS-003 | "View full breakdown" link works          | 1. Click "View full breakdown →"                                                                  | Opens "What's going on" drawer from the right                                                  |

### C. "What's Going On" Panel (Breakdown Drawer)

| ID     | Scenario                                  | Steps                                                                                              | Expected Result                                                                                 |
|--------|-------------------------------------------|----------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------|
| WG-001 | Top reasons limited to 3                  | 1. Open breakdown drawer                                                                          | Shows max 3 bullet points at top — no more                                                     |
| WG-002 | Reasons are human-readable                | 1. Read top reasons                                                                               | Says things like "Emory has gone quiet for 9 days" — not "No activity this period"             |
| WG-003 | Momentum section is compact               | 1. View "Your pipeline right now" section                                                         | Shows inline counts: "X gaining momentum", "X cooling off", "X steady" — NOT expandable groups|
| WG-004 | Per-school section renamed                | 1. View school breakdown section header                                                           | Says "What's driving your pipeline" — NOT "Why each school is here"                            |
| WG-005 | Max 2 reasons per school                  | 1. Check any school in the breakdown                                                              | Shows 1–2 reasons max. No duplication.                                                         |
| WG-006 | Show more toggle works                    | 1. If 4+ schools, click "+X more"                                                                 | Remaining schools expand with animation                                                        |
| WG-007 | AI insights are short and actionable      | 1. View insights at bottom of drawer                                                              | Max 2 insights. Each is 1–2 lines. Actionable language.                                        |
| WG-008 | Drawer closes properly                    | 1. Click X or backdrop                                                                            | Drawer slides away, no orphaned overlays                                                       |

### D. Pipeline Page (My Schools)

| ID     | Scenario                                  | Steps                                                                                              | Expected Result                                                                                 |
|--------|-------------------------------------------|----------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------|
| PP-001 | Priority view shows schools by urgency    | 1. Go to /pipeline with Priority tab active                                                       | Schools sorted: Act Now → Keep Momentum → Monitor                                              |
| PP-002 | Pipeline/kanban view shows stage columns  | 1. Switch to "Pipeline" tab                                                                       | Schools in columns: Added, Outreach, Talking, Visit, Offer, Committed                          |
| PP-003 | Toggle buttons are right-aligned          | 1. View Priority/Pipeline toggle                                                                  | Toggle is on the right side, no white background                                               |
| PP-004 | School cards show correct stage           | 1. View any school card                                                                           | Stage badge (e.g., "Outreach") matches the column and journey data                            |
| PP-005 | School card click navigates               | 1. Click any school card                                                                          | Opens Journey page /pipeline/:programId                                                        |

### E. Journey Page (Per-School Detail)

| ID     | Scenario                                  | Steps                                                                                              | Expected Result                                                                                 |
|--------|-------------------------------------------|----------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------|
| JP-001 | Header shows school info + vertical rail  | 1. Navigate to /pipeline/:programId                                                               | Dark header with school name, logo, division, match score, risk badges, and vertical "WHERE YOU ARE" rail on right |
| JP-002 | Coach Watch V2 card loads automatically   | 1. Scroll to Coach Watch section                                                                  | Unified AI card loads with skeleton, then shows state + headline + recommended action + AI insight |
| JP-003 | Timeline shows interactions in order      | 1. Scroll to timeline section                                                                     | Events sorted newest first, each with type icon, description, timestamp                        |
| JP-004 | Tasks section works                       | 1. View tasks  2. Mark one complete                                                               | Task moves to "Completed" section. Toast confirms.                                             |
| JP-005 | "Why this?" context appears               | 1. View the hero action card                                                                      | Shows "Why this?" label with contextual signals (days since activity, interest level)          |
| JP-006 | Back button returns to pipeline           | 1. Click back arrow in header                                                                     | Returns to /pipeline                                                                           |
| JP-007 | Quick action buttons work                 | 1. Click "Send Email" / "Log Interaction" / "Schedule Follow-up"                                  | Opens corresponding modal/composer. Submitting works.                                          |

### F. Messages & File Upload

| ID     | Scenario                                  | Steps                                                                                              | Expected Result                                                                                 |
|--------|-------------------------------------------|----------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------|
| FM-001 | Thread list loads                         | 1. Go to /messages                                                                                | Shows list of message threads with subject, sender, timestamp                                  |
| FM-002 | Thread opens on click                     | 1. Click a thread                                                                                 | Shows conversation with sender avatars, timestamps, message bodies                             |
| FM-003 | Reply without attachment                  | 1. Type in reply box  2. Click Send                                                               | Message appears in thread. Reply box clears.                                                   |
| FM-004 | Attach button visible                     | 1. Open any thread                                                                                | Paperclip icon button visible to the left of reply input                                       |
| FM-005 | Upload file                               | 1. Click paperclip  2. Select file (PNG, PDF, or DOC)                                            | File uploads, preview chip appears above reply box with filename and X to remove               |
| FM-006 | Remove attachment before sending          | 1. Upload a file  2. Click X on the attachment chip                                               | Attachment removed from preview area                                                           |
| FM-007 | Send reply with attachment                | 1. Upload file  2. Type message  3. Click Send                                                   | Message appears in thread with attachment bubble showing file icon, name, size                  |
| FM-008 | Download attachment                       | 1. Click on an attachment bubble in a message                                                     | File downloads (browser save dialog or inline preview for images/PDFs)                         |
| FM-009 | Reject file over 10MB                     | 1. Try to upload a file larger than 10MB                                                          | Toast error: "too large (max 10 MB)". File not uploaded.                                       |
| FM-010 | Send attachment-only message              | 1. Upload file  2. Leave reply box empty  3. Click Send                                          | Message sent with attachment and empty body. Send button is enabled.                           |
| FM-011 | Multiple attachments                      | 1. Upload 2+ files  2. Send                                                                      | All files show as separate chips before send, all appear as bubbles in sent message            |
| FM-012 | All roles have upload                     | 1. Test as Athlete, Coach, Director                                                              | All three roles see paperclip button and can upload/send/download                              |

### G. Coach/Director — Mission Control

| ID     | Scenario                                  | Steps                                                                                              | Expected Result                                                                                 |
|--------|-------------------------------------------|----------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------|
| MC-001 | Coach inbox loads                         | 1. Login as coach  2. Go to /mission-control                                                     | Shows athletes with attention signals, sorted by priority                                      |
| MC-002 | Athlete task completion clears blocker    | 1. Login as athlete, complete overdue task  2. Login as coach, refresh inbox                      | Blocker/signal for that task is GONE from coach inbox                                          |
| MC-003 | Profile completion updates                | 1. Athlete saves profile  2. Coach views athlete's support pod                                   | Profile completeness reflects new data. No "incomplete profile" blocker if 100%.               |
| MC-004 | Coach can navigate to School Pod          | 1. Click on an athlete  2. Click on a school                                                     | Opens School Pod (/support-pods/:athleteId/school/:programId)                                  |
| MC-005 | School Pod sections render                | 1. Open any School Pod                                                                           | Renders: Hero, Risk, Quick Actions, Playbook, Tasks, Timeline, Signals, Relationship, Pipeline |
| MC-006 | Coach can add/complete tasks              | 1. Click "Add" in Tasks  2. Create task  3. Complete it                                          | Task appears, then moves to completed section                                                  |
| MC-007 | Escalate to Director works                | 1. Click "Escalate" quick action  2. Submit                                                      | Escalation created. Director can see it.                                                       |

### H. Status & Urgency Logic

| ID     | Scenario                                  | Steps                                                                                              | Expected Result                                                                                 |
|--------|-------------------------------------------|----------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------|
| SU-001 | No contradictions                         | 1. Check summary, hero card, and school cards for same school                                     | Same school never shows "On Track" in one place and "Critical" in another                      |
| SU-002 | Top Priority = highest urgency            | 1. View hero card  2. Compare with school list                                                   | Hero shows the school with the most urgent signal (overdue, longest inactivity, coach flag)    |
| SU-003 | Secondary = needs attention soon          | 1. View "Keep Momentum" section                                                                  | Schools here have moderate signals — not critical but need follow-up within days                |
| SU-004 | Watch = stable                            | 1. View "Monitor" section                                                                        | Schools here have no urgent signals — on track, no overdue tasks                               |
| SU-005 | Stage progression is accurate             | 1. View a school in "Outreach" stage  2. Log an interaction  3. Refresh                          | Stage may advance based on activity. Pipeline column and Journey rail should match.            |

---

## 6. UI/UX Validation

### Visual Hierarchy Checks

| Check                                             | Pass Criteria                                                        |
|---------------------------------------------------|----------------------------------------------------------------------|
| Most urgent item visible without scrolling        | Hero card is above the fold on both mobile and desktop               |
| Action text is the largest element in hero card   | School name and action text dominate visually                        |
| Badges are readable but not dominant              | TOP PRIORITY, COACH WAITING badges are visible but don't overshadow the action |
| CTA button is obvious                             | Teal/green, pill-shaped, clearly labeled with action verb            |
| No clutter or duplicate info                      | No section repeats information from another section                  |

### Mobile-Specific (375px width)

| Check                                             | Pass Criteria                                                        |
|---------------------------------------------------|----------------------------------------------------------------------|
| No horizontal scrolling                           | Content fits within viewport — no overflow                           |
| Touch targets are 44px+ minimum                   | Buttons, links, cards are tappable without precision                 |
| Text is readable without zooming                  | Body text 14px+, labels 11px+                                        |
| Sidebar collapses properly                        | Sidebar is hidden on mobile, hamburger menu works                    |
| Hero card vertical rail hidden on mobile          | Rail only shows on sm+ (640px+) breakpoint                           |
| Reply box is usable                               | Paperclip, input, send button all visible and usable on small screens|

### Typography & Spacing

| Check                                             | Pass Criteria                                                        |
|---------------------------------------------------|----------------------------------------------------------------------|
| Consistent heading hierarchy                      | H1 > H2 > body > small — no inversions                              |
| Sufficient whitespace between sections            | Sections have 16–24px gaps, not cramped                              |
| No orphaned labels or empty states                | If a section has no data, show a meaningful empty message            |

---

## 7. Edge Cases & Error Handling

| ID     | Scenario                                  | Steps                                                                                              | Expected Result                                                                                 |
|--------|-------------------------------------------|----------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------|
| EC-001 | Empty pipeline                            | 1. Login with athlete who has 0 schools                                                           | Shows empty state — "Add schools to get started" or similar. No hero card. No crash.           |
| EC-002 | All schools inactive (7+ days)            | 1. Pipeline where every school has gone quiet                                                     | Summary reflects urgency for all. No "you're in a good position" contradiction.                |
| EC-003 | All schools active                        | 1. Pipeline where all schools have recent activity                                                | Summary reflects positive state. Hero shows next best action (not critical urgency).           |
| EC-004 | Missing coach info on school              | 1. School with no coach_email or primary_coach                                                   | School Pod contact section hidden or shows "No contact info"                                   |
| EC-005 | Very long school name                     | 1. School name like "University of North Carolina at Chapel Hill"                                 | Name truncates gracefully — no layout break on mobile                                          |
| EC-006 | Rapid state changes                       | 1. Complete 3 tasks quickly in succession                                                         | Each completion triggers cache refresh. UI updates smoothly. No stale data.                    |
| EC-007 | Upload unsupported file type              | 1. Try uploading .exe or .zip                                                                    | Error toast: "File type not allowed". File not uploaded.                                       |
| EC-008 | Network error during upload               | 1. Disconnect network  2. Try uploading a file                                                   | Error toast shown. No spinner stuck forever.                                                   |
| EC-009 | Session expired                           | 1. Wait for token expiry  2. Try any action                                                      | Redirects to login page. No white screen.                                                      |
| EC-010 | Access wrong role's page                  | 1. As athlete, navigate to /mission-control                                                      | Redirected away — no access to coach-only pages                                                |

---

## 8. Performance Checks

| Check                                             | Pass Criteria                                                        |
|---------------------------------------------------|----------------------------------------------------------------------|
| Pipeline page initial load                        | Under 3 seconds on broadband, under 5 seconds on 3G                 |
| Journey page initial load                         | Under 3 seconds (including Coach Watch AI call)                      |
| No layout shift (CLS)                             | Hero card, school cards, and sections don't jump after loading       |
| Smooth scrolling                                  | Pipeline and Journey pages scroll without jank or frame drops        |
| Skeleton loading states                           | Coach Watch V2 card shows shimmer skeleton while AI loads            |
| File upload progress                              | Paperclip spinner shows during upload. No frozen UI.                 |
| No memory leaks                                   | Navigate between pages 20+ times — no increasing memory usage        |
| Concurrent requests                               | Open pipeline, then rapidly switch schools — no stale data rendered  |

---

## 9. Regression Checklist

Run after every deployment. Every item must pass.

| #  | Check                                                                                  | Status |
|----|----------------------------------------------------------------------------------------|--------|
| 1  | Hero card shows correct top priority school (matches pipeline data)                    | [ ]    |
| 2  | Pipeline summary matches hero card school                                              | [ ]    |
| 3  | "What's going on" drawer data matches pipeline state                                   | [ ]    |
| 4  | School cards in kanban match correct columns                                           | [ ]    |
| 5  | Journey page header rail stage matches pipeline kanban column for same school           | [ ]    |
| 6  | Coach Watch V2 loads without error on Journey page                                     | [ ]    |
| 7  | Completing task as athlete removes blocker from coach inbox (cross-role sync)           | [ ]    |
| 8  | File upload works on Messages page for athlete, coach, director                        | [ ]    |
| 9  | Downloaded file matches uploaded file (content intact)                                 | [ ]    |
| 10 | Notifications click-through navigates to correct page (not /my-schools)                | [ ]    |
| 11 | Public profile preview works for coaches (staff_preview=true)                          | [ ]    |
| 12 | Login/logout cycle works for all 3 roles                                               | [ ]    |
| 13 | Dark mode toggle doesn't break layout or readability                                   | [ ]    |
| 14 | Mobile (375px): no horizontal scroll, all CTAs tappable, hero card usable              | [ ]    |
| 15 | No console errors on Pipeline, Journey, Messages, Mission Control pages                | [ ]    |

---

## 10. Acceptance Criteria

The app passes QA when **all** of the following are true:

| #  | Criterion                                                                              | Mandatory |
|----|----------------------------------------------------------------------------------------|-----------|
| 1  | User can identify the top priority school in **under 3 seconds** on Pipeline page      | Yes       |
| 2  | **No contradictions** exist between summary, hero card, school cards, and Journey page | Yes       |
| 3  | **No duplicated information** within any single view (hero, drawer, cards)             | Yes       |
| 4  | **All CTAs navigate correctly** — no dead links, no 404s, no wrong destinations        | Yes       |
| 5  | **Status and urgency are always accurate** — Top Priority = most urgent, no mislabels | Yes       |
| 6  | **Cross-role data sync works** — athlete action immediately clears coach blocker       | Yes       |
| 7  | **File upload/download works** for all 3 roles with proper validation                  | Yes       |
| 8  | **Mobile layout is usable** — no overflow, tappable targets, readable text at 375px   | Yes       |
| 9  | **AI insights are grounded** — no hallucinated data, no contradictions with UI         | Yes       |
| 10 | **Page loads under 3 seconds** on broadband for all core pages                         | Yes       |
| 11 | UI feels **clean, fast, and actionable** — not cluttered, not confusing                | Yes       |
| 12 | **Zero critical bugs** — no crashes, no white screens, no data loss                    | Yes       |

---

## Appendix: Key data-testid References

Use these for automated testing or quick element verification:

| Element                    | data-testid                           |
|----------------------------|---------------------------------------|
| Hero card                  | `pipeline-hero`                       |
| Hero top priority badge    | `hero-top-priority-badge`             |
| Hero coach waiting badge   | `hero-coach-waiting-badge`            |
| Hero timing label          | `hero-timing-label`                   |
| Hero action text           | `hero-advice-text`                    |
| Hero context line          | `hero-descriptive-reason`             |
| Hero risk context          | `hero-risk-context`                   |
| Hero CTA button            | `hero-cta-btn`                        |
| Hero vertical rail         | `hero-progress-rail`                  |
| Pipeline summary           | `summary-headline`                    |
| View breakdown link        | `view-breakdown-btn`                  |
| Breakdown drawer           | `breakdown-drawer`                    |
| Breakdown narrative        | `breakdown-narrative`                 |
| Breakdown momentum         | `breakdown-momentum`                  |
| Breakdown schools          | `breakdown-schools`                   |
| View toggle                | `view-toggle`                         |
| Journey header rail        | `journey-header-rail`                 |
| Journey school name        | `journey-school-name`                 |
| Attach file button         | `attach-file-btn`                     |
| File input                 | `file-input`                          |
| Reply attachments preview  | `reply-attachments`                   |
| Reply input                | `thread-reply-input`                  |
| Reply send                 | `thread-reply-send`                   |
| School Pod page            | `school-pod-page`                     |
| School Pod tasks           | `school-tasks`                        |
| School Pod timeline        | `school-timeline`                     |
