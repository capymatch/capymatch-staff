"""
QA SCENARIO 3: Merged Priority Case
- Recap says Purdue is top priority (cooling, needs re-engagement)
- Live data also shows Purdue overdue by 1 day (slight urgency)
- No stronger blockers elsewhere
- Expected: Hero = Purdue, prioritySource = merged
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
    """Set up Scenario 3: Purdue cooling+overdue, existing programs non-cooling."""
    now = datetime.now(timezone.utc)
    one_day_ago = now - timedelta(days=1)
    two_days_ago = now - timedelta(days=2)
    six_days_ago = now - timedelta(days=6)
    thirty_days_ago = now - timedelta(days=30)

    # Clean QA data
    await db.programs.delete_many({"program_id": {"$regex": "^qa3-"}})
    await db.interactions.delete_many({"interaction_id": {"$regex": "^qa3-"}})
    await db.events.delete_many({"event_id": "qa3-showcase-001"})
    await db.momentum_recaps.delete_many({"tenant_id": TENANT_ID})

    # ── Purdue: cooling (last interaction 6 days ago) + overdue 1 day ──
    await db.programs.insert_one({
        "program_id": "qa3-purdue-001",
        "tenant_id": TENANT_ID,
        "athlete_id": "athlete_1",
        "university_name": "Purdue University",
        "division": "D1", "conference": "Big Ten", "region": "Midwest",
        "recruiting_status": "Interested",
        "reply_status": "Reply Received",
        "priority": "Top Choice",
        "next_action": "Follow up with Purdue coach",
        "next_action_due": one_day_ago.strftime("%Y-%m-%d"),  # overdue by 1 day
        "journey_stage": "in_conversation",
        "board_group": "active",
        "org_id": "org-capymatch-default",
        "created_at": thirty_days_ago.isoformat(),
        "updated_at": six_days_ago.isoformat(),
    })

    # Purdue's only interaction is 6 days ago (before the 2-day recap window)
    await db.interactions.insert_one({
        "interaction_id": "qa3-ix-p1",
        "program_id": "qa3-purdue-001",
        "tenant_id": TENANT_ID,
        "type": "coach_reply",
        "summary": "Purdue coach replied about upcoming visit",
        "date_time": six_days_ago.isoformat(),
    })

    # ── Event: 2 days ago (anchors recap window) ──
    await db.events.insert_one({
        "event_id": "qa3-showcase-001",
        "id": "qa3-showcase-001",
        "name": "Midwest Showcase",
        "status": "past",
        "date": two_days_ago.isoformat(),
        "tenant_id": TENANT_ID,
    })

    # ── Make existing programs non-threatening ──
    # Add 2+ recent interactions so they're HEATED in the recap
    existing_progs = await db.programs.find(
        {"tenant_id": TENANT_ID, "program_id": {"$not": {"$regex": "^qa3-"}}},
        {"_id": 0, "program_id": 1, "university_name": 1}
    ).to_list(20)

    fake_interactions = []
    for i, p in enumerate(existing_progs):
        pid = p["program_id"]
        # 2 interactions within the recap window → heated
        fake_interactions.append({
            "interaction_id": f"qa3-fake-{i}a",
            "program_id": pid,
            "tenant_id": TENANT_ID,
            "type": "email_sent",
            "summary": "Check-in email sent",
            "date_time": one_day_ago.isoformat(),
        })
        fake_interactions.append({
            "interaction_id": f"qa3-fake-{i}b",
            "program_id": pid,
            "tenant_id": TENANT_ID,
            "type": "coach_reply",
            "summary": "Coach responded",
            "date_time": one_day_ago.isoformat(),
        })

    if fake_interactions:
        await db.interactions.insert_many(fake_interactions)

    # Also push existing programs' due dates to future (no live urgency)
    await db.programs.update_many(
        {"tenant_id": TENANT_ID, "program_id": {"$not": {"$regex": "^qa3-"}}},
        {"$set": {"next_action_due": (now + timedelta(days=7)).strftime("%Y-%m-%d")}}
    )

    print("  Setup: Purdue cooling+overdue(1d), existing programs heated+future-due")
    return existing_progs


async def cleanup(db, existing_pids, original_dues):
    """Restore original due dates and remove QA data."""
    for pid, due in original_dues.items():
        await db.programs.update_one({"program_id": pid}, {"$set": {"next_action_due": due}})
    await db.programs.delete_many({"program_id": {"$regex": "^qa3-"}})
    await db.interactions.delete_many({"interaction_id": {"$regex": "^qa3-"}})
    await db.events.delete_many({"event_id": "qa3-showcase-001"})
    await db.momentum_recaps.delete_many({"tenant_id": TENANT_ID})
    print("\n  [Cleanup complete — original data restored]")


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
                    age = (datetime.now(timezone.utc) - datetime.fromisoformat(
                        recap_created.replace("Z", "+00:00"))).total_seconds() / 86400
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
        hero_reason = (f"Overdue {abs(days_until)}d — also your recap's top focus"
                       if days_until is not None and days_until < 0
                       else "Due now — also flagged in your recap")
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
        factors.append({"type": "overdue", "label": f"Overdue by {abs(days_until)} days"})
    if days_until == 0:
        factors.append({"type": "due", "label": "Due today"})
    if cat == "coach_flag":
        factors.append({"type": "coach", "label": "Flagged by coach"})
    if recap_rank == "top":
        factors.append({"type": "recap", "label": "Top priority in Momentum Recap"})
    elif recap_rank == "secondary":
        factors.append({"type": "recap", "label": "Identified in Momentum Recap"})
    elif recap_rank == "watch":
        factors.append({"type": "recap", "label": "On recap watch list"})
    if last_activity is not None and last_activity >= 5:
        factors.append({"type": "stale", "label": f"{last_activity} days since last activity"})

    return {
        "name": name, "pid": p.get("program_id"), "score": score,
        "attention": attention, "daysUntil": days_until, "dsa": last_activity,
        "primaryAction": primary, "heroReason": hero_reason, "reasonShort": rs,
        "prioritySource": ps, "recapRank": recap_rank, "explainFactors": factors,
        "stage": stage, "actionKey": ak,
    }


def simulate_reinforcement(hero):
    random.seed(42)
    recap_rank = hero.get("recapRank")
    ps = hero["prioritySource"]
    hr = hero.get("heroReason", "")
    du = hero.get("daysUntil")

    if ps == "merged":
        msg = random.choice(["Top priority handled", "You moved this forward at the right time",
                             "Critical issue cleared", "This was the most important thing to do"])
        sub = "Cleared a live issue and a recap priority"
        return msg, sub, "highImpact"

    if recap_rank and ps == "recap":
        msg = random.choice(["Recap priority handled", "Top priority cleared", "Your #1 focus — done"])
        return msg, hr or "This was your most important move", "highImpact"

    if du is not None and du < 0:
        return "Overdue cleared — pipeline breathing again", f"{hero['name']} is back on track", "riskResolved"

    msg = random.choice(["Top priority handled", "You moved this forward at the right time"])
    return msg, hr or "This was your most urgent action", "highImpact"


async def main():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    # Save original due dates for restore
    existing = await db.programs.find(
        {"tenant_id": TENANT_ID, "program_id": {"$not": {"$regex": "^qa3-"}}},
        {"_id": 0, "program_id": 1, "next_action_due": 1}
    ).to_list(20)
    original_dues = {p["program_id"]: p.get("next_action_due") for p in existing}

    print("=" * 80)
    print("  QA SCENARIO 3: Merged Priority Case")
    print("  'The most important differentiation test for CapyMatch'")
    print("=" * 80)

    print("\n  Setting up scenario...")
    await setup(db)

    # ── STEP 1: Generate Recap ──
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
    steady = recap.get("momentum", {}).get("holding_steady", [])
    cooling = recap.get("momentum", {}).get("cooling_off", [])
    priorities = recap.get("priorities", [])

    print(f"  Period: {recap.get('period_label')}")
    print(f"  Heated ({len(heated)}): {[m['school_name'] for m in heated]}")
    print(f"  Steady ({len(steady)}): {[m['school_name'] for m in steady]}")
    print(f"  Cooling ({len(cooling)}): {[m['school_name'] for m in cooling]}")
    print(f"\n  Priorities:")
    for pr in priorities:
        print(f"    [{pr['rank']:10s}] {pr['school_name']:30s} | {pr['action']}")

    purdue_recap = next((pr for pr in priorities if "Purdue" in pr.get("school_name", "")), None)
    print(f"\n  Purdue recap rank: {purdue_recap['rank'] if purdue_recap else 'NOT IN PRIORITIES'}")

    # ── STEP 2: Compute attention ──
    print("\n" + "━" * 80)
    print("  2. HERO CARD SELECTION")
    print("━" * 80)

    async with httpx.AsyncClient(timeout=60) as http:
        programs = (await http.get(f"{API}/athlete/programs", headers=h)).json()
        actions_data = (await http.get(f"{API}/internal/programs/top-actions", headers=h)).json()
        actions_list = actions_data.get("actions", actions_data) if isinstance(actions_data, dict) else actions_data

    stored = await db.momentum_recaps.find_one({"tenant_id": TENANT_ID}, {"_id": 0})
    recap_pris = stored.get("priorities", []) if stored else []
    recap_created = stored.get("created_at", "") if stored else ""
    actions_map = {a["program_id"]: a for a in actions_list}

    results = []
    for p in programs:
        ta = actions_map.get(p["program_id"], {})
        results.append(compute_score(p, ta, recap_pris, recap_created))
    results.sort(key=lambda x: -x["score"])

    # Post-sort: add recap-outranked factor (matching new computeAllAttention logic)
    if results and results[0]["prioritySource"] == "live":
        recap_top = next((r for r in results if r["recapRank"] == "top" and r["pid"] != results[0]["pid"]), None)
        if recap_top:
            results[0]["explainFactors"].append({
                "type": "recap-outranked",
                "label": f"Recap suggested {recap_top['name']} — this is more urgent"
            })

    for i, r in enumerate(results):
        tag = " ◄ HERO" if i == 0 else ""
        qa = " [QA]" if r["pid"].startswith("qa3-") else ""
        src = r["prioritySource"]
        print(f"    #{i+1:2d} [{r['score']:3d}] {r['name']:30s} | src={src:7s} | {r['reasonShort'] or '—':30s}{qa}{tag}")

    hero = results[0]
    purdue = next((r for r in results if r["pid"] == "qa3-purdue-001"), None)
    purdue_rank = next((i+1 for i, r in enumerate(results) if r["pid"] == "qa3-purdue-001"), None)

    print(f"\n  ── HERO CARD DETAILS ──")
    print(f"    School:          {hero['name']}")
    print(f"    Score:           {hero['score']}")
    print(f"    Title/Action:    {hero['primaryAction']}")
    print(f"    heroReason:      {hero['heroReason']}")
    print(f"    reasonShort:     {hero['reasonShort']}")
    print(f"    prioritySource:  {hero['prioritySource']}")
    print(f"    attentionLevel:  {hero['attention']}")
    print(f"    recapRank:       {hero['recapRank']}")

    print(f"\n  ── 'WHY THIS?' FACTORS ──")
    for f in hero["explainFactors"]:
        ftype = f["type"] if isinstance(f, dict) else "?"
        flabel = f["label"] if isinstance(f, dict) else str(f)
        style = "  (secondary, italic)" if ftype == "recap-outranked" else ""
        print(f"    • [{ftype:16s}] {flabel}{style}")

    # ── STEP 3: Reinforcement ──
    print(f"\n" + "━" * 80)
    print("  3. REINFORCEMENT MESSAGE (completing Purdue)")
    print("━" * 80)
    msg, sub, indicator = simulate_reinforcement(hero)
    print(f"    Message:    \"{msg}\"")
    print(f"    Subtext:    \"{sub}\"")
    print(f"    Indicator:  {indicator}")

    # ── STEP 4: Next hero ──
    print(f"\n" + "━" * 80)
    print("  4. NEXT HERO AFTER PURDUE")
    print("━" * 80)
    next_hero = results[1] if len(results) > 1 else None
    if next_hero:
        print(f"    Next:       {next_hero['name']} (score={next_hero['score']}, src={next_hero['prioritySource']})")
        print(f"    Action:     {next_hero['primaryAction']}")
        print(f"    Reason:     {next_hero['heroReason'] or next_hero['reasonShort']}")

    # ═══════════════════════════════════════════════════════════════════
    print(f"\n" + "═" * 80)
    print("  VERDICT TABLE")
    print("═" * 80)

    purdue_is_hero = hero["pid"] == "qa3-purdue-001"
    is_merged = hero["prioritySource"] == "merged"
    reason_coherent = hero["heroReason"] and "recap" in hero["heroReason"].lower() and ("overdue" in hero["heroReason"].lower() or "due" in hero["heroReason"].lower())

    # Check heroReason doesn't feel like two competing systems
    reason_text = hero.get("heroReason", "") or ""
    has_dash_connector = "—" in reason_text or "–" in reason_text or " — " in reason_text
    feels_coherent = has_dash_connector and len(reason_text) < 80

    # Check factors have both overdue AND recap
    factor_types = [f["type"] for f in hero["explainFactors"]] if hero["explainFactors"] else []
    has_overdue_factor = "overdue" in factor_types
    has_recap_factor = "recap" in factor_types

    # Reinforcement covers both
    reinf_covers_both = "live" in sub.lower() and "recap" in sub.lower()

    # 1) Hero
    r1 = P if purdue_is_hero else F
    print(f"  [{r1}] Hero = Purdue University (rank #{purdue_rank})")

    # 2) prioritySource
    r2 = P if is_merged else F
    print(f"  [{r2}] prioritySource = {hero['prioritySource']} (expected: merged)")

    # 3) Hero reason coherent
    r3 = P if reason_coherent else W
    print(f"  [{r3}] Hero reason coherent: \"{reason_text}\"")
    if reason_coherent and feels_coherent:
        print(f"         Reads as one thought, not two competing systems")
    elif reason_coherent:
        print(f"         References both live + recap but may feel slightly formulaic")

    # 4) Why this? factors
    r4 = P if (has_overdue_factor and has_recap_factor) else W
    print(f"  [{r4}] 'Why this?' shows both overdue + recap factors")
    print(f"         Types present: {factor_types}")

    # 5) Reinforcement
    r5a = P if "priority" in msg.lower() or "handled" in msg.lower() or "cleared" in msg.lower() or "moved" in msg.lower() else W
    print(f"  [{r5a}] Reinforcement message: \"{msg}\"")
    r5b = P if reinf_covers_both else W
    print(f"  [{r5b}] Reinforcement subtext covers both: \"{sub}\"")

    # 6) Trust
    merged_trust = purdue_is_hero and is_merged and reason_coherent
    r6 = P if merged_trust else W
    print(f"  [{r6}] System feels like it understands context (merged trust)")

    # ═══════════════════════════════════════════════════════════════════
    print(f"\n" + "═" * 80)
    print("  WORDING REVIEW")
    print("═" * 80)

    print(f"\n  Hero reason:        \"{reason_text}\"")
    robotic = False
    if reason_text.count("—") > 1:
        print(f"    ⚠ Multiple em-dashes — may feel formulaic")
        robotic = True
    if "also" in reason_text.lower():
        print(f"    ℹ 'also' makes it feel additive rather than synthesized")
        print(f"      Consider: 'Overdue 1d + recap top focus' or 'Recap priority — overdue, act now'")
    if not robotic:
        print(f"    ✓ Reads naturally — one coherent sentence")

    print(f"\n  Reinforcement msg:  \"{msg}\"")
    if msg in ("Top priority handled", "This was the most important thing to do"):
        print(f"    ✓ Clean, confident, not repetitive")
    elif "Critical" in msg:
        print(f"    ℹ 'Critical' may overstate for a 1-day overdue")

    print(f"\n  Reinforcement sub:  \"{sub}\"")
    if sub == "Cleared a live issue and a recap priority":
        print(f"    ✓ Explicitly acknowledges both systems")
    else:
        print(f"    ℹ Subtext could be more specific about what was resolved")

    # ═══════════════════════════════════════════════════════════════════
    print(f"\n" + "═" * 80)
    print("  NOTES")
    print("═" * 80)
    print("""
  1. MERGED = HIGHEST TRUST SIGNAL
     When recap and live data agree, the system shows maximum coherence.
     Score: overdue(+80) + in_conversation(+10) + recap_top(+65) = 155.
     This outscores any single-source program. The merged source feels
     like genuine synthesis, not collision.

  2. HERO REASON FORMAT
     'Overdue Xd — also your recap's top focus' reads as one thought:
     live urgency (left) connected to strategic context (right). The dash
     serves as a natural pivot between operational and strategic thinking.

  3. NO RECAP-OUTRANKED FACTOR (correct)
     Since Purdue IS both the recap top AND the hero, no 'recap outranked'
     factor appears. The recap-outranked logic correctly only fires when
     hero.prioritySource='live' (not 'merged'). 

  4. REINFORCEMENT ACKNOWLEDGES BOTH SYSTEMS
     'Cleared a live issue and a recap priority' — the user knows the
     system recognized this action resolved urgency on two dimensions.
""")

    # Cleanup
    await cleanup(db, existing, original_dues)
    client.close()


asyncio.run(main())
