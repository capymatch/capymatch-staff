"""
Comprehensive data seeder for CapyMatch.
Wipes all athlete/event/action data and creates a clean, interconnected dataset.

Usage: python seed_fresh.py
"""
import asyncio
import uuid
import bcrypt
from datetime import datetime, timezone, timedelta
from db_client import db

NOW = datetime.now(timezone.utc)
DEFAULT_ORG_ID = "org-capymatch-default"


def ago(days=0, hours=0):
    return (NOW - timedelta(days=days, hours=hours)).isoformat()


def from_now(days=0):
    return (NOW + timedelta(days=days)).isoformat()


def uid():
    return str(uuid.uuid4())


def pw(plain):
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


# ─── ATHLETES ───────────────────────────────────────────────────
ATHLETES = [
    {
        "id": "athlete_1",
        "first_name": "Emma",
        "last_name": "Chen",
        "full_name": "Emma Chen",
        "email": "emma.chen@athlete.capymatch.com",
        "position": "Outside Hitter",
        "grad_year": 2026,
        "height": "5'10\"",
        "weight": "145",
        "city": "Miami",
        "state": "FL",
        "gpa": "3.8",
        "bio": "Passionate volleyball player with 5 years of club experience. Strong at the net with consistent serve receive.",
        "video_link": "https://www.hudl.com/emmachen",
        "team": "U17 Premier",
        "high_school": "Miami Central HS",
        "photo_url": "",
        "jersey_number": "7",
        "sat_score": "1280",
        "act_score": "28",
        "approach_touch": "9'8\"",
        "block_touch": "9'2\"",
        "standing_reach": "7'10\"",
        "wingspan": "5'10\"",
        "archetype": "hot_prospect",
        "recruiting_stage": "actively_recruiting",
        "days_since_activity": 1,
    },
    {
        "id": "athlete_2",
        "first_name": "Olivia",
        "last_name": "Anderson",
        "full_name": "Olivia Anderson",
        "email": "olivia.anderson@athlete.capymatch.com",
        "position": "Setter",
        "grad_year": 2025,
        "height": "5'7\"",
        "weight": "",
        "city": "Portland",
        "state": "OR",
        "gpa": "3.5",
        "bio": "",
        "video_link": "",
        "team": "U18 Academy",
        "high_school": "",
        "photo_url": "",
        "jersey_number": "",
        "sat_score": "",
        "act_score": "",
        "approach_touch": "",
        "block_touch": "",
        "standing_reach": "",
        "wingspan": "",
        "archetype": "blocked_docs",
        "recruiting_stage": "actively_recruiting",
        "days_since_activity": 3,
    },
    {
        "id": "athlete_3",
        "first_name": "Marcus",
        "last_name": "Johnson",
        "full_name": "Marcus Johnson",
        "email": "marcus.johnson@athlete.capymatch.com",
        "position": "Libero",
        "grad_year": 2026,
        "height": "5'9\"",
        "weight": "155",
        "city": "Chicago",
        "state": "IL",
        "gpa": "3.2",
        "bio": "Defensive specialist. Led my team in digs last season.",
        "video_link": "https://www.hudl.com/marcusjohnson",
        "team": "U17 Premier",
        "high_school": "Lincoln Park HS",
        "photo_url": "",
        "jersey_number": "3",
        "sat_score": "1150",
        "act_score": "",
        "approach_touch": "",
        "block_touch": "",
        "standing_reach": "",
        "wingspan": "",
        "archetype": "gone_dark",
        "recruiting_stage": "actively_recruiting",
        "days_since_activity": 22,
    },
    {
        "id": "athlete_4",
        "first_name": "Sarah",
        "last_name": "Martinez",
        "full_name": "Sarah Martinez",
        "email": "sarah.martinez@athlete.capymatch.com",
        "position": "Middle Blocker",
        "grad_year": 2027,
        "height": "6'0\"",
        "weight": "160",
        "city": "Dallas",
        "state": "TX",
        "gpa": "3.9",
        "bio": "Tall and athletic. Just starting my recruiting journey.",
        "video_link": "",
        "team": "U16 Elite",
        "high_school": "Plano East HS",
        "photo_url": "",
        "jersey_number": "12",
        "sat_score": "",
        "act_score": "",
        "approach_touch": "10'0\"",
        "block_touch": "9'6\"",
        "standing_reach": "8'2\"",
        "wingspan": "6'1\"",
        "archetype": "narrow_list",
        "recruiting_stage": "exploring",
        "days_since_activity": 4,
    },
    {
        "id": "athlete_5",
        "first_name": "Lucas",
        "last_name": "Rodriguez",
        "full_name": "Lucas Rodriguez",
        "email": "lucas.rodriguez@athlete.capymatch.com",
        "position": "Opposite Hitter",
        "grad_year": 2025,
        "height": "6'3\"",
        "weight": "185",
        "city": "San Diego",
        "state": "CA",
        "gpa": "3.6",
        "bio": "Power hitter with a 95mph serve. National team experience.",
        "video_link": "https://www.hudl.com/lucasrodriguez",
        "team": "U18 Academy",
        "high_school": "Torrey Pines HS",
        "photo_url": "https://example.com/lucas.jpg",
        "jersey_number": "9",
        "sat_score": "1350",
        "act_score": "30",
        "approach_touch": "11'2\"",
        "block_touch": "10'8\"",
        "standing_reach": "8'6\"",
        "wingspan": "6'5\"",
        "archetype": "healthy",
        "recruiting_stage": "narrowing",
        "days_since_activity": 0,
    },
]

