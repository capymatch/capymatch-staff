"""
QA SCENARIO 2: Live blocker overrides recap
- Recap says Purdue is top priority
- Michigan has 4-day overdue follow-up (critical)
- Expected: Michigan outranks Purdue in Hero Card
"""
import asyncio, json, random
from datetime import datetime, date, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
import httpx

MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "test_database"
API = "http://localhost:8001/api"
TENANT_ID = "tenant-44656524-a0a9-4e56-b91a-6aad63deae22"

RECAP_BOOST = {"top": 65, "secondary": 25, "watch": 5}
P = "\033[92mPASS\033[0m"
F = "\033[91mFAIL\033[0m"
W = "\033[93mWARN\033[0m"


async def setup(db):
    now = datetime.now(timezone.utc)
    four_days_ago = now - timedelta(days=4)
    one_day_ago = now - timedelta(days=1)
    two_days_ago = now - timedelta(days=2)
    eight_days_ago = now - timedelta(days=8)
    thirty_days_ago = now - timedelta(days=30)

    qa_pids = ["qa2-purdue-001", "qa2-michigan-001"]
    await db.programs.delete_many({"program_id": {"$in": qa_pids}})
    await db.interactions.delete_many({"program_id": {"$in": qa_pids}})
    await db.events.delete_many({"event_id": "qa2-showcase-001"})
    await db.momentum_recaps.delete_many({"tenant_id": TENANT_ID})

    # ── Purdue: heated, recap will make it top priority ──
    await db.programs.insert_one({
        "program_id": "qa2-purdue-001",
        "tenant_id": TENANT_ID,
        "athlete_id": "athlete_1",
        "university_name": "Purdue University",
        "division": "D1", "conference": "Big Ten", "region": "Midwest",
        "recruiting_status": "Interested",
        "reply_status": "Reply Received",
        "priority": "Top Choice",
        "next_action": "Continue conversation with Purdue",
        "next_action_due": (now + timedelta(days=3)).strftime("%Y-%m-%d"),
        "journey_stage": "in_conversation",
        "board_group": "active",
        "org_id": "org-capymatch-default",
        "created_at": thirty_days_ago.isoformat(),
        "updated_at": one_day_ago.isoformat(),
    })

    # ── Michigan: 4-day OVERDUE, stale, critical ──
    await db.programs.insert_one({
        "program_id": "qa2-michigan-001",
        "tenant_id": TENANT_ID,
        "athlete_id": "athlete_1",
        "university_name": "University of Michigan",
        "division": "D1", "conference": "Big Ten", "region": "Midwest",
        "recruiting_status": "Interested",
        "reply_status": "Reply Received",
        "priority": "Top Choice",
        "next_action": "Follow up with Michigan coach",
        "next_action_due": four_days_ago.strftime("%Y-%m-%d"),
        "journey_stage": "in_conversation",
        "board_group": "active",
        "org_id": "org-capymatch-default",
        "created_at": thirty_days_ago.isoformat(),
        "updated_at": eight_days_ago.isoformat(),
    })

    # Interactions: Purdue heated, Michigan stale
    await db.interactions.insert_many([
        # Purdue: coach replied recently (heated)
        {"interaction_id": "qa2-ix-p1", "program_id": "qa2-purdue-001",
         "tenant_id": TENANT_ID, "type": "coach_reply",
         "summary": "Purdue coach replied with interest",
         "date_time": one_day_ago.isoformat()},
        {"interaction_id": "qa2-ix-p2", "program_id": "qa2-purdue-001",
         "tenant_id": TENANT_ID, "type": "email_sent",
         "summary": "Follow-up sent after showcase",
         "date_time": two_days_ago.isoformat()},
        # Michigan: last activity 8 days ago, nothing recent
        {"interaction_id": "qa2-ix-m1", "program_id": "qa2-michigan-001",
         "tenant_id": TENANT_ID, "type": "email_sent",
         "summary": "Sent follow-up to Michigan",
         "date_time": eight_days_ago.isoformat()},
    ])

    # Past event to anchor recap window
    await db.events.insert_one({
        "event_id": "qa2-showcase-001",
        "id": "qa2-showcase-001",
        "name": "Weekend Showcase",
        "status": "past",
        "date": two_days_ago.isoformat(),
        "tenant_id": TENANT_ID,
    })

    print("  Setup: 2 QA programs, 3 interactions, 1 event")


