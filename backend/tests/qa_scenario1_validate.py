"""
QA Validation: SCENARIO 1 — Strong post-event momentum
Full loop: Hero → Action → Reinforcement → Recap → Hero

Step 1: Sets up scenario data
Step 2: Calls each API and traces the full loop
Step 3: Validates each checkpoint
"""
import asyncio
import json
import httpx
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "test_database"
API = "http://localhost:8001/api"

TENANT_ID = "tenant-44656524-a0a9-4e56-b91a-6aad63deae22"

# Scenario schools
SCHOOLS = {
    "purdue": {
        "name": "Purdue University",
        "program_id": "qa-purdue-001",
        "recruiting_status": "Interested",
        "journey_stage": "in_conversation",
        "reply_status": "Reply Received",
    },
    "indiana_state": {
        "name": "Indiana State University",
        "program_id": "qa-indiana-state-001",
        "recruiting_status": "Interested",
        "journey_stage": "in_conversation",
        "reply_status": "Reply Received",
    },
    "ball_state": {
        "name": "Ball State University",
        "program_id": "qa-ball-state-001",
        "recruiting_status": "Initial Contact",
        "journey_stage": "outreach",
        "reply_status": "No Reply",
    },
    "louisville": {
        "name": "University of Louisville",
        "program_id": "qa-louisville-001",
        "recruiting_status": "Initial Contact",
        "journey_stage": "outreach",
        "reply_status": "No Reply",
    },
}

QA_PIDS = [s["program_id"] for s in SCHOOLS.values()]

PASS = "\033[92mPASS\033[0m"
FAIL = "\033[91mFAIL\033[0m"
WARN = "\033[93mWARN\033[0m"


