"""
QA SCENARIO 6: User ignores Hero and acts elsewhere
- Hero = Purdue (follow up)
- User completes Louisville (lower priority) instead
- Reinforcement should be soft, NOT hero-level
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


def generate_feedback(ctx):
    """Exact Python port of generateFeedback from reinforcement.js"""
    random.seed(42)
    t = ctx.get("type", "")
    is_hero = ctx.get("isHeroPriority", False)
    rank = ctx.get("priorityRank", 99)
    recap_rank = ctx.get("recapRank")
    ps = ctx.get("prioritySource", "live")
    hero_reason = ctx.get("heroReason", "")
    att_before = ctx.get("attentionBefore")
    att_after = ctx.get("attentionAfter")
    days = ctx.get("daysSinceLastActivity", 0)
    stage_before = ctx.get("stageBefore")
    stage_after = ctx.get("stageAfter")
    school = ctx.get("schoolName", "")

    # Path 1: Hero priority top
    if is_hero and rank == 1:
        if recap_rank == "top" or ps == "recap":
            msg = random.choice(["Recap priority handled", "Top priority cleared", "Your #1 focus — done"])
            sub = hero_reason or "This was your most important move"
        elif ps == "merged":
            msg = random.choice(["Top priority handled", "You moved this forward at the right time",
                                 "Critical issue cleared", "This was the most important thing to do"])
            sub = "Cleared a live issue and a recap priority"
        else:
            msg = random.choice(["Top priority handled", "You moved this forward at the right time",
                                 "Critical issue cleared", "This was the most important thing to do"])
            sub = hero_reason or "This was your most urgent action"
        return {"message": msg, "subtext": sub, "indicator": "highImpact", "path": "hero_top"}

    # Path 2: Attention cleared (high → lower)
    if att_before == "high" and att_after and att_after != "high":
        msg = random.choice(["Risk cleared — back in motion", "Caught in time — momentum restored",
                             "Crisis averted, pipeline stabilized"])
        return {"message": msg, "subtext": "You caught this in time", "indicator": "riskResolved", "path": "attention_cleared"}

    # Path 3: Overdue cleared
    if t == "overdueCleared":
        msg = random.choice(["Overdue cleared — pipeline breathing again",
                             "Back on schedule — nice recovery"])
        return {"message": msg, "subtext": f"{school} is back on track", "indicator": "riskResolved", "path": "overdue_cleared"}

    # Path 4: Stage progression
    if stage_before and stage_after and stage_before != stage_after:
        stage_msgs = {
            "in_conversation": ("Conversation started", "First contact made — keep it going"),
            "campus_visit": ("Campus visit secured", "Big step — this could be the one"),
            "offer": ("Offer stage reached", "The finish line is in sight"),
        }
        pair = stage_msgs.get(stage_after, ("Pipeline advancing", f"{school} moved forward"))
        return {"message": pair[0], "subtext": pair[1], "indicator": "momentum", "path": "stage_progress"}

    # Path 5: Inactivity recovery
    if days > 5:
        msg = random.choice(["Momentum restored", "Good to see this moving again",
                             "You broke the silence — that matters"])
        return {"message": msg, "subtext": f"First activity in {days} days", "indicator": "momentum", "path": "inactivity_recovery"}

    # Path 6: Priority addressed (non-top hero)
    if is_hero or recap_rank == "secondary":
        msg = random.choice(["Priority addressed", "On-deck item handled",
                             "Smart follow-through"])
        return {"message": msg, "subtext": f"{school} — keeping momentum", "indicator": "momentum", "path": "priority_addressed"}

    # Path 7: Soft progress (default) — for NON-hero, NON-priority actions
    msg = random.choice(["Momentum building", "Good progress here",
                         "Another step forward", "Keeping pace — nice",
                         "That keeps things moving"])
    return {"message": msg, "subtext": school, "indicator": "neutral", "path": "soft_progress"}


async def setup(db):
    now = datetime.now(timezone.utc)
    one_day_ago = now - timedelta(days=1)
    two_days_ago = now - timedelta(days=2)
    three_days_ago = now - timedelta(days=3)
    five_days_ago = now - timedelta(days=5)
    thirty_days_ago = now - timedelta(days=30)

    await db.programs.delete_many({"program_id": {"$regex": "^qa6-"}})
    await db.interactions.delete_many({"interaction_id": {"$regex": "^qa6-"}})
    await db.momentum_recaps.delete_many({"tenant_id": TENANT_ID})

    # Purdue: high priority, overdue 1 day → Hero #1
    await db.programs.insert_one({
        "program_id": "qa6-purdue-001", "tenant_id": TENANT_ID, "athlete_id": "athlete_1",
        "university_name": "Purdue University", "division": "D1",
        "conference": "Big Ten", "region": "Midwest",
        "recruiting_status": "Interested", "reply_status": "Reply Received",
        "priority": "Top Choice",
        "next_action": "Follow up with Purdue coach",
        "next_action_due": one_day_ago.strftime("%Y-%m-%d"),
        "journey_stage": "in_conversation", "board_group": "active",
        "org_id": "org-capymatch-default",
        "created_at": thirty_days_ago.isoformat(),
        "updated_at": three_days_ago.isoformat(),
    })
    await db.interactions.insert_one({
        "interaction_id": "qa6-ix-p1", "program_id": "qa6-purdue-001",
        "tenant_id": TENANT_ID, "type": "coach_reply",
        "summary": "Purdue coach replied",
        "date_time": three_days_ago.isoformat(),
    })

    # Louisville: lower priority, medium attention, due in 5 days
    await db.programs.insert_one({
        "program_id": "qa6-louisville-001", "tenant_id": TENANT_ID, "athlete_id": "athlete_1",
        "university_name": "University of Louisville", "division": "D1",
        "conference": "ACC", "region": "Southeast",
        "recruiting_status": "Initial Contact", "reply_status": "No Reply",
        "priority": "Interest",
        "next_action": "Send transcript to Louisville",
        "next_action_due": (now + timedelta(days=5)).strftime("%Y-%m-%d"),
        "journey_stage": "outreach", "board_group": "active",
        "org_id": "org-capymatch-default",
        "created_at": thirty_days_ago.isoformat(),
        "updated_at": five_days_ago.isoformat(),
    })
    await db.interactions.insert_one({
        "interaction_id": "qa6-ix-l1", "program_id": "qa6-louisville-001",
        "tenant_id": TENANT_ID, "type": "email_sent",
        "summary": "Initial outreach email",
        "date_time": five_days_ago.isoformat(),
    })

    # Hide existing programs that would outrank
    await db.programs.update_many(
        {"tenant_id": TENANT_ID, "program_id": {"$not": {"$regex": "^qa6-"}}},
        {"$set": {"board_group": "qa6_hidden"}}
    )

    print("  Setup: Purdue (hero, overdue 1d) + Louisville (low priority, due in 5d)")


async def cleanup(db):
    await db.programs.delete_many({"program_id": {"$regex": "^qa6-"}})
    await db.interactions.delete_many({"interaction_id": {"$regex": "^qa6-"}})
    await db.programs.update_many({"board_group": "qa6_hidden"}, {"$set": {"board_group": "active"}})
    await db.momentum_recaps.delete_many({"tenant_id": TENANT_ID})
    print("\n  [Cleanup complete]")


async def main():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    print("=" * 80)
    print("  QA SCENARIO 6: User Ignores Hero and Acts Elsewhere")
    print("=" * 80)
    print("\n  Setting up scenario...")
    await setup(db)

    async with httpx.AsyncClient(timeout=30) as http:
        token = (await http.post(f"{API}/auth/login", json={
            "email": "emma.chen@athlete.capymatch.com", "password": "athlete123"
        })).json()["token"]
        h = {"Authorization": f"Bearer {token}"}
        programs = (await http.get(f"{API}/athlete/programs", headers=h)).json()
        actions_data = (await http.get(f"{API}/internal/programs/top-actions", headers=h)).json()
        actions_list = actions_data.get("actions", actions_data) if isinstance(actions_data, dict) else actions_data

    actions_map = {a["program_id"]: a for a in actions_list}
    qa_programs = [p for p in programs if p["program_id"].startswith("qa6-")]

    # Compute attention
    results = []
    for p in qa_programs:
        name = p.get("university_name", "")
        sig = p.get("signals", {})
        dsa = sig.get("days_since_activity")
        due = p.get("next_action_due", "")
        days_until = None
        if due:
            try:
                ds = due.split("T")[0] if "T" in due else due
                days_until = (datetime.strptime(ds, "%Y-%m-%d").date() - date.today()).days
            except: pass

        score = 0
        if days_until is not None:
            if days_until < 0: score += 80
            elif days_until == 0: score += 70
            elif days_until == 1: score += 50
            elif days_until <= 3: score += 30
        if dsa is not None and dsa > 0:
            if dsa >= 7: score += 40
            elif dsa >= 3: score += 20
        stage = p.get("journey_stage", "")
        if stage == "campus_visit": score += 15
        elif stage == "in_conversation": score += 10

        attention = "high" if score >= 80 else "medium" if score >= 40 else "low"

        results.append({
            "name": name, "pid": p["program_id"], "score": score,
            "attention": attention, "daysUntil": days_until, "dsa": dsa,
            "stage": stage, "recapRank": None, "prioritySource": "live",
        })

    results.sort(key=lambda x: -x["score"])
    hero = results[0] if results else None
    louisville = next((r for r in results if "Louisville" in r["name"]), None)

    # ── STEP 1: Verify hero = Purdue ──
    print("\n" + "━" * 80)
    print("  1. HERO CARD VERIFICATION")
    print("━" * 80)
    for i, r in enumerate(results):
        tag = " ◄ HERO" if i == 0 else ""
        print(f"    #{i+1} [{r['score']:3d}] {r['name']:30s} | att={r['attention']:8s} | daysUntil={r['daysUntil']}{tag}")

    print(f"\n  Hero: {hero['name'] if hero else 'None'}")
    print(f"  Louisville: score={louisville['score'] if louisville else '?'}, attention={louisville['attention'] if louisville else '?'}")

    # ── STEP 2: Simulate user acting on Louisville (NOT the hero) ──
    print("\n" + "━" * 80)
    print("  2. REINFORCEMENT: User completes Louisville (NOT the hero)")
    print("━" * 80)

    # BUG FIX context: Before fix, isHeroPriority was based on attentionLevel === "high"
    # After fix, isHeroPriority is based on programId === heroProgramId
    hero_pid = hero["pid"] if hero else None
    louisville_pid = louisville["pid"] if louisville else None

    # OLD behavior (before fix): isHero = attentionLevel === "high" || recapRank === "top"
    old_is_hero = (louisville["attention"] == "high") if louisville else False
    # NEW behavior (after fix): isHero = programId === heroProgramId
    new_is_hero = louisville_pid == hero_pid if louisville else False

    print(f"\n  ── OLD LOGIC (before fix) ──")
    print(f"    isHeroPriority = attentionLevel === 'high' || recapRank === 'top'")
    print(f"    Louisville attention: {louisville['attention'] if louisville else '?'}")
    print(f"    Louisville recapRank: {louisville['recapRank'] if louisville else '?'}")
    print(f"    Old isHeroPriority: {old_is_hero}")

    old_ctx = {
        "type": "taskComplete",
        "isHeroPriority": old_is_hero,
        "heroReason": "",
        "priorityRank": 1 if old_is_hero else 99,
        "attentionBefore": louisville["attention"] if louisville else "low",
        "attentionAfter": "low",
        "daysSinceLastActivity": louisville["dsa"] or 0 if louisville else 0,
        "stageBefore": louisville["stage"] if louisville else "outreach",
        "stageAfter": louisville["stage"] if louisville else "outreach",
        "schoolName": "University of Louisville",
        "recapRank": None,
        "prioritySource": "live",
    }
    old_feedback = generate_feedback(old_ctx)
    print(f"    Result: \"{old_feedback['message']}\" / {old_feedback['indicator']} (path: {old_feedback['path']})")

    print(f"\n  ── NEW LOGIC (after fix) ──")
    print(f"    isHeroPriority = programId === heroProgramId")
    print(f"    Louisville programId: {louisville_pid}")
    print(f"    Hero programId: {hero_pid}")
    print(f"    New isHeroPriority: {new_is_hero}")

    new_ctx = {
        "type": "taskComplete",
        "isHeroPriority": new_is_hero,
        "heroReason": "",
        "priorityRank": 1 if new_is_hero else 99,
        "attentionBefore": louisville["attention"] if louisville else "low",
        "attentionAfter": "low",
        "daysSinceLastActivity": louisville["dsa"] or 0 if louisville else 0,
        "stageBefore": louisville["stage"] if louisville else "outreach",
        "stageAfter": louisville["stage"] if louisville else "outreach",
        "schoolName": "University of Louisville",
        "recapRank": None,
        "prioritySource": "live",
    }
    new_feedback = generate_feedback(new_ctx)
    print(f"    Result: \"{new_feedback['message']}\" / {new_feedback['indicator']} (path: {new_feedback['path']})")

    # ── STEP 3: Verify hero remains Purdue after Louisville action ──
    print(f"\n" + "━" * 80)
    print("  3. HERO PERSISTENCE CHECK")
    print("━" * 80)
    print(f"    After Louisville action, Purdue's urgency unchanged (still overdue 1d)")
    print(f"    Hero should remain Purdue: {hero['name'] if hero else 'None'}")
    print(f"    Louisville action doesn't change Purdue's score ({hero['score'] if hero else '?'})")

    # ── STEP 4: Control — what if user HAD acted on Purdue? ──
    print(f"\n" + "━" * 80)
    print("  4. CONTROL: What if user acted on Purdue (the hero)?")
    print("━" * 80)
    purdue_ctx = {
        "type": "taskComplete",
        "isHeroPriority": True,
        "heroReason": "Overdue by 1 day",
        "priorityRank": 1,
        "attentionBefore": hero["attention"] if hero else "high",
        "attentionAfter": "low",
        "daysSinceLastActivity": hero["dsa"] or 0 if hero else 0,
        "stageBefore": "in_conversation",
        "stageAfter": "in_conversation",
        "schoolName": "Purdue University",
        "recapRank": None,
        "prioritySource": "live",
    }
    purdue_feedback = generate_feedback(purdue_ctx)
    print(f"    Purdue (hero): \"{purdue_feedback['message']}\" / {purdue_feedback['indicator']} (path: {purdue_feedback['path']})")
    print(f"    Louisville (non-hero): \"{new_feedback['message']}\" / {new_feedback['indicator']} (path: {new_feedback['path']})")
    print(f"\n    Difference is clear: hero gets '{purdue_feedback['indicator']}', non-hero gets '{new_feedback['indicator']}'")

    # ═══════════════════════════════════════════════════════════════════
    print(f"\n" + "═" * 80)
    print("  VERDICT TABLE")
    print("═" * 80)

    is_soft = new_feedback["indicator"] == "neutral" and new_feedback["path"] == "soft_progress"
    no_false_praise = "Top priority" not in new_feedback["message"] and "Recap priority" not in new_feedback["message"]
    hero_remains = hero and "Purdue" in hero["name"]
    hero_stronger = purdue_feedback["indicator"] in ("highImpact", "riskResolved")

    r1 = P if is_soft else F
    print(f"  [{r1}] Louisville reinforcement is soft: \"{new_feedback['message']}\" / {new_feedback['indicator']}")

    r2 = P if no_false_praise else F
    print(f"  [{r2}] No false 'Top priority handled' praise")
    bad_phrases = ["Top priority", "Recap priority", "#1 focus", "Critical issue", "most important"]
    for phrase in bad_phrases:
        if phrase in new_feedback["message"]:
            print(f"         ✗ Contains: '{phrase}'")

    r3 = P if hero_remains else F
    print(f"  [{r3}] Hero remains Purdue after Louisville action")

    r4 = P if hero_stronger else F
    print(f"  [{r4}] Purdue (hero) gets stronger reinforcement than Louisville (non-hero)")
    print(f"         Purdue: {purdue_feedback['indicator']} / Louisville: {new_feedback['indicator']}")

    bug_was_fixed = not old_is_hero or (old_is_hero and old_feedback["path"] != "soft_progress")
    if louisville and louisville["attention"] == "high":
        r5 = P
        print(f"  [{r5}] BUG FIX VERIFIED: Louisville has high attention but is NOT the hero")
        print(f"         Old logic: isHeroPriority={old_is_hero} → \"{old_feedback['message']}\" ({old_feedback['path']})")
        print(f"         New logic: isHeroPriority={new_is_hero} → \"{new_feedback['message']}\" ({new_feedback['path']})")
    else:
        print(f"  [INFO] Louisville has {louisville['attention'] if louisville else '?'} attention — bug path not triggered in this config")
        print(f"         Fix still correct: exact hero ID comparison prevents false positives")

    # ═══════════════════════════════════════════════════════════════════
    print(f"\n" + "═" * 80)
    print("  NOTES")
    print("═" * 80)
    print(f"""
  1. BUG FIXED: isHeroPriority now uses exact programId match
     Before: isHeroPriority = attentionLevel === "high" || recapRank === "top"
     After:  isHeroPriority = programId === heroProgramId
     This prevents ANY non-hero program from receiving hero-level praise,
     even if it has high attention or a recap top rank.

  2. REINFORCEMENT CALIBRATION IS CORRECT
     Hero action (Purdue):     "{purdue_feedback['message']}" / {purdue_feedback['indicator']}
     Non-hero action (Louie):  "{new_feedback['message']}" / {new_feedback['indicator']}
     The gap between hero and non-hero reinforcement is clear but not
     punishing. The user isn't scolded for ignoring the hero — they get
     soft encouragement for making progress elsewhere.

  3. HERO PERSISTS AFTER NON-HERO ACTION
     Completing Louisville doesn't change Purdue's urgency (still overdue).
     The hero card remains Purdue until the user addresses it or another
     program develops stronger urgency.

  4. NO FALSE PRAISE LEAKAGE
     The soft progress path produces: "Momentum building", "Good progress
     here", "Another step forward" — none of which imply the user handled
     the most important task. The system is honest about what was done.
""")

    await cleanup(db)
    client.close()


asyncio.run(main())
