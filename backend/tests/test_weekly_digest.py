"""
Weekly Digest V1 Backend API Tests
- POST /api/digest/generate: Director-only digest generation and email sending
- GET /api/digest/history: List past digests sorted by sent_at desc
- GET /api/digest/{digest_id}: Get full digest detail with summary_data

Features tested:
- Director-only access (403 for coaches)
- Digest data assembly (coach activation, notes, athletes needing attention, unassigned, events)
- Summary response (what_changed, coach_count, needs_support, notes_this_week, athletes_attention, unassigned)
- Digest storage with full summary_data snapshot
- Digest record structure validation
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
DIRECTOR_EMAIL = "director@capymatch.com"
DIRECTOR_PASSWORD = "director123"
COACH_EMAIL = "coach.williams@capymatch.com"
COACH_PASSWORD = "coach123"


@pytest.fixture(scope="module")
def director_token():
    """Get director authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": DIRECTOR_EMAIL,
        "password": DIRECTOR_PASSWORD
    })
    assert response.status_code == 200, f"Director login failed: {response.text}"
    data = response.json()
    return data.get("token")


@pytest.fixture(scope="module")
def coach_token():
    """Get coach authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": COACH_EMAIL,
        "password": COACH_PASSWORD
    })
    assert response.status_code == 200, f"Coach login failed: {response.text}"
    data = response.json()
    return data.get("token")


@pytest.fixture
def director_session(director_token):
    """Session with director auth"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {director_token}"
    })
    return session