async def setup_scenario(db):
    """Insert scenario data into MongoDB."""
    now = datetime.now(timezone.utc)
    two_days_ago = now - timedelta(days=2)
    one_day_ago = now - timedelta(days=1)
    five_days_ago = now - timedelta(days=5)
    twelve_days_ago = now - timedelta(days=12)
    thirty_days_ago = now - timedelta(days=30)

    # Clean
    await db.programs.delete_many({"program_id": {"$in": QA_PIDS}})
    await db.interactions.delete_many({"program_id": {"$in": QA_PIDS}})
    await db.tasks.delete_many({"program_id": {"$in": QA_PIDS}})
    await db.events.delete_many({"event_id": "qa-showcase-001"})
    await db.momentum_recaps.delete_many({"tenant_id": TENANT_ID})

    # Insert programs
    tomorrow = (now + timedelta(days=1)).strftime("%Y-%m-%d")
    three_days = (now + timedelta(days=3)).strftime("%Y-%m-%d")

    programs = [
        {
            "program_id": SCHOOLS["purdue"]["program_id"],
            "tenant_id": TENANT_ID,
            "athlete_id": "athlete_1",
            "university_name": "Purdue University",
            "division": "D1",
            "conference": "Big Ten",
            "region": "Midwest",
            "recruiting_status": "Interested",
            "reply_status": "Reply Received",
            "priority": "Top Choice",
            "next_action": "Follow up with Purdue coach",
            "next_action_due": tomorrow,
            "initial_contact_sent": thirty_days_ago.isoformat(),
            "last_follow_up": one_day_ago.isoformat(),
            "stage_entered_at": two_days_ago.isoformat(),
            "notes": "",
            "org_id": "org-capymatch-default",
            "created_at": thirty_days_ago.isoformat(),
            "updated_at": one_day_ago.isoformat(),
            "journey_stage": "in_conversation",
            "source_added": "manual",
            "board_group": "active",
        },
        {
            "program_id": SCHOOLS["indiana_state"]["program_id"],
            "tenant_id": TENANT_ID,
            "athlete_id": "athlete_1",
            "university_name": "Indiana State University",
            "division": "D1",
            "conference": "Missouri Valley",
            "region": "Midwest",
            "recruiting_status": "Interested",
            "reply_status": "Reply Received",
            "priority": "Target",
            "next_action": "Send transcript to Indiana State",
            "next_action_due": three_days,
            "initial_contact_sent": thirty_days_ago.isoformat(),
            "last_follow_up": two_days_ago.isoformat(),
            "stage_entered_at": two_days_ago.isoformat(),
            "notes": "",
            "org_id": "org-capymatch-default",
            "created_at": thirty_days_ago.isoformat(),
            "updated_at": two_days_ago.isoformat(),
            "journey_stage": "in_conversation",
            "source_added": "manual",
            "board_group": "active",
        },
        {
            "program_id": SCHOOLS["ball_state"]["program_id"],
            "tenant_id": TENANT_ID,
            "athlete_id": "athlete_1",
            "university_name": "Ball State University",
            "division": "D1",
            "conference": "Mid-American",
            "region": "Midwest",
            "recruiting_status": "Initial Contact",
            "reply_status": "No Reply",
            "priority": "Interest",
            "next_action": None,
            "next_action_due": None,
            "initial_contact_sent": thirty_days_ago.isoformat(),
            "last_follow_up": five_days_ago.isoformat(),
            "stage_entered_at": five_days_ago.isoformat(),
            "notes": "",
            "org_id": "org-capymatch-default",
            "created_at": thirty_days_ago.isoformat(),
            "updated_at": five_days_ago.isoformat(),
            "journey_stage": "outreach",
            "source_added": "manual",
            "board_group": "active",
        },
        {
            "program_id": SCHOOLS["louisville"]["program_id"],
            "tenant_id": TENANT_ID,
            "athlete_id": "athlete_1",
            "university_name": "University of Louisville",
            "division": "D1",
            "conference": "ACC",
            "region": "Southeast",
            "recruiting_status": "Initial Contact",
            "reply_status": "No Reply",
            "priority": "Interest",
            "next_action": None,
            "next_action_due": None,
            "initial_contact_sent": thirty_days_ago.isoformat(),
            "last_follow_up": twelve_days_ago.isoformat(),
            "stage_entered_at": twelve_days_ago.isoformat(),
            "notes": "",
            "org_id": "org-capymatch-default",
            "created_at": thirty_days_ago.isoformat(),
            "updated_at": twelve_days_ago.isoformat(),
            "journey_stage": "outreach",
            "source_added": "manual",
            "board_group": "active",
        },
    ]
    await db.programs.insert_many(programs)

    # Insert interactions
    interactions = [
        # Purdue: coach replied + stage change + email (3 touchpoints, heated)
        {"interaction_id": "qa-ix-p1", "program_id": SCHOOLS["purdue"]["program_id"],
         "tenant_id": TENANT_ID, "type": "coach_reply",
         "summary": "Purdue coach replied expressing strong interest",
         "date_time": one_day_ago.isoformat()},
        {"interaction_id": "qa-ix-p2", "program_id": SCHOOLS["purdue"]["program_id"],
         "tenant_id": TENANT_ID, "type": "Stage Change",
         "summary": "Moved from Interested to Active",
         "date_time": two_days_ago.isoformat()},
        {"interaction_id": "qa-ix-p3", "program_id": SCHOOLS["purdue"]["program_id"],
         "tenant_id": TENANT_ID, "type": "email_sent",
         "summary": "Follow-up email sent after showcase",
         "date_time": two_days_ago.isoformat()},

        # Indiana State: coach conversation (2 touchpoints, heated)
        {"interaction_id": "qa-ix-i1", "program_id": SCHOOLS["indiana_state"]["program_id"],
         "tenant_id": TENANT_ID, "type": "coach_reply",
         "summary": "Coach conversation about recruitment timeline",
         "date_time": two_days_ago.isoformat()},
        {"interaction_id": "qa-ix-i2", "program_id": SCHOOLS["indiana_state"]["program_id"],
         "tenant_id": TENANT_ID, "type": "phone_call",
         "summary": "Phone call with coaching staff",
         "date_time": two_days_ago.isoformat()},

        # Ball State: profile view only (1 touchpoint, minimal)
        {"interaction_id": "qa-ix-b1", "program_id": SCHOOLS["ball_state"]["program_id"],
         "tenant_id": TENANT_ID, "type": "profile_viewed",
         "summary": "Ball State viewed your profile",
         "date_time": five_days_ago.isoformat()},

        # Louisville: old email only (cooling)
        {"interaction_id": "qa-ix-l1", "program_id": SCHOOLS["louisville"]["program_id"],
         "tenant_id": TENANT_ID, "type": "email_sent",
         "summary": "Initial outreach email",
         "date_time": twelve_days_ago.isoformat()},
    ]
    await db.interactions.insert_many(interactions)

    # Insert showcase event (past)
    await db.events.insert_one({
        "event_id": "qa-showcase-001",
        "name": "Weekend Showcase",
        "status": "past",
        "date": two_days_ago.isoformat(),
        "tenant_id": TENANT_ID,
    })

    print("Setup complete: 4 programs, 7 interactions, 1 event")


