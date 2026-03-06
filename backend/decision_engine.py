"""
Decision Engine - Intervention Detection and Scoring

This module implements the 6 intervention categories, priority scoring,
and surfacing logic as defined in DECISION_ENGINE_SPEC.md
"""

from datetime import datetime, timezone, timedelta
from typing import List, Dict, Literal
import random


# ============================================================================
# INTERVENTION CATEGORIES
# ============================================================================

def detect_momentum_drop(athlete: Dict) -> Dict or None:
    """
    Category 1: Momentum Drop
    Triggers: No activity 14+ days, declining engagement, stage regression
    """
    days_since = athlete['daysSinceActivity']
    
    if days_since >= 14:
        # Calculate scores
        urgency = min(10, int((days_since - 14) / 2) + 7)  # 7-10 based on days
        impact = 7 if days_since > 21 else 6  # Severe if 3+ weeks
        actionability = 8  # Coach can call family easily
        ownership = 9  # Clear coach responsibility
        
        score = (urgency * 40) + (impact * 30) + (actionability * 20) + (ownership * 10)
        score = score / 10  # Convert to 0-100 scale
        
        return {
            'category': 'momentum_drop',
            'trigger': f'no_activity_{days_since}_days',
            'score': int(score),
            'urgency': urgency,
            'impact': impact,
            'actionability': actionability,
            'ownership': ownership,
            
            # Explainability
            'why_this_surfaced': f"No activity in {days_since} days",
            'what_changed': f"Last activity was {athlete['lastActivity']}",
            'recommended_action': "Check in with family about engagement",
            'owner': "Coach Martinez",
            
            # Details for expansion
            'details': {
                'last_activity': athlete['lastActivity'],
                'momentum_score': athlete['momentumScore'],
                'expected_frequency': 'Weekly updates',
                'suggested_steps': [
                    'Phone call to check in (preferred)',
                    'Review target school list for engagement',
                    'Log update after conversation'
                ]
            }
        }
    
    return None


def detect_blocker(athlete: Dict) -> Dict or None:
    """
    Category 2: Blocker
    Triggers: Missing documents, overdue actions, support pod gaps
    """
    # Simulate various blockers more frequently
    
    # Missing transcript for 2025 grads (20% chance)
    if athlete['gradYear'] == 2025 and random.random() < 0.2:
        urgency = 8  # Application season
        impact = 8  # Blocks multiple schools
        actionability = 6  # Requires external party (school counselor)
        ownership = 7  # Parent + Coach coordination
        
        score = (urgency * 40) + (impact * 30) + (actionability * 20) + (ownership * 10)
        score = score / 10
        
        return {
            'category': 'blocker',
            'trigger': 'missing_transcript',
            'score': int(score),
            'urgency': urgency,
            'impact': impact,
            'actionability': actionability,
            'ownership': ownership,
            
            'why_this_surfaced': "Transcript missing for 3 target schools",
            'what_changed': "Application deadlines in 10-14 days",
            'recommended_action': "Request transcript from high school counselor",
            'owner': "Parent + Coach",
            
            'details': {
                'affected_schools': ['UCLA', 'Stanford', 'Duke'],
                'deadline_dates': ['Jan 15', 'Jan 18', 'Jan 20'],
                'blocker_type': 'missing_document',
                'suggested_steps': [
                    'Parent contacts school counselor',
                    'Coach follows up with parent',
                    'Track submission status'
                ]
            }
        }
    
    # Missing highlight reel (15% chance for actively recruiting)
    if athlete['recruitingStage'] == 'actively_recruiting' and random.random() < 0.15:
        urgency = 6  # Important but not urgent
        impact = 7  # Can't share with coaches
        actionability = 4  # Requires filming and editing
        ownership = 7  # Coach + Athlete
        
        score = (urgency * 40) + (impact * 30) + (actionability * 20) + (ownership * 10)
        score = score / 10
        
        return {
            'category': 'blocker',
            'trigger': 'missing_highlight_reel',
            'score': int(score),
            'urgency': urgency,
            'impact': impact,
            'actionability': actionability,
            'ownership': ownership,
            
            'why_this_surfaced': "No highlight reel available to share",
            'what_changed': "Coaches requesting film for evaluation",
            'recommended_action': "Create 2-3 minute highlight reel",
            'owner': "Coach + Athlete",
            
            'details': {
                'blocker_type': 'missing_materials',
                'impact_description': 'Cannot respond to coach film requests',
                'suggested_steps': [
                    'Identify recent games with best footage',
                    'Work with coach to select clips',
                    'Create 2-3 minute reel'
                ]
            }
        }
    
    # Parent not in support pod (10% chance)
    if random.random() < 0.1:
        urgency = 5  # Not urgent but important
        impact = 6  # Coordination gap
        actionability = 9  # Easy to invite
        ownership = 10  # Clear coach action
        
        score = (urgency * 40) + (impact * 30) + (actionability * 20) + (ownership * 10)
        score = score / 10
        
        return {
            'category': 'blocker',
            'trigger': 'support_pod_gap',
            'score': int(score),
            'urgency': urgency,
            'impact': impact,
            'actionability': actionability,
            'ownership': ownership,
            
            'why_this_surfaced': "Parent not yet added to Support Pod",
            'what_changed': "Family coordination needed for recruiting",
            'recommended_action': "Invite parent to join Support Pod",
            'owner': "Coach Martinez",
            
            'details': {
                'blocker_type': 'pod_gap',
                'missing_role': 'parent',
                'suggested_steps': [
                    'Send Support Pod invite to parent',
                    'Explain pod purpose and access',
                    'Schedule kickoff call'
                ]
            }
        }
    
    return None


