from datetime import datetime, timezone, timedelta
import random

# Seed for consistent, reproducible results
random.seed(42)

# ============================================================================
# ATHLETE ARCHETYPES — each designed to trigger specific intervention categories
# ============================================================================

first_names = ["Sarah", "Jake", "Emma", "Marcus", "Olivia", "Ryan", "Sophia", "Ethan", "Ava", "Noah",
              "Isabella", "Liam", "Mia", "Lucas", "Charlotte", "Mason", "Amelia", "Logan", "Harper", "Elijah",
              "Evelyn", "Oliver", "Abigail", "James", "Emily"]

last_names = ["Martinez", "Williams", "Chen", "Johnson", "Anderson", "Thompson", "Garcia", "Rodriguez", "Davis", "Miller",
             "Wilson", "Moore", "Taylor", "Thomas", "Jackson", "White", "Harris", "Martin", "Brown", "Lee",
             "Walker", "Hall", "Allen", "Young", "King"]

positions = ["Forward", "Midfielder", "Defender", "Goalkeeper"]
teams = {"2025": "U18 Academy", "2026": "U17 Premier", "2027": "U16 Elite"}

schools = [
    {"id": "ucla", "name": "UCLA", "division": "D1"},
    {"id": "stanford", "name": "Stanford", "division": "D1"},
    {"id": "duke", "name": "Duke", "division": "D1"},
    {"id": "unc", "name": "UNC", "division": "D1"},
    {"id": "georgetown", "name": "Georgetown", "division": "D1"},
    {"id": "usc", "name": "USC", "division": "D1"},
    {"id": "boston-college", "name": "Boston College", "division": "D1"},
    {"id": "virginia", "name": "Virginia", "division": "D1"},
    {"id": "michigan", "name": "Michigan", "division": "D1"},
    {"id": "pepperdine", "name": "Pepperdine", "division": "D1"},
]

# Define athlete profiles with controlled characteristics
# Each profile is tuned to trigger (or not trigger) specific intervention categories
ATHLETE_PROFILES = [
    # --- MOMENTUM DROP candidates (3-4 athletes, gone dark 21+ days) ---
    {"days_inactive": 25, "grad_year": 2026, "stage": "actively_recruiting", "targets": 6, "interest": 2, "archetype": "gone_dark"},
    {"days_inactive": 22, "grad_year": 2027, "stage": "exploring", "targets": 5, "interest": 1, "archetype": "gone_dark"},
    {"days_inactive": 28, "grad_year": 2026, "stage": "actively_recruiting", "targets": 4, "interest": 0, "archetype": "gone_dark"},

    # --- BLOCKER candidates (2025 grads with missing docs / actively recruiting without materials) ---
    {"days_inactive": 3, "grad_year": 2025, "stage": "actively_recruiting", "targets": 6, "interest": 4, "archetype": "blocked_docs"},
    {"days_inactive": 5, "grad_year": 2025, "stage": "narrowing", "targets": 7, "interest": 3, "archetype": "blocked_docs"},
    {"days_inactive": 2, "grad_year": 2025, "stage": "actively_recruiting", "targets": 5, "interest": 5, "archetype": "blocked_materials"},
    {"days_inactive": 7, "grad_year": 2026, "stage": "actively_recruiting", "targets": 4, "interest": 2, "archetype": "blocked_materials"},

    # --- ENGAGEMENT DROP candidates (inactive 8-15 days, families disengaging) ---
    {"days_inactive": 12, "grad_year": 2026, "stage": "actively_recruiting", "targets": 5, "interest": 3, "archetype": "disengaging"},
    {"days_inactive": 11, "grad_year": 2025, "stage": "narrowing", "targets": 6, "interest": 4, "archetype": "disengaging"},
    {"days_inactive": 14, "grad_year": 2027, "stage": "exploring", "targets": 3, "interest": 1, "archetype": "disengaging"},
    {"days_inactive": 9, "grad_year": 2026, "stage": "actively_recruiting", "targets": 5, "interest": 2, "archetype": "disengaging"},

    # --- OWNERSHIP GAP candidates (high interest, active, responses waiting) ---
    {"days_inactive": 1, "grad_year": 2026, "stage": "actively_recruiting", "targets": 7, "interest": 5, "archetype": "hot_prospect"},
    {"days_inactive": 2, "grad_year": 2025, "stage": "narrowing", "targets": 8, "interest": 5, "archetype": "hot_prospect"},
    {"days_inactive": 0, "grad_year": 2026, "stage": "actively_recruiting", "targets": 6, "interest": 4, "archetype": "hot_prospect"},
    {"days_inactive": 3, "grad_year": 2027, "stage": "exploring", "targets": 5, "interest": 4, "archetype": "hot_prospect"},

    # --- READINESS ISSUE candidates (2025 grads with too few targets) ---
    {"days_inactive": 4, "grad_year": 2025, "stage": "actively_recruiting", "targets": 2, "interest": 3, "archetype": "narrow_list"},
    {"days_inactive": 6, "grad_year": 2025, "stage": "exploring", "targets": 3, "interest": 1, "archetype": "narrow_list"},
    {"days_inactive": 1, "grad_year": 2025, "stage": "narrowing", "targets": 2, "interest": 4, "archetype": "narrow_list"},

    # --- HEALTHY athletes (no issues, positive momentum) ---
    {"days_inactive": 0, "grad_year": 2026, "stage": "actively_recruiting", "targets": 6, "interest": 3, "archetype": "healthy"},
    {"days_inactive": 1, "grad_year": 2025, "stage": "narrowing", "targets": 7, "interest": 5, "archetype": "healthy"},
    {"days_inactive": 2, "grad_year": 2027, "stage": "exploring", "targets": 5, "interest": 2, "archetype": "healthy"},
    {"days_inactive": 0, "grad_year": 2026, "stage": "actively_recruiting", "targets": 8, "interest": 4, "archetype": "healthy"},
    {"days_inactive": 3, "grad_year": 2025, "stage": "narrowing", "targets": 6, "interest": 3, "archetype": "healthy"},
    {"days_inactive": 1, "grad_year": 2027, "stage": "exploring", "targets": 4, "interest": 1, "archetype": "healthy"},
    {"days_inactive": 4, "grad_year": 2026, "stage": "actively_recruiting", "targets": 5, "interest": 2, "archetype": "healthy"},
]


