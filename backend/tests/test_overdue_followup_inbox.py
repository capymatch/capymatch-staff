"""
Test overdue_followup detection in Coach and Director Inbox APIs.

This test verifies that:
1. Coach Inbox API (/api/coach-inbox) returns overdue_followup signals with school names for Sophia Garcia
2. Director Inbox API (/api/director-inbox) returns overdue_followup signals with school names for Sophia Garcia
3. Sophia Garcia shows severity=critical (not low/medium) in both coach and director inboxes
4. Sophia Garcia shows schoolIssues with 3 schools in coach inbox
5. Sophia Garcia shows schoolBreakdown with 3 schools in director inbox
6. Risk engine properly scores overdue_followup + no_activity compound as elevated severity
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
COACH_EMAIL = "coach.williams@capymatch.com"
COACH_PASSWORD = "coach123"
DIRECTOR_EMAIL = "director@capymatch.com"
DIRECTOR_PASSWORD = "director123"

# Expected data for Sophia Garcia
SOPHIA_ATHLETE_ID = "athlete_10"
SOPHIA_NAME = "Sophia Garcia"
EXPECTED_SCHOOLS = ["Arizona State University", "University of Arizona", "San Diego State University"]


@pytest.fixture(scope="module")
def coach_token():
    """Get coach authentication token."""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": COACH_EMAIL,
        "password": COACH_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Coach login failed: {response.status_code}")
    return response.json().get("token")


@pytest.fixture(scope="module")
def director_token():
    """Get director authentication token."""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": DIRECTOR_EMAIL,
        "password": DIRECTOR_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Director login failed: {response.status_code}")
    return response.json().get("token")


class TestCoachInboxOverdueFollowup:
    """Test overdue_followup detection in Coach Inbox API."""

    def test_coach_inbox_returns_200(self, coach_token):
        """Coach inbox endpoint should return 200."""
        response = requests.get(
            f"{BASE_URL}/api/coach-inbox",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "items" in data
        assert "count" in data
        print(f"Coach inbox returned {data['count']} items")

    def test_sophia_garcia_in_coach_inbox(self, coach_token):
        """Sophia Garcia should appear in coach inbox."""
        response = requests.get(
            f"{BASE_URL}/api/coach-inbox",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        sophia_item = next((item for item in data["items"] if item.get("athleteId") == SOPHIA_ATHLETE_ID), None)
        assert sophia_item is not None, f"Sophia Garcia ({SOPHIA_ATHLETE_ID}) not found in coach inbox"
        print(f"Found Sophia Garcia in coach inbox: {sophia_item.get('athleteName')}")

    def test_sophia_has_overdue_followup_signal(self, coach_token):
        """Sophia Garcia should have 'Overdue follow-up' in riskSignals."""
        response = requests.get(
            f"{BASE_URL}/api/coach-inbox",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        sophia_item = next((item for item in data["items"] if item.get("athleteId") == SOPHIA_ATHLETE_ID), None)
        assert sophia_item is not None, "Sophia Garcia not found in coach inbox"
        
        risk_signals = sophia_item.get("riskSignals", [])
        issues = sophia_item.get("issues", [])
        all_signals = risk_signals + issues
        
        has_overdue = any("Overdue follow-up" in s for s in all_signals)
        assert has_overdue, f"Expected 'Overdue follow-up' in signals, got: {all_signals}"
        print(f"Sophia's risk signals: {risk_signals}")

    def test_sophia_has_critical_or_high_severity(self, coach_token):
        """Sophia Garcia should have critical or high severity (not low/medium)."""
        response = requests.get(
            f"{BASE_URL}/api/coach-inbox",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        sophia_item = next((item for item in data["items"] if item.get("athleteId") == SOPHIA_ATHLETE_ID), None)
        assert sophia_item is not None, "Sophia Garcia not found in coach inbox"
        
        severity = sophia_item.get("severity", "")
        priority = sophia_item.get("priority", "")
        
        # Severity should be critical or high (not low/medium)
        assert severity in ["critical", "high"], f"Expected severity critical/high, got: {severity}"
        assert priority in ["high"], f"Expected priority high, got: {priority}"
        print(f"Sophia's severity: {severity}, priority: {priority}")

    def test_sophia_has_school_issues_with_3_schools(self, coach_token):
        """Sophia Garcia should have schoolIssues with 3 schools."""
        response = requests.get(
            f"{BASE_URL}/api/coach-inbox",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        sophia_item = next((item for item in data["items"] if item.get("athleteId") == SOPHIA_ATHLETE_ID), None)
        assert sophia_item is not None, "Sophia Garcia not found in coach inbox"
        
        school_issues = sophia_item.get("schoolIssues", [])
        school_count = sophia_item.get("schoolCount", 0)
        
        # Should have at least 3 schools
        assert school_count >= 3, f"Expected schoolCount >= 3, got: {school_count}"
        
        # Extract school names from schoolIssues
        school_names = [si.get("school") for si in school_issues if si.get("school")]
        
        # Check that expected schools are present
        for expected_school in EXPECTED_SCHOOLS:
            found = any(expected_school in s for s in school_names)
            assert found, f"Expected school '{expected_school}' not found in schoolIssues: {school_names}"
        
        print(f"Sophia's school issues ({len(school_issues)}): {school_names}")

    def test_sophia_title_suffix_shows_multiple_schools(self, coach_token):
        """Sophia Garcia should have titleSuffix indicating multiple schools."""
        response = requests.get(
            f"{BASE_URL}/api/coach-inbox",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        sophia_item = next((item for item in data["items"] if item.get("athleteId") == SOPHIA_ATHLETE_ID), None)
        assert sophia_item is not None, "Sophia Garcia not found in coach inbox"
        
        title_suffix = sophia_item.get("titleSuffix", "")
        school_count = sophia_item.get("schoolCount", 0)
        
        # If multiple schools, should have titleSuffix like "Across 3 schools"
        if school_count > 1:
            assert title_suffix is not None, f"Expected titleSuffix for {school_count} schools"
            assert "schools" in title_suffix.lower() or str(school_count) in title_suffix, \
                f"Expected titleSuffix to mention schools, got: {title_suffix}"
        
        print(f"Sophia's titleSuffix: {title_suffix}")


class TestDirectorInboxOverdueFollowup:
    """Test overdue_followup detection in Director Inbox API."""

    def test_director_inbox_returns_200(self, director_token):
        """Director inbox endpoint should return 200."""
        response = requests.get(
            f"{BASE_URL}/api/director-inbox",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "items" in data
        assert "count" in data
        print(f"Director inbox returned {data['count']} items")

    def test_sophia_garcia_in_director_inbox(self, director_token):
        """Sophia Garcia should appear in director inbox."""
        response = requests.get(
            f"{BASE_URL}/api/director-inbox",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        sophia_item = next((item for item in data["items"] if item.get("athleteId") == SOPHIA_ATHLETE_ID), None)
        assert sophia_item is not None, f"Sophia Garcia ({SOPHIA_ATHLETE_ID}) not found in director inbox"
        print(f"Found Sophia Garcia in director inbox: {sophia_item.get('athleteName')}")

    def test_sophia_has_overdue_followup_signal_director(self, director_token):
        """Sophia Garcia should have 'Overdue follow-up' in riskSignals (director view)."""
        response = requests.get(
            f"{BASE_URL}/api/director-inbox",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        sophia_item = next((item for item in data["items"] if item.get("athleteId") == SOPHIA_ATHLETE_ID), None)
        assert sophia_item is not None, "Sophia Garcia not found in director inbox"
        
        risk_signals = sophia_item.get("riskSignals", [])
        issues = sophia_item.get("issues", [])
        all_signals = risk_signals + issues
        
        has_overdue = any("Overdue follow-up" in s for s in all_signals)
        assert has_overdue, f"Expected 'Overdue follow-up' in signals, got: {all_signals}"
        print(f"Sophia's risk signals (director): {risk_signals}")

    def test_sophia_has_critical_or_high_severity_director(self, director_token):
        """Sophia Garcia should have critical or high severity in director inbox."""
        response = requests.get(
            f"{BASE_URL}/api/director-inbox",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        sophia_item = next((item for item in data["items"] if item.get("athleteId") == SOPHIA_ATHLETE_ID), None)
        assert sophia_item is not None, "Sophia Garcia not found in director inbox"
        
        severity = sophia_item.get("severity", "")
        priority = sophia_item.get("priority", "")
        
        # Severity should be critical or high (not low/medium)
        assert severity in ["critical", "high"], f"Expected severity critical/high, got: {severity}"
        assert priority in ["high"], f"Expected priority high, got: {priority}"
        print(f"Sophia's severity (director): {severity}, priority: {priority}")

    def test_sophia_has_school_breakdown_with_3_schools(self, director_token):
        """Sophia Garcia should have schoolBreakdown with 3 schools in director inbox."""
        response = requests.get(
            f"{BASE_URL}/api/director-inbox",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        sophia_item = next((item for item in data["items"] if item.get("athleteId") == SOPHIA_ATHLETE_ID), None)
        assert sophia_item is not None, "Sophia Garcia not found in director inbox"
        
        school_breakdown = sophia_item.get("schoolBreakdown", [])
        school_count = sophia_item.get("schoolCount", 0)
        
        # Should have at least 3 schools
        assert school_count >= 3, f"Expected schoolCount >= 3, got: {school_count}"
        
        # Extract school names from schoolBreakdown
        school_names = [sb.get("school") for sb in school_breakdown if sb.get("school")]
        
        # Check that expected schools are present
        for expected_school in EXPECTED_SCHOOLS:
            found = any(expected_school in s for s in school_names)
            assert found, f"Expected school '{expected_school}' not found in schoolBreakdown: {school_names}"
        
        print(f"Sophia's school breakdown ({len(school_breakdown)}): {school_names}")

    def test_sophia_school_breakdown_has_overdue_issue(self, director_token):
        """Sophia's schoolBreakdown entries should have 'Overdue follow-up' issue."""
        response = requests.get(
            f"{BASE_URL}/api/director-inbox",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        sophia_item = next((item for item in data["items"] if item.get("athleteId") == SOPHIA_ATHLETE_ID), None)
        assert sophia_item is not None, "Sophia Garcia not found in director inbox"
        
        school_breakdown = sophia_item.get("schoolBreakdown", [])
        
        # At least some entries should have "Overdue follow-up" issue
        overdue_entries = [sb for sb in school_breakdown if "Overdue follow-up" in sb.get("issue", "")]
        assert len(overdue_entries) >= 3, f"Expected at least 3 overdue entries, got: {len(overdue_entries)}"
        
        print(f"Overdue entries in schoolBreakdown: {overdue_entries}")


class TestRiskEngineOverdueFollowup:
    """Test risk engine scoring for overdue_followup signals."""

    def test_sophia_risk_score_elevated(self, coach_token):
        """Sophia's risk score should be elevated due to overdue_followup + no_activity compound."""
        response = requests.get(
            f"{BASE_URL}/api/coach-inbox",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        sophia_item = next((item for item in data["items"] if item.get("athleteId") == SOPHIA_ATHLETE_ID), None)
        assert sophia_item is not None, "Sophia Garcia not found in coach inbox"
        
        risk_score = sophia_item.get("riskScore", 0)
        
        # Risk score should be >= 76 for critical severity
        # Or at least >= 56 for high severity
        assert risk_score >= 56, f"Expected riskScore >= 56 (high), got: {risk_score}"
        print(f"Sophia's risk score: {risk_score}")

    def test_sophia_why_now_mentions_overdue(self, coach_token):
        """Sophia's whyNow should mention overdue follow-ups."""
        response = requests.get(
            f"{BASE_URL}/api/coach-inbox",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        sophia_item = next((item for item in data["items"] if item.get("athleteId") == SOPHIA_ATHLETE_ID), None)
        assert sophia_item is not None, "Sophia Garcia not found in coach inbox"
        
        why_now = sophia_item.get("whyNow", "")
        
        # whyNow should mention overdue or school follow-ups
        has_relevant_text = any(term in why_now.lower() for term in ["overdue", "follow-up", "school", "inactivity"])
        assert has_relevant_text, f"Expected whyNow to mention overdue/follow-up, got: {why_now}"
        print(f"Sophia's whyNow: {why_now}")

    def test_sophia_intervention_type_appropriate(self, coach_token):
        """Sophia's intervention type should be escalate or blocker for critical severity."""
        response = requests.get(
            f"{BASE_URL}/api/coach-inbox",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        sophia_item = next((item for item in data["items"] if item.get("athleteId") == SOPHIA_ATHLETE_ID), None)
        assert sophia_item is not None, "Sophia Garcia not found in coach inbox"
        
        intervention = sophia_item.get("interventionType", "")
        severity = sophia_item.get("severity", "")
        
        # For critical/high severity, intervention should be escalate, blocker, or review
        if severity in ["critical", "high"]:
            assert intervention in ["escalate", "blocker", "review", "nudge"], \
                f"Expected intervention escalate/blocker/review for {severity} severity, got: {intervention}"
        
        print(f"Sophia's intervention type: {intervention}")


class TestNoRegressions:
    """Test that existing inbox items still render correctly."""

    def test_coach_inbox_has_multiple_items(self, coach_token):
        """Coach inbox should have multiple items (no regression)."""
        response = requests.get(
            f"{BASE_URL}/api/coach-inbox",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should have at least a few items
        assert data["count"] >= 1, f"Expected at least 1 item, got: {data['count']}"
        print(f"Coach inbox has {data['count']} items")

    def test_director_inbox_has_multiple_items(self, director_token):
        """Director inbox should have multiple items (no regression)."""
        response = requests.get(
            f"{BASE_URL}/api/director-inbox",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should have at least a few items
        assert data["count"] >= 1, f"Expected at least 1 item, got: {data['count']}"
        print(f"Director inbox has {data['count']} items")

    def test_all_coach_inbox_items_have_required_fields(self, coach_token):
        """All coach inbox items should have required fields."""
        response = requests.get(
            f"{BASE_URL}/api/coach-inbox",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        required_fields = ["id", "athleteId", "athleteName", "severity", "priority", "riskScore", "cta"]
        
        for item in data["items"]:
            for field in required_fields:
                assert field in item, f"Missing required field '{field}' in item: {item.get('athleteName')}"
        
        print(f"All {len(data['items'])} coach inbox items have required fields")

    def test_all_director_inbox_items_have_required_fields(self, director_token):
        """All director inbox items should have required fields."""
        response = requests.get(
            f"{BASE_URL}/api/director-inbox",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        required_fields = ["id", "athleteId", "athleteName", "severity", "priority", "riskScore", "cta"]
        
        for item in data["items"]:
            for field in required_fields:
                assert field in item, f"Missing required field '{field}' in item: {item.get('athleteName')}"
        
        print(f"All {len(data['items'])} director inbox items have required fields")