async def login():
    async with httpx.AsyncClient() as client:
        resp = await client.post(f"{API}/auth/login", json={
            "email": "emma.chen@athlete.capymatch.com",
            "password": "athlete123"
        })
        return resp.json()["token"]


async def validate_loop():
    """Run the full loop validation."""
    token = await login()
    headers = {"Authorization": f"Bearer {token}"}
    results = []

    print("\n" + "=" * 70)
    print("QA VALIDATION — SCENARIO 1: Strong Post-Event Momentum")
    print("=" * 70)

    async with httpx.AsyncClient(timeout=30) as client:
        # ═══ STEP A: Generate Recap ═══════════════════════════════════════
        print("\n━━━ STEP A: Momentum Recap ━━━")
        recap_resp = await client.get(f"{API}/athlete/momentum-recap", headers=headers)
        recap = recap_resp.json()

        heated = recap.get("momentum", {}).get("heated_up", [])
        steady = recap.get("momentum", {}).get("holding_steady", [])
        cooling = recap.get("momentum", {}).get("cooling_off", [])
        priorities = recap.get("priorities", [])

        heated_names = [m["school_name"] for m in heated]
        steady_names = [m["school_name"] for m in steady]
        cooling_names = [m["school_name"] for m in cooling]

        print(f"  Recap Hero: {recap.get('recap_hero', '?')}")
        print(f"  Period: {recap.get('period_label', '?')}")
        print(f"  Heated Up: {heated_names}")
        print(f"  Holding Steady: {steady_names}")
        print(f"  Cooling Off: {cooling_names}")
        print(f"  Priorities:")
        for p in priorities:
            print(f"    {p['rank']}: {p['school_name']} — {p['action']}")

        # Validate Recap
        # Expected: Purdue + Indiana State = heated, Ball State = steady/cooling, Louisville = cooling
        test_heated = "Purdue University" in heated_names and "Indiana State University" in heated_names
        test_cooling = "University of Louisville" in cooling_names
        top_priority = priorities[0] if priorities else {}

        r_heated = PASS if test_heated else FAIL
        r_cooling = PASS if test_cooling else FAIL
        print(f"\n  [{r_heated}] Purdue & Indiana State heated up")
        print(f"  [{r_cooling}] Louisville cooling off")

        ball_state_status = "heated" if "Ball State" in str(heated_names) else "steady" if "Ball State" in str(steady_names) else "cooling" if "Ball State" in str(cooling_names) else "unknown"
        print(f"  [INFO] Ball State classified as: {ball_state_status}")

        r_top_priority = PASS if top_priority.get("school_name") in ("University of Louisville", "Purdue University") else WARN
        print(f"  [{r_top_priority}] Top priority: {top_priority.get('school_name', '?')} — {top_priority.get('action', '?')}")

        # ═══ STEP B: Fetch Programs + Top Actions ═════════════════════════
        print("\n━━━ STEP B: Hero Card Selection ━━━")
        programs_resp = await client.get(f"{API}/athlete/programs", headers=headers)
        programs = programs_resp.json()

        actions_resp = await client.get(f"{API}/internal/programs/top-actions", headers=headers)
        actions_data = actions_resp.json()
        actions_list = actions_data.get("actions", actions_data) if isinstance(actions_data, dict) else actions_data

        # Filter to QA programs
        qa_programs = [p for p in programs if p["program_id"] in QA_PIDS]
        print(f"  QA Programs loaded: {len(qa_programs)}")

        # Build actions map
        actions_map = {}
        for a in actions_list:
            actions_map[a["program_id"]] = a
        print(f"  Actions for QA programs:")
        for pid in QA_PIDS:
            a = actions_map.get(pid, {})
            print(f"    {a.get('university_name', pid)}: key={a.get('action_key','?')} cat={a.get('category','?')}")

        # ═══ STEP C: Simulate computeAttention (Python port) ══════════════
        print("\n━━━ STEP C: Attention Engine Simulation ━━━")

        # Build recap context from stored recap
        client_db = AsyncIOMotorClient(MONGO_URL)
        mdb = client_db[DB_NAME]
        stored_recap = await mdb.momentum_recaps.find_one({"tenant_id": TENANT_ID}, {"_id": 0})
        client_db.close()

        recap_ctx = None
        if stored_recap:
            recap_ctx = {
                "priorities": stored_recap.get("priorities", []),
                "createdAt": stored_recap.get("created_at", ""),
            }

        attention_results = []
        for p in qa_programs:
            ta = actions_map.get(p["program_id"], {})
            result = simulate_attention(p, ta, recap_ctx)
            attention_results.append(result)

        # Sort by score descending
        attention_results.sort(key=lambda x: -x["score"])

        print(f"\n  Attention Rankings:")
        for i, ar in enumerate(attention_results):
            marker = " ◄ HERO #1" if i == 0 else ""
            print(f"    #{i+1} [{ar['score']:3d}] {ar['name']:30s} | source={ar['prioritySource']:7s} | {ar['primaryAction']}{marker}")

        hero = attention_results[0] if attention_results else None

        if hero:
            print(f"\n  ── Hero Card Analysis ──")
            print(f"  Actual Hero title:    {hero['primaryAction']}")
            print(f"  Actual Hero reason:   {hero['heroReason'] or hero['reasonShort']}")
            print(f"  Actual prioritySource: {hero['prioritySource']}")
            print(f"  Explain factors:       {hero['explainFactors']}")

            # Validate hero selection
            is_purdue_hero = "Purdue" in hero["name"]
            r_hero = PASS if is_purdue_hero else FAIL
            print(f"\n  [{r_hero}] Hero should prioritize Purdue")

            expected_sources = ("recap", "merged")
            r_source = PASS if hero["prioritySource"] in expected_sources else FAIL
            print(f"  [{r_source}] prioritySource should be recap or merged (got: {hero['prioritySource']})")

            has_momentum_reason = any(word in (hero["heroReason"] or "").lower() + (hero["reasonShort"] or "").lower()
                                      for word in ("momentum", "recap", "priority", "pushing", "hot"))
            r_reason = PASS if has_momentum_reason else WARN
            print(f"  [{r_reason}] Hero reason references momentum/recap context")

        # ═══ STEP D: Reinforcement Message Simulation ═════════════════════
        print("\n━━━ STEP D: Reinforcement on Purdue Follow-up ━━━")

        if hero:
            reinf_ctx = {
                "type": "taskComplete",
                "isHeroPriority": True,
                "heroReason": hero.get("heroReason", ""),
                "priorityRank": 1,
                "attentionBefore": "high" if hero["score"] >= 80 else "medium",
                "attentionAfter": "low",
                "daysSinceLastActivity": 1,
                "stageBefore": "in_conversation",
                "stageAfter": "in_conversation",
                "schoolName": hero["name"],
                "recapRank": hero.get("recapRank"),
                "prioritySource": hero["prioritySource"],
            }
            feedback = simulate_reinforcement(reinf_ctx)
            print(f"  Actual reinforcement message: \"{feedback['message']}\"")
            print(f"  Actual subtext:               \"{feedback['subtext']}\"")
            print(f"  Indicator:                    {feedback['indicator']}")

            expected_msgs = ["Recap priority handled", "Top priority handled", "Top priority cleared",
                             "Your #1 focus — done", "You moved this forward at the right time",
                             "Critical issue cleared", "This was the most important thing to do"]
            r_reinf = PASS if feedback["message"] in expected_msgs else WARN
            print(f"\n  [{r_reinf}] Reinforcement message matches expected pattern")
            if feedback["message"] not in expected_msgs:
                print(f"       Expected one of: {expected_msgs}")

        # ═══ STEP E: Next Hero After Recap ════════════════════════════════
        print("\n━━━ STEP E: Next Hero After Purdue Completed ━━━")
        # After Purdue is handled, second hero should surface
        if len(attention_results) > 1:
            next_hero = attention_results[1]
            print(f"  Next Hero:           {next_hero['name']}")
            print(f"  Next primaryAction:  {next_hero['primaryAction']}")
            print(f"  Next prioritySource: {next_hero['prioritySource']}")
            print(f"  Next reasonShort:    {next_hero['reasonShort']}")

            trustworthy = next_hero["score"] > 0
            r_next = PASS if trustworthy else FAIL
            print(f"\n  [{r_next}] Next hero feels trustworthy (score={next_hero['score']})")

    # ═══ FINAL SUMMARY ════════════════════════════════════════════════════
    print("\n" + "=" * 70)
    print("SCENARIO 1 — FULL LOOP VALIDATION REPORT")
    print("=" * 70)

    print(f"""
┌─────────────────────────────────────────────────────────────┐
│ Checkpoint                        │ Result                  │
├─────────────────────────────────────────────────────────────┤
│ Recap: Purdue heated up           │ {"Purdue University" in heated_names}                  │
│ Recap: Indiana State heated up    │ {"Indiana State University" in heated_names}                  │
│ Recap: Louisville cooling off     │ {"University of Louisville" in cooling_names}                  │
│ Recap: Ball State status          │ {ball_state_status:25s}│
│ Recap top priority                │ {top_priority.get('school_name','?'):25s}│
│ Hero selects Purdue               │ {"Purdue" in (hero["name"] if hero else "")}                  │
│ prioritySource = recap/merged     │ {hero["prioritySource"] if hero else "?":25s}│
│ Hero reason references momentum   │ {has_momentum_reason if hero else False}                  │
│ Reinforcement matches pattern     │ {feedback["message"][:25] if hero else "?":25s}│
│ Next hero trustworthy             │ {attention_results[1]["name"][:25] if len(attention_results) > 1 else "?":25s}│
└─────────────────────────────────────────────────────────────┘
""")

    # Print detailed notes
    print("NOTES:")
    if hero and not is_purdue_hero:
        print(f"  ⚠ Hero selected {hero['name']} instead of Purdue. Check recap priority boost vs live score.")
    if hero and hero["prioritySource"] == "live":
        print(f"  ⚠ prioritySource is 'live' — recap boost may not have been applied or live urgency dominates.")
    if ball_state_status == "heated":
        print(f"  ⚠ Ball State classified as heated (profile view counted as engagement).")
    if top_priority.get("school_name") == "University of Louisville":
        print(f"  ℹ Top recap priority is Louisville (cooling → re-engage) which is correct for cooling schools.")
        print(f"    This means the Hero Card should show Purdue via recap secondary/live priority boost.")
    print()