def generate_athletes():
    """Generate 25 athletes from controlled archetype profiles"""
    athletes = []

    for i, profile in enumerate(ATHLETE_PROFILES):
        days = profile["days_inactive"]
        grad_year = profile["grad_year"]

        # Momentum derived from inactivity
        if days <= 3:
            momentum_score = random.randint(6, 10)
            momentum_trend = "rising"
        elif days <= 7:
            momentum_score = random.randint(3, 7)
            momentum_trend = "stable"
        elif days <= 14:
            momentum_score = random.randint(0, 4)
            momentum_trend = "declining"
        else:
            momentum_score = random.randint(-5, 0)
            momentum_trend = "declining"

        athlete = {
            "id": f"athlete_{i+1}",
            "first_name": first_names[i],
            "last_name": last_names[i],
            "full_name": f"{first_names[i]} {last_names[i]}",
            "email": f"{first_names[i].lower()}.{last_names[i].lower()}@athlete.capymatch.com",
            "grad_year": grad_year,
            "position": positions[i % len(positions)],
            "team": teams[str(grad_year)],
            "recruiting_stage": profile["stage"],
            "momentum_score": momentum_score,
            "momentum_trend": momentum_trend,
            "last_activity": (datetime.now(timezone.utc) - timedelta(days=days)).isoformat(),
            "days_since_activity": days,
            "school_targets": profile["targets"],
            "active_interest": profile["interest"],
            "archetype": profile["archetype"],
        }

        athletes.append(athlete)

    return athletes