# ─── PROGRAMS (target schools per athlete) ──────────────────────
PROGRAMS = [
    # Emma Chen — 5 schools, various stages. Active, strong pipeline.
    {"athlete": "athlete_1", "school": "Stanford University", "status": "Campus Visit", "reply": "Reply Received", "priority": "Top Choice", "days_stale": 2, "days_overdue": 0, "last_follow_up_days": 2, "initial_contact_days": 45},
    {"athlete": "athlete_1", "school": "University of Florida", "status": "Prospect", "reply": "No Reply", "priority": "High", "days_stale": 18, "days_overdue": 5, "last_follow_up_days": 18, "initial_contact_days": 30},
    {"athlete": "athlete_1", "school": "Emory University", "status": "Initial Contact", "reply": "No Reply", "priority": "Medium", "days_stale": 25, "days_overdue": 10, "last_follow_up_days": 25, "initial_contact_days": 25},
    {"athlete": "athlete_1", "school": "UCLA", "status": "Prospect", "reply": "Reply Received", "priority": "High", "days_stale": 5, "days_overdue": 0, "last_follow_up_days": 5, "initial_contact_days": 40},
    {"athlete": "athlete_1", "school": "Creighton University", "status": "Not Contacted", "reply": "N/A", "priority": "Low", "days_stale": 0, "days_overdue": 0, "last_follow_up_days": 0, "initial_contact_days": 0},

    # Olivia Anderson — 4 schools, blocker (missing transcript) affecting progress.
    {"athlete": "athlete_2", "school": "Duke University", "status": "Initial Contact", "reply": "Reply Received", "priority": "Top Choice", "days_stale": 8, "days_overdue": 3, "last_follow_up_days": 8, "initial_contact_days": 20},
    {"athlete": "athlete_2", "school": "University of North Carolina at Chapel Hill", "status": "Prospect", "reply": "No Reply", "priority": "High", "days_stale": 15, "days_overdue": 7, "last_follow_up_days": 15, "initial_contact_days": 15},
    {"athlete": "athlete_2", "school": "Georgetown University", "status": "Not Contacted", "reply": "N/A", "priority": "Medium", "days_stale": 0, "days_overdue": 0, "last_follow_up_days": 0, "initial_contact_days": 0},
    {"athlete": "athlete_2", "school": "University of Virginia", "status": "Initial Contact", "reply": "No Reply", "priority": "High", "days_stale": 12, "days_overdue": 4, "last_follow_up_days": 12, "initial_contact_days": 12},

    # Marcus Johnson — 4 schools, gone dark (22 days inactive), engagement dropping.
    {"athlete": "athlete_3", "school": "University of Michigan", "status": "Campus Visit", "reply": "Reply Received", "priority": "Top Choice", "days_stale": 22, "days_overdue": 14, "last_follow_up_days": 22, "initial_contact_days": 60},
    {"athlete": "athlete_3", "school": "Penn State University", "status": "Prospect", "reply": "No Reply", "priority": "High", "days_stale": 28, "days_overdue": 18, "last_follow_up_days": 28, "initial_contact_days": 40},
    {"athlete": "athlete_3", "school": "Ohio State University", "status": "Initial Contact", "reply": "No Reply", "priority": "Medium", "days_stale": 20, "days_overdue": 12, "last_follow_up_days": 20, "initial_contact_days": 20},
    {"athlete": "athlete_3", "school": "University of Wisconsin", "status": "Not Contacted", "reply": "N/A", "priority": "Low", "days_stale": 0, "days_overdue": 0, "last_follow_up_days": 0, "initial_contact_days": 0},

    # Sarah Martinez — 3 schools, exploring (2027 grad), narrow list.
    {"athlete": "athlete_4", "school": "University of Texas", "status": "Not Contacted", "reply": "N/A", "priority": "Top Choice", "days_stale": 0, "days_overdue": 0, "last_follow_up_days": 0, "initial_contact_days": 0},
    {"athlete": "athlete_4", "school": "Baylor University", "status": "Not Contacted", "reply": "N/A", "priority": "High", "days_stale": 0, "days_overdue": 0, "last_follow_up_days": 0, "initial_contact_days": 0},
    {"athlete": "athlete_4", "school": "University of Nebraska", "status": "Initial Contact", "reply": "No Reply", "priority": "Medium", "days_stale": 4, "days_overdue": 0, "last_follow_up_days": 4, "initial_contact_days": 4},

    # Lucas Rodriguez — 4 schools, strong momentum, narrowing with an offer.
    {"athlete": "athlete_5", "school": "University of Southern California", "status": "Offer", "reply": "Reply Received", "priority": "Top Choice", "days_stale": 0, "days_overdue": 0, "last_follow_up_days": 1, "initial_contact_days": 90},
    {"athlete": "athlete_5", "school": "Pepperdine University", "status": "Campus Visit", "reply": "Reply Received", "priority": "High", "days_stale": 1, "days_overdue": 0, "last_follow_up_days": 1, "initial_contact_days": 75},
    {"athlete": "athlete_5", "school": "Stanford University", "status": "Prospect", "reply": "Reply Received", "priority": "High", "days_stale": 3, "days_overdue": 0, "last_follow_up_days": 3, "initial_contact_days": 50},
    {"athlete": "athlete_5", "school": "University of Oregon", "status": "Initial Contact", "reply": "Reply Received", "priority": "Medium", "days_stale": 5, "days_overdue": 0, "last_follow_up_days": 5, "initial_contact_days": 30},
]