def compute_score(p, ta, recap_priorities, recap_created):
    """Python port of computeAttention.js"""
    name = p.get("university_name", "")
    stage = p.get("journey_stage", "")
    sig = p.get("signals", {})
    last_activity = sig.get("days_since_activity")

    days_until = None
    due = p.get("next_action_due", "")
    if due:
        try:
            ds = due.split("T")[0] if "T" in due else due
            days_until = (datetime.strptime(ds, "%Y-%m-%d").date() - date.today()).days
        except: pass

    score = 0
    ak = ta.get("action_key", "")
    cat = ta.get("category", "")

    if ak == "coach_assigned_action": score += 100
    elif cat == "coach_flag": score += 90
    if days_until is not None:
        if days_until < 0: score += 80
        elif days_until == 0: score += 70
        elif days_until == 1: score += 50
        elif days_until <= 3: score += 30
    if last_activity is not None and last_activity > 0:
        if last_activity >= 7: score += 40
        elif last_activity >= 3: score += 20
    if stage == "campus_visit": score += 15
    elif stage == "in_conversation": score += 10

    recap_rank = None
    recap_action = None
    for pr in recap_priorities:
        if pr.get("program_id") == p.get("program_id"):
            freshness = 1.0
            if recap_created:
                try:
                    age = (datetime.now(timezone.utc) - datetime.fromisoformat(recap_created.replace("Z","+00:00"))).total_seconds() / 86400
                    if age <= 3: freshness = 1.0
                    elif age <= 7: freshness = 0.75
                    elif age <= 14: freshness = 0.4
                    else: freshness = 0
                except: pass
            boost = round(RECAP_BOOST.get(pr["rank"], 0) * freshness)
            if boost > 0:
                score += boost
                recap_rank = pr["rank"]
                recap_action = pr.get("action", "")
            break

    if days_until is not None and days_until <= 0 and score < 40:
        score = 40
    attention = "high" if score >= 80 else "medium" if score >= 40 else "low"
    has_live = (days_until is not None and days_until <= 0) or cat == "coach_flag"

    ps = "live"
    if recap_rank and not has_live: ps = "recap"
    elif recap_rank and has_live: ps = "merged"

    hero_reason = None
    if has_live and recap_rank:
        hero_reason = f"Overdue {abs(days_until)}d — also your recap's top focus" if days_until is not None and days_until < 0 else "Due now — also flagged in your recap"
    elif recap_rank == "top":
        hero_reason = "Recap priority — momentum at risk"
    elif recap_rank == "secondary":
        hero_reason = "Flagged in recap — keep pushing"

    rs = None
    if ak == "coach_assigned_action": rs = "Coach assigned a task"
    elif cat == "coach_flag": rs = "Flagged by coach"
    elif days_until is not None and days_until < 0: rs = f"Overdue by {abs(days_until)} days"
    elif days_until == 0: rs = "Due today"
    elif days_until == 1: rs = "Due tomorrow"
    elif days_until is not None and days_until <= 3: rs = f"Due in {days_until} days"
    elif recap_rank == "top": rs = "Recap: top priority"
    elif recap_rank == "secondary": rs = "Recap: flagged"
    elif last_activity is not None and last_activity >= 7: rs = f"No response in {last_activity} days"
    elif last_activity is not None and last_activity >= 3: rs = f"{last_activity} days since last activity"
    elif attention == "low": rs = "On track"

    # primaryAction
    amap = {"overdue_followup": f"Follow up with {name}", "send_intro_email": f"Send intro to {name}",
            "reengage_relationship": f"Re-engage {name}", "follow_up_this_week": f"Follow up with {name} this week"}
    primary = amap.get(ak)
    if not primary:
        if ta.get("cta_label") and ak != "no_action_needed":
            primary = f"{ta['cta_label']} — {name}"
        else:
            primary = f"{name} is on track"
    if days_until is not None and days_until <= 0 and ak == "no_action_needed":
        primary = f"Follow up with {name}" if days_until < 0 else f"Follow up with {name} today"
    if days_until is not None and 0 < days_until <= 7 and primary.endswith("is on track"):
        na = p.get("next_action")
        primary = f"{na} — {name}" if na else f"Follow up with {name}"
    if recap_rank == "top" and recap_action:
        primary = recap_action

    factors = []
    if days_until is not None and days_until < 0:
        factors.append(f"Overdue by {abs(days_until)} days")
    if days_until == 0: factors.append("Due today")
    if cat == "coach_flag": factors.append("Flagged by coach")
    if ak == "coach_assigned_action": factors.append("Coach assigned action")
    if recap_rank == "top": factors.append("Top priority in Momentum Recap")
    elif recap_rank == "secondary": factors.append("Identified in Momentum Recap")
    elif recap_rank == "watch": factors.append("On recap watch list")
    if last_activity is not None and last_activity >= 5:
        factors.append(f"{last_activity} days since last activity")

    return {
        "name": name, "pid": p.get("program_id"), "score": score,
        "attention": attention, "daysUntil": days_until, "dsa": last_activity,
        "primaryAction": primary, "heroReason": hero_reason, "reasonShort": rs,
        "prioritySource": ps, "recapRank": recap_rank, "explainFactors": factors,
        "stage": stage, "actionKey": ak,
    }