def generate_momentum_signals(athletes):
    """Generate recent momentum signals (what changed today)"""
    signals = []
    signal_templates = [
        {"type": "new_interest", "sentiment": "positive", "icon": "plus",
         "template": "Received interest from {school}"},
        {"type": "coach_response", "sentiment": "positive", "icon": "mail",
         "template": "{school} coach responded to outreach"},
        {"type": "camp_invite", "sentiment": "positive", "icon": "calendar",
         "template": "Invited to {school} showcase"},
        {"type": "no_activity", "sentiment": "negative", "icon": "alert",
         "template": "No activity logged in {days} days"},
        {"type": "stage_change", "sentiment": "neutral", "icon": "arrow-right",
         "template": "Moved to 'Actively Recruiting' stage"},
    ]

    # Pick 8 diverse signals from different athletes
    active_athletes = [a for a in athletes if a.get("days_since_activity", 999) <= 7]
    inactive_athletes = [a for a in athletes if a.get("days_since_activity", 999) > 7]

    # 5 positive signals from active athletes
    for i in range(5):
        athlete = active_athletes[i % len(active_athletes)]
        template = signal_templates[i % 3]  # cycle positive types
        school = schools[i % len(schools)]
        hours_ago = random.randint(1, 24)

        signals.append({
            "id": f"signal_{i+1}",
            "athleteId": athlete["id"],
            "athleteName": athlete["full_name"],
            "type": template["type"],
            "sentiment": template["sentiment"],
            "icon": template["icon"],
            "description": template["template"].format(school=school["name"], days=""),
            "timestamp": (datetime.now(timezone.utc) - timedelta(hours=hours_ago)).isoformat(),
            "hoursAgo": hours_ago,
            "school": school["name"],
        })

    # 3 negative/neutral signals from inactive athletes
    for i in range(3):
        athlete = inactive_athletes[i % len(inactive_athletes)]
        if i < 2:
            template = signal_templates[3]  # no_activity
            description = template["template"].format(school="", days=athlete.get("days_since_activity", 0))
        else:
            template = signal_templates[4]  # stage_change
            description = template["template"]

        hours_ago = random.randint(2, 36)

        signals.append({
            "id": f"signal_{len(signals)+1}",
            "athleteId": athlete["id"],
            "athleteName": athlete["full_name"],
            "type": template["type"],
            "sentiment": template["sentiment"],
            "icon": template["icon"],
            "description": description,
            "timestamp": (datetime.now(timezone.utc) - timedelta(hours=hours_ago)).isoformat(),
            "hoursAgo": hours_ago,
            "school": None,
        })

    signals.sort(key=lambda x: x["hoursAgo"])
    return signals