# ─── EVENTS ─────────────────────────────────────────────────────
# school_ids match the IDs in mock_data.SCHOOLS
EVENTS = [
    {
        "id": "event_0",
        "name": "Winter Showcase",
        "type": "showcase",
        "daysAway": -6,
        "location": "Portland, OR",
        "expectedSchools": 5,
        "prepStatus": "ready",
        "status": "past",
        "athlete_ids": ["athlete_1", "athlete_3", "athlete_5"],
        "school_ids": ["stanford", "virginia", "michigan", "usc", "ucla"],
        "checklist": [
            {"id": "check_1", "label": "Confirm athlete attendance", "completed": True},
            {"id": "check_2", "label": "Identify target school coaches attending", "completed": True},
            {"id": "check_3", "label": "Review highlight reels", "completed": True},
            {"id": "check_4", "label": "Prepare talking points for athlete-school pairs", "completed": True},
            {"id": "check_5", "label": "Confirm travel/logistics", "completed": True},
        ],
        "summaryStatus": "pending",
    },
    {
        "id": "event_1",
        "name": "College Exposure Camp",
        "type": "camp",
        "daysAway": 3,
        "location": "Irvine, CA",
        "expectedSchools": 5,
        "prepStatus": "in_progress",
        "status": "upcoming",
        "athlete_ids": ["athlete_1", "athlete_2", "athlete_4"],
        "school_ids": ["ucla", "stanford", "usc", "virginia", "duke"],
        "checklist": [
            {"id": "check_1", "label": "Confirm athlete attendance", "completed": True},
            {"id": "check_2", "label": "Identify target school coaches attending", "completed": True},
            {"id": "check_3", "label": "Review highlight reels", "completed": False},
            {"id": "check_4", "label": "Prepare talking points for athlete-school pairs", "completed": False},
            {"id": "check_5", "label": "Confirm travel/logistics", "completed": False},
        ],
        "summaryStatus": None,
    },
    {
        "id": "event_2",
        "name": "Spring Classic",
        "type": "tournament",
        "daysAway": 10,
        "location": "Las Vegas, NV",
        "expectedSchools": 5,
        "prepStatus": "not_started",
        "status": "upcoming",
        "athlete_ids": ["athlete_1", "athlete_3", "athlete_5"],
        "school_ids": ["duke", "unc", "georgetown", "usc", "pepperdine"],
        "checklist": [
            {"id": "check_1", "label": "Confirm athlete attendance", "completed": False},
            {"id": "check_2", "label": "Identify target school coaches attending", "completed": False},
            {"id": "check_3", "label": "Review highlight reels", "completed": False},
            {"id": "check_4", "label": "Prepare talking points for athlete-school pairs", "completed": False},
            {"id": "check_5", "label": "Confirm travel/logistics", "completed": False},
        ],
        "summaryStatus": None,
    },
]


