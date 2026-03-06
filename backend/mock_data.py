from datetime import datetime, timezone, timedelta
import random
from decision_engine import (
    detect_all_interventions,
    rank_interventions,
    get_priority_alerts,
    get_athletes_needing_attention
)

# Generate realistic mock data for Mission Control

first_names = ["Sarah", "Jake", "Emma", "Marcus", "Olivia", "Ryan", "Sophia", "Ethan", "Ava", "Noah",
              "Isabella", "Liam", "Mia", "Lucas", "Charlotte", "Mason", "Amelia", "Logan", "Harper", "Elijah",
              "Evelyn", "Oliver", "Abigail", "James", "Emily", "Benjamin", "Madison", "William", "Sofia", "Michael"]

last_names = ["Martinez", "Williams", "Chen", "Johnson", "Anderson", "Thompson", "Garcia", "Rodriguez", "Davis", "Miller",
             "Wilson", "Moore", "Taylor", "Thomas", "Jackson", "White", "Harris", "Martin", "Brown", "Lee",
             "Walker", "Hall", "Allen", "Young", "King", "Wright", "Lopez", "Hill", "Green", "Adams"]

positions = ["Forward", "Midfielder", "Defender", "Goalkeeper"]
teams = ["U16 Elite", "U17 Premier", "U18 Academy", "U19 Select"]
recruiting_stages = ["exploring", "actively_recruiting", "narrowing"]

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

def generate_athletes():
    """Generate 25 athletes with varying characteristics"""
    athletes = []
    
    for i in range(25):
        athlete_id = f"athlete_{i+1}"
        first_name = first_names[i % len(first_names)]
        last_name = last_names[i % len(last_names)]
        grad_year = random.choice([2025, 2026, 2027])
        position = random.choice(positions)
        team = teams[grad_year - 2025]
        stage = random.choice(recruiting_stages)
        
        # Momentum calculation
        days_since_activity = random.randint(0, 30)
        if days_since_activity <= 3:
            momentum_score = random.randint(6, 10)
            momentum_trend = "rising"
        elif days_since_activity <= 7:
            momentum_score = random.randint(3, 7)
            momentum_trend = "stable"
        else:
            momentum_score = random.randint(-5, 3)
            momentum_trend = "declining"
        
        athlete = {
            "id": athlete_id,
            "firstName": first_name,
            "lastName": last_name,
            "fullName": f"{first_name} {last_name}",
            "gradYear": grad_year,
            "position": position,
            "team": team,
            "recruitingStage": stage,
            "momentumScore": momentum_score,
            "momentumTrend": momentum_trend,
            "lastActivity": (datetime.now(timezone.utc) - timedelta(days=days_since_activity)).isoformat(),
            "daysSinceActivity": days_since_activity,
            "schoolTargets": random.randint(3, 8),
            "activeInterest": random.randint(0, 5) if momentum_score > 0 else 0,
        }
        
        athletes.append(athlete)
    
    return athletes

def generate_momentum_signals(athletes):
    """Generate recent momentum signals (changes)"""
    signals = []
    signal_types = [
        {"type": "new_interest", "sentiment": "positive", "icon": "plus"},
        {"type": "coach_response", "sentiment": "positive", "icon": "mail"},
        {"type": "camp_invite", "sentiment": "positive", "icon": "calendar"},
        {"type": "no_activity", "sentiment": "negative", "icon": "alert"},
        {"type": "stage_change", "sentiment": "neutral", "icon": "arrow-right"},
    ]
    
    for i in range(8):
        athlete = random.choice(athletes)
        signal_type = random.choice(signal_types)
        hours_ago = random.randint(1, 48)
        school = random.choice(schools)
        
        if signal_type["type"] == "new_interest":
            description = f"Received camp invite from {school['name']}"
        elif signal_type["type"] == "coach_response":
            description = f"{school['name']} coach responded to outreach"
        elif signal_type["type"] == "camp_invite":
            description = f"Invited to {school['name']} showcase"
        elif signal_type["type"] == "no_activity":
            description = f"No activity logged in {hours_ago} days"
        else:
            description = "Moved to 'Actively Recruiting' stage"
        
        signals.append({
            "id": f"signal_{i+1}",
            "athleteId": athlete["id"],
            "athleteName": athlete["fullName"],
            "type": signal_type["type"],
            "sentiment": signal_type["sentiment"],
            "icon": signal_type["icon"],
            "description": description,
            "timestamp": (datetime.now(timezone.utc) - timedelta(hours=hours_ago)).isoformat(),
            "hoursAgo": hours_ago,
            "school": school["name"] if signal_type["type"] != "no_activity" else None,
        })
    
    # Sort by timestamp (most recent first)
    signals.sort(key=lambda x: x["hoursAgo"])
    return signals