def generate_upcoming_events():
    """Generate upcoming + past events with full rosters, school lists, and checklists"""

    # School roster for cross-referencing
    school_list = [
        {"id": "ucla", "name": "UCLA", "division": "D1"},
        {"id": "stanford", "name": "Stanford", "division": "D1"},
        {"id": "duke", "name": "Duke", "division": "D1"},
        {"id": "unc", "name": "UNC", "division": "D1"},
        {"id": "georgetown", "name": "Georgetown", "division": "D1"},
        {"id": "usc", "name": "USC", "division": "D1"},
        {"id": "boston-college", "name": "Boston College", "division": "D1"},
        {"id": "virginia", "name": "Virginia", "division": "D1"},
        {"id": "michigan", "name": "Michigan", "division": "D1"},
        {"id": "pepperdine", "name": "Pepperdine", "division": "D1"},
    ]

    def default_checklist():
        return [
            {"id": "check_1", "label": "Confirm athlete attendance", "completed": False},
            {"id": "check_2", "label": "Identify target school coaches attending", "completed": False},
            {"id": "check_3", "label": "Review highlight reels", "completed": False},
            {"id": "check_4", "label": "Prepare talking points for athlete-school pairs", "completed": False},
            {"id": "check_5", "label": "Confirm travel/logistics", "completed": False},
        ]

    events = [
        # Past event — needs debrief
        {
            "id": "event_0", "name": "Winter Showcase", "type": "showcase",
            "daysAway": -6, "location": "Portland, OR",
            "expectedSchools": 8, "prepStatus": "ready", "status": "past",
            "athlete_ids": ["athlete_4", "athlete_5", "athlete_9", "athlete_13", "athlete_20"],
            "school_ids": ["stanford", "virginia", "michigan", "pepperdine", "boston-college"],
            "checklist": [
                {"id": "check_1", "label": "Confirm athlete attendance", "completed": True},
                {"id": "check_2", "label": "Identify target school coaches attending", "completed": True},
                {"id": "check_3", "label": "Review highlight reels", "completed": True},
                {"id": "check_4", "label": "Prepare talking points for athlete-school pairs", "completed": True},
                {"id": "check_5", "label": "Confirm travel/logistics", "completed": True},
            ],
            "capturedNotes": [
                {
                    "id": "past_note_1", "event_id": "event_0",
                    "athlete_id": "athlete_5", "athlete_name": "Olivia Anderson",
                    "school_id": "stanford", "school_name": "Stanford",
                    "interest_level": "hot",
                    "note_text": "Stanford coach pulled her aside after match, very interested",
                    "follow_ups": ["schedule_call"],
                    "captured_by": "Coach Martinez",
                    "captured_at": (datetime.now(timezone.utc) - timedelta(days=6, hours=3)).isoformat(),
                    "routed_to_pod": False, "routed_to_mc": False,
                    "advocacy_candidate": True,
                },
                {
                    "id": "past_note_2", "event_id": "event_0",
                    "athlete_id": "athlete_13", "athlete_name": "Lucas Rodriguez",
                    "school_id": "virginia", "school_name": "Virginia",
                    "interest_level": "warm",
                    "note_text": "Virginia assistant liked his pace of play, asked about grades",
                    "follow_ups": ["send_film"],
                    "captured_by": "Coach Martinez",
                    "captured_at": (datetime.now(timezone.utc) - timedelta(days=6, hours=2)).isoformat(),
                    "routed_to_pod": False, "routed_to_mc": False,
                    "advocacy_candidate": True,
                },
                {
                    "id": "past_note_3", "event_id": "event_0",
                    "athlete_id": "athlete_4", "athlete_name": "Marcus Johnson",
                    "school_id": "michigan", "school_name": "Michigan",
                    "interest_level": "hot",
                    "note_text": "Michigan GK coach wants to see him at spring camp",
                    "follow_ups": ["schedule_call", "send_film"],
                    "captured_by": "Coach Martinez",
                    "captured_at": (datetime.now(timezone.utc) - timedelta(days=6, hours=1)).isoformat(),
                    "routed_to_pod": False, "routed_to_mc": False,
                    "advocacy_candidate": True,
                },
                {
                    "id": "past_note_4", "event_id": "event_0",
                    "athlete_id": "athlete_9", "athlete_name": "Sophia Garcia",
                    "school_id": "pepperdine", "school_name": "Pepperdine",
                    "interest_level": "cool",
                    "note_text": "Brief intro, coach was polite but non-committal",
                    "follow_ups": [],
                    "captured_by": "Coach Martinez",
                    "captured_at": (datetime.now(timezone.utc) - timedelta(days=6, hours=4)).isoformat(),
                    "routed_to_pod": False, "routed_to_mc": False,
                    "advocacy_candidate": False,
                },
                {
                    "id": "past_note_5", "event_id": "event_0",
                    "athlete_id": "athlete_5", "athlete_name": "Olivia Anderson",
                    "school_id": "virginia", "school_name": "Virginia",
                    "interest_level": "warm",
                    "note_text": "Virginia also noticed her, asked about academic interests",
                    "follow_ups": ["add_to_targets"],
                    "captured_by": "Coach Martinez",
                    "captured_at": (datetime.now(timezone.utc) - timedelta(days=6, hours=1, minutes=30)).isoformat(),
                    "routed_to_pod": False, "routed_to_mc": False,
                    "advocacy_candidate": True,
                },
            ],
            "summaryStatus": "pending",
        },

        # Upcoming events
        {"id": "event_1", "name": "SoCal Showcase", "type": "showcase",
         "daysAway": 1, "location": "San Diego, CA",
         "expectedSchools": 12, "prepStatus": "not_started", "status": "upcoming",
         "athlete_ids": ["athlete_1", "athlete_3", "athlete_5", "athlete_12", "athlete_14", "athlete_19"],
         "school_ids": ["ucla", "stanford", "duke", "unc", "georgetown", "usc", "boston-college", "virginia", "michigan", "pepperdine"],
         "checklist": default_checklist(),
         "capturedNotes": [], "summaryStatus": None,
        },
        {"id": "event_2", "name": "Elite Academy Tournament", "type": "tournament",
         "daysAway": 3, "location": "Los Angeles, CA",
         "expectedSchools": 15, "prepStatus": "in_progress", "status": "upcoming",
         "athlete_ids": ["athlete_1", "athlete_2", "athlete_4", "athlete_6", "athlete_8", "athlete_11", "athlete_15", "athlete_20"],
         "school_ids": ["ucla", "stanford", "duke", "unc", "georgetown", "usc", "boston-college", "virginia", "michigan", "pepperdine"],
         "checklist": [
             {"id": "check_1", "label": "Confirm athlete attendance", "completed": True},
             {"id": "check_2", "label": "Identify target school coaches attending", "completed": True},
             {"id": "check_3", "label": "Review highlight reels", "completed": False},
             {"id": "check_4", "label": "Prepare talking points for athlete-school pairs", "completed": False},
             {"id": "check_5", "label": "Confirm travel/logistics", "completed": False},
         ],
         "capturedNotes": [], "summaryStatus": None,
        },
        {"id": "event_3", "name": "College Exposure Camp", "type": "camp",
         "daysAway": 5, "location": "Irvine, CA",
         "expectedSchools": 10, "prepStatus": "ready", "status": "upcoming",
         "athlete_ids": ["athlete_3", "athlete_7", "athlete_10", "athlete_16"],
         "school_ids": ["ucla", "stanford", "usc", "virginia", "michigan", "pepperdine"],
         "checklist": [
             {"id": "check_1", "label": "Confirm athlete attendance", "completed": True},
             {"id": "check_2", "label": "Identify target school coaches attending", "completed": True},
             {"id": "check_3", "label": "Review highlight reels", "completed": True},
             {"id": "check_4", "label": "Prepare talking points for athlete-school pairs", "completed": True},
             {"id": "check_5", "label": "Confirm travel/logistics", "completed": True},
         ],
         "capturedNotes": [], "summaryStatus": None,
        },
        {"id": "event_4", "name": "Spring Classic", "type": "tournament",
         "daysAway": 8, "location": "Las Vegas, NV",
         "expectedSchools": 14, "prepStatus": "not_started", "status": "upcoming",
         "athlete_ids": ["athlete_2", "athlete_5", "athlete_8", "athlete_12", "athlete_17", "athlete_21", "athlete_22"],
         "school_ids": ["duke", "unc", "georgetown", "usc", "boston-college", "virginia", "michigan"],
         "checklist": default_checklist(),
         "capturedNotes": [], "summaryStatus": None,
        },
        {"id": "event_5", "name": "ID Camp", "type": "camp",
         "daysAway": 11, "location": "Phoenix, AZ",
         "expectedSchools": 8, "prepStatus": "not_started", "status": "upcoming",
         "athlete_ids": ["athlete_6", "athlete_10", "athlete_15", "athlete_18", "athlete_23"],
         "school_ids": ["ucla", "duke", "usc", "pepperdine"],
         "checklist": default_checklist(),
         "capturedNotes": [], "summaryStatus": None,
        },
        {"id": "event_6", "name": "National Showcase", "type": "showcase",
         "daysAway": 14, "location": "Dallas, TX",
         "expectedSchools": 18, "prepStatus": "not_started", "status": "upcoming",
         "athlete_ids": ["athlete_1", "athlete_4", "athlete_9", "athlete_13", "athlete_19", "athlete_24"],
         "school_ids": ["ucla", "stanford", "duke", "unc", "georgetown", "usc", "boston-college", "virginia", "michigan", "pepperdine"],
         "checklist": default_checklist(),
         "capturedNotes": [], "summaryStatus": None,
        },
    ]

    for event in events:
        event["date"] = (datetime.now(timezone.utc) + timedelta(days=event["daysAway"])).isoformat()
        event["athleteCount"] = len(event["athlete_ids"])

    return events, school_list