def simulate_attention(program, top_action, recap_ctx):
    """Python port of computeAttention.js for validation."""
    p = program
    ta = top_action
    name = p.get("university_name", "")

    # daysUntil
    days_until = None
    next_due = p.get("next_action_due", "")
    if next_due:
        from datetime import date
        today = date.today()
        try:
            due_str = next_due.split("T")[0] if "T" in next_due else next_due
            due = datetime.strptime(due_str, "%Y-%m-%d").date()
            days_until = (due - today).days
        except:
            pass

    last_activity = (p.get("signals") or {}).get("days_since_activity")

    # Score
    score = 0
    if ta.get("action_key") == "coach_assigned_action": score += 100
    elif ta.get("category") == "coach_flag": score += 90

    if days_until is not None:
        if days_until < 0: score += 80
        elif days_until == 0: score += 70
        elif days_until == 1: score += 50
        elif days_until <= 3: score += 30

    if last_activity is not None and last_activity > 0:
        if last_activity >= 7: score += 40
        elif last_activity >= 3: score += 20

    if p.get("journey_stage") == "campus_visit": score += 15
    elif p.get("journey_stage") == "in_conversation": score += 10

    # Recap boost
    recap_rank = None
    recap_action = None
    recap_boost = 0
    if recap_ctx:
        for pr in recap_ctx.get("priorities", []):
            if pr.get("program_id") == p.get("program_id"):
                # Freshness
                created = recap_ctx.get("createdAt", "")
                freshness = 1.0  # assume fresh (just generated)
                if created:
                    try:
                        age_days = (datetime.now(timezone.utc) - datetime.fromisoformat(created.replace("Z", "+00:00"))).total_seconds() / 86400
                        if age_days <= 3: freshness = 1.0
                        elif age_days <= 7: freshness = 0.75
                        elif age_days <= 14: freshness = 0.4
                        else: freshness = 0
                    except:
                        pass
                boost_map = {"top": 65, "secondary": 25, "watch": 5}
                boost = round(boost_map.get(pr["rank"], 0) * freshness)
                if boost > 0:
                    score += boost
                    recap_boost = boost
                    recap_rank = pr["rank"]
                    recap_action = pr.get("action", "")
                break

    if days_until is not None and days_until <= 0 and score < 40:
        score = 40

    attention_level = "high" if score >= 80 else "medium" if score >= 40 else "low"
    has_live_urgency = (days_until is not None and days_until <= 0) or ta.get("category") == "coach_flag"

    # prioritySource
    priority_source = "live"
    if recap_rank and not has_live_urgency: priority_source = "recap"
    elif recap_rank and has_live_urgency: priority_source = "merged"

    # heroReason
    hero_reason = None
    if has_live_urgency and recap_rank:
        if days_until is not None and days_until < 0:
            hero_reason = f"Overdue {abs(days_until)}d — also your recap's top focus"
        else:
            hero_reason = "Due now — also flagged in your recap"
    elif recap_rank == "top":
        hero_reason = "Recap priority — momentum at risk"
    elif recap_rank == "secondary":
        hero_reason = "Flagged in recap — keep pushing"

    # reasonShort
    reason_short = None
    if ta.get("action_key") == "coach_assigned_action": reason_short = "Coach assigned a task"
    elif ta.get("category") == "coach_flag": reason_short = "Flagged by coach"
    elif days_until is not None and days_until < 0: reason_short = f"Overdue by {abs(days_until)} days"
    elif days_until == 0: reason_short = "Due today"
    elif days_until == 1: reason_short = "Due tomorrow"
    elif days_until is not None and days_until <= 3: reason_short = f"Due in {days_until} days"
    elif recap_rank == "top": reason_short = "Recap: top priority"
    elif recap_rank == "secondary": reason_short = "Recap: flagged"
    elif last_activity is not None and last_activity >= 7: reason_short = f"No response in {last_activity} days"
    elif last_activity is not None and last_activity >= 3: reason_short = f"{last_activity} days since last activity"
    elif attention_level == "low": reason_short = "On track"

    # primaryAction
    action_map = {
        "coach_assigned_action": f"Follow up with {name} coach",
        "overdue_followup": f"Follow up with {name}",
        "overdue_follow_up": f"Follow up with {name}",
        "stale_reply": f"Follow up with {name}",
        "first_outreach_needed": f"Send intro to {name}",
        "send_intro_email": f"Send intro to {name}",
        "relationship_cooling": f"Re-engage {name}",
        "reengage_relationship": f"Re-engage {name}",
        "due_today_follow_up": f"Follow up with {name} today",
    }
    primary_action = action_map.get(ta.get("action_key"))
    if not primary_action:
        if ta.get("cta_label") and ta.get("action_key") != "no_action_needed":
            primary_action = f"{ta['cta_label']} — {name}"
        else:
            primary_action = f"{name} is on track"

    if days_until is not None and days_until <= 0 and ta.get("action_key") == "no_action_needed":
        primary_action = f"Follow up with {name}" if days_until < 0 else f"Follow up with {name} today"
    if days_until is not None and 0 < days_until <= 7 and primary_action.endswith("is on track"):
        primary_action = p.get("next_action", f"Follow up with {name}") + f" — {name}" if p.get("next_action") else f"Follow up with {name}"

    # Override with recap top action
    if recap_rank == "top" and recap_action:
        primary_action = recap_action

    # explainFactors
    explain = []
    if days_until is not None and days_until < 0:
        explain.append(f"Overdue by {abs(days_until)} days")
    if days_until == 0:
        explain.append("Due today")
    if ta.get("category") == "coach_flag":
        explain.append("Flagged by coach")
    if recap_rank == "top":
        explain.append("Top priority in Momentum Recap")
    elif recap_rank == "secondary":
        explain.append("Identified in Momentum Recap")
    elif recap_rank == "watch":
        explain.append("On recap watch list")
    if last_activity is not None and last_activity >= 5:
        explain.append(f"{last_activity} days since last activity")

    return {
        "name": name,
        "programId": p.get("program_id"),
        "score": score,
        "attentionLevel": attention_level,
        "primaryAction": primary_action,
        "heroReason": hero_reason,
        "reasonShort": reason_short,
        "prioritySource": priority_source,
        "recapRank": recap_rank,
        "recapBoost": recap_boost,
        "daysUntil": days_until,
        "explainFactors": explain,
    }