@pytest.fixture
def coach_session(coach_token):
    """Session with coach auth"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {coach_token}"
    })
    return session


class TestDigestGenerate:
    """Tests for POST /api/digest/generate endpoint"""
    
    def test_generate_requires_auth(self):
        """POST /api/digest/generate returns 401 without authentication"""
        response = requests.post(f"{BASE_URL}/api/digest/generate")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_generate_forbidden_for_coach(self, coach_session):
        """POST /api/digest/generate returns 403 for coaches (director-only)"""
        response = coach_session.post(f"{BASE_URL}/api/digest/generate")
        assert response.status_code == 403, f"Expected 403 for coach, got {response.status_code}"
        data = response.json()
        assert "director" in data.get("detail", "").lower() or "only" in data.get("detail", "").lower()
    
    def test_generate_success_for_director(self, director_session):
        """POST /api/digest/generate succeeds for director and returns summary"""
        response = director_session.post(f"{BASE_URL}/api/digest/generate")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify top-level response fields
        assert "status" in data, "Response should contain status"
        assert data["status"] in ["sent", "failed"], f"Status should be sent or failed, got {data['status']}"
        assert "digest_id" in data, "Response should contain digest_id"
        assert "sent_at" in data, "Response should contain sent_at"
        
        # Verify summary object
        assert "summary" in data, "Response should contain summary object"
        summary = data["summary"]
        
        # Verify required summary fields
        assert "what_changed" in summary, "Summary should contain what_changed"
        assert "coach_count" in summary, "Summary should contain coach_count"
        assert "needs_support" in summary, "Summary should contain needs_support"
        assert "notes_this_week" in summary, "Summary should contain notes_this_week"
        assert "athletes_attention" in summary, "Summary should contain athletes_attention"
        assert "unassigned" in summary, "Summary should contain unassigned"
        
        # Verify types
        assert isinstance(summary["what_changed"], str), "what_changed should be string"
        assert isinstance(summary["coach_count"], int), "coach_count should be int"
        assert isinstance(summary["needs_support"], int), "needs_support should be int"
        assert isinstance(summary["notes_this_week"], int), "notes_this_week should be int"
        assert isinstance(summary["athletes_attention"], int), "athletes_attention should be int"
        assert isinstance(summary["unassigned"], int), "unassigned should be int"
        
        # Store digest_id for later tests
        TestDigestGenerate.last_digest_id = data["digest_id"]
    
    def test_what_changed_contains_summary_text(self, director_session):
        """Verify what_changed text is generated dynamically with context"""
        response = director_session.post(f"{BASE_URL}/api/digest/generate")
        assert response.status_code == 200
        
        data = response.json()
        what_changed = data["summary"]["what_changed"]
        
        # what_changed should be a non-empty string ending with period
        assert len(what_changed) > 0, "what_changed should not be empty"
        assert what_changed.endswith("."), "what_changed should end with period"


class TestDigestHistory:
    """Tests for GET /api/digest/history endpoint"""
    
    def test_history_requires_auth(self):
        """GET /api/digest/history returns 401 without authentication"""
        response = requests.get(f"{BASE_URL}/api/digest/history")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_history_forbidden_for_coach(self, coach_session):
        """GET /api/digest/history returns 403 for coaches (director-only)"""
        response = coach_session.get(f"{BASE_URL}/api/digest/history")
        assert response.status_code == 403, f"Expected 403 for coach, got {response.status_code}"
    
    def test_history_success_for_director(self, director_session):
        """GET /api/digest/history returns list of past digests for director"""
        response = director_session.get(f"{BASE_URL}/api/digest/history")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # There should be at least 1 digest (from earlier tests)
        assert len(data) >= 1, "Should have at least 1 digest in history"
    
    def test_history_sorted_by_sent_at_desc(self, director_session):
        """GET /api/digest/history returns digests sorted by sent_at descending"""
        response = director_session.get(f"{BASE_URL}/api/digest/history")
        assert response.status_code == 200
        
        data = response.json()
        if len(data) >= 2:
            # Verify descending order by sent_at
            for i in range(len(data) - 1):
                assert data[i]["sent_at"] >= data[i + 1]["sent_at"], \
                    f"History should be sorted by sent_at desc: {data[i]['sent_at']} should be >= {data[i + 1]['sent_at']}"
    
    def test_history_record_structure(self, director_session):
        """Verify digest history records have correct structure"""
        response = director_session.get(f"{BASE_URL}/api/digest/history")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) >= 1, "Need at least 1 digest"
        
        digest = data[0]
        
        # Required fields per spec
        assert "id" in digest, "Digest should have id"
        assert "sent_by_name" in digest, "Digest should have sent_by_name"
        assert "recipients" in digest, "Digest should have recipients"
        assert isinstance(digest["recipients"], list), "recipients should be array"
        assert "period_start" in digest, "Digest should have period_start"
        assert "period_end" in digest, "Digest should have period_end"
        assert "delivery_status" in digest, "Digest should have delivery_status"
        assert "sent_at" in digest, "Digest should have sent_at"
        
        # Verify delivery_status is valid
        assert digest["delivery_status"] in ["pending", "sent", "failed"], \
            f"delivery_status should be pending/sent/failed, got {digest['delivery_status']}"
    
    def test_history_includes_summary_data_subset(self, director_session):
        """Verify history records include summary_data fields for display"""
        response = director_session.get(f"{BASE_URL}/api/digest/history")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) >= 1
        
        digest = data[0]
        
        # History should include summary_data subset for UI display
        if "summary_data" in digest:
            sd = digest["summary_data"]
            # Should have coach_summary with status_counts
            if "coach_summary" in sd:
                assert "status_counts" in sd["coach_summary"], "Should have status_counts"
            # Should have notes total
            if "notes" in sd:
                assert "total" in sd["notes"], "Should have notes.total"


class TestDigestDetail:
    """Tests for GET /api/digest/{digest_id} endpoint"""
    
    def test_detail_requires_auth(self, director_session):
        """GET /api/digest/{id} returns 401 without authentication"""
        # First get a valid digest_id
        response = director_session.get(f"{BASE_URL}/api/digest/history")
        assert response.status_code == 200
        data = response.json()
        if len(data) == 0:
            pytest.skip("No digests available")
        
        digest_id = data[0]["id"]
        
        # Now test without auth
        response = requests.get(f"{BASE_URL}/api/digest/{digest_id}")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_detail_forbidden_for_coach(self, director_session, coach_session):
        """GET /api/digest/{id} returns 403 for coaches"""
        # Get a valid digest_id first
        response = director_session.get(f"{BASE_URL}/api/digest/history")
        assert response.status_code == 200
        data = response.json()
        if len(data) == 0:
            pytest.skip("No digests available")
        
        digest_id = data[0]["id"]
        
        # Test with coach
        response = coach_session.get(f"{BASE_URL}/api/digest/{digest_id}")
        assert response.status_code == 403, f"Expected 403 for coach, got {response.status_code}"
    
    def test_detail_returns_full_snapshot(self, director_session):
        """GET /api/digest/{id} returns full digest with summary_data snapshot"""
        # Get a valid digest_id
        response = director_session.get(f"{BASE_URL}/api/digest/history")
        assert response.status_code == 200
        history = response.json()
        if len(history) == 0:
            pytest.skip("No digests available")
        
        digest_id = history[0]["id"]
        
        # Get detail
        response = director_session.get(f"{BASE_URL}/api/digest/{digest_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # Verify full record structure
        assert "id" in data, "Should have id"
        assert "sent_by" in data, "Should have sent_by (user id)"
        assert "sent_by_name" in data, "Should have sent_by_name"
        assert "recipients" in data, "Should have recipients array"
        assert isinstance(data["recipients"], list), "recipients should be array"
        assert "period_start" in data, "Should have period_start"
        assert "period_end" in data, "Should have period_end"
        assert "summary_data" in data, "Should have full summary_data snapshot"
        assert "delivery_status" in data, "Should have delivery_status"
        assert "sent_at" in data, "Should have sent_at"
    
    def test_detail_summary_data_contains_athletes_needing_attention(self, director_session):
        """Verify summary_data includes athletes_needing_attention snapshot"""
        response = director_session.get(f"{BASE_URL}/api/digest/history")
        assert response.status_code == 200
        history = response.json()
        if len(history) == 0:
            pytest.skip("No digests available")
        
        digest_id = history[0]["id"]
        
        response = director_session.get(f"{BASE_URL}/api/digest/{digest_id}")
        assert response.status_code == 200
        
        data = response.json()
        summary_data = data.get("summary_data", {})
        
        # Verify athletes_needing_attention is in snapshot
        assert "athletes_needing_attention" in summary_data, \
            "summary_data should contain athletes_needing_attention"
        assert isinstance(summary_data["athletes_needing_attention"], list), \
            "athletes_needing_attention should be a list"
    
    def test_detail_summary_data_structure(self, director_session):
        """Verify full summary_data structure in digest detail"""
        response = director_session.get(f"{BASE_URL}/api/digest/history")
        assert response.status_code == 200
        history = response.json()
        if len(history) == 0:
            pytest.skip("No digests available")
        
        digest_id = history[0]["id"]
        
        response = director_session.get(f"{BASE_URL}/api/digest/{digest_id}")
        assert response.status_code == 200
        
        data = response.json()
        sd = data.get("summary_data", {})
        
        # Verify all sections of summary_data
        assert "period_start" in sd, "Should have period_start"
        assert "period_end" in sd, "Should have period_end"
        assert "coach_summary" in sd, "Should have coach_summary"
        assert "notes" in sd, "Should have notes section"
        assert "athletes_needing_attention" in sd, "Should have athletes_needing_attention"
        assert "unassigned_athletes" in sd, "Should have unassigned_athletes"
        assert "upcoming_events" in sd, "Should have upcoming_events"
        
        # Verify coach_summary structure
        cs = sd["coach_summary"]
        assert "total" in cs, "coach_summary should have total"
        assert "status_counts" in cs, "coach_summary should have status_counts"
        
        # Verify notes structure  
        notes = sd["notes"]
        assert "total" in notes, "notes should have total"
    
    def test_detail_not_found(self, director_session):
        """GET /api/digest/{id} returns 404 for non-existent digest"""
        response = director_session.get(f"{BASE_URL}/api/digest/nonexistent_digest_id_12345")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"


class TestDigestDataAssembly:
    """Tests for digest data assembly accuracy"""
    
    def test_coach_count_matches(self, director_session):
        """Verify coach_count in summary matches actual coach count"""
        # Generate digest
        response = director_session.post(f"{BASE_URL}/api/digest/generate")
        assert response.status_code == 200
        
        digest_data = response.json()
        digest_id = digest_data["digest_id"]
        
        # Get full detail
        response = director_session.get(f"{BASE_URL}/api/digest/{digest_id}")
        assert response.status_code == 200
        
        detail = response.json()
        sd = detail["summary_data"]
        
        # Verify coach_count in summary matches coach_summary.total
        assert digest_data["summary"]["coach_count"] == sd["coach_summary"]["total"], \
            f"coach_count mismatch: summary={digest_data['summary']['coach_count']}, snapshot={sd['coach_summary']['total']}"
    
    def test_needs_support_matches(self, director_session):
        """Verify needs_support count matches coaches_needing_support length"""
        response = director_session.post(f"{BASE_URL}/api/digest/generate")
        assert response.status_code == 200
        
        digest_data = response.json()
        digest_id = digest_data["digest_id"]
        
        response = director_session.get(f"{BASE_URL}/api/digest/{digest_id}")
        assert response.status_code == 200
        
        detail = response.json()
        sd = detail["summary_data"]
        
        # Verify needs_support matches
        coaches_needing_support = sd["coach_summary"].get("coaches_needing_support", [])
        assert digest_data["summary"]["needs_support"] == len(coaches_needing_support), \
            f"needs_support mismatch: summary={digest_data['summary']['needs_support']}, snapshot={len(coaches_needing_support)}"
    
    def test_athletes_attention_matches(self, director_session):
        """Verify athletes_attention count matches snapshot length"""
        response = director_session.post(f"{BASE_URL}/api/digest/generate")
        assert response.status_code == 200
        
        digest_data = response.json()
        digest_id = digest_data["digest_id"]
        
        response = director_session.get(f"{BASE_URL}/api/digest/{digest_id}")
        assert response.status_code == 200
        
        detail = response.json()
        sd = detail["summary_data"]
        
        athletes_attention = sd.get("athletes_needing_attention", [])
        assert digest_data["summary"]["athletes_attention"] == len(athletes_attention), \
            f"athletes_attention mismatch: summary={digest_data['summary']['athletes_attention']}, snapshot={len(athletes_attention)}"
    
    def test_unassigned_matches(self, director_session):
        """Verify unassigned count matches unassigned_athletes length"""
        response = director_session.post(f"{BASE_URL}/api/digest/generate")
        assert response.status_code == 200
        
        digest_data = response.json()
        digest_id = digest_data["digest_id"]
        
        response = director_session.get(f"{BASE_URL}/api/digest/{digest_id}")
        assert response.status_code == 200
        
        detail = response.json()
        sd = detail["summary_data"]
        
        unassigned = sd.get("unassigned_athletes", [])
        assert digest_data["summary"]["unassigned"] == len(unassigned), \
            f"unassigned mismatch: summary={digest_data['summary']['unassigned']}, snapshot={len(unassigned)}"