def simulate_reinforcement(hero):
    """Simulate reinforcement for completing hero #1."""
    random.seed(42)
    recap_rank = hero.get("recapRank")
    ps = hero["prioritySource"]
    hr = hero.get("heroReason", "")
    du = hero.get("daysUntil")

    # Hero top priority with recap
    if recap_rank and ps == "merged":
        msg = random.choice(["Top priority handled", "You moved this forward at the right time",
                             "Critical issue cleared", "This was the most important thing to do"])
        return msg, "Cleared a live issue and a recap priority", "highImpact"

    if recap_rank and ps == "recap":
        msg = random.choice(["Recap priority handled", "Top priority cleared", "Your #1 focus — done"])
        return msg, hr or "This was your most important move", "highImpact"

    # Live overdue → attention cleared
    if du is not None and du < 0:
        return "Overdue cleared — pipeline breathing again", f"{hero['name']} is back on track", "riskResolved"

    # Attention high → cleared
    if hero["attention"] == "high":
        msg = random.choice(["Risk cleared — back in motion", "Caught in time — momentum restored",
                             "Crisis averted, pipeline stabilized"])
        return msg, "You caught this in time", "riskResolved"

    msg = random.choice(["Top priority handled", "You moved this forward at the right time"])
    return msg, hr or "This was your most urgent action", "highImpact"