def simulate_reinforcement(ctx):
    """Python port of generateFeedback from reinforcement.js"""
    import random

    is_hero = ctx.get("isHeroPriority", False)
    rank = ctx.get("priorityRank", 99)
    recap_rank = ctx.get("recapRank")
    priority_source = ctx.get("prioritySource", "live")
    hero_reason = ctx.get("heroReason", "")
    att_before = ctx.get("attentionBefore")
    att_after = ctx.get("attentionAfter")
    days_inactive = ctx.get("daysSinceLastActivity", 0)
    stage_after = ctx.get("stageAfter")
    school = ctx.get("schoolName", "")

    # Hero priority top
    if is_hero and rank == 1:
        if recap_rank == "top" or priority_source == "recap":
            msg = random.choice(["Recap priority handled", "Top priority cleared", "Your #1 focus — done"])
            sub = hero_reason or "This was your most important move"
        elif priority_source == "merged":
            msg = random.choice(["Top priority handled", "You moved this forward at the right time",
                                 "Critical issue cleared", "This was the most important thing to do"])
            sub = "Cleared a live issue and a recap priority"
        else:
            msg = random.choice(["Top priority handled", "You moved this forward at the right time",
                                 "Critical issue cleared", "This was the most important thing to do"])
            sub = hero_reason or "This was your most urgent action"
        return {"message": msg, "subtext": sub, "indicator": "highImpact"}

    # Attention cleared
    if att_before == "high" and att_after and att_after != "high":
        return {
            "message": random.choice(["Risk cleared — back in motion", "Caught in time — momentum restored",
                                       "Crisis averted, pipeline stabilized"]),
            "subtext": "You caught this in time", "indicator": "riskResolved"
        }

    return {"message": "Momentum building", "subtext": school, "indicator": "neutral"}


async def main():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    print("Setting up scenario data...")
    await setup_scenario(db)
    client.close()

    print("Running loop validation...")
    await validate_loop()


asyncio.run(main())