def detect_deadline_proximity(athlete: Dict, upcoming_events: List[Dict]) -> Dict or None:
    """
    Category 3: Deadline Proximity
    Triggers: Event in 48 hours without prep, application deadline approaching
    """
    # Check if athlete has event tomorrow without prep
    for event in upcoming_events:
        if event['daysAway'] <= 1 and event['prepStatus'] == 'not_started':
            # Check if athlete is attending
            if random.random() < 0.3:  # 30% of athletes have this issue
                urgency = 10  # Event tomorrow
                impact = 8  # Major showcase
                actionability = 9  # Can set targets now
                ownership = 10  # Clear coach ownership
                
                score = (urgency * 40) + (impact * 30) + (actionability * 20) + (ownership * 10)
                score = score / 10
                
                return {
                    'category': 'deadline_proximity',
                    'trigger': 'event_tomorrow_no_prep',
                    'score': int(score),
                    'urgency': urgency,
                    'impact': impact,
                    'actionability': actionability,
                    'ownership': ownership,
                    
                    'why_this_surfaced': f"{event['name']} in {event['daysAway']} {'day' if event['daysAway'] == 1 else 'hours'}",
                    'what_changed': f"Event starts {'tomorrow' if event['daysAway'] == 1 else 'today'} at 9am",
                    'recommended_action': "Set target schools and review prep checklist",
                    'owner': "Coach Martinez",
                    
                    'details': {
                        'event_name': event['name'],
                        'event_date': event['date'],
                        'expected_schools': event['expectedSchools'],
                        'prep_status': event['prepStatus'],
                        'checklist': [
                            'Set target schools',
                            'Review athlete current list',
                            'Prepare intro talking points'
                        ]
                    }
                }
    
    return None


def detect_engagement_drop(athlete: Dict) -> Dict or None:
    """
    Category 4: Engagement Drop
    Triggers: Athlete/family inactive, coach hasn't checked pod
    """
    # Simulate family disengagement for some athletes
    if athlete['daysSinceActivity'] > 10 and random.random() < 0.2:
        days_inactive = athlete['daysSinceActivity']
        
        urgency = 7  # Concerning but not immediate
        impact = 7  # Engagement critical for success
        actionability = 8  # Coach can call
        ownership = 9  # Clear coach responsibility
        
        score = (urgency * 40) + (impact * 30) + (actionability * 20) + (ownership * 10)
        score = score / 10
        
        return {
            'category': 'engagement_drop',
            'trigger': f'family_inactive_{days_inactive}_days',
            'score': int(score),
            'urgency': urgency,
            'impact': impact,
            'actionability': actionability,
            'ownership': ownership,
            
            'why_this_surfaced': f"Family hasn't engaged in {days_inactive} days",
            'what_changed': f"No logins, no responses since {athlete['lastActivity']}",
            'recommended_action': "Personal phone call to check in",
            'owner': "Coach Martinez",
            
            'details': {
                'last_login': athlete['lastActivity'],
                'missed_contacts': 3,
                'engagement_pattern': 'sudden_drop',
                'suggested_steps': [
                    'Personal phone call (not text)',
                    'Ask about family situation',
                    'Re-engage with recruiting plan'
                ]
            }
        }
    
    return None


def detect_ownership_gap(athlete: Dict) -> Dict or None:
    """
    Category 5: Ownership Gap
    Triggers: Action with no owner, college response unassigned
    """
    # Simulate college response without follow-up owner
    if athlete['activeInterest'] > 3 and random.random() < 0.15:
        urgency = 8  # Response aging
        impact = 9  # High-priority school
        actionability = 10  # Can assign immediately
        ownership = 4  # Needs assignment
        
        score = (urgency * 40) + (impact * 30) + (actionability * 20) + (ownership * 10)
        score = score / 10
        
        schools = ['Boston College', 'Georgetown', 'Virginia', 'Michigan']
        school = random.choice(schools)
        
        return {
            'category': 'ownership_gap',
            'trigger': 'college_response_no_owner',
            'score': int(score),
            'urgency': urgency,
            'impact': impact,
            'actionability': actionability,
            'ownership': ownership,
            
            'why_this_surfaced': f"{school} coach responded 3 days ago",
            'what_changed': "No follow-up owner assigned",
            'recommended_action': "Assign owner and draft response strategy",
            'owner': "Coach (needs to assign)",
            
            'details': {
                'school_name': school,
                'response_date': '3 days ago',
                'response_type': 'camp_invite',
                'athlete_interest_level': 'high',
                'suggested_steps': [
                    'Assign to athlete or parent',
                    'Review response with family',
                    'Draft reply within 24 hours'
                ]
            }
        }
    
    return None