def generate_upcoming_events():
    """Generate upcoming events for next 14 days"""
    events = []
    event_types = ["tournament", "showcase", "camp"]
    event_names = [
        "SoCal Showcase",
        "Elite Academy Tournament",
        "College Exposure Camp",
        "Spring Classic",
        "ID Camp",
        "National Showcase",
    ]
    
    for i in range(6):
        days_away = random.randint(1, 14)
        event = {
            "id": f"event_{i+1}",
            "name": random.choice(event_names),
            "type": random.choice(event_types),
            "date": (datetime.now(timezone.utc) + timedelta(days=days_away)).isoformat(),
            "daysAway": days_away,
            "location": random.choice(["San Diego, CA", "Los Angeles, CA", "Irvine, CA", "Las Vegas, NV"]),
            "athleteCount": random.randint(3, 8),
            "expectedSchools": random.randint(8, 15),
            "prepStatus": random.choice(["ready", "in_progress", "not_started"]),
        }
        events.append(event)
    
    # Sort by date
    events.sort(key=lambda x: x["daysAway"])
    return events

def get_program_snapshot(athletes):
    """Generate program-wide metrics"""
    total_athletes = len(athletes)
    by_stage = {}
    by_grad_year = {}
    
    for athlete in athletes:
        stage = athlete["recruitingStage"]
        grad_year = athlete["gradYear"]
        
        by_stage[stage] = by_stage.get(stage, 0) + 1
        by_grad_year[grad_year] = by_grad_year.get(grad_year, 0) + 1
    
    needing_attention_count = len([a for a in athletes if a["daysSinceActivity"] > 10 or a["momentumTrend"] == "declining"])
    positive_momentum_count = len([a for a in athletes if a["momentumScore"] > 5])
    
    return {
        "totalAthletes": total_athletes,
        "byStage": by_stage,
        "byGradYear": by_grad_year,
        "needingAttention": needing_attention_count,
        "positiveMomentum": positive_momentum_count,
        "upcomingEvents": 6,
    }

# Generate data on module load
ATHLETES = generate_athletes()
UPCOMING_EVENTS = generate_upcoming_events()
PROGRAM_SNAPSHOT = get_program_snapshot(ATHLETES)

# ============================================================================
# DECISION ENGINE INTEGRATION
# ============================================================================

# Detect all interventions across all athletes
ALL_INTERVENTIONS = []
for athlete in ATHLETES:
    interventions = detect_all_interventions(athlete, UPCOMING_EVENTS)
    ALL_INTERVENTIONS.extend(interventions)

# Rank all interventions by score
ALL_INTERVENTIONS = rank_interventions(ALL_INTERVENTIONS)

# Surface priority alerts (top 2-4, score >= 70)
PRIORITY_ALERTS = get_priority_alerts(ALL_INTERVENTIONS)

# Surface athletes needing attention (up to 12, score >= 50)
ATHLETES_NEEDING_ATTENTION = get_athletes_needing_attention(ALL_INTERVENTIONS)

# Generate momentum signals (what changed today) from recent interventions
# For V1, simulate recent positive/negative signals
MOMENTUM_SIGNALS = generate_momentum_signals(ATHLETES)