async def seed():
    print("=" * 60)
    print("  CAPYMATCH — COMPREHENSIVE DATA SEEDER")
    print("=" * 60)

    # ─── STEP 0: CLEAR ALL DATA ──────────────────────────────────
    print("\n[STEP 0] Clearing all data...")
    collections_to_clear = [
        "athletes", "programs", "program_metrics", "program_snapshots",
        "program_stage_history", "pod_actions", "pod_action_events",
        "pod_issues", "pod_resolutions", "athlete_notes", "coach_notes",
        "event_notes", "events", "playbook_progress",
        "support_messages", "support_threads",
        "interactions", "assignments", "nudges", "recommendations",
        "coach_flags", "coach_watch_alerts", "athlete_events",
        "intelligence_cache", "smart_match_cache", "smart_match_runs",
        "digests", "notifications", "reassignment_log",
        "ai_conversations", "ai_school_insights",
        "athlete_user_links", "program_signals",
        "director_actions",
    ]
    for c in collections_to_clear:
        r = await db[c].delete_many({})
        if r.deleted_count > 0:
            print(f"  Cleared {c}: {r.deleted_count}")

    # Remove athlete user accounts (will be recreated)
    await db.users.delete_many({"role": "athlete"})
    print("  Cleared athlete user accounts")

    # Find coach user
    coach = await db.users.find_one(
        {"email": "coach.williams@capymatch.com"},
        {"_id": 0, "id": 1, "name": 1}
    )
    if not coach:
        print("  WARNING: Coach user not found! Creating a placeholder.")
        coach = {"id": "coach-williams", "name": "Coach Williams"}
    coach_user_id = coach["id"]
    coach_name = coach["name"]
    print(f"  Coach: {coach_name} ({coach_user_id})")

    # ─── STEP 1: CREATE ATHLETE USER ACCOUNTS ────────────────────
    print("\n[STEP 1] Creating athlete user accounts...")
    hashed_pw = pw("athlete123")
    for a in ATHLETES:
        user_id = uid()
        await db.users.insert_one({
            "id": user_id,
            "email": a["email"],
            "password_hash": hashed_pw,
            "name": a["full_name"],
            "role": "athlete",
            "athlete_id": a["id"],
            "org_id": DEFAULT_ORG_ID,
            "created_at": ago(60),
        })
        a["_user_id"] = user_id
        a["_tenant_id"] = f"tenant-{user_id}"
        print(f"  {a['full_name']} ({a['email']}) -> user_id={user_id[:12]}...")

    # ─── STEP 2: CREATE ATHLETE PROFILES ─────────────────────────
    print("\n[STEP 2] Creating athlete profiles...")

    # Pre-compute school_targets and active_interest per athlete
    athlete_school_counts = {}
    athlete_reply_counts = {}
    for p in PROGRAMS:
        aid = p["athlete"]
        athlete_school_counts[aid] = athlete_school_counts.get(aid, 0) + 1
        if p["reply"] == "Reply Received":
            athlete_reply_counts[aid] = athlete_reply_counts.get(aid, 0) + 1

    for a in ATHLETES:
        days = a["days_since_activity"]
        # Compute momentum
        if days <= 3:
            momentum_score = max(6, 10 - days)
            momentum_trend = "rising"
        elif days <= 14:
            momentum_score = max(2, 7 - days)
            momentum_trend = "stable"
        else:
            momentum_score = max(-5, -days // 5)
            momentum_trend = "declining"

        # Profile fields for DB
        profile_fields = [
            "id", "first_name", "last_name", "full_name", "email",
            "position", "grad_year", "height", "weight", "city", "state",
            "gpa", "bio", "video_link", "team", "high_school",
            "photo_url", "jersey_number", "sat_score", "act_score",
            "approach_touch", "block_touch", "standing_reach", "wingspan",
            "archetype",
        ]
        doc = {k: a[k] for k in profile_fields if k in a}
        doc["user_id"] = a["_user_id"]
        doc["tenant_id"] = a["_tenant_id"]
        doc["org_id"] = DEFAULT_ORG_ID
        doc["recruiting_stage"] = a["recruiting_stage"]
        doc["last_activity"] = ago(days)
        doc["days_since_activity"] = days
        doc["momentum_score"] = momentum_score
        doc["momentum_trend"] = momentum_trend
        doc["school_targets"] = athlete_school_counts.get(a["id"], 0)
        doc["active_interest"] = athlete_reply_counts.get(a["id"], 0)
        doc["primary_coach_id"] = coach_user_id
        doc["created_at"] = ago(60)
        doc["updated_at"] = ago(0)
        doc["phone"] = ""

        await db.athletes.insert_one(doc)
    print(f"  Created {len(ATHLETES)} athlete profiles")

    # ─── STEP 3: CREATE ATHLETE-USER LINKS ───────────────────────
    print("\n[STEP 3] Creating athlete-user links...")
    for a in ATHLETES:
        await db.athlete_user_links.insert_one({
            "athlete_id": a["id"],
            "user_id": a["_user_id"],
            "relationship_type": "athlete",
            "permissions": ["full"],
            "created_at": ago(60),
        })
    print(f"  Created {len(ATHLETES)} links")

    # ─── STEP 4: CREATE PROGRAMS (target schools) ────────────────
    print("\n[STEP 4] Creating programs...")
    program_map = {}  # (athlete_id, school_name) -> program_id
    for p in PROGRAMS:
        pid = uid()
        a = next(x for x in ATHLETES if x["id"] == p["athlete"])
        initial = ago(p["initial_contact_days"]) if p["initial_contact_days"] > 0 else ""
        last_fu = ago(p["last_follow_up_days"]) if p["last_follow_up_days"] > 0 else ""

        if p["status"] == "Not Contacted":
            next_action = "Send introduction"
            next_due = ""
        elif p["status"] == "Offer":
            next_action = "Respond to offer"
            next_due = from_now(5)
        elif p["days_overdue"] > 0:
            next_action = "Follow up (overdue)"
            next_due = ago(p["days_overdue"])
        else:
            next_action = "Follow up"
            next_due = from_now(3)

        doc = {
            "program_id": pid,
            "tenant_id": a["_tenant_id"],
            "athlete_id": a["id"],
            "university_name": p["school"],
            "division": "",
            "conference": "",
            "region": "",
            "recruiting_status": p["status"],
            "reply_status": p["reply"],
            "priority": p["priority"],
            "next_action": next_action,
            "next_action_due": next_due,
            "initial_contact_sent": initial,
            "last_follow_up": last_fu,
            "notes": "",
            "org_id": DEFAULT_ORG_ID,
            "created_at": ago(90),
            "updated_at": ago(p["days_stale"]),
        }

        # Enrich from knowledge base
        kb = await db.university_knowledge_base.find_one(
            {"university_name": p["school"]}, {"_id": 0}
        )
        if kb:
            doc["division"] = kb.get("division", "")
            doc["conference"] = kb.get("conference", "")
            doc["region"] = kb.get("region", "")

        await db.programs.insert_one(doc)
        program_map[(p["athlete"], p["school"])] = pid
        print(f"  {a['full_name']} -> {p['school']} ({p['status']}) [{pid[:8]}]")

    # ─── STEP 5: CREATE PROGRAM METRICS ──────────────────────────
    print("\n[STEP 5] Creating program metrics...")
    for p in PROGRAMS:
        pid = program_map[(p["athlete"], p["school"])]
        a = next(x for x in ATHLETES if x["id"] == p["athlete"])

        # Compute health state
        if p["days_overdue"] > 7 and p["days_stale"] > 14:
            health = "at_risk"
        elif p["days_overdue"] > 3 or (p["reply"] == "No Reply" and p["days_stale"] > 10):
            health = "needs_attention"
        elif p["reply"] == "No Reply" and p["days_stale"] > 5:
            health = "awaiting_reply"
        elif p["status"] == "Not Contacted":
            health = "still_early"
        elif p["days_stale"] <= 3 and p["reply"] == "Reply Received":
            health = "strong_momentum"
        else:
            health = "active"

        # Engagement trend
        if p["days_stale"] > 14:
            trend = "declining"
        elif p["days_stale"] > 7:
            trend = "stale"
        elif p["days_stale"] <= 3:
            trend = "accelerating"
        else:
            trend = "stable"

        reply_rate = 1.0 if p["reply"] == "Reply Received" else 0.0
        interactions = max(1, (p["initial_contact_days"] or 1) // 10) if p["status"] != "Not Contacted" else 0

        # Engagement freshness
        if p["days_stale"] > 14:
            freshness = "stale"
        elif p["days_stale"] > 7:
            freshness = "cooling"
        elif p["days_stale"] > 0:
            freshness = "active"
        else:
            freshness = "hot"

        doc = {
            "program_id": pid,
            "athlete_id": p["athlete"],
            "tenant_id": a["_tenant_id"],
            "org_id": DEFAULT_ORG_ID,
            "university_name": p["school"],
            "pipeline_health_state": health,
            "engagement_trend": trend,
            "reply_rate": reply_rate,
            "overdue_followups": 1 if p["days_overdue"] > 0 else 0,
            "stage_stalled_days": p["days_stale"] if p["days_stale"] > 7 else 0,
            "days_since_last_engagement": p["days_stale"],
            "engagement_freshness_label": freshness,
            "meaningful_interaction_count": interactions,
            "last_meaningful_engagement_at": ago(p["days_stale"]) if p["days_stale"] > 0 else NOW.isoformat(),
            "data_confidence": "HIGH" if interactions > 2 else "MEDIUM" if interactions > 0 else "LOW",
            "computed_at": NOW.isoformat(),
        }
        await db.program_metrics.insert_one(doc)
    print(f"  Created {len(PROGRAMS)} program metrics")

    # ─── STEP 6: CREATE POD ACTIONS ──────────────────────────────
    print("\n[STEP 6] Creating pod actions...")
    actions_data = [
        # Emma — overdue follow-up with Florida
        {"athlete": "athlete_1", "school": "University of Florida", "title": "Send follow-up email to Florida coaching staff", "status": "ready", "due": ago(5), "source": "manual"},
        {"athlete": "athlete_1", "school": "Stanford University", "title": "Prepare for Stanford campus visit", "status": "ready", "due": from_now(7), "source": "manual"},
        {"athlete": "athlete_1", "school": "Emory University", "title": "Re-engage with Emory — try different approach", "status": "ready", "due": ago(3), "source": "manual"},
        # Olivia — blocker-related actions
        {"athlete": "athlete_2", "school": "Duke University", "title": "Request transcript from high school counselor", "status": "ready", "due": ago(2), "source": "manual"},
        {"athlete": "athlete_2", "school": "Duke University", "title": "Follow up with Duke admissions on application status", "status": "ready", "due": from_now(3), "source": "manual"},
        # Marcus — overdue (momentum drop)
        {"athlete": "athlete_3", "school": "University of Michigan", "title": "Check in with Marcus about Michigan visit experience", "status": "ready", "due": ago(14), "source": "manual"},
        {"athlete": "athlete_3", "school": "Penn State University", "title": "Send updated highlight reel to Penn State", "status": "ready", "due": ago(10), "source": "manual"},
        # Sarah — early-stage actions
        {"athlete": "athlete_4", "school": "University of Texas", "title": "Research Texas volleyball program roster needs", "status": "ready", "due": from_now(5), "source": "manual"},
        # Lucas — completed + active actions (strong momentum)
        {"athlete": "athlete_5", "school": "University of Southern California", "title": "Review USC offer details with family", "status": "completed", "due": ago(3), "source": "manual"},
        {"athlete": "athlete_5", "school": "Pepperdine University", "title": "Schedule Pepperdine campus visit", "status": "completed", "due": ago(5), "source": "manual"},
        {"athlete": "athlete_5", "school": "University of Southern California", "title": "Respond to USC offer — discuss with family", "status": "ready", "due": from_now(5), "source": "manual"},
    ]
    for ad in actions_data:
        pid = program_map.get((ad["athlete"], ad["school"]))
        await db.pod_actions.insert_one({
            "id": uid(),
            "athlete_id": ad["athlete"],
            "program_id": pid,
            "school_name": ad["school"],
            "title": ad["title"],
            "owner": coach_name,
            "status": ad["status"],
            "due_date": ad["due"],
            "source": ad["source"],
            "source_category": "recruiting",
            "created_by": coach_name,
            "created_at": ago(10),
            "is_suggested": False,
            "completed_at": ago(3) if ad["status"] == "completed" else None,
        })
    print(f"  Created {len(actions_data)} actions")

    # ─── STEP 7: CREATE NOTES ────────────────────────────────────
    print("\n[STEP 7] Creating school-scoped notes...")
    notes_data = [
        {"athlete": "athlete_1", "school": "Stanford University", "text": "Stanford coach was very positive about Emma's serve receive skills at the showcase. They want to see her at the campus visit.", "tag": "Coach Note", "days": 3},
        {"athlete": "athlete_1", "school": "University of Florida", "text": "Left voicemail with Coach Mary Wise. No callback yet.", "tag": "Coach Note", "days": 18},
        {"athlete": "athlete_1", "school": "UCLA", "text": "UCLA assistant coach mentioned they're looking for OHs in the 2026 class. Good fit.", "tag": "Coach Note", "days": 5},
        {"athlete": "athlete_2", "school": "Duke University", "text": "Duke is very interested but needs the transcript before they can process the application.", "tag": "Coach Note", "days": 8},
        {"athlete": "athlete_2", "school": "University of North Carolina at Chapel Hill", "text": "Sent intro email. No response yet.", "tag": "Coach Note", "days": 15},
        {"athlete": "athlete_3", "school": "University of Michigan", "text": "Marcus had a great campus visit 3 weeks ago but hasn't followed up since.", "tag": "Coach Note", "days": 22},
        {"athlete": "athlete_3", "school": "Penn State University", "text": "Penn State coach asked for updated film. Marcus hasn't provided it.", "tag": "Coach Note", "days": 20},
        {"athlete": "athlete_5", "school": "University of Southern California", "text": "USC extended a full scholarship offer. Lucas and family are reviewing.", "tag": "Coach Note", "days": 2},
        {"athlete": "athlete_5", "school": "Pepperdine University", "text": "Pepperdine campus visit went great. Coach Wong was very impressed.", "tag": "Coach Note", "days": 4},
    ]
    for n in notes_data:
        pid = program_map.get((n["athlete"], n["school"]))
        await db.athlete_notes.insert_one({
            "id": uid(),
            "athlete_id": n["athlete"],
            "program_id": pid,
            "school_name": n["school"],
            "author": coach_name,
            "text": n["text"],
            "tag": n["tag"],
            "category": "recruiting",
            "created_at": ago(n["days"]),
        })
    print(f"  Created {len(notes_data)} notes")

    # ─── STEP 8: CREATE TIMELINE EVENTS ──────────────────────────
    print("\n[STEP 8] Creating timeline events...")
    events_data = [
        {"athlete": "athlete_1", "school": "Stanford University", "type": "email_sent", "text": "Sent follow-up email to Stanford after showcase", "days": 5},
        {"athlete": "athlete_1", "school": "Stanford University", "type": "email_received", "text": "Stanford coach replied — campus visit scheduled", "days": 3},
        {"athlete": "athlete_1", "school": "University of Florida", "type": "email_sent", "text": "Sent introduction email to Coach Mary Wise", "days": 30},
        {"athlete": "athlete_1", "school": "Emory University", "type": "email_sent", "text": "Sent introduction email to Emory coaching staff", "days": 25},
        {"athlete": "athlete_2", "school": "Duke University", "type": "email_received", "text": "Duke replied — interested, need transcript", "days": 8},
        {"athlete": "athlete_3", "school": "University of Michigan", "type": "campus_visit", "text": "Marcus visited Michigan campus", "days": 22},
        {"athlete": "athlete_5", "school": "University of Southern California", "type": "offer", "text": "USC extended full scholarship offer", "days": 2},
        {"athlete": "athlete_5", "school": "Pepperdine University", "type": "campus_visit", "text": "Campus visit at Pepperdine", "days": 4},
    ]
    for e in events_data:
        pid = program_map.get((e["athlete"], e["school"]))
        await db.pod_action_events.insert_one({
            "id": uid(),
            "athlete_id": e["athlete"],
            "program_id": pid,
            "event_type": e["type"],
            "type": e["type"],
            "description": e["text"],
            "text": e["text"],
            "author": coach_name,
            "actor": coach_name,
            "created_at": ago(e["days"]),
        })
    print(f"  Created {len(events_data)} timeline events")

    # ─── STEP 9: CREATE SUPPORT MESSAGES ─────────────────────────
    print("\n[STEP 9] Creating support messages...")
    messages = [
        {"athlete": "athlete_1", "subject": "Stanford Visit Details", "body": "Hi Emma! Great news — your Stanford campus visit is confirmed for next week. Please make sure you have your highlight reel updated.", "days": 3},
        {"athlete": "athlete_2", "subject": "Transcript Needed — Duke", "body": "Hi Olivia, Duke is very interested but they need your official transcript. Can you request it from your school counselor?", "days": 5},
        {"athlete": "athlete_3", "subject": "Check In — Michigan Follow-up", "body": "Hey Marcus, it's been 3 weeks since your Michigan visit. They're expecting to hear from you. Let's touch base this week.", "days": 7},
        {"athlete": "athlete_5", "subject": "Congrats on the USC Offer!", "body": "Lucas, congratulations on the USC offer! Take your time reviewing it with your family. Let me know if you have any questions.", "days": 2},
    ]
    for m in messages:
        thread_id = uid()
        msg_id = uid()
        await db.support_threads.insert_one({
            "id": thread_id,
            "athlete_id": m["athlete"],
            "subject": m["subject"],
            "last_message_at": ago(m["days"]),
            "created_by": coach_user_id,
            "created_at": ago(m["days"]),
        })
        await db.support_messages.insert_one({
            "id": msg_id,
            "thread_id": thread_id,
            "athlete_id": m["athlete"],
            "sender_id": coach_user_id,
            "sender_name": coach_name,
            "body": m["body"],
            "created_at": ago(m["days"]),
        })
    print(f"  Created {len(messages)} message threads")

    # ─── STEP 10: CREATE EVENTS IN DB ────────────────────────────
    print("\n[STEP 10] Creating events in database...")
    for event in EVENTS:
        event_doc = {**event}
        event_doc["date"] = (NOW + timedelta(days=event["daysAway"])).isoformat()
        event_doc["athleteCount"] = len(event["athlete_ids"])
        event_doc["capturedNotes"] = []  # Will not be stored; event_notes collection is used
        # Remove capturedNotes from the DB doc
        db_doc = {k: v for k, v in event_doc.items() if k != "capturedNotes"}
        await db.events.insert_one(db_doc)
        print(f"  Event: {event['name']} ({event['status']}, {len(event['athlete_ids'])} athletes)")
    print(f"  Created {len(EVENTS)} events")

    # ─── STEP 11: CREATE EVENT NOTES ─────────────────────────────
    print("\n[STEP 11] Creating event notes...")
    event_notes = [
        # Winter Showcase (past event) — notes from the event
        {"event": "event_0", "athlete": "athlete_5", "school": "Stanford University", "interest": "hot", "text": "Stanford coach was very impressed with Lucas's power serve. Wants to schedule a call.", "follow_ups": ["schedule_call"]},
        {"event": "event_0", "athlete": "athlete_5", "school": "University of Southern California", "interest": "hot", "text": "USC head coach personally approached Lucas after the match. Offer discussion started.", "follow_ups": ["schedule_call", "send_film"]},
        {"event": "event_0", "athlete": "athlete_3", "school": "University of Michigan", "interest": "warm", "text": "Michigan assistant coach liked Marcus's defensive play. Asked for updated film.", "follow_ups": ["send_film"]},
        {"event": "event_0", "athlete": "athlete_3", "school": "Ohio State University", "interest": "cool", "text": "Ohio State coach watched briefly. Seemed lukewarm.", "follow_ups": []},
        {"event": "event_0", "athlete": "athlete_1", "school": "Stanford University", "interest": "hot", "text": "Stanford head coach pulled Emma aside. Very interested in her for 2026 class.", "follow_ups": ["schedule_call", "send_film"]},
        {"event": "event_0", "athlete": "athlete_1", "school": "UCLA", "interest": "warm", "text": "UCLA assistant mentioned they need outside hitters. Good fit for Emma.", "follow_ups": ["schedule_call"]},
    ]
    for en in event_notes:
        a = next(x for x in ATHLETES if x["id"] == en["athlete"])
        pid = program_map.get((en["athlete"], en["school"]))
        await db.event_notes.insert_one({
            "id": uid(),
            "event_id": en["event"],
            "athlete_id": en["athlete"],
            "athlete_name": a["full_name"],
            "school_id": en["school"].lower().replace(" ", "_")[:20],
            "school_name": en["school"],
            "interest_level": en["interest"],
            "note_text": en["text"],
            "follow_ups": en["follow_ups"],
            "captured_by": coach_name,
            "captured_at": ago(6) if en["event"] == "event_0" else ago(1),
            "routed_to_pod": False,
            "routed_to_mc": False,
            "advocacy_candidate": en["interest"] in ("hot", "warm"),
            "program_id": pid,
        })
    print(f"  Created {len(event_notes)} event notes")

    # ─── SUMMARY ─────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("  SEED COMPLETE")
    print("=" * 60)
    print(f"  {len(ATHLETES)} athletes with user accounts")
    print(f"  {len(PROGRAMS)} programs (target schools)")
    print(f"  {len(actions_data)} pod actions")
    print(f"  {len(notes_data)} school-scoped notes")
    print(f"  {len(events_data)} timeline events")
    print(f"  {len(messages)} message threads")
    print(f"  {len(EVENTS)} events")
    print(f"  {len(event_notes)} event notes")
    print()
    print("  Test credentials:")
    print(f"  Coach: coach.williams@capymatch.com / coach123")
    for a in ATHLETES:
        print(f"  Athlete: {a['email']} / athlete123")
    print()
    print("  RESTART THE SERVER to load new data into memory.")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(seed())
