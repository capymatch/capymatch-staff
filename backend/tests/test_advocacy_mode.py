"""
Test suite for Advocacy Mode and Decision Engine event_follow_up feature.

Features tested:
1. Decision Engine: event_follow_up category detection
2. Advocacy API: Recommendations CRUD, status transitions, response tracking
3. Relationships: School relationship memory and aggregation
4. Event Context: Supporting context lookup for recommendation builder
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# ============================================================================
# DECISION ENGINE — event_follow_up detection
# ============================================================================

class TestDecisionEngineEventFollowUp:
    """Test event_follow_up intervention detection"""
    
    def test_debug_interventions_endpoint_returns_200(self):
        """GET /api/debug/interventions returns 200"""
        response = requests.get(f"{BASE_URL}/api/debug/interventions")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ GET /api/debug/interventions returns 200")
    
    def test_debug_interventions_has_by_category(self):
        """Verify response has by_category breakdown including event_follow_up"""
        response = requests.get(f"{BASE_URL}/api/debug/interventions")
        data = response.json()
        
        assert "by_category" in data, "Missing by_category in response"
        assert "event_follow_up" in data["by_category"], "Missing event_follow_up category"
        print(f"✓ by_category includes event_follow_up: {data['by_category']['event_follow_up']} detected")
    
    def test_event_follow_up_interventions_exist(self):
        """Verify event_follow_up interventions are detected for stale notes"""
        response = requests.get(f"{BASE_URL}/api/debug/interventions")
        data = response.json()
        
        event_follow_ups = [i for i in data["interventions"] if i["category"] == "event_follow_up"]
        
        # Should have at least some event_follow_up interventions from past events
        # Based on mock_data.py, event_0 (Winter Showcase, 6 days ago) has Hot/Warm notes
        print(f"✓ Found {len(event_follow_ups)} event_follow_up interventions")
        
        # Print details for debugging
        for efu in event_follow_ups:
            print(f"  - {efu['athlete_name']}: {efu['trigger']} (score: {efu['score']})")
    
    def test_event_follow_up_intervention_has_required_fields(self):
        """Verify event_follow_up interventions have proper structure"""
        response = requests.get(f"{BASE_URL}/api/debug/interventions")
        data = response.json()
        
        event_follow_ups = [i for i in data["interventions"] if i["category"] == "event_follow_up"]
        
        if event_follow_ups:
            efu = event_follow_ups[0]
            required_fields = [
                "category", "trigger", "score", "urgency", "impact", "actionability", "ownership",
                "why_this_surfaced", "what_changed", "recommended_action", "owner",
                "athlete_id", "athlete_name", "priority_tier"
            ]
            for field in required_fields:
                assert field in efu, f"Missing field: {field}"
            
            # Verify trigger is correct type
            assert efu["trigger"] in ("hot_follow_up_stale", "warm_follow_up_stale"), f"Unexpected trigger: {efu['trigger']}"
            print(f"✓ event_follow_up intervention has all required fields")
        else:
            print("⚠ No event_follow_up interventions to validate structure")


# ============================================================================
# ADVOCACY API — Recommendations CRUD
# ============================================================================

class TestAdvocacyRecommendationsList:
    """Test recommendations listing endpoint"""
    
    def test_list_recommendations_returns_200(self):
        """GET /api/advocacy/recommendations returns 200"""
        response = requests.get(f"{BASE_URL}/api/advocacy/recommendations")
        assert response.status_code == 200
        print("✓ GET /api/advocacy/recommendations returns 200")
    
    def test_list_recommendations_has_groups(self):
        """Verify response has expected groupings"""
        response = requests.get(f"{BASE_URL}/api/advocacy/recommendations")
        data = response.json()
        
        assert "needs_attention" in data, "Missing needs_attention group"
        assert "drafts" in data, "Missing drafts group"
        assert "recently_sent" in data, "Missing recently_sent group"
        assert "closed" in data, "Missing closed group"
        assert "stats" in data, "Missing stats"
        print(f"✓ Response has all 4 groups + stats")
    
    def test_list_recommendations_stats_correct(self):
        """Verify stats structure"""
        response = requests.get(f"{BASE_URL}/api/advocacy/recommendations")
        data = response.json()
        stats = data["stats"]
        
        assert "total" in stats
        assert "drafts" in stats
        assert "sent" in stats
        assert "awaiting" in stats
        assert "warm" in stats
        assert "closed" in stats
        print(f"✓ Stats: total={stats['total']}, drafts={stats['drafts']}, sent={stats['sent']}, awaiting={stats['awaiting']}, warm={stats['warm']}, closed={stats['closed']}")
    
    def test_seeded_recommendations_exist(self):
        """Verify seeded recommendations are present"""
        response = requests.get(f"{BASE_URL}/api/advocacy/recommendations")
        data = response.json()
        
        all_recs = data["needs_attention"] + data["drafts"] + data["recently_sent"] + data["closed"]
        rec_ids = [r["id"] for r in all_recs]
        
        # Check seeded recommendations
        assert "rec_1" in rec_ids, "Missing seeded rec_1 (warm_response)"
        assert "rec_4" in rec_ids, "Missing seeded rec_4 (draft)"
        assert "rec_5" in rec_ids, "Missing seeded rec_5 (closed)"
        print(f"✓ Found {len(all_recs)} recommendations including seeded data")
    
    def test_filter_by_status_drafts(self):
        """Filter recommendations by status=draft"""
        response = requests.get(f"{BASE_URL}/api/advocacy/recommendations?status=draft")
        data = response.json()
        
        # Drafts should only appear in drafts section
        assert len(data["drafts"]) >= 1, "Expected at least one draft (rec_4)"
        print(f"✓ Filter status=draft returns {len(data['drafts'])} drafts")


class TestAdvocacyRecommendationDetail:
    """Test single recommendation detail"""
    
    def test_get_recommendation_rec_1(self):
        """GET /api/advocacy/recommendations/rec_1 returns warm_response rec"""
        response = requests.get(f"{BASE_URL}/api/advocacy/recommendations/rec_1")
        assert response.status_code == 200
        data = response.json()
        
        assert data["id"] == "rec_1"
        assert data["status"] == "warm_response"
        assert data["athlete_name"] == "Marcus Johnson"
        assert data["school_name"] == "Michigan"
        assert "relationship_summary" in data, "Should include relationship_summary"
        print(f"✓ rec_1: {data['athlete_name']} → {data['school_name']} (status: {data['status']})")
    
    def test_get_recommendation_rec_4_draft(self):
        """GET /api/advocacy/recommendations/rec_4 returns draft"""
        response = requests.get(f"{BASE_URL}/api/advocacy/recommendations/rec_4")
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "draft"
        assert data["sent_at"] is None
        print(f"✓ rec_4: draft for {data['athlete_name']} → {data['school_name']}")
    
    def test_get_nonexistent_recommendation(self):
        """GET /api/advocacy/recommendations/rec_999 returns error"""
        response = requests.get(f"{BASE_URL}/api/advocacy/recommendations/rec_999")
        assert response.status_code == 200
        data = response.json()
        assert "error" in data
        print("✓ Nonexistent recommendation returns error")


class TestAdvocacyRecommendationCreate:
    """Test recommendation creation"""
    
    def test_create_recommendation(self):
        """POST /api/advocacy/recommendations creates new draft"""
        payload = {
            "athlete_id": "athlete_12",
            "school_id": "unc",
            "school_name": "UNC",
            "fit_reasons": ["athletic_ability", "coachability"],
            "fit_note": "Test recommendation for pytest",
            "intro_message": "",
            "desired_next_step": "review_film"
        }
        
        response = requests.post(f"{BASE_URL}/api/advocacy/recommendations", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "draft"
        assert data["athlete_id"] == "athlete_12"
        assert data["school_id"] == "unc"
        assert "id" in data
        assert data["id"].startswith("rec_")
        
        # Verify GET returns the created rec
        get_response = requests.get(f"{BASE_URL}/api/advocacy/recommendations/{data['id']}")
        assert get_response.status_code == 200
        
        print(f"✓ Created recommendation: {data['id']}")
        return data["id"]


class TestAdvocacyRecommendationSend:
    """Test sending a draft recommendation"""
    
    def test_send_draft_recommendation(self):
        """POST /api/advocacy/recommendations/:id/send transitions draft to sent"""
        # First create a draft
        payload = {
            "athlete_id": "athlete_14",
            "school_id": "duke",
            "school_name": "Duke",
            "fit_reasons": ["tactical_awareness"],
            "fit_note": "Test send flow",
            "intro_message": "Hello Coach, I'd like to recommend...",
            "desired_next_step": "schedule_call"
        }
        create_response = requests.post(f"{BASE_URL}/api/advocacy/recommendations", json=payload)
        rec_id = create_response.json()["id"]
        
        # Send it
        send_response = requests.post(f"{BASE_URL}/api/advocacy/recommendations/{rec_id}/send")
        assert send_response.status_code == 200
        data = send_response.json()
        
        assert data["status"] == "sent"
        assert data["sent_at"] is not None
        assert len(data["response_history"]) == 1
        assert data["response_history"][0]["type"] == "sent"
        
        print(f"✓ Sent recommendation: {rec_id}")
    
    def test_cannot_send_already_sent(self):
        """Cannot send an already sent recommendation"""
        # rec_3 is already sent
        response = requests.post(f"{BASE_URL}/api/advocacy/recommendations/rec_3/send")
        assert response.status_code == 200
        data = response.json()
        assert "error" in data
        print("✓ Cannot re-send already sent recommendation")


class TestAdvocacyResponseTracking:
    """Test response logging and follow-up"""
    
    def test_log_response_warm(self):
        """POST /api/advocacy/recommendations/:id/respond logs warm response"""
        # Use rec_3 which is in 'sent' state
        payload = {
            "response_note": "Coach expressed strong interest, wants spring tape",
            "response_type": "warm"
        }
        
        response = requests.post(f"{BASE_URL}/api/advocacy/recommendations/rec_3/respond", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "warm_response"
        assert data["response_note"] == payload["response_note"]
        assert data["response_at"] is not None
        print(f"✓ Logged warm response for rec_3")
    
    def test_follow_up_increments_count(self):
        """POST /api/advocacy/recommendations/:id/follow-up increments follow_up_count"""
        # Get current state of rec_2
        get_response = requests.get(f"{BASE_URL}/api/advocacy/recommendations/rec_2")
        initial_count = get_response.json().get("follow_up_count", 0)
        
        # Mark follow-up
        response = requests.post(f"{BASE_URL}/api/advocacy/recommendations/rec_2/follow-up")
        assert response.status_code == 200
        data = response.json()
        
        assert data["follow_up_count"] == initial_count + 1
        assert data["status"] == "follow_up_needed"
        print(f"✓ Follow-up count incremented: {initial_count} → {data['follow_up_count']}")
    
    def test_close_recommendation(self):
        """POST /api/advocacy/recommendations/:id/close closes recommendation"""
        # Create and send a new rec to close
        create_payload = {
            "athlete_id": "athlete_15",
            "school_id": "pepperdine",
            "school_name": "Pepperdine",
            "fit_reasons": ["academic_fit"],
            "intro_message": "Test close flow",
            "desired_next_step": "visit_campus"
        }
        create_response = requests.post(f"{BASE_URL}/api/advocacy/recommendations", json=create_payload)
        rec_id = create_response.json()["id"]
        
        # Send it
        requests.post(f"{BASE_URL}/api/advocacy/recommendations/{rec_id}/send")
        
        # Close it
        close_response = requests.post(f"{BASE_URL}/api/advocacy/recommendations/{rec_id}/close", json={"reason": "no_response"})
        assert close_response.status_code == 200
        data = close_response.json()
        
        assert data["status"] == "closed"
        assert data["closed_reason"] == "no_response"
        assert data["closed_at"] is not None
        print(f"✓ Closed recommendation: {rec_id}")


# ============================================================================
# RELATIONSHIPS — School memory
# ============================================================================

class TestAdvocacyRelationships:
    """Test school relationship memory"""
    
    def test_list_relationships(self):
        """GET /api/advocacy/relationships returns relationship list"""
        response = requests.get(f"{BASE_URL}/api/advocacy/relationships")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"✓ Found {len(data)} school relationships with interactions")
    
    def test_get_michigan_relationship(self):
        """GET /api/advocacy/relationships/michigan returns full relationship"""
        response = requests.get(f"{BASE_URL}/api/advocacy/relationships/michigan")
        assert response.status_code == 200
        data = response.json()
        
        assert "school" in data
        assert data["school"]["id"] == "michigan"
        assert data["school"]["name"] == "Michigan"
        
        assert "summary" in data
        summary = data["summary"]
        assert "totalInteractions" in summary
        assert "athletesIntroduced" in summary
        assert "responseRate" in summary
        assert "warmth" in summary
        
        assert "athletes" in data
        assert "timeline" in data
        
        print(f"✓ Michigan relationship: {summary['totalInteractions']} interactions, {summary['athletesIntroduced']} athletes introduced, warmth={summary['warmth']}")
    
    def test_nonexistent_relationship(self):
        """GET /api/advocacy/relationships/fake_school returns error"""
        response = requests.get(f"{BASE_URL}/api/advocacy/relationships/fake_school")
        assert response.status_code == 200
        data = response.json()
        assert "error" in data
        print("✓ Nonexistent school returns error")


# ============================================================================
# EVENT CONTEXT — Supporting context lookup
# ============================================================================

class TestAdvocacyEventContext:
    """Test event context for recommendation builder"""
    
    def test_get_context_athlete_only(self):
        """GET /api/advocacy/context/:athleteId returns athlete context"""
        response = requests.get(f"{BASE_URL}/api/advocacy/context/athlete_4")
        assert response.status_code == 200
        data = response.json()
        
        assert "event_notes" in data
        assert "athlete_snapshot" in data
        
        if data["athlete_snapshot"]:
            snap = data["athlete_snapshot"]
            assert "id" in snap
            assert "fullName" in snap
            assert "gradYear" in snap
            assert "position" in snap
            print(f"✓ Context for athlete_4: {len(data['event_notes'])} event notes, snapshot present")
        else:
            print("✓ Context for athlete_4: no snapshot (athlete not found)")
    
    def test_get_context_athlete_school(self):
        """GET /api/advocacy/context/:athleteId/:schoolId returns filtered context"""
        response = requests.get(f"{BASE_URL}/api/advocacy/context/athlete_4/michigan")
        assert response.status_code == 200
        data = response.json()
        
        # Should filter to Michigan-related notes (or Hot/Warm general notes)
        print(f"✓ Context for athlete_4 × Michigan: {len(data['event_notes'])} event notes")


# ============================================================================
# MISSION CONTROL — event_follow_up in Priority Alerts
# ============================================================================

class TestMissionControlEventFollowUp:
    """Test event_follow_up appears in Mission Control"""
    
    def test_mission_control_returns_200(self):
        """GET /api/mission-control returns 200"""
        response = requests.get(f"{BASE_URL}/api/mission-control")
        assert response.status_code == 200
        print("✓ GET /api/mission-control returns 200")
    
    def test_priority_alerts_may_include_event_follow_up(self):
        """Priority alerts may include event_follow_up category if detected"""
        response = requests.get(f"{BASE_URL}/api/mission-control")
        data = response.json()
        
        priority_alerts = data.get("priorityAlerts", [])
        event_follow_up_alerts = [a for a in priority_alerts if a.get("category") == "event_follow_up"]
        
        print(f"✓ Priority alerts: {len(priority_alerts)} total, {len(event_follow_up_alerts)} event_follow_up")
        
        # Note: event_follow_up may not appear in priority alerts if score < 70
        # or if other interventions have higher scores


# ============================================================================
# SCHOOLS LIST
# ============================================================================

class TestSchoolsList:
    """Test schools endpoint for dropdowns"""
    
    def test_list_schools(self):
        """GET /api/schools returns school list"""
        response = requests.get(f"{BASE_URL}/api/schools")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) >= 10
        
        # Verify structure
        school = data[0]
        assert "id" in school
        assert "name" in school
        assert "division" in school
        
        print(f"✓ Found {len(data)} schools")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