def get_program_snapshot(athletes):
    """Generate program-wide metrics"""
    total_athletes = len(athletes)
    by_stage = {}
    by_grad_year = {}

    for athlete in athletes:
        stage = athlete.get("recruiting_stage", "unknown")
        grad_year = athlete.get("grad_year", "unknown")
        by_stage[stage] = by_stage.get(stage, 0) + 1
        by_grad_year[grad_year] = by_grad_year.get(grad_year, 0) + 1

    needing_attention_count = len([a for a in athletes if a.get("days_since_activity", 0) > 10 or a.get("momentum_trend") == "declining"])
    positive_momentum_count = len([a for a in athletes if a.get("momentum_score", 0) > 5])

    return {
        "totalAthletes": total_athletes,
        "byStage": by_stage,
        "byGradYear": by_grad_year,
        "needingAttention": needing_attention_count,
        "positiveMomentum": positive_momentum_count,
        "upcomingEvents": 6,
    }


# ============================================================================
# GENERATE SEED DATA ON MODULE LOAD
# Runtime reads go through services/athlete_store.py — not these variables.
# ATHLETES is used ONLY for initial DB seeding (seed_athletes in startup.py).
# UPCOMING_EVENTS and SCHOOLS are still runtime data (events not migrated yet).
# ============================================================================

ATHLETES = generate_athletes()
UPCOMING_EVENTS, SCHOOLS = generate_upcoming_events()
