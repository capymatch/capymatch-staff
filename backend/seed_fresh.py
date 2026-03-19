"""
Comprehensive data seeder for CapyMatch.
Wipes all athlete/event/action data and creates a clean, interconnected dataset.
Covers ALL Risk Engine v3 scenarios:

Athlete Scenarios:
  1. Emma Chen       — Hot prospect, improving trajectory (recent actions taken)
  2. Olivia Anderson — Missing docs blocker (2025 grad, transcript missing)
  3. Marcus Johnson  — Gone dark, worsening (25d inactive, stalled at Campus Visit)
  4. Sarah Martinez  — Early stage, narrow list, profile incomplete
  5. Lucas Rodriguez — Healthy, strong momentum (has offer, all clear)
  6. Ava Thompson    — Escalation + awaiting reply (compound risk)
  7. Noah Davis      — Event blocker + missing docs (compound risk)
  8. Isabella Wilson — Awaiting reply + no activity (compound, worsening)
  9. Liam Moore      — No coach assigned + no activity (compound, worsening)
  10. Sophia Garcia  — Follow-up overdue + improving (recent action on stalled pipeline)

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
        "first_name": "Emma", "last_name": "Chen", "full_name": "Emma Chen",
        "email": "emma.chen@athlete.capymatch.com",
        "position": "Outside Hitter", "grad_year": 2026,
        "height": "5'10\"", "weight": "145", "city": "Miami", "state": "FL",
        "gpa": "3.8", "bio": "Passionate volleyball player with 5 years of club experience.",
        "video_link": "https://www.hudl.com/emmachen",
        "team": "U17 Premier", "high_school": "Miami Central HS",
        "photo_url": "", "jersey_number": "7",
        "sat_score": "1280", "act_score": "28",
        "approach_touch": "9'8\"", "block_touch": "9'2\"",
        "standing_reach": "7'10\"", "wingspan": "5'10\"",
        "archetype": "hot_prospect",
        "recruiting_stage": "actively_recruiting",
        "days_since_activity": 1,
    },
    {
        "id": "athlete_2",
        "first_name": "Olivia", "last_name": "Anderson", "full_name": "Olivia Anderson",
        "email": "olivia.anderson@athlete.capymatch.com",
        "position": "Setter", "grad_year": 2025,
        "height": "5'7\"", "weight": "", "city": "Portland", "state": "OR",
        "gpa": "3.5", "bio": "",
        "video_link": "", "team": "U18 Academy", "high_school": "",
        "photo_url": "", "jersey_number": "", "sat_score": "", "act_score": "",
        "approach_touch": "", "block_touch": "", "standing_reach": "", "wingspan": "",
        "archetype": "blocked_docs",
        "recruiting_stage": "actively_recruiting",
        "days_since_activity": 5,
    },
    {
        "id": "athlete_3",
        "first_name": "Marcus", "last_name": "Johnson", "full_name": "Marcus Johnson",
        "email": "marcus.johnson@athlete.capymatch.com",
        "position": "Libero", "grad_year": 2026,
        "height": "5'9\"", "weight": "155", "city": "Chicago", "state": "IL",
        "gpa": "3.2", "bio": "Defensive specialist. Led my team in digs last season.",
        "video_link": "https://www.hudl.com/marcusjohnson",
        "team": "U17 Premier", "high_school": "Lincoln Park HS",
        "photo_url": "", "jersey_number": "3",
        "sat_score": "1150", "act_score": "",
        "approach_touch": "", "block_touch": "", "standing_reach": "", "wingspan": "",
        "archetype": "gone_dark",
        "recruiting_stage": "actively_recruiting",
        "days_since_activity": 25,
    },
    {
        "id": "athlete_4",
        "first_name": "Sarah", "last_name": "Martinez", "full_name": "Sarah Martinez",
        "email": "sarah.martinez@athlete.capymatch.com",
        "position": "Middle Blocker", "grad_year": 2027,
        "height": "6'0\"", "weight": "160", "city": "Dallas", "state": "TX",
        "gpa": "3.9", "bio": "Tall and athletic. Just starting my recruiting journey.",
        "video_link": "", "team": "U16 Elite", "high_school": "Plano East HS",
        "photo_url": "", "jersey_number": "12",
        "sat_score": "", "act_score": "",
        "approach_touch": "10'0\"", "block_touch": "9'6\"",
        "standing_reach": "8'2\"", "wingspan": "6'1\"",
        "archetype": "narrow_list",
        "recruiting_stage": "exploring",
        "days_since_activity": 4,
    },
    {
        "id": "athlete_5",
        "first_name": "Lucas", "last_name": "Rodriguez", "full_name": "Lucas Rodriguez",
        "email": "lucas.rodriguez@athlete.capymatch.com",
        "position": "Opposite Hitter", "grad_year": 2025,
        "height": "6'3\"", "weight": "185", "city": "San Diego", "state": "CA",
        "gpa": "3.6", "bio": "Power hitter with a 95mph serve. National team experience.",
        "video_link": "https://www.hudl.com/lucasrodriguez",
        "team": "U18 Academy", "high_school": "Torrey Pines HS",
        "photo_url": "", "jersey_number": "9",
        "sat_score": "1350", "act_score": "30",
        "approach_touch": "11'2\"", "block_touch": "10'8\"",
        "standing_reach": "8'6\"", "wingspan": "6'5\"",
        "archetype": "healthy",
        "recruiting_stage": "narrowing",
        "days_since_activity": 0,
    },
    {
        "id": "athlete_6",
        "first_name": "Ava", "last_name": "Thompson", "full_name": "Ava Thompson",
        "email": "ava.thompson@athlete.capymatch.com",
        "position": "Outside Hitter", "grad_year": 2026,
        "height": "5'11\"", "weight": "148", "city": "Atlanta", "state": "GA",
        "gpa": "3.4", "bio": "Strong all-round player. Looking to play D1.",
        "video_link": "https://www.hudl.com/avathompson",
        "team": "U17 Premier", "high_school": "Brookwood HS",
        "photo_url": "", "jersey_number": "15",
        "sat_score": "1200", "act_score": "26",
        "approach_touch": "9'10\"", "block_touch": "9'4\"",
        "standing_reach": "7'11\"", "wingspan": "5'11\"",
        "archetype": "disengaging",
        "recruiting_stage": "actively_recruiting",
        "days_since_activity": 10,
    },
    {
        "id": "athlete_7",
        "first_name": "Noah", "last_name": "Davis", "full_name": "Noah Davis",
        "email": "noah.davis@athlete.capymatch.com",
        "position": "Setter", "grad_year": 2025,
        "height": "6'1\"", "weight": "170", "city": "Denver", "state": "CO",
        "gpa": "3.7", "bio": "Quick hands, strong court vision. Team captain.",
        "video_link": "",
        "team": "U18 Academy", "high_school": "Cherry Creek HS",
        "photo_url": "", "jersey_number": "1",
        "sat_score": "1300", "act_score": "29",
        "approach_touch": "", "block_touch": "", "standing_reach": "", "wingspan": "",
        "archetype": "blocked_materials",
        "recruiting_stage": "actively_recruiting",
        "days_since_activity": 3,
    },
    {
        "id": "athlete_8",
        "first_name": "Isabella", "last_name": "Wilson", "full_name": "Isabella Wilson",
        "email": "isabella.wilson@athlete.capymatch.com",
        "position": "Defensive Specialist", "grad_year": 2026,
        "height": "5'6\"", "weight": "130", "city": "Houston", "state": "TX",
        "gpa": "3.3", "bio": "Consistent passer. Looking for the right program fit.",
        "video_link": "https://www.hudl.com/isabellawilson",
        "team": "U17 Premier", "high_school": "Memorial HS",
        "photo_url": "", "jersey_number": "5",
        "sat_score": "1180", "act_score": "",
        "approach_touch": "", "block_touch": "", "standing_reach": "", "wingspan": "",
        "archetype": "disengaging",
        "recruiting_stage": "actively_recruiting",
        "days_since_activity": 18,
    },
    {
        "id": "athlete_9",
        "first_name": "Liam", "last_name": "Moore", "full_name": "Liam Moore",
        "email": "liam.moore@athlete.capymatch.com",
        "position": "Middle Blocker", "grad_year": 2026,
        "height": "6'4\"", "weight": "190", "city": "Seattle", "state": "WA",
        "gpa": "3.1", "bio": "Tall, athletic blocker with great timing at the net.",
        "video_link": "",
        "team": "U17 Premier", "high_school": "Garfield HS",
        "photo_url": "", "jersey_number": "10",
        "sat_score": "1100", "act_score": "",
        "approach_touch": "10'6\"", "block_touch": "10'0\"",
        "standing_reach": "8'4\"", "wingspan": "6'6\"",
        "archetype": "gone_dark",
        "recruiting_stage": "actively_recruiting",
        "days_since_activity": 16,
    },
    {
        "id": "athlete_10",
        "first_name": "Sophia", "last_name": "Garcia", "full_name": "Sophia Garcia",
        "email": "sophia.garcia@athlete.capymatch.com",
        "position": "Right Side Hitter", "grad_year": 2026,
        "height": "5'11\"", "weight": "152", "city": "Phoenix", "state": "AZ",
        "gpa": "3.6", "bio": "Versatile hitter with a strong block. Improving every season.",
        "video_link": "https://www.hudl.com/sophiagarcia",
        "team": "U17 Premier", "high_school": "Desert Vista HS",
        "photo_url": "", "jersey_number": "8",
        "sat_score": "1250", "act_score": "27",
        "approach_touch": "9'11\"", "block_touch": "9'5\"",
        "standing_reach": "8'0\"", "wingspan": "6'0\"",
        "archetype": "disengaging",
        "recruiting_stage": "actively_recruiting",
        "days_since_activity": 10,
    },
]

# ─── PROGRAMS (target schools per athlete) ──────────────────────
PROGRAMS = [
    # Emma Chen (athlete_1) — 5 schools, campus visit stage, active, IMPROVING
    {"athlete": "athlete_1", "school": "Stanford University", "status": "Campus Visit", "reply": "Reply Received", "priority": "Top Choice", "days_stale": 2, "days_overdue": 0, "last_follow_up_days": 2, "initial_contact_days": 45},
    {"athlete": "athlete_1", "school": "University of Florida", "status": "Interested", "reply": "Reply Received", "priority": "High", "days_stale": 4, "days_overdue": 0, "last_follow_up_days": 4, "initial_contact_days": 30},
    {"athlete": "athlete_1", "school": "Emory University", "status": "Initial Contact", "reply": "No Reply", "priority": "Medium", "days_stale": 8, "days_overdue": 2, "last_follow_up_days": 8, "initial_contact_days": 25},
    {"athlete": "athlete_1", "school": "UCLA", "status": "Prospect", "reply": "Reply Received", "priority": "High", "days_stale": 5, "days_overdue": 0, "last_follow_up_days": 5, "initial_contact_days": 40},
    {"athlete": "athlete_1", "school": "Creighton University", "status": "Not Contacted", "reply": "N/A", "priority": "Low", "days_stale": 0, "days_overdue": 0, "last_follow_up_days": 0, "initial_contact_days": 0},

    # Olivia Anderson (athlete_2) — 5 schools, MISSING DOCS BLOCKER
    {"athlete": "athlete_2", "school": "Duke University", "status": "Campus Visit", "reply": "Reply Received", "priority": "Top Choice", "days_stale": 5, "days_overdue": 2, "last_follow_up_days": 5, "initial_contact_days": 40},
    {"athlete": "athlete_2", "school": "University of Virginia", "status": "Engaged", "reply": "No Reply", "priority": "High", "days_stale": 10, "days_overdue": 4, "last_follow_up_days": 10, "initial_contact_days": 25},
    {"athlete": "athlete_2", "school": "University of North Carolina at Chapel Hill", "status": "Prospect", "reply": "No Reply", "priority": "High", "days_stale": 15, "days_overdue": 7, "last_follow_up_days": 15, "initial_contact_days": 15},
    {"athlete": "athlete_2", "school": "Georgetown University", "status": "Not Contacted", "reply": "N/A", "priority": "Medium", "days_stale": 0, "days_overdue": 0, "last_follow_up_days": 0, "initial_contact_days": 0},
    {"athlete": "athlete_2", "school": "Rice University", "status": "Not Contacted", "reply": "N/A", "priority": "Medium", "days_stale": 0, "days_overdue": 0, "last_follow_up_days": 0, "initial_contact_days": 0},

    # Marcus Johnson (athlete_3) — 4 schools, GONE DARK (25d inactive), high stage stalled
    {"athlete": "athlete_3", "school": "University of Michigan", "status": "Campus Visit", "reply": "Reply Received", "priority": "Top Choice", "days_stale": 25, "days_overdue": 14, "last_follow_up_days": 25, "initial_contact_days": 60},
    {"athlete": "athlete_3", "school": "Ohio State University", "status": "Initial Contact", "reply": "No Reply", "priority": "Medium", "days_stale": 22, "days_overdue": 12, "last_follow_up_days": 22, "initial_contact_days": 22},
    {"athlete": "athlete_3", "school": "Penn State University", "status": "Prospect", "reply": "No Reply", "priority": "High", "days_stale": 28, "days_overdue": 18, "last_follow_up_days": 28, "initial_contact_days": 40},
    {"athlete": "athlete_3", "school": "University of Wisconsin", "status": "Not Contacted", "reply": "N/A", "priority": "Low", "days_stale": 0, "days_overdue": 0, "last_follow_up_days": 0, "initial_contact_days": 0},

    # Sarah Martinez (athlete_4) — 3 schools, EXPLORING, NARROW LIST
    {"athlete": "athlete_4", "school": "University of Texas", "status": "Not Contacted", "reply": "N/A", "priority": "Top Choice", "days_stale": 0, "days_overdue": 0, "last_follow_up_days": 0, "initial_contact_days": 0},
    {"athlete": "athlete_4", "school": "Baylor University", "status": "Not Contacted", "reply": "N/A", "priority": "High", "days_stale": 0, "days_overdue": 0, "last_follow_up_days": 0, "initial_contact_days": 0},
    {"athlete": "athlete_4", "school": "University of Nebraska", "status": "Initial Contact", "reply": "No Reply", "priority": "Medium", "days_stale": 4, "days_overdue": 0, "last_follow_up_days": 4, "initial_contact_days": 4},

    # Lucas Rodriguez (athlete_5) — 4 schools, HEALTHY, HAS OFFER
    {"athlete": "athlete_5", "school": "University of Southern California", "status": "Offer", "reply": "Reply Received", "priority": "Top Choice", "days_stale": 0, "days_overdue": 0, "last_follow_up_days": 1, "initial_contact_days": 90},
    {"athlete": "athlete_5", "school": "Pepperdine University", "status": "Campus Visit", "reply": "Reply Received", "priority": "High", "days_stale": 1, "days_overdue": 0, "last_follow_up_days": 1, "initial_contact_days": 75},
    {"athlete": "athlete_5", "school": "Stanford University", "status": "Interested", "reply": "Reply Received", "priority": "High", "days_stale": 3, "days_overdue": 0, "last_follow_up_days": 3, "initial_contact_days": 50},
    {"athlete": "athlete_5", "school": "University of Oregon", "status": "Initial Contact", "reply": "Reply Received", "priority": "Medium", "days_stale": 5, "days_overdue": 0, "last_follow_up_days": 5, "initial_contact_days": 30},

    # Ava Thompson (athlete_6) — 4 schools, ESCALATION + AWAITING REPLY compound
    {"athlete": "athlete_6", "school": "University of Georgia", "status": "Engaged", "reply": "No Reply", "priority": "Top Choice", "days_stale": 10, "days_overdue": 5, "last_follow_up_days": 10, "initial_contact_days": 35},
    {"athlete": "athlete_6", "school": "Clemson University", "status": "Initial Contact", "reply": "No Reply", "priority": "High", "days_stale": 12, "days_overdue": 6, "last_follow_up_days": 12, "initial_contact_days": 20},
    {"athlete": "athlete_6", "school": "Auburn University", "status": "Prospect", "reply": "No Reply", "priority": "Medium", "days_stale": 8, "days_overdue": 3, "last_follow_up_days": 8, "initial_contact_days": 15},
    {"athlete": "athlete_6", "school": "University of Tennessee", "status": "Not Contacted", "reply": "N/A", "priority": "Low", "days_stale": 0, "days_overdue": 0, "last_follow_up_days": 0, "initial_contact_days": 0},

    # Noah Davis (athlete_7) — 4 schools, EVENT BLOCKER + MISSING DOCS compound
    {"athlete": "athlete_7", "school": "University of Colorado", "status": "Interested", "reply": "Reply Received", "priority": "Top Choice", "days_stale": 3, "days_overdue": 0, "last_follow_up_days": 3, "initial_contact_days": 45},
    {"athlete": "athlete_7", "school": "University of Utah", "status": "Initial Contact", "reply": "No Reply", "priority": "High", "days_stale": 8, "days_overdue": 3, "last_follow_up_days": 8, "initial_contact_days": 20},
    {"athlete": "athlete_7", "school": "Colorado State University", "status": "Prospect", "reply": "No Reply", "priority": "Medium", "days_stale": 6, "days_overdue": 1, "last_follow_up_days": 6, "initial_contact_days": 12},
    {"athlete": "athlete_7", "school": "Arizona State University", "status": "Not Contacted", "reply": "N/A", "priority": "Low", "days_stale": 0, "days_overdue": 0, "last_follow_up_days": 0, "initial_contact_days": 0},

    # Isabella Wilson (athlete_8) — 4 schools, AWAITING REPLY + NO ACTIVITY compound (18d inactive)
    {"athlete": "athlete_8", "school": "Texas A&M University", "status": "Engaged", "reply": "No Reply", "priority": "Top Choice", "days_stale": 18, "days_overdue": 10, "last_follow_up_days": 18, "initial_contact_days": 30},
    {"athlete": "athlete_8", "school": "Louisiana State University", "status": "Initial Contact", "reply": "No Reply", "priority": "High", "days_stale": 18, "days_overdue": 8, "last_follow_up_days": 18, "initial_contact_days": 20},
    {"athlete": "athlete_8", "school": "University of Alabama", "status": "Prospect", "reply": "No Reply", "priority": "Medium", "days_stale": 15, "days_overdue": 5, "last_follow_up_days": 15, "initial_contact_days": 15},
    {"athlete": "athlete_8", "school": "University of Mississippi", "status": "Not Contacted", "reply": "N/A", "priority": "Low", "days_stale": 0, "days_overdue": 0, "last_follow_up_days": 0, "initial_contact_days": 0},

    # Liam Moore (athlete_9) — 3 schools, NO COACH + NO ACTIVITY compound (16d inactive, no coach)
    {"athlete": "athlete_9", "school": "University of Washington", "status": "Interested", "reply": "Reply Received", "priority": "Top Choice", "days_stale": 16, "days_overdue": 8, "last_follow_up_days": 16, "initial_contact_days": 35},
    {"athlete": "athlete_9", "school": "Oregon State University", "status": "Initial Contact", "reply": "No Reply", "priority": "High", "days_stale": 14, "days_overdue": 6, "last_follow_up_days": 14, "initial_contact_days": 18},
    {"athlete": "athlete_9", "school": "Washington State University", "status": "Prospect", "reply": "No Reply", "priority": "Medium", "days_stale": 12, "days_overdue": 4, "last_follow_up_days": 12, "initial_contact_days": 12},

    # Sophia Garcia (athlete_10) — 4 schools, FOLLOW-UP + NO ACTIVITY but IMPROVING (recent action)
    {"athlete": "athlete_10", "school": "Arizona State University", "status": "Engaged", "reply": "Reply Received", "priority": "Top Choice", "days_stale": 10, "days_overdue": 4, "last_follow_up_days": 10, "initial_contact_days": 40},
    {"athlete": "athlete_10", "school": "University of Arizona", "status": "Initial Contact", "reply": "No Reply", "priority": "High", "days_stale": 12, "days_overdue": 5, "last_follow_up_days": 12, "initial_contact_days": 20},
    {"athlete": "athlete_10", "school": "San Diego State University", "status": "Prospect", "reply": "No Reply", "priority": "Medium", "days_stale": 8, "days_overdue": 2, "last_follow_up_days": 8, "initial_contact_days": 15},
    {"athlete": "athlete_10", "school": "University of Nevada", "status": "Not Contacted", "reply": "N/A", "priority": "Low", "days_stale": 0, "days_overdue": 0, "last_follow_up_days": 0, "initial_contact_days": 0},
]

# ─── EVENTS ─────────────────────────────────────────────────────
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
            {"id": "check_4", "label": "Prepare talking points", "completed": True},
            {"id": "check_5", "label": "Confirm travel/logistics", "completed": True},
        ],
        "summaryStatus": "pending",
    },
    {
        "id": "event_1",
        "name": "College Exposure Camp",
        "type": "camp",
        "daysAway": 2,
        "location": "Irvine, CA",
        "expectedSchools": 8,
        "prepStatus": "in_progress",
        "status": "upcoming",
        "athlete_ids": ["athlete_1", "athlete_2", "athlete_7"],
        "school_ids": ["ucla", "stanford", "usc", "virginia", "duke", "colorado", "utah", "arizona_state"],
        "checklist": [
            {"id": "check_1", "label": "Confirm athlete attendance", "completed": True},
            {"id": "check_2", "label": "Identify target school coaches attending", "completed": True},
            {"id": "check_3", "label": "Review highlight reels", "completed": False},
            {"id": "check_4", "label": "Prepare talking points", "completed": False},
            {"id": "check_5", "label": "Confirm travel/logistics", "completed": False},
        ],
        "summaryStatus": None,
    },
    {
        "id": "event_2",
        "name": "Spring Classic",
        "type": "tournament",
        "daysAway": 12,
        "location": "Las Vegas, NV",
        "expectedSchools": 10,
        "prepStatus": "not_started",
        "status": "upcoming",
        "athlete_ids": ["athlete_1", "athlete_5", "athlete_6", "athlete_10"],
        "school_ids": ["duke", "unc", "georgetown", "usc", "pepperdine", "georgia", "clemson", "arizona_state"],
        "checklist": [
            {"id": "check_1", "label": "Confirm athlete attendance", "completed": False},
            {"id": "check_2", "label": "Identify target school coaches attending", "completed": False},
            {"id": "check_3", "label": "Review highlight reels", "completed": False},
            {"id": "check_4", "label": "Prepare talking points", "completed": False},
            {"id": "check_5", "label": "Confirm travel/logistics", "completed": False},
        ],
        "summaryStatus": None,
    },
]


async def seed():
    print("=" * 60)
    print("  CAPYMATCH — COMPREHENSIVE DATA SEEDER (v2)")
    print("  Covers all Risk Engine v3 scenarios")
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
        "director_actions", "autopilot_log",
        "email_tracking", "college_coaches",
        "subscriptions",
    ]
    for c in collections_to_clear:
        r = await db[c].delete_many({})
        if r.deleted_count > 0:
            print(f"  Cleared {c}: {r.deleted_count}")

    await db.users.delete_many({"role": "athlete"})
    print("  Cleared athlete user accounts")

    # Find coach users
    coach_williams = await db.users.find_one(
        {"email": "coach.williams@capymatch.com"}, {"_id": 0, "id": 1, "name": 1}
    )
    coach_garcia = await db.users.find_one(
        {"email": "coach.garcia@capymatch.com"}, {"_id": 0, "id": 1, "name": 1}
    )
    if not coach_williams:
        coach_williams = {"id": "coach-williams", "name": "Coach Williams"}
    if not coach_garcia:
        coach_garcia = {"id": "coach-garcia", "name": "Coach Garcia"}

    print(f"  Coach 1: {coach_williams['name']} ({coach_williams['id']})")
    print(f"  Coach 2: {coach_garcia['name']} ({coach_garcia['id']})")

    # Coach assignment map — split across coaches, athlete_9 gets NO coach
    coach_map = {
        "athlete_1": coach_williams,
        "athlete_2": coach_williams,
        "athlete_3": coach_williams,
        "athlete_4": coach_garcia,
        "athlete_5": coach_garcia,
        "athlete_6": coach_williams,
        "athlete_7": coach_garcia,
        "athlete_8": coach_garcia,
        "athlete_9": None,  # NO COACH — triggers no_coach_assigned signal
        "athlete_10": coach_williams,
    }

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
        print(f"  {a['full_name']} ({a['email']})")

    # ─── STEP 2: CREATE ATHLETE PROFILES ─────────────────────────
    print("\n[STEP 2] Creating athlete profiles...")
    athlete_school_counts = {}
    athlete_reply_counts = {}
    for p in PROGRAMS:
        aid = p["athlete"]
        athlete_school_counts[aid] = athlete_school_counts.get(aid, 0) + 1
        if p["reply"] == "Reply Received":
            athlete_reply_counts[aid] = athlete_reply_counts.get(aid, 0) + 1

    for a in ATHLETES:
        days = a["days_since_activity"]
        if days <= 3:
            momentum_score = max(6, 10 - days)
            momentum_trend = "rising"
        elif days <= 14:
            momentum_score = max(2, 7 - days)
            momentum_trend = "stable"
        else:
            momentum_score = max(-5, -days // 5)
            momentum_trend = "declining"

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
        doc["created_at"] = ago(60)
        doc["updated_at"] = ago(0)
        doc["phone"] = ""

        coach = coach_map.get(a["id"])
        doc["primary_coach_id"] = coach["id"] if coach else None

        # Missing documents / profile completeness
        missing_doc_map = {
            "athlete_2": ["official_transcript"],           # Olivia — blocker
            "athlete_7": ["highlight_reel", "test_scores"], # Noah — missing materials
        }
        incomplete_profiles = {"athlete_2", "athlete_4", "athlete_7", "athlete_9"}

        doc["missing_documents"] = missing_doc_map.get(a["id"], [])
        doc["profile_complete"] = a["id"] not in incomplete_profiles

        # Recruiting profile (marks onboarding as done)
        doc["recruiting_profile"] = {
            "position": [a["position"]],
            "division": ["D1"],
            "priorities": ["coaching_style", "academic_reputation"],
            "regions": [a["state"]],
            "gpa": a["gpa"],
        }

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
    program_map = {}
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
            "division": "", "conference": "", "region": "",
            "recruiting_status": p["status"],
            "reply_status": p["reply"],
            "priority": p["priority"],
            "next_action": next_action,
            "next_action_due": next_due,
            "initial_contact_sent": initial,
            "last_follow_up": last_fu,
            "stage_entered_at": ago(p.get("days_stale", 7)),
            "notes": "",
            "org_id": DEFAULT_ORG_ID,
            "created_at": ago(90),
            "updated_at": ago(p["days_stale"]),
        }
        kb = await db.university_knowledge_base.find_one(
            {"university_name": p["school"]}, {"_id": 0}
        )
        if kb:
            doc["division"] = kb.get("division", "")
            doc["conference"] = kb.get("conference", "")
            doc["region"] = kb.get("region", "")

        await db.programs.insert_one(doc)
        program_map[(p["athlete"], p["school"])] = pid
        print(f"  {a['full_name']} -> {p['school']} ({p['status']})")

    # ─── STEP 5: CREATE PROGRAM METRICS ──────────────────────────
    print("\n[STEP 5] Creating program metrics...")
    for p in PROGRAMS:
        pid = program_map[(p["athlete"], p["school"])]
        a = next(x for x in ATHLETES if x["id"] == p["athlete"])

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
    cw_name = coach_williams["name"]
    cg_name = coach_garcia["name"]
    actions_data = [
        # Emma (athlete_1) — one overdue, one upcoming, one completed recently
        {"athlete": "athlete_1", "school": "Emory University", "title": "Follow up with Emory coaching staff", "status": "ready", "due": ago(2), "source": "manual", "owner": cw_name},
        {"athlete": "athlete_1", "school": "Stanford University", "title": "Prepare for Stanford campus visit", "status": "ready", "due": from_now(5), "source": "manual", "owner": cw_name},
        {"athlete": "athlete_1", "school": "University of Florida", "title": "Send thank-you note to Florida coach", "status": "completed", "due": ago(1), "source": "manual", "owner": cw_name},

        # Olivia (athlete_2) — blocker-related overdue actions
        {"athlete": "athlete_2", "school": "Duke University", "title": "Request transcript from high school counselor", "status": "ready", "due": ago(5), "source": "manual", "owner": cw_name},
        {"athlete": "athlete_2", "school": "University of Virginia", "title": "Follow up with UVA on application requirements", "status": "ready", "due": ago(3), "source": "manual", "owner": cw_name},
        {"athlete": "athlete_2", "school": "Duke University", "title": "Confirm Duke campus visit date", "status": "ready", "due": from_now(3), "source": "manual", "owner": cw_name},

        # Marcus (athlete_3) — long overdue actions (gone dark)
        {"athlete": "athlete_3", "school": "University of Michigan", "title": "Check in with Marcus about Michigan visit follow-up", "status": "ready", "due": ago(19), "source": "manual", "owner": cw_name},
        {"athlete": "athlete_3", "school": "Penn State University", "title": "Send updated highlight reel to Penn State", "status": "ready", "due": ago(14), "source": "manual", "owner": cw_name},

        # Sarah (athlete_4) — early stage
        {"athlete": "athlete_4", "school": "University of Texas", "title": "Research Texas volleyball program roster needs", "status": "ready", "due": from_now(5), "source": "manual", "owner": cg_name},

        # Lucas (athlete_5) — completed actions (healthy)
        {"athlete": "athlete_5", "school": "University of Southern California", "title": "Review USC offer details with family", "status": "completed", "due": ago(3), "source": "manual", "owner": cg_name},
        {"athlete": "athlete_5", "school": "Pepperdine University", "title": "Schedule Pepperdine campus visit", "status": "completed", "due": ago(5), "source": "manual", "owner": cg_name},
        {"athlete": "athlete_5", "school": "University of Southern California", "title": "Respond to USC offer — discuss with family", "status": "ready", "due": from_now(5), "source": "manual", "owner": cg_name},

        # Ava (athlete_6) — overdue actions (escalation scenario)
        {"athlete": "athlete_6", "school": "University of Georgia", "title": "Re-engage with UGA coach after silence", "status": "ready", "due": ago(5), "source": "manual", "owner": cw_name},
        {"athlete": "athlete_6", "school": "Clemson University", "title": "Send follow-up email to Clemson", "status": "ready", "due": ago(4), "source": "manual", "owner": cw_name},

        # Noah (athlete_7) — event-related actions overdue
        {"athlete": "athlete_7", "school": "University of Colorado", "title": "Prepare talking points for Colorado coach meeting at camp", "status": "ready", "due": ago(1), "source": "manual", "owner": cg_name},
        {"athlete": "athlete_7", "school": "University of Utah", "title": "Send highlight reel to Utah ahead of camp", "status": "ready", "due": ago(2), "source": "manual", "owner": cg_name},

        # Isabella (athlete_8) — overdue follow-ups (inactive)
        {"athlete": "athlete_8", "school": "Texas A&M University", "title": "Follow up with Texas A&M — no reply in 18 days", "status": "ready", "due": ago(10), "source": "manual", "owner": cg_name},
        {"athlete": "athlete_8", "school": "Louisiana State University", "title": "Re-engage with LSU coaching staff", "status": "ready", "due": ago(8), "source": "manual", "owner": cg_name},

        # Liam (athlete_9) — unassigned actions (no coach)
        {"athlete": "athlete_9", "school": "University of Washington", "title": "Follow up with UW about recruiting interest", "status": "ready", "due": ago(8), "source": "manual", "owner": ""},
        {"athlete": "athlete_9", "school": "Oregon State University", "title": "Send film to Oregon State coach", "status": "ready", "due": ago(6), "source": "manual", "owner": ""},

        # Sophia (athlete_10) — one overdue but recent action taken
        {"athlete": "athlete_10", "school": "Arizona State University", "title": "Follow up with ASU after coach meeting", "status": "ready", "due": ago(4), "source": "manual", "owner": cw_name},
        {"athlete": "athlete_10", "school": "University of Arizona", "title": "Send intro email to UA coaching staff", "status": "ready", "due": ago(2), "source": "manual", "owner": cw_name},
    ]
    for ad in actions_data:
        pid = program_map.get((ad["athlete"], ad["school"]))
        await db.pod_actions.insert_one({
            "id": uid(),
            "athlete_id": ad["athlete"],
            "program_id": pid,
            "school_name": ad["school"],
            "title": ad["title"],
            "owner": ad["owner"],
            "status": ad["status"],
            "due_date": ad["due"],
            "source": ad["source"],
            "source_category": "recruiting",
            "created_by": ad["owner"] or "System",
            "created_at": ago(10),
            "is_suggested": False,
            "completed_at": ago(3) if ad["status"] == "completed" else None,
        })
    print(f"  Created {len(actions_data)} actions")

    # ─── STEP 7: CREATE ESCALATIONS (director_actions) ───────────
    print("\n[STEP 7] Creating escalations...")
    escalations = [
        # Ava (athlete_6) — Coach Williams escalated a communication issue
        {
            "action_id": f"da_{uid()[:12]}",
            "type": "coach_escalation",
            "status": "open",
            "coach_id": coach_williams["id"],
            "coach_name": coach_williams["name"],
            "athlete_id": "athlete_6",
            "athlete_name": "Ava Thompson",
            "school_name": "University of Georgia",
            "org_id": DEFAULT_ORG_ID,
            "reason": "needs_intervention",
            "reason_label": "[University of Georgia] Coach escalation: Communication issue",
            "note": "UGA coach hasn't responded to multiple outreach attempts. Ava is losing interest. Need director to use their network.",
            "primary_risk": "Communication issue",
            "why_now": "Engagement dropping with top choice school",
            "urgency": "high",
            "source": "coach_escalation",
            "created_at": ago(3),
            "acknowledged_at": None,
            "resolved_at": None,
        },
        # Marcus (athlete_3) — Coach Williams escalated his inactivity
        {
            "action_id": f"da_{uid()[:12]}",
            "type": "coach_escalation",
            "status": "open",
            "coach_id": coach_williams["id"],
            "coach_name": coach_williams["name"],
            "athlete_id": "athlete_3",
            "athlete_name": "Marcus Johnson",
            "school_name": "University of Michigan",
            "org_id": DEFAULT_ORG_ID,
            "reason": "needs_intervention",
            "reason_label": "[University of Michigan] Coach escalation: Athlete gone dark",
            "note": "Marcus hasn't responded to any outreach in 25 days. Michigan is his top choice and the window is closing.",
            "primary_risk": "Athlete gone dark",
            "why_now": "25 days of silence, Michigan relationship at risk",
            "urgency": "high",
            "source": "coach_escalation",
            "created_at": ago(5),
            "acknowledged_at": None,
            "resolved_at": None,
        },
    ]
    for e in escalations:
        await db.director_actions.insert_one(e)
    print(f"  Created {len(escalations)} escalations")

    # ─── STEP 8: CREATE AUTOPILOT LOG (for trajectory: improving) ─
    print("\n[STEP 8] Creating autopilot log entries (for improving trajectories)...")
    autopilot_entries = [
        # Emma (athlete_1) — recent action → trajectory should be improving
        {"athlete_id": "athlete_1", "action_type": "follow_up_sent", "school_name": "Stanford University", "executed_at": ago(0, 8), "description": "Auto follow-up sent to Stanford coaching staff"},
        # Sophia (athlete_10) — recent action → trajectory should be improving
        {"athlete_id": "athlete_10", "action_type": "follow_up_sent", "school_name": "Arizona State University", "executed_at": ago(1), "description": "Follow-up sent to ASU after meeting"},
        {"athlete_id": "athlete_10", "action_type": "check_in", "school_name": "", "executed_at": ago(0, 12), "description": "Coach check-in with Sophia"},
    ]
    for ae in autopilot_entries:
        await db.autopilot_log.insert_one({
            "id": uid(),
            **ae,
        })
    print(f"  Created {len(autopilot_entries)} autopilot log entries")

    # ─── STEP 9: CREATE RECOMMENDATIONS (advocacy) ───────────────
    print("\n[STEP 9] Creating recommendations...")
    recommendations = [
        # Marcus → Michigan — warm response
        {
            "id": "rec_1",
            "athlete_id": "athlete_3", "athlete_name": "Marcus Johnson",
            "school_id": "michigan", "school_name": "Michigan",
            "college_coach_name": "Coach Thompson",
            "status": "warm_response",
            "fit_reasons": ["athletic_ability", "program_need_match"],
            "fit_note": "Elite defensive skills, strong fit for Michigan's system",
            "fit_summary": "Defensive specialist, campus visit candidate",
            "supporting_event_notes": [],
            "intro_message": "Coach Thompson, I wanted to personally recommend Marcus Johnson from our program.",
            "desired_next_step": "review_film",
            "created_by": cw_name,
            "created_at": ago(8),
            "sent_at": ago(6),
            "response_status": "warm",
            "response_note": "Michigan coach wants to see spring tape.",
            "response_at": ago(2),
            "follow_up_count": 0, "last_follow_up_at": None,
            "closed_at": None, "closed_reason": None,
            "response_history": [
                {"type": "sent", "date": ago(6), "text": "Recommendation sent to Michigan"},
                {"type": "response", "date": ago(2), "text": "Michigan coach wants spring tape"},
            ],
        },
        # Olivia → Stanford — awaiting reply (5+ days → appears in inbox)
        {
            "id": "rec_2",
            "athlete_id": "athlete_2", "athlete_name": "Olivia Anderson",
            "school_id": "stanford", "school_name": "Stanford",
            "college_coach_name": "Coach Williams",
            "status": "awaiting_reply",
            "fit_reasons": ["athletic_ability", "academic_fit"],
            "fit_note": "Olivia combines elite defensive instincts with strong GPA",
            "fit_summary": "Academic + athletic fit",
            "supporting_event_notes": [],
            "intro_message": "Coach Williams, after your staff showed interest in Olivia at the showcase, I wanted to follow up.",
            "desired_next_step": "schedule_call",
            "created_by": cw_name,
            "created_at": ago(8),
            "sent_at": ago(7),
            "response_status": None, "response_note": None, "response_at": None,
            "follow_up_count": 1, "last_follow_up_at": ago(3),
            "closed_at": None, "closed_reason": None,
            "response_history": [
                {"type": "sent", "date": ago(7), "text": "Recommendation sent to Stanford"},
                {"type": "follow_up", "date": ago(3), "text": "No response after 4 days -- follow-up sent"},
            ],
        },
        # Lucas → Pepperdine — closed (positive outcome)
        {
            "id": "rec_3",
            "athlete_id": "athlete_5", "athlete_name": "Lucas Rodriguez",
            "school_id": "pepperdine", "school_name": "Pepperdine",
            "college_coach_name": "Coach Wong",
            "status": "closed",
            "fit_reasons": ["athletic_ability", "campus_culture"],
            "fit_note": "Lucas's power hitting would strengthen Pepperdine's offense",
            "fit_summary": "Power hitter, great campus fit",
            "supporting_event_notes": [],
            "intro_message": "Coach Wong, I wanted to share my strong recommendation for Lucas Rodriguez.",
            "desired_next_step": "campus_visit",
            "created_by": cg_name,
            "created_at": ago(10),
            "sent_at": ago(8),
            "response_status": "warm",
            "response_note": "Pepperdine wants to schedule a campus visit.",
            "response_at": ago(4),
            "follow_up_count": 1, "last_follow_up_at": ago(2),
            "closed_at": ago(1), "closed_reason": "positive_outcome",
            "response_history": [
                {"type": "sent", "date": ago(8), "text": "Recommendation sent to Pepperdine"},
                {"type": "response", "date": ago(4), "text": "Pepperdine wants campus visit"},
                {"type": "closed", "date": ago(1), "text": "Closed — campus visit scheduled"},
            ],
        },
        # Ava → Clemson — awaiting reply (escalation scenario)
        {
            "id": "rec_4",
            "athlete_id": "athlete_6", "athlete_name": "Ava Thompson",
            "school_id": "clemson", "school_name": "Clemson",
            "college_coach_name": "Coach Davis",
            "status": "awaiting_reply",
            "fit_reasons": ["athletic_ability", "geographic_fit"],
            "fit_note": "Strong all-round player, perfect fit for SEC program",
            "fit_summary": "Versatile outside hitter",
            "supporting_event_notes": [],
            "intro_message": "Coach Davis, I'd like to recommend Ava Thompson.",
            "desired_next_step": "evaluation",
            "created_by": cw_name,
            "created_at": ago(10),
            "sent_at": ago(8),
            "response_status": None, "response_note": None, "response_at": None,
            "follow_up_count": 1, "last_follow_up_at": ago(3),
            "closed_at": None, "closed_reason": None,
            "response_history": [
                {"type": "sent", "date": ago(8), "text": "Recommendation sent to Clemson"},
                {"type": "follow_up", "date": ago(3), "text": "No response -- follow-up sent"},
            ],
        },
    ]
    for r in recommendations:
        await db.recommendations.insert_one({**r})
    print(f"  Created {len(recommendations)} recommendations")

    # ─── STEP 10: CREATE NOTES ───────────────────────────────────
    print("\n[STEP 10] Creating school-scoped notes...")
    notes_data = [
        {"athlete": "athlete_1", "school": "Stanford University", "text": "Stanford coach was very positive about Emma's serve receive skills at the showcase.", "tag": "Coach Note", "days": 3, "author": cw_name},
        {"athlete": "athlete_1", "school": "University of Florida", "text": "Florida coach liked Emma's film. Invited to unofficial visit.", "tag": "Coach Note", "days": 5, "author": cw_name},
        {"athlete": "athlete_2", "school": "Duke University", "text": "Duke is very interested but needs the transcript before they can process the application.", "tag": "Coach Note", "days": 8, "author": cw_name},
        {"athlete": "athlete_3", "school": "University of Michigan", "text": "Marcus had a great campus visit 4 weeks ago but hasn't followed up since. Michigan staff getting concerned.", "tag": "Coach Note", "days": 22, "author": cw_name},
        {"athlete": "athlete_5", "school": "University of Southern California", "text": "USC extended a full scholarship offer. Lucas and family are reviewing.", "tag": "Coach Note", "days": 2, "author": cg_name},
        {"athlete": "athlete_6", "school": "University of Georgia", "text": "UGA coach hasn't responded to 3 outreach attempts. Escalated to director.", "tag": "Coach Note", "days": 3, "author": cw_name},
        {"athlete": "athlete_8", "school": "Texas A&M University", "text": "Sent intro email 18 days ago. No response from A&M. Isabella is getting discouraged.", "tag": "Coach Note", "days": 18, "author": cg_name},
        {"athlete": "athlete_9", "school": "University of Washington", "text": "UW coach expressed interest. Liam needs a coach assigned to manage this.", "tag": "Coach Note", "days": 14, "author": cg_name},
        {"athlete": "athlete_10", "school": "Arizona State University", "text": "Had a productive call with ASU coach yesterday. They want to see Sophia at the spring showcase.", "tag": "Coach Note", "days": 1, "author": cw_name},
    ]
    for n in notes_data:
        pid = program_map.get((n["athlete"], n["school"]))
        await db.athlete_notes.insert_one({
            "id": uid(),
            "athlete_id": n["athlete"],
            "program_id": pid,
            "school_name": n["school"],
            "author": n["author"],
            "text": n["text"],
            "tag": n["tag"],
            "category": "recruiting",
            "created_at": ago(n["days"]),
        })
    print(f"  Created {len(notes_data)} notes")

    # ─── STEP 11: CREATE TIMELINE EVENTS ─────────────────────────
    print("\n[STEP 11] Creating timeline events...")
    events_data = [
        {"athlete": "athlete_1", "school": "Stanford University", "type": "email_sent", "text": "Sent follow-up email to Stanford after showcase", "days": 5},
        {"athlete": "athlete_1", "school": "Stanford University", "type": "email_received", "text": "Stanford coach replied — campus visit scheduled", "days": 3},
        {"athlete": "athlete_2", "school": "Duke University", "type": "email_received", "text": "Duke replied — interested, need transcript", "days": 8},
        {"athlete": "athlete_3", "school": "University of Michigan", "type": "campus_visit", "text": "Marcus visited Michigan campus", "days": 25},
        {"athlete": "athlete_5", "school": "University of Southern California", "type": "offer", "text": "USC extended full scholarship offer", "days": 2},
        {"athlete": "athlete_5", "school": "Pepperdine University", "type": "campus_visit", "text": "Campus visit at Pepperdine", "days": 4},
        {"athlete": "athlete_6", "school": "University of Georgia", "type": "email_sent", "text": "Sent 3rd follow-up to UGA coach", "days": 3},
        {"athlete": "athlete_8", "school": "Texas A&M University", "type": "email_sent", "text": "Sent introduction email to A&M coach", "days": 18},
        {"athlete": "athlete_10", "school": "Arizona State University", "type": "phone_call", "text": "Call with ASU coach — positive interest", "days": 1},
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
            "author": cw_name,
            "actor": cw_name,
            "created_at": ago(e["days"]),
        })
    print(f"  Created {len(events_data)} timeline events")

    # ─── STEP 12: CREATE SUPPORT MESSAGES ────────────────────────
    print("\n[STEP 12] Creating support messages...")
    messages = [
        {"athlete": "athlete_1", "subject": "Stanford Visit Details", "body": "Hi Emma! Great news -- your Stanford campus visit is confirmed. Make sure your highlight reel is updated.", "days": 3, "coach": coach_williams},
        {"athlete": "athlete_2", "subject": "Transcript Needed -- Duke", "body": "Hi Olivia, Duke needs your official transcript. Can you request it from your school counselor?", "days": 5, "coach": coach_williams},
        {"athlete": "athlete_3", "subject": "Check In -- Michigan Follow-up", "body": "Hey Marcus, it's been 3 weeks since your Michigan visit. They're expecting to hear from you.", "days": 7, "coach": coach_williams},
        {"athlete": "athlete_5", "subject": "Congrats on the USC Offer!", "body": "Lucas, congratulations on the USC offer! Take your time reviewing it with your family.", "days": 2, "coach": coach_garcia},
        {"athlete": "athlete_6", "subject": "UGA Situation Update", "body": "Ava, I've escalated the Georgia communication issue to our director. We'll get this sorted.", "days": 2, "coach": coach_williams},
        {"athlete": "athlete_9", "subject": "Welcome to CapyMatch", "body": "Hi Liam, we're working on getting you a dedicated coach. In the meantime, keep your profile updated.", "days": 10, "coach": coach_garcia},
    ]
    for m in messages:
        thread_id = uid()
        msg_id = uid()
        await db.support_threads.insert_one({
            "id": thread_id,
            "athlete_id": m["athlete"],
            "subject": m["subject"],
            "last_message_at": ago(m["days"]),
            "created_by": m["coach"]["id"],
            "created_at": ago(m["days"]),
        })
        await db.support_messages.insert_one({
            "id": msg_id,
            "thread_id": thread_id,
            "athlete_id": m["athlete"],
            "sender_id": m["coach"]["id"],
            "sender_name": m["coach"]["name"],
            "body": m["body"],
            "created_at": ago(m["days"]),
        })
    print(f"  Created {len(messages)} message threads")

    # ─── STEP 13: CREATE EVENTS IN DB ────────────────────────────
    print("\n[STEP 13] Creating events...")
    for event in EVENTS:
        db_doc = {**event}
        db_doc["date"] = (NOW + timedelta(days=event["daysAway"])).isoformat()
        db_doc["athleteCount"] = len(event["athlete_ids"])
        db_doc.pop("capturedNotes", None)
        await db.events.insert_one(db_doc)
        print(f"  Event: {event['name']} ({event['status']}, {len(event['athlete_ids'])} athletes)")
    print(f"  Created {len(EVENTS)} events")

    # ─── STEP 14: CREATE EVENT NOTES ─────────────────────────────
    print("\n[STEP 14] Creating event notes...")
    event_notes = [
        {"event": "event_0", "athlete": "athlete_5", "school": "Stanford University", "interest": "hot", "text": "Stanford coach was very impressed with Lucas's power serve.", "follow_ups": ["schedule_call"]},
        {"event": "event_0", "athlete": "athlete_5", "school": "University of Southern California", "interest": "hot", "text": "USC head coach personally approached Lucas after the match.", "follow_ups": ["schedule_call", "send_film"]},
        {"event": "event_0", "athlete": "athlete_3", "school": "University of Michigan", "interest": "warm", "text": "Michigan assistant coach liked Marcus's defensive play. Asked for updated film.", "follow_ups": ["send_film"]},
        {"event": "event_0", "athlete": "athlete_1", "school": "Stanford University", "interest": "hot", "text": "Stanford head coach pulled Emma aside. Very interested.", "follow_ups": ["schedule_call", "send_film"]},
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
            "captured_by": cw_name,
            "captured_at": ago(6),
            "routed_to_pod": False,
            "routed_to_mc": False,
            "advocacy_candidate": en["interest"] in ("hot", "warm"),
            "program_id": pid,
        })
    print(f"  Created {len(event_notes)} event notes")

    # ─── STEP 15: CREATE INTERACTIONS (drives journey rail + signals) ─
    print("\n[STEP 15] Creating interactions (drives athlete-facing journey rail)...")

    # Map recruiting_status to the interaction trail that PRODUCES that state
    # Journey rail auto-detects: added (always), outreach (outreach_count>0), in_conversation (has_coach_reply)
    # campus_visit, offer, committed require journey_stage manual override
    JOURNEY_STAGE_MAP = {
        "Campus Visit": "campus_visit",
        "Visit Scheduled": "campus_visit",
        "Visit": "campus_visit",
        "Offer": "offer",
        "Committed": "committed",
    }

    interaction_count = 0
    for p in PROGRAMS:
        pid = program_map[(p["athlete"], p["school"])]
        a = next(x for x in ATHLETES if x["id"] == p["athlete"])
        tenant_id = a["_tenant_id"]
        status = p["status"]
        reply = p["reply"]
        contact_days = p["initial_contact_days"]

        # Set journey_stage on the program for advanced stages
        journey_stage = JOURNEY_STAGE_MAP.get(status)
        if journey_stage:
            await db.programs.update_one(
                {"program_id": pid},
                {"$set": {"journey_stage": journey_stage}}
            )

        if status == "Not Contacted":
            continue  # No interactions for uncontacted schools

        interactions = []

        # 1. Initial outreach email
        if contact_days > 0:
            interactions.append({
                "type": "Email Sent",
                "outcome": "Sent",
                "notes": f"Initial outreach email to {p['school']} coaching staff",
                "date_time": ago(contact_days),
            })

        # 2. Follow-up outreach(es) based on staleness
        fu_days = p["last_follow_up_days"]
        if fu_days > 0 and fu_days < contact_days:
            # Add a mid-point follow-up if there's a gap
            mid = (contact_days + fu_days) // 2
            if mid != contact_days and mid != fu_days:
                interactions.append({
                    "type": "Email Sent",
                    "outcome": "Sent",
                    "notes": f"Follow-up email to {p['school']}",
                    "date_time": ago(mid),
                })
            # Most recent follow-up
            interactions.append({
                "type": "Email Sent",
                "outcome": "Sent",
                "notes": f"Follow-up email to {p['school']}",
                "date_time": ago(fu_days),
            })

        # 3. Coach reply (if reply received)
        if reply == "Reply Received" and contact_days > 3:
            reply_day = max(1, contact_days - 5)
            interactions.append({
                "type": "coach_reply",
                "outcome": "Positive",
                "notes": f"Reply from {p['school']} coaching staff",
                "date_time": ago(reply_day),
            })

        # 4. Advanced stage interactions
        if status in ("Engaged", "Interested", "In Conversation"):
            if reply != "Reply Received":
                # Add a coach reply for engaged schools even if reply_status doesn't say so
                interactions.append({
                    "type": "coach_reply",
                    "outcome": "Positive",
                    "notes": f"Response from {p['school']} coach",
                    "date_time": ago(max(1, contact_days - 8)),
                })
            interactions.append({
                "type": "Phone Call",
                "outcome": "Positive",
                "notes": f"Phone call with {p['school']} coaching staff",
                "date_time": ago(max(1, fu_days + 1) if fu_days > 0 else max(1, contact_days - 3)),
            })

        if status in ("Campus Visit", "Visit Scheduled", "Visit"):
            if reply != "Reply Received":
                interactions.append({
                    "type": "coach_reply",
                    "outcome": "Positive",
                    "notes": f"Reply from {p['school']} coach",
                    "date_time": ago(max(1, contact_days - 10)),
                })
            interactions.append({
                "type": "Phone Call",
                "outcome": "Positive",
                "notes": f"Phone call with {p['school']} to discuss visit",
                "date_time": ago(max(1, contact_days - 7)),
            })
            interactions.append({
                "type": "Campus Visit",
                "outcome": "Completed",
                "notes": f"Campus visit at {p['school']}",
                "date_time": ago(max(1, fu_days if fu_days > 0 else 5)),
                "is_meaningful": True,
            })

        if status == "Offer":
            if reply != "Reply Received":
                interactions.append({
                    "type": "coach_reply",
                    "outcome": "Positive",
                    "notes": f"Reply from {p['school']} coach",
                    "date_time": ago(max(1, contact_days - 15)),
                })
            interactions.append({
                "type": "Phone Call",
                "outcome": "Positive",
                "notes": f"Phone call with {p['school']} head coach",
                "date_time": ago(max(1, contact_days - 10)),
            })
            interactions.append({
                "type": "Campus Visit",
                "outcome": "Completed",
                "notes": f"Official visit at {p['school']}",
                "date_time": ago(max(1, contact_days - 5)),
                "is_meaningful": True,
            })
            interactions.append({
                "type": "coach_reply",
                "outcome": "Offer Extended",
                "notes": f"Scholarship offer from {p['school']}",
                "date_time": ago(max(1, fu_days if fu_days > 0 else 2)),
                "is_meaningful": True,
                "offer_signal": True,
            })

        # Insert all interactions for this program
        for ix in interactions:
            await db.interactions.insert_one({
                "interaction_id": uid(),
                "tenant_id": tenant_id,
                "program_id": pid,
                "university_name": p["school"],
                "type": ix["type"],
                "outcome": ix.get("outcome", ""),
                "notes": ix.get("notes", ""),
                "date_time": ix["date_time"],
                "created_at": ix["date_time"],
                "is_meaningful": ix.get("is_meaningful"),
                "offer_signal": ix.get("offer_signal"),
            })
            interaction_count += 1

    print(f"  Created {interaction_count} interactions across {len(PROGRAMS)} programs")
    print("\n" + "=" * 60)
    print("  SEED COMPLETE — Risk Engine v3 Scenarios")
    print("=" * 60)
    print(f"  {len(ATHLETES)} athletes")
    print(f"  {len(PROGRAMS)} programs (target schools)")
    print(f"  {interaction_count} interactions (drives journey rail + signals)")
    print(f"  {len(actions_data)} pod actions")
    print(f"  {len(escalations)} escalations")
    print(f"  {len(recommendations)} recommendations")
    print(f"  {len(notes_data)} notes")
    print(f"  {len(events_data)} timeline events")
    print(f"  {len(messages)} messages")
    print(f"  {len(EVENTS)} events")
    print(f"  {len(event_notes)} event notes")
    print(f"  {len(autopilot_entries)} autopilot entries")
    print()
    print("  ATHLETE SCENARIOS:")
    print("  1. Emma Chen       - Hot prospect, IMPROVING (recent auto follow-up)")
    print("  2. Olivia Anderson - BLOCKER: missing transcript (2025 grad)")
    print("  3. Marcus Johnson  - CRITICAL/WORSENING: gone dark 25d, stalled at Campus Visit")
    print("  4. Sarah Martinez  - MEDIUM: narrow list, early stage (2027)")
    print("  5. Lucas Rodriguez - ALL CLEAR: has offer, strong momentum")
    print("  6. Ava Thompson    - ESCALATION + AWAITING REPLY compound")
    print("  7. Noah Davis      - EVENT BLOCKER + MISSING DOCS compound (2025 grad)")
    print("  8. Isabella Wilson - NO ACTIVITY + AWAITING REPLY compound, WORSENING")
    print("  9. Liam Moore      - NO COACH + NO ACTIVITY compound, WORSENING")
    print("  10. Sophia Garcia  - FOLLOW-UP + NO ACTIVITY but IMPROVING (recent action)")
    print()
    print("  Test credentials:")
    print("  Director: director@capymatch.com / director123")
    print("           clara.morgan@director.capymatch.com / director123")
    print("  Coach:    coach.williams@capymatch.com / coach123")
    print("  Coach:    coach.garcia@capymatch.com / coach123")
    for a in ATHLETES:
        print(f"  Athlete:  {a['email']} / athlete123")
    print()
    print("  RESTART THE SERVER to load new data into memory.")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(seed())
