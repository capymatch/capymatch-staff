"""
Decision Engine - Intervention Detection and Scoring

This module implements the 6 intervention categories, priority scoring,
and surfacing logic as defined in DECISION_ENGINE_SPEC.md

Scoring formula: (urgency * 40) + (impact * 30) + (actionability * 20) + (ownership * 10) / 10
"""

from datetime import datetime, timezone, timedelta
from typing import List, Dict
import random


# ============================================================================
# INTERVENTION CATEGORIES
# ============================================================================

def detect_momentum_drop(athlete: Dict) -> Dict or None:
    """
    Category 1: Momentum Drop
    Triggers: No activity 21+ days (3 weeks = meaningful silence, not just a busy week)
    """
    days_since = athlete['daysSinceActivity']

    if days_since >= 21:
        urgency = min(10, 6 + (days_since - 21) // 3)
        impact = 8 if days_since > 28 else 6
        actionability = 8
        ownership = 9

        score = (urgency * 40) + (impact * 30) + (actionability * 20) + (ownership * 10)
        score = score // 10

        return {
            'category': 'momentum_drop',
            'trigger': f'no_activity_{days_since}_days',
            'score': int(score),
            'urgency': urgency,
            'impact': impact,
            'actionability': actionability,
            'ownership': ownership,

            'why_this_surfaced': f"No activity in {days_since} days — this athlete has gone dark",
            'what_changed': f"Last logged activity was {days_since} days ago",
            'recommended_action': "Check in with family about engagement and recruiting interest",
            'owner': "Coach Martinez",

            'details': {
                'last_activity': athlete['lastActivity'],
                'momentum_score': athlete['momentumScore'],
                'expected_frequency': 'Weekly updates',
                'suggested_steps': [
                    'Phone call to check in (preferred over text)',
                    'Review target school list — is the plan still viable?',
                    'Log update after conversation'
                ]
            }
        }

    return None


def detect_blocker(athlete: Dict) -> Dict or None:
    """
    Category 2: Blocker
    Triggers: Missing documents, overdue actions, support pod gaps
    Uses deterministic checks based on athlete archetype/state, not pure randomness.
    """
    # Missing transcript — 2025 grads who are actively recruiting or narrowing
    if athlete['gradYear'] == 2025 and athlete.get('archetype') in ('blocked_docs', 'blocked_materials'):
        if athlete.get('archetype') == 'blocked_docs':
            urgency = 9
            impact = 8
            actionability = 6
            ownership = 7

            score = (urgency * 40) + (impact * 30) + (actionability * 20) + (ownership * 10)
            score = score // 10

            return {
                'category': 'blocker',
                'trigger': 'missing_transcript',
                'score': int(score),
                'urgency': urgency,
                'impact': impact,
                'actionability': actionability,
                'ownership': ownership,

                'why_this_surfaced': "Transcript missing — blocks applications to 3 target schools",
                'what_changed': "Application deadlines in 10-14 days",
                'recommended_action': "Request transcript from high school counselor",
                'owner': "Parent + Coach",

                'details': {
                    'affected_schools': ['UCLA', 'Stanford', 'Duke'],
                    'deadline_dates': ['Feb 15', 'Feb 18', 'Feb 20'],
                    'blocker_type': 'missing_document',
                    'suggested_steps': [
                        'Parent contacts school counselor',
                        'Coach follows up with parent in 48 hours',
                        'Track submission status in pod'
                    ]
                }
            }
        else:
            urgency = 6
            impact = 7
            actionability = 4
            ownership = 7

            score = (urgency * 40) + (impact * 30) + (actionability * 20) + (ownership * 10)
            score = score // 10

            return {
                'category': 'blocker',
                'trigger': 'missing_highlight_reel',
                'score': int(score),
                'urgency': urgency,
                'impact': impact,
                'actionability': actionability,
                'ownership': ownership,

                'why_this_surfaced': "No highlight reel available — coaches requesting film",
                'what_changed': "2 college coaches requested film in the last week",
                'recommended_action': "Create 2-3 minute highlight reel from recent games",
                'owner': "Coach + Athlete",

                'details': {
                    'blocker_type': 'missing_materials',
                    'impact_description': 'Cannot respond to coach film requests',
                    'suggested_steps': [
                        'Identify best footage from last 3 games',
                        'Work with coach to select top clips',
                        'Create 2-3 minute reel, upload to profile'
                    ]
                }
            }

    # Support pod gap — athletes whose families aren't in the system (use archetype)
    if athlete.get('archetype') == 'disengaging' and random.random() < 0.4:
        urgency = 5
        impact = 6
        actionability = 9
        ownership = 10

        score = (urgency * 40) + (impact * 30) + (actionability * 20) + (ownership * 10)
        score = score // 10

        return {
            'category': 'blocker',
            'trigger': 'support_pod_gap',
            'score': int(score),
            'urgency': urgency,
            'impact': impact,
            'actionability': actionability,
            'ownership': ownership,

            'why_this_surfaced': "Parent not yet added to Support Pod — coordination gap",
            'what_changed': "Family engagement declining, pod access could help",
            'recommended_action': "Invite parent to join the athlete's Support Pod",
            'owner': "Coach Rivera",

            'details': {
                'blocker_type': 'pod_gap',
                'missing_role': 'parent',
                'suggested_steps': [
                    'Send Support Pod invite to parent',
                    'Explain pod purpose and what they can see/do',
                    'Schedule a kickoff call'
                ]
            }
        }

    return None


def detect_deadline_proximity(athlete: Dict, upcoming_events: List[Dict]) -> Dict or None:
    """
    Category 3: Deadline Proximity
    Triggers: Event in <=2 days without prep, for athletes who are actively recruiting.
    Only fires for athletes in active stages — not everyone.
    """
    if athlete['recruitingStage'] not in ('actively_recruiting', 'narrowing'):
        return None

    for event in upcoming_events:
        if event.get('daysAway', 99) < 0:
            continue  # Skip past events
        if event['daysAway'] <= 2 and event['prepStatus'] == 'not_started':
            # Only fire for ~25% of eligible athletes (simulates not all athletes attend every event)
            if random.random() < 0.25:
                urgency = 10
                impact = 8
                actionability = 9
                ownership = 10

                score = (urgency * 40) + (impact * 30) + (actionability * 20) + (ownership * 10)
                score = score // 10

                return {
                    'category': 'deadline_proximity',
                    'trigger': 'event_imminent_no_prep',
                    'score': int(score),
                    'urgency': urgency,
                    'impact': impact,
                    'actionability': actionability,
                    'ownership': ownership,

                    'why_this_surfaced': f"{event['name']} is {'tomorrow' if event['daysAway'] == 1 else 'in 2 days'} — no prep started",
                    'what_changed': f"Event starts in {event['daysAway']} day(s), {event['expectedSchools']} schools expected",
                    'recommended_action': "Set target schools and complete prep checklist now",
                    'owner': "Coach Martinez",

                    'details': {
                        'event_name': event['name'],
                        'event_date': event['date'],
                        'expected_schools': event['expectedSchools'],
                        'prep_status': event['prepStatus'],
                        'suggested_steps': [
                            'Identify target school coaches attending',
                            'Review athlete highlight reel',
                            'Prepare intro talking points'
                        ]
                    }
                }

    return None


def detect_engagement_drop(athlete: Dict) -> Dict or None:
    """
    Category 4: Engagement Drop
    Triggers: Athlete/family inactive 7-20 days (not yet "gone dark" like momentum_drop)
    Catches the warning signs before full momentum collapse.
    """
    days = athlete['daysSinceActivity']

    # 7-20 day window — between "busy week" and "gone dark"
    if 7 <= days <= 20:
        # Higher probability for disengaging archetypes, lower for others
        threshold = 0.6 if athlete.get('archetype') == 'disengaging' else 0.15
        if random.random() < threshold:
            urgency = 5 + min(3, (days - 7) // 3)
            impact = 7
            actionability = 8
            ownership = 9

            score = (urgency * 40) + (impact * 30) + (actionability * 20) + (ownership * 10)
            score = score // 10

            return {
                'category': 'engagement_drop',
                'trigger': f'family_inactive_{days}_days',
                'score': int(score),
                'urgency': urgency,
                'impact': impact,
                'actionability': actionability,
                'ownership': ownership,

                'why_this_surfaced': f"Family hasn't engaged in {days} days — early warning",
                'what_changed': f"No logins or responses since {athlete['lastActivity'][:10]}",
                'recommended_action': "Personal phone call to check in before momentum drops further",
                'owner': "Coach Rivera",

                'details': {
                    'last_login': athlete['lastActivity'],
                    'days_inactive': days,
                    'engagement_pattern': 'declining',
                    'suggested_steps': [
                        'Personal phone call (not text/email)',
                        'Ask about family situation — any changes?',
                        'Re-engage with updated recruiting timeline'
                    ]
                }
            }

    return None


def detect_ownership_gap(athlete: Dict) -> Dict or None:
    """
    Category 5: Ownership Gap
    Triggers: College responded but no follow-up owner assigned.
    Fires for athletes with active college interest (>= 3 schools showing interest).
    """
    if athlete['activeInterest'] >= 3:
        # Higher probability for hot prospects who have lots of inbound
        threshold = 0.5 if athlete.get('archetype') == 'hot_prospect' else 0.15
        if random.random() < threshold:
            school_options = ['Boston College', 'Georgetown', 'Virginia', 'Michigan', 'UNC', 'USC']
            school = random.choice(school_options)
            days_ago = random.choice([2, 3, 4, 5])

            urgency = 8
            impact = 9
            actionability = 10
            ownership = 3  # Low — that's the problem

            score = (urgency * 40) + (impact * 30) + (actionability * 20) + (ownership * 10)
            score = score // 10

            return {
                'category': 'ownership_gap',
                'trigger': 'college_response_unassigned',
                'score': int(score),
                'urgency': urgency,
                'impact': impact,
                'actionability': actionability,
                'ownership': ownership,

                'why_this_surfaced': f"{school} coach responded {days_ago} days ago — no one owns the follow-up",
                'what_changed': "Response aging without assignment",
                'recommended_action': "Assign follow-up owner and draft response strategy",
                'owner': "Needs assignment",

                'details': {
                    'school_name': school,
                    'response_date': f'{days_ago} days ago',
                    'response_type': random.choice(['camp_invite', 'info_request', 'evaluation_feedback']),
                    'athlete_interest_level': 'high',
                    'suggested_steps': [
                        'Assign to parent or athlete as owner',
                        'Review response details with family',
                        'Draft and send reply within 24 hours'
                    ]
                }
            }

    return None


def detect_readiness_issue(athlete: Dict) -> Dict or None:
    """
    Category 6: Readiness Issue
    Triggers: 2025 grad with too few target schools (< 4).
    This is deterministic — if your list is thin, we surface it.
    """
    if athlete['gradYear'] == 2025 and athlete['schoolTargets'] < 4:
        urgency = 8
        impact = 7
        actionability = 5
        ownership = 7

        score = (urgency * 40) + (impact * 30) + (actionability * 20) + (ownership * 10)
        score = score // 10

        return {
            'category': 'readiness_issue',
            'trigger': 'target_list_too_narrow',
            'score': int(score),
            'urgency': urgency,
            'impact': impact,
            'actionability': actionability,
            'ownership': ownership,

            'why_this_surfaced': f"Only {athlete['schoolTargets']} target schools for a {athlete['gradYear']} grad",
            'what_changed': "Spring recruiting window is open — narrow list limits options",
            'recommended_action': "Expand target list to 5-8 schools based on athletic and academic fit",
            'owner': "Coach + Athlete",

            'details': {
                'current_target_count': athlete['schoolTargets'],
                'recommended_range': '5-8 schools',
                'grad_year': athlete['gradYear'],
                'suggested_steps': [
                    'Research 3-5 schools matching athletic profile',
                    'Discuss academic/geographic fit with family',
                    'Add schools and begin outreach'
                ]
            }
        }

    return None


def detect_event_follow_up(athlete: Dict, past_events: List[Dict]) -> Dict or None:
    """
    Category 7: Event Follow-Up (stale post-event opportunities)
    Triggers: Hot interest note with uncompleted follow-ups >48h after event,
              or Warm interest >72h.
    Tightly scoped to post-event opportunities only.
    """
    athlete_id = athlete['id']

    for event in past_events:
        if event.get('daysAway', 0) >= 0:
            continue  # only past events

        days_since_event = abs(event['daysAway'])
        notes = event.get('capturedNotes', [])

        for note in notes:
            if note.get('athlete_id') != athlete_id:
                continue
            if note.get('routed_to_pod'):
                continue  # already handled
            if not note.get('follow_ups'):
                continue  # no pending follow-ups

            interest = note.get('interest_level', 'none')
            school_name = note.get('school_name', 'Unknown school')

            # Hot: stale after 2 days
            if interest == 'hot' and days_since_event >= 2:
                urgency = min(10, 7 + (days_since_event - 2))
                impact = 9
                actionability = 9
                ownership = 5

                score = (urgency * 40) + (impact * 30) + (actionability * 20) + (ownership * 10)
                score = score // 10

                stale_fus = [f.replace('_', ' ') for f in note.get('follow_ups', [])]

                return {
                    'category': 'event_follow_up',
                    'trigger': 'hot_follow_up_stale',
                    'score': int(score),
                    'urgency': urgency,
                    'impact': impact,
                    'actionability': actionability,
                    'ownership': ownership,

                    'why_this_surfaced': f"{school_name} showed hot interest at {event['name']} — follow-up overdue",
                    'what_changed': f"{days_since_event} days since event, no response sent",
                    'recommended_action': f"Complete follow-up: {', '.join(stale_fus)}",
                    'owner': "Coach Martinez",

                    'details': {
                        'event_name': event['name'],
                        'event_id': event['id'],
                        'school_name': school_name,
                        'school_id': note.get('school_id'),
                        'interest_level': 'hot',
                        'days_since_event': days_since_event,
                        'note_text': note.get('note_text', ''),
                        'stale_follow_ups': note.get('follow_ups', []),
                        'suggested_steps': [
                            f'Send follow-up to {school_name} coach',
                            'Reference specific interaction from event',
                            'Route event context to Support Pod',
                        ]
                    }
                }

            # Warm: stale after 3 days
            if interest == 'warm' and days_since_event >= 3:
                urgency = min(8, 5 + (days_since_event - 3))
                impact = 7
                actionability = 8
                ownership = 5

                score = (urgency * 40) + (impact * 30) + (actionability * 20) + (ownership * 10)
                score = score // 10

                stale_fus = [f.replace('_', ' ') for f in note.get('follow_ups', [])]

                return {
                    'category': 'event_follow_up',
                    'trigger': 'warm_follow_up_stale',
                    'score': int(score),
                    'urgency': urgency,
                    'impact': impact,
                    'actionability': actionability,
                    'ownership': ownership,

                    'why_this_surfaced': f"{school_name} showed warm interest at {event['name']} — follow-up aging",
                    'what_changed': f"{days_since_event} days since event, pending: {', '.join(stale_fus)}",
                    'recommended_action': f"Follow up with {school_name} before opportunity cools",
                    'owner': "Coach Martinez",

                    'details': {
                        'event_name': event['name'],
                        'event_id': event['id'],
                        'school_name': school_name,
                        'school_id': note.get('school_id'),
                        'interest_level': 'warm',
                        'days_since_event': days_since_event,
                        'note_text': note.get('note_text', ''),
                        'stale_follow_ups': note.get('follow_ups', []),
                        'suggested_steps': [
                            f'Send follow-up to {school_name}',
                            'Decide if this warrants a full recommendation',
                            'Route to Support Pod if follow-up is complex',
                        ]
                    }
                }

    return None

def detect_all_interventions(athlete: Dict, upcoming_events: List[Dict]) -> List[Dict]:
    """Run all 7 detection categories and return list of interventions"""
    interventions = []

    detectors = [
        detect_momentum_drop(athlete),
        detect_blocker(athlete),
        detect_deadline_proximity(athlete, upcoming_events),
        detect_engagement_drop(athlete),
        detect_ownership_gap(athlete),
        detect_readiness_issue(athlete),
        detect_event_follow_up(athlete, upcoming_events),
    ]

    for intervention in detectors:
        if intervention:
            intervention['athlete_id'] = athlete['id']
            intervention['athlete_name'] = athlete['fullName']
            intervention['grad_year'] = athlete['gradYear']
            intervention['position'] = athlete['position']
            intervention['momentum_score'] = athlete['momentumScore']
            intervention['momentum_trend'] = athlete['momentumTrend']
            intervention['recruiting_stage'] = athlete['recruitingStage']
            intervention['school_targets'] = athlete['schoolTargets']
            intervention['team'] = athlete['team']

            score = intervention['score']
            if score >= 90:
                intervention['priority_tier'] = 'critical'
                intervention['badge_color'] = 'red'
            elif score >= 70:
                intervention['priority_tier'] = 'high'
                intervention['badge_color'] = 'amber'
            elif score >= 50:
                intervention['priority_tier'] = 'medium'
                intervention['badge_color'] = 'blue'
            else:
                intervention['priority_tier'] = 'low'
                intervention['badge_color'] = 'gray'

            intervention['action_link'] = f"/support-pods/{athlete['id']}?context={intervention['category']}"
            intervention['action_type'] = 'navigate'

            interventions.append(intervention)

    return interventions


def rank_interventions(interventions: List[Dict]) -> List[Dict]:
    """Sort interventions by score (descending)"""
    return sorted(interventions, key=lambda x: x['score'], reverse=True)


# ============================================================================
# SURFACING LOGIC
# ============================================================================

def get_priority_alerts(all_interventions: List[Dict]) -> List[Dict]:
    """
    Return top 2-4 critical/high priority items (score >= 70)
    Consolidate: max 2 per athlete
    """
    high_priority = [i for i in all_interventions if i['score'] >= 70]

    athlete_counts = {}
    filtered = []

    for intervention in high_priority:
        athlete_id = intervention['athlete_id']
        count = athlete_counts.get(athlete_id, 0)
        if count < 2:
            filtered.append(intervention)
            athlete_counts[athlete_id] = count + 1

    return filtered[:4]


def get_athletes_needing_attention(all_interventions: List[Dict]) -> List[Dict]:
    """
    Return up to 12 medium+ priority items (score >= 50)
    One intervention per athlete (highest scored)
    """
    medium_plus = [i for i in all_interventions if i['score'] >= 50]

    athlete_best = {}
    for intervention in medium_plus:
        athlete_id = intervention['athlete_id']
        if athlete_id not in athlete_best or intervention['score'] > athlete_best[athlete_id]['score']:
            athlete_best[athlete_id] = intervention

    result = sorted(athlete_best.values(), key=lambda x: x['score'], reverse=True)
    return result[:12]


def consolidate_multiple_issues(athlete_id: str, interventions: List[Dict]) -> Dict:
    """If athlete has 3+ issues, show top 2 with '+ N more' indicator"""
    athlete_issues = [i for i in interventions if i['athlete_id'] == athlete_id]

    if len(athlete_issues) <= 2:
        return None

    return {
        'athlete_id': athlete_id,
        'athlete_name': athlete_issues[0]['athlete_name'],
        'total_issues': len(athlete_issues),
        'top_issues': athlete_issues[:2],
        'additional_count': len(athlete_issues) - 2,
        'message': f"+ {len(athlete_issues) - 2} more issues"
    }
