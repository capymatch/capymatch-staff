"""
QA Validation: Hero → Action → Reinforcement → Recap → Hero
SCENARIO 1: Strong post-event momentum

Sets up the scenario, then validates each step of the loop.
"""
import asyncio
import json
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "test_database"

# Scenario schools
SCHOOLS = {
    "purdue": {
        "name": "Purdue University",
        "program_id": "qa-purdue-001",
        "recruiting_status": "Interested",   # Moved to Active/Interested
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

async def main():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    now = datetime.now(timezone.utc)
    two_days_ago = now - timedelta(days=2)
    one_day_ago = now - timedelta(days=1)
    ten_days_ago = now - timedelta(days=10)

    # Find Emma's athlete record
    emma_user = await db.users.find_one({"email": "emma.chen@athlete.capymatch.com"}, {"_id": 0})
    if not emma_user:
        print("ERROR: Emma Chen user not found")
        return
    user_id = emma_user["user_id"]
    tenant_id = emma_user.get("tenant_id", "")
    print(f"Emma's user_id={user_id}, tenant_id={tenant_id}")

    # ── STEP 1: Clean up any previous QA data ──
    qa_pids = [s["program_id"] for s in SCHOOLS.values()]
    await db.programs.delete_many({"program_id": {"$in": qa_pids}})
    await db.interactions.delete_many({"program_id": {"$in": qa_pids}})
    await db.tasks.delete_many({"program_id": {"$in": qa_pids}})

    # ── STEP 2: Insert scenario programs ──
    programs_to_insert = []
    for key, school in SCHOOLS.items():
        programs_to_insert.append({
            "program_id": school["program_id"],
            "tenant_id": tenant_id,
            "university_name": school["name"],
            "recruiting_status": school["recruiting_status"],
            "journey_stage": school["journey_stage"],
            "reply_status": school["reply_status"],
            "board_group": "active",
            "next_action": "Follow up" if key == "purdue" else "Send transcript" if key == "indiana_state" else None,
            "next_action_due": (now + timedelta(days=1)).isoformat() if key == "purdue" else (now + timedelta(days=3)).isoformat() if key == "indiana_state" else None,
            "signals": {
                "days_since_activity": 1 if key == "purdue" else 2 if key == "indiana_state" else 5 if key == "ball_state" else 12 if key == "louisville" else 0,
            },
            "updated_at": one_day_ago.isoformat() if key in ("purdue", "indiana_state") else ten_days_ago.isoformat(),
            "created_at": (now - timedelta(days=30)).isoformat(),
        })
    await db.programs.insert_many(programs_to_insert)
    print(f"Inserted {len(programs_to_insert)} QA programs")

    # ── STEP 3: Insert scenario interactions ──
    interactions = []

    # Purdue: stage change (Interested → Active) + multiple recent touchpoints
    interactions.append({
        "interaction_id": "qa-ix-purdue-1",
        "program_id": SCHOOLS["purdue"]["program_id"],
        "tenant_id": tenant_id,
        "type": "coach_reply",
        "summary": "Purdue coach replied expressing strong interest",
        "date_time": one_day_ago.isoformat(),
    })
    interactions.append({
        "interaction_id": "qa-ix-purdue-2",
        "program_id": SCHOOLS["purdue"]["program_id"],
        "tenant_id": tenant_id,
        "type": "Stage Change",
        "summary": "Moved from Interested to Active",
        "date_time": two_days_ago.isoformat(),
    })
    interactions.append({
        "interaction_id": "qa-ix-purdue-3",
        "program_id": SCHOOLS["purdue"]["program_id"],
        "tenant_id": tenant_id,
        "type": "email_sent",
        "summary": "Initial follow-up email sent",
        "date_time": two_days_ago.isoformat(),
    })

    # Indiana State: coach conversation logged
    interactions.append({
        "interaction_id": "qa-ix-indiana-1",
        "program_id": SCHOOLS["indiana_state"]["program_id"],
        "tenant_id": tenant_id,
        "type": "coach_reply",
        "summary": "Coach conversation about recruitment timeline",
        "date_time": two_days_ago.isoformat(),
    })
    interactions.append({
        "interaction_id": "qa-ix-indiana-2",
        "program_id": SCHOOLS["indiana_state"]["program_id"],
        "tenant_id": tenant_id,
        "type": "phone_call",
        "summary": "Phone call with Indiana State coaching staff",
        "date_time": two_days_ago.isoformat(),
    })

    # Ball State: profile view but no follow-up
    interactions.append({
        "interaction_id": "qa-ix-ball-1",
        "program_id": SCHOOLS["ball_state"]["program_id"],
        "tenant_id": tenant_id,
        "type": "profile_viewed",
        "summary": "Ball State viewed your profile",
        "date_time": (now - timedelta(days=5)).isoformat(),
    })

    # Louisville: no recent activity (last activity 10+ days ago)
    interactions.append({
        "interaction_id": "qa-ix-louisville-1",
        "program_id": SCHOOLS["louisville"]["program_id"],
        "tenant_id": tenant_id,
        "type": "email_sent",
        "summary": "Initial outreach email",
        "date_time": ten_days_ago.isoformat(),
    })

    await db.interactions.insert_many(interactions)
    print(f"Inserted {len(interactions)} QA interactions")

    # ── STEP 4: Insert tasks ──
    tasks = [
        {
            "task_id": "qa-task-purdue-1",
            "program_id": SCHOOLS["purdue"]["program_id"],
            "tenant_id": tenant_id,
            "title": "Follow up with Purdue within 24h",
            "due_date": (now + timedelta(days=1)).strftime("%Y-%m-%d"),
            "status": "pending",
            "created_at": one_day_ago.isoformat(),
        },
        {
            "task_id": "qa-task-indiana-1",
            "program_id": SCHOOLS["indiana_state"]["program_id"],
            "tenant_id": tenant_id,
            "title": "Send transcript to Indiana State",
            "due_date": (now + timedelta(days=3)).strftime("%Y-%m-%d"),
            "status": "pending",
            "created_at": two_days_ago.isoformat(),
        },
    ]
    await db.tasks.insert_many(tasks)
    print(f"Inserted {len(tasks)} QA tasks")

    # ── STEP 5: Create a past event (weekend showcase) ──
    showcase_event = {
        "event_id": "qa-showcase-001",
        "name": "Weekend Showcase",
        "status": "past",
        "date": two_days_ago.isoformat(),
        "tenant_id": tenant_id,
    }
    await db.events.delete_many({"event_id": "qa-showcase-001"})
    await db.events.insert_one(showcase_event)
    print("Inserted QA showcase event")

    # ── STEP 6: Clear old recap so fresh one generates ──
    await db.momentum_recaps.delete_many({"tenant_id": tenant_id})
    print("Cleared old recaps")

    print("\n" + "=" * 70)
    print("SCENARIO 1 DATA SETUP COMPLETE")
    print("=" * 70)

    client.close()

asyncio.run(main())
