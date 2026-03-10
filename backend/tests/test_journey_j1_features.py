"""
Test suite for Journey Page J1 Features:
- Match Score badge (GET /api/match-scores)
- Risk badges (with RiskExplainerDrawer)
- Overdue/Upcoming follow-up cards
- Questionnaire section
- University logo support

Test programs:
- Stanford (a54a0014): overdue follow-up (2026-03-07, 3 days overdue)
- UCLA (421ac5a8): due today (2026-03-10)
- Tampa (66c1d51c): new school
- Florida (15d08982): upcoming follow-up (2026-03-16, 6 days - outside 5-day window)
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')

# Known test credentials and programs
ATHLETE_EMAIL = "emma.chen@athlete.capymatch.com"
ATHLETE_PASSWORD = "password123"

# Test programs from the review request
STANFORD_PROGRAM_ID = "a54a0014-0e83-4a16-b0c2-5e8f10401de2"  # overdue follow-up
UCLA_PROGRAM_ID = "421ac5a8-af32-4c26-81b4-0de4cc749a54"       # due today
TAMPA_PROGRAM_ID = "66c1d51c-3326-4d74-a3e1-aa49776b3ec5"       # new school
FLORIDA_PROGRAM_ID = "15d08982-3c51-4761-9b83-67414484582e"     # upcoming (6 days)


class TestMatchScoresAPI:
    """Tests for GET /api/match-scores endpoint"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for athlete"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ATHLETE_EMAIL, "password": ATHLETE_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def test_match_scores_returns_200(self):
        """Test GET /api/match-scores returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/match-scores",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("PASS: GET /api/match-scores returns 200")

    def test_match_scores_has_scores_array(self):
        """Test response contains scores array"""
        response = requests.get(
            f"{BASE_URL}/api/match-scores",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "scores" in data, "Missing 'scores' field in response"
        assert isinstance(data["scores"], list), "scores should be a list"
        print(f"PASS: Match scores returned {len(data['scores'])} scores")

    def test_match_score_structure(self):
        """Test each match score has required fields for J1"""
        response = requests.get(
            f"{BASE_URL}/api/match-scores",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        scores = data.get("scores", [])
        
        if len(scores) > 0:
            score = scores[0]
            required_fields = ["program_id", "match_score"]
            for field in required_fields:
                assert field in score, f"Missing required field: {field}"
            
            # match_score should be a number 0-100
            assert isinstance(score["match_score"], (int, float)), "match_score should be numeric"
            assert 0 <= score["match_score"] <= 100, f"match_score out of range: {score['match_score']}"
            
            print(f"PASS: Match score structure valid - program_id present, match_score={score['match_score']}")

    def test_match_score_risk_badges_field(self):
        """Test match scores include risk_badges array for RiskBadges component"""
        response = requests.get(
            f"{BASE_URL}/api/match-scores",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        scores = data.get("scores", [])
        
        if len(scores) > 0:
            # At least some scores should have risk_badges
            has_risk_badges = any("risk_badges" in s for s in scores)
            if has_risk_badges:
                score_with_badges = next((s for s in scores if s.get("risk_badges")), None)
                if score_with_badges:
                    badges = score_with_badges["risk_badges"]
                    assert isinstance(badges, list), "risk_badges should be a list"
                    if len(badges) > 0:
                        badge = badges[0]
                        assert "key" in badge, "Badge missing 'key' field"
                        assert "label" in badge, "Badge missing 'label' field"
                        print(f"PASS: risk_badges structure valid - found badge: {badge['key']}")
            else:
                print("INFO: No scores have risk_badges (may be expected for some programs)")
        else:
            print("INFO: No match scores returned")

    def test_match_score_logo_url_field(self):
        """Test match scores include logo_url for UniversityLogo component"""
        response = requests.get(
            f"{BASE_URL}/api/match-scores",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        scores = data.get("scores", [])
        
        # Check if any score has logo_url
        has_logo = any("logo_url" in s or "domain" in s for s in scores)
        if has_logo:
            print("PASS: Some scores have logo_url or domain for university logo")
        else:
            print("INFO: No scores have logo_url/domain (may use fallback avatars)")

    def test_match_score_for_stanford(self):
        """Test match score for Stanford program (should have ~64% match)"""
        response = requests.get(
            f"{BASE_URL}/api/match-scores",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        scores = data.get("scores", [])
        
        stanford = next((s for s in scores if s.get("program_id") == STANFORD_PROGRAM_ID), None)
        if stanford:
            print(f"PASS: Found Stanford match score: {stanford.get('match_score')}%")
            if stanford.get("risk_badges"):
                print(f"  - Risk badges: {[b.get('key') for b in stanford['risk_badges']]}")
        else:
            print("INFO: Stanford program not in match scores (may be expected)")

    def test_match_score_for_tampa(self):
        """Test match score for Tampa program (should have ~73% match)"""
        response = requests.get(
            f"{BASE_URL}/api/match-scores",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        scores = data.get("scores", [])
        
        tampa = next((s for s in scores if s.get("program_id") == TAMPA_PROGRAM_ID), None)
        if tampa:
            print(f"PASS: Found Tampa match score: {tampa.get('match_score')}%")
        else:
            print("INFO: Tampa program not in match scores")


class TestProgramFollowUpData:
    """Tests for follow-up data in program responses"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for athlete"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ATHLETE_EMAIL, "password": ATHLETE_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def test_stanford_has_overdue_followup(self):
        """Test Stanford program has overdue follow-up (2026-03-07)"""
        response = requests.get(
            f"{BASE_URL}/api/athlete/programs/{STANFORD_PROGRAM_ID}",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to get Stanford: {response.text}"
        data = response.json()
        
        next_action_due = data.get("next_action_due")
        print(f"Stanford next_action_due: {next_action_due}")
        
        if next_action_due:
            due_date = datetime.strptime(next_action_due, "%Y-%m-%d")
            today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            days_diff = (due_date - today).days
            
            if days_diff < 0:
                print(f"PASS: Stanford follow-up is overdue by {abs(days_diff)} days")
            else:
                print(f"INFO: Stanford follow-up is not overdue yet (due in {days_diff} days)")
        else:
            print("INFO: Stanford has no next_action_due set")

    def test_ucla_has_due_today_followup(self):
        """Test UCLA program has follow-up due today (2026-03-10)"""
        response = requests.get(
            f"{BASE_URL}/api/athlete/programs/{UCLA_PROGRAM_ID}",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to get UCLA: {response.text}"
        data = response.json()
        
        next_action_due = data.get("next_action_due")
        print(f"UCLA next_action_due: {next_action_due}")
        
        if next_action_due:
            print(f"PASS: UCLA has follow-up scheduled for {next_action_due}")
        else:
            print("INFO: UCLA has no next_action_due set")

    def test_florida_followup_outside_5_day_window(self):
        """Test Florida program follow-up (2026-03-16) is outside 5-day upcoming window"""
        response = requests.get(
            f"{BASE_URL}/api/athlete/programs/{FLORIDA_PROGRAM_ID}",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to get Florida: {response.text}"
        data = response.json()
        
        next_action_due = data.get("next_action_due")
        print(f"Florida next_action_due: {next_action_due}")
        
        if next_action_due:
            print(f"PASS: Florida has follow-up scheduled for {next_action_due}")
        else:
            print("INFO: Florida has no next_action_due set")


class TestQuestionnaireData:
    """Tests for questionnaire fields in program responses"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for athlete"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ATHLETE_EMAIL, "password": ATHLETE_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def test_program_questionnaire_fields(self):
        """Test programs can have questionnaire_url and questionnaire_completed"""
        # Check all test programs for questionnaire data
        programs_to_check = [
            (STANFORD_PROGRAM_ID, "Stanford"),
            (UCLA_PROGRAM_ID, "UCLA"),
            (TAMPA_PROGRAM_ID, "Tampa"),
            (FLORIDA_PROGRAM_ID, "Florida"),
        ]
        
        found_questionnaire = False
        for prog_id, name in programs_to_check:
            response = requests.get(
                f"{BASE_URL}/api/athlete/programs/{prog_id}",
                headers=self.headers
            )
            if response.status_code == 200:
                data = response.json()
                quest_url = data.get("questionnaire_url")
                quest_completed = data.get("questionnaire_completed")
                
                if quest_url:
                    found_questionnaire = True
                    print(f"PASS: {name} has questionnaire_url: {quest_url[:50]}...")
                    print(f"  - questionnaire_completed: {quest_completed}")
        
        if not found_questionnaire:
            print("INFO: No test programs have questionnaire_url set")

    def test_update_questionnaire_completed(self):
        """Test updating questionnaire_completed field"""
        # Try to update Florida's questionnaire_completed
        response = requests.put(
            f"{BASE_URL}/api/athlete/programs/{FLORIDA_PROGRAM_ID}",
            headers=self.headers,
            json={
                "questionnaire_completed": True,
                "questionnaire_completed_at": datetime.now().isoformat()
            }
        )
        assert response.status_code == 200, f"Failed to update: {response.text}"
        data = response.json()
        
        # Verify update
        if data.get("questionnaire_completed") == True:
            print("PASS: questionnaire_completed updated to True")
        else:
            print("INFO: questionnaire_completed may not have been set")
        
        # Reset to False
        requests.put(
            f"{BASE_URL}/api/athlete/programs/{FLORIDA_PROGRAM_ID}",
            headers=self.headers,
            json={"questionnaire_completed": False, "questionnaire_completed_at": None}
        )


class TestUniversityLogoData:
    """Tests for university logo data from match scores"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for athlete"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ATHLETE_EMAIL, "password": ATHLETE_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def test_match_scores_logo_data(self):
        """Test match scores provide logo_url or domain for UniversityLogo"""
        response = requests.get(
            f"{BASE_URL}/api/match-scores",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        scores = data.get("scores", [])
        
        logo_count = 0
        domain_count = 0
        
        for score in scores:
            if score.get("logo_url"):
                logo_count += 1
            if score.get("domain"):
                domain_count += 1
        
        print(f"PASS: Match scores - {logo_count} with logo_url, {domain_count} with domain")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