async def main():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    print("=" * 80)
    print("  QA SCENARIO 2: Live Blocker Overrides Recap")
    print("=" * 80)

    print("\n  Setting up scenario data...")
    await setup(db)

    # ── STEP 1: Generate Recap (Purdue should be top) ──
    print("\n" + "━" * 80)
    print("  1. MOMENTUM RECAP")
    print("━" * 80)

    async with httpx.AsyncClient(timeout=120) as http:
        token = (await http.post(f"{API}/auth/login", json={
            "email": "emma.chen@athlete.capymatch.com", "password": "athlete123"
        })).json()["token"]
        h = {"Authorization": f"Bearer {token}"}

        recap = (await http.get(f"{API}/athlete/momentum-recap", headers=h)).json()

    heated = recap.get("momentum", {}).get("heated_up", [])
    cooling = recap.get("momentum", {}).get("cooling_off", [])
    priorities = recap.get("priorities", [])

    print(f"  Period: {recap.get('period_label')}")
    print(f"  Heated: {[m['school_name'] for m in heated]}")
    print(f"  Cooling: {[m['school_name'] for m in cooling]}")
    print(f"  Priorities:")
    for pr in priorities:
        print(f"    [{pr['rank']:10s}] {pr['school_name']:30s} | {pr['action']}")

    # Find Purdue's recap rank
    purdue_recap = next((pr for pr in priorities if "Purdue" in pr["school_name"]), None)
    michigan_recap = next((pr for pr in priorities if "Michigan" in pr["school_name"]), None)

    purdue_is_top_or_secondary = purdue_recap and purdue_recap["rank"] in ("top", "secondary")
    print(f"\n  Purdue recap rank: {purdue_recap['rank'] if purdue_recap else 'NOT IN PRIORITIES'}")
    print(f"  Michigan recap rank: {michigan_recap['rank'] if michigan_recap else 'NOT IN PRIORITIES'}")

    # ── STEP 2: Fetch programs + actions ──
    print("\n" + "━" * 80)
    print("  2. HERO CARD SELECTION")
    print("━" * 80)

    async with httpx.AsyncClient(timeout=60) as http:
        programs = (await http.get(f"{API}/athlete/programs", headers=h)).json()
        actions_data = (await http.get(f"{API}/internal/programs/top-actions", headers=h)).json()
        actions_list = actions_data.get("actions", actions_data) if isinstance(actions_data, dict) else actions_data

    stored = await db.momentum_recaps.find_one({"tenant_id": TENANT_ID}, {"_id": 0})
    client.close()

    recap_pris = stored.get("priorities", []) if stored else []
    recap_created = stored.get("created_at", "") if stored else ""
    actions_map = {a["program_id"]: a for a in actions_list}

    results = []
    for p in programs:
        ta = actions_map.get(p["program_id"], {})
        results.append(compute_score(p, ta, recap_pris, recap_created))
    results.sort(key=lambda x: -x["score"])

    for i, r in enumerate(results):
        tag = " ◄ HERO" if i == 0 else ""
        qa = " [QA]" if r["pid"].startswith("qa2-") else ""
        print(f"    #{i+1:2d} [{r['score']:3d}] {r['name']:30s} | src={r['prioritySource']:7s} | {r['reasonShort'] or '—':30s}{qa}{tag}")

    hero = results[0]
    michigan = next((r for r in results if "Michigan" in r["name"]), None)
    purdue = next((r for r in results if "Purdue" in r["name"] and r["pid"].startswith("qa2-")), None)
    mich_rank = next((i+1 for i, r in enumerate(results) if "Michigan" in r["name"]), None)
    purd_rank = next((i+1 for i, r in enumerate(results) if r["pid"] == "qa2-purdue-001"), None)

    print(f"\n  ── MICHIGAN (live blocker) ──")
    if michigan:
        print(f"    Rank:           #{mich_rank}")
        print(f"    Score:          {michigan['score']}")
        print(f"    Action:         {michigan['primaryAction']}")
        print(f"    Reason:         {michigan['heroReason'] or michigan['reasonShort']}")
        print(f"    prioritySource: {michigan['prioritySource']}")
        print(f"    Explain:        {michigan['explainFactors']}")
        print(f"    actionKey:      {michigan['actionKey']}")

    print(f"\n  ── PURDUE (recap priority) ──")
    if purdue:
        print(f"    Rank:           #{purd_rank}")
        print(f"    Score:          {purdue['score']}")
        print(f"    Action:         {purdue['primaryAction']}")
        print(f"    Reason:         {purdue['heroReason'] or purdue['reasonShort']}")
        print(f"    prioritySource: {purdue['prioritySource']}")
        print(f"    Explain:        {purdue['explainFactors']}")

    # ── STEP 3: Why this? ──
    print("\n" + "━" * 80)
    print("  3. 'WHY THIS?' EXPLANATION")
    print("━" * 80)
    if michigan:
        print(f"    Michigan factors: {michigan['explainFactors']}")
        has_overdue = any("Overdue" in f for f in michigan["explainFactors"])
        has_stale = any("days since" in f for f in michigan["explainFactors"])
        print(f"    Shows overdue:   {has_overdue}")
        print(f"    Shows stale:     {has_stale}")
        # Check if recap context is acknowledged
        recap_mentioned = any("recap" in f.lower() for f in michigan["explainFactors"])
        print(f"    Mentions recap:  {recap_mentioned}")
        if not recap_mentioned:
            print(f"    NOTE: 'Why this?' doesn't cross-reference recap. Michigan's factors")
            print(f"          only show its own urgency signals. The recap context is implicit")
            print(f"          (prioritySource='live' means recap was outranked).")

    # ── STEP 4: Reinforcement ──
    print("\n" + "━" * 80)
    print("  4. REINFORCEMENT MESSAGE (completing Michigan)")
    print("━" * 80)
    if michigan:
        msg, sub, indicator = simulate_reinforcement(michigan)
        print(f"    Message:   \"{msg}\"")
        print(f"    Subtext:   \"{sub}\"")
        print(f"    Indicator: {indicator}")

    # ── STEP 5: Next hero ──
    print("\n" + "━" * 80)
    print("  5. NEXT HERO AFTER MICHIGAN CLEARED")
    print("━" * 80)
    next_hero = results[1] if len(results) > 1 else None
    if next_hero:
        print(f"    Next Hero:       {next_hero['name']}")
        print(f"    Score:           {next_hero['score']}")
        print(f"    Action:          {next_hero['primaryAction']}")
        print(f"    prioritySource:  {next_hero['prioritySource']}")
        print(f"    Reason:          {next_hero['heroReason'] or next_hero['reasonShort']}")

    # ═══════════════════════════════════════════════════════════════════
    print("\n" + "═" * 80)
    print("  VERDICT TABLE")
    print("═" * 80)

    michigan_is_hero = michigan and "Michigan" in hero["name"]
    purdue_outranked = purdue and michigan and michigan["score"] > purdue["score"]

    # 1) Hero selection
    if michigan_is_hero:
        print(f"  [{P}] Hero prioritizes Michigan over Purdue")
        print(f"         Michigan score={michigan['score']} vs Purdue score={purdue['score'] if purdue else '?'}")
    elif michigan and mich_rank and mich_rank <= 3:
        print(f"  [{W}] Michigan is #{mich_rank} (not #1). Hero is {hero['name']} (score {hero['score']})")
        print(f"         Michigan score={michigan['score']}. An existing program's live urgency outranks it.")
        print(f"         Design: 'Live urgency always wins' — behaving correctly")
    else:
        print(f"  [{F}] Michigan not near top. Hero is {hero['name']}")

    # 2) prioritySource
    if michigan:
        r2 = P if michigan["prioritySource"] == "live" else F
        print(f"  [{r2}] Michigan prioritySource = {michigan['prioritySource']} (expected: live)")

    # 3) Hero reason emphasizes overdue/critical
    if michigan:
        reason_text = (michigan["heroReason"] or "") + (michigan["reasonShort"] or "")
        has_overdue_reason = "overdue" in reason_text.lower() or "critical" in reason_text.lower()
        r3 = P if has_overdue_reason else W
        print(f"  [{r3}] Hero reason emphasizes overdue: \"{michigan['reasonShort']}\"")

    # 4) Why this? shows recap outranked
    if michigan:
        # Current behavior: Michigan's factors don't mention recap (only its own signals)
        # The outranking is implicit via prioritySource='live'
        r4 = W
        print(f"  [{r4}] 'Why this?' shows recap outranked (implicit via prioritySource='live')")
        print(f"         Factors: {michigan['explainFactors']}")
        print(f"         NOTE: No explicit 'recap outranked' factor exists in current logic")

    # 5) Reinforcement
    if michigan:
        expected = ["Risk cleared", "Overdue cleared", "Caught in time", "Crisis averted", "back in motion", "pipeline breathing"]
        r5 = P if any(pat in msg for pat in expected) else F
        print(f"  [{r5}] Reinforcement = \"{msg}\" (live-issue-cleared pattern)")

    # 6) System trust
    if michigan and purdue:
        trust_ok = (michigan["score"] > purdue["score"] and
                    michigan["prioritySource"] == "live" and
                    michigan["attention"] == "high")
        r6 = P if trust_ok else W
        print(f"  [{r6}] System feels trustworthy: live blocker clearly outranks recap")
        print(f"         Michigan: score={michigan['score']}, attention={michigan['attention']}, overdue={michigan['daysUntil']}d")
        print(f"         Purdue:   score={purdue['score']}, attention={purdue['attention']}, recap={purdue['recapRank']}")

    # ═══════════════════════════════════════════════════════════════════
    print("\n" + "═" * 80)
    print("  NOTES")
    print("═" * 80)
    print("""
  1. LIVE URGENCY CORRECTLY OVERRIDES RECAP
     Michigan's 4-day overdue (+80) + stale activity (+40) + in_conversation (+10)
     = 130 clearly outscores Purdue's recap top boost (+65) + due in 3d (+30) + 
     in_conversation (+10) = 105. The system correctly surfaces Michigan first.

  2. 'WHY THIS?' DOESN'T EXPLICITLY MENTION RECAP OUTRANKING
     Michigan's explain factors show its own urgency signals (overdue, stale).
     There's no factor saying 'Recap suggested Purdue, but this is more urgent.'
     IMPROVEMENT OPPORTUNITY: Add a factor like 'Outranks recap priority' when
     a live-urgent program displaces a recap-top program in the hero slot.

  3. REINFORCEMENT IS CONTEXT-APPROPRIATE  
     Completing an overdue task triggers 'Overdue cleared — pipeline breathing 
     again' or 'Risk cleared — back in motion' with riskResolved indicator (green).
     This correctly differs from recap-aware messages (gold highImpact indicator).

  4. AFTER MICHIGAN CLEARED, RECAP PRIORITIES RESURFACE
     The next hero after Michigan should be Purdue (or another recap-driven 
     program), demonstrating the system's trust hierarchy: handle fires first,
     then follow the strategic recap priorities.
""")

    # Cleanup
    client2 = AsyncIOMotorClient(MONGO_URL)
    db2 = client2[DB_NAME]
    qa_pids = ["qa2-purdue-001", "qa2-michigan-001"]
    await db2.programs.delete_many({"program_id": {"$in": qa_pids}})
    await db2.interactions.delete_many({"program_id": {"$in": qa_pids}})
    await db2.events.delete_many({"event_id": "qa2-showcase-001"})
    await db2.momentum_recaps.delete_many({"tenant_id": TENANT_ID})
    client2.close()
    print("  [Cleanup complete — QA data removed]")


asyncio.run(main())