def detect_readiness_issue(athlete: Dict) -> Dict or None:
    """
    Category 6: Readiness Issue
    Triggers: Target list too narrow/broad, stage misalignment
    """
    # Check target school count for grad year
    if athlete['gradYear'] == 2025 and athlete['schoolTargets'] < 4:
        urgency = 8  # Critical recruiting window
        impact = 6  # Limits opportunities
        actionability = 5  # Requires research
        ownership = 7  # Collaborative (coach + athlete)
        
        score = (urgency * 40) + (impact * 30) + (actionability * 20) + (ownership * 10)
        score = score / 10
        
        return {
            'category': 'readiness_issue',
            'trigger': 'target_list_too_narrow',
            'score': int(score),
            'urgency': urgency,
            'impact': impact,
            'actionability': actionability,
            'ownership': ownership,
            
            'why_this_surfaced': f"Only {athlete['schoolTargets']} target schools for {athlete['gradYear']} grad",
            'what_changed': "Critical recruiting window (spring season)",
            'recommended_action': "Expand target list to 5-8 schools, research fit",
            'owner': "Coach + Athlete",
            
            'details': {
                'current_target_count': athlete['schoolTargets'],
                'recommended_range': '5-8 schools',
                'grad_year': athlete['gradYear'],
                'suggested_steps': [
                    'Research schools matching profile',
                    'Discuss fit with family',
                    'Add 3-4 target schools'
                ]
            }
        }
    
    return None


# ============================================================================
# SCORING AND RANKING
# ============================================================================

def detect_all_interventions(athlete: Dict, upcoming_events: List[Dict]) -> List[Dict]:
    """
    Run all 6 detection categories and return list of interventions
    """
    interventions = []
    
    # Run each detector
    detectors = [
        detect_momentum_drop(athlete),
        detect_blocker(athlete),
        detect_deadline_proximity(athlete, upcoming_events),
        detect_engagement_drop(athlete),
        detect_ownership_gap(athlete),
        detect_readiness_issue(athlete)
    ]
    
    # Filter out None results
    for intervention in detectors:
        if intervention:
            # Add athlete context
            intervention['athlete_id'] = athlete['id']
            intervention['athlete_name'] = athlete['fullName']
            intervention['grad_year'] = athlete['gradYear']
            intervention['position'] = athlete['position']
            
            # Add priority tier
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
            
            # Add routing
            intervention['action_link'] = f"/support-pods/{athlete['id']}?context={intervention['category']}"
            intervention['action_type'] = 'navigate'
            
            interventions.append(intervention)
    
    return interventions


def rank_interventions(interventions: List[Dict]) -> List[Dict]:
    """
    Sort interventions by score (descending)
    """
    return sorted(interventions, key=lambda x: x['score'], reverse=True)


# ============================================================================
# SURFACING LOGIC
# ============================================================================

def get_priority_alerts(all_interventions: List[Dict]) -> List[Dict]:
    """
    Return top 2-4 critical/high priority items (score >= 70)
    Consolidate: max 2 per athlete
    """
    # Filter for score >= 70
    high_priority = [i for i in all_interventions if i['score'] >= 70]
    
    # Consolidate: max 2 per athlete
    athlete_counts = {}
    filtered = []
    
    for intervention in high_priority:
        athlete_id = intervention['athlete_id']
        count = athlete_counts.get(athlete_id, 0)
        
        if count < 2:
            filtered.append(intervention)
            athlete_counts[athlete_id] = count + 1
    
    # Return top 2-4
    return filtered[:4]


def get_athletes_needing_attention(all_interventions: List[Dict]) -> List[Dict]:
    """
    Return up to 12 medium+ priority items (score >= 50)
    One intervention per athlete (highest scored)
    """
    # Filter for score >= 50
    medium_plus = [i for i in all_interventions if i['score'] >= 50]
    
    # One per athlete (highest score)
    athlete_best = {}
    for intervention in medium_plus:
        athlete_id = intervention['athlete_id']
        if athlete_id not in athlete_best or intervention['score'] > athlete_best[athlete_id]['score']:
            athlete_best[athlete_id] = intervention
    
    # Convert to list and sort
    result = list(athlete_best.values())
    result = sorted(result, key=lambda x: x['score'], reverse=True)
    
    # Return up to 12
    return result[:12]


def consolidate_multiple_issues(athlete_id: str, interventions: List[Dict]) -> Dict:
    """
    If athlete has 3+ issues, show top 2 with "+ N more" indicator
    """
    athlete_issues = [i for i in interventions if i['athlete_id'] == athlete_id]
    
    if len(athlete_issues) <= 2:
        return None
    
    # Return consolidation info
    return {
        'athlete_id': athlete_id,
        'athlete_name': athlete_issues[0]['athlete_name'],
        'total_issues': len(athlete_issues),
        'top_issues': athlete_issues[:2],
        'additional_count': len(athlete_issues) - 2,
        'message': f"+ {len(athlete_issues) - 2} more issues"
    }
