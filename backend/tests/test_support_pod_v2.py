"""
Support Pod V2 Features Testing
Tests the Diagnose -> Decide -> Act workflow enhancements:
- Recruiting Timeline (Point 7)
- Recruiting Intelligence/Signals (Point 8)
- Intervention Playbooks (Point 9)
- Support Pod API response structure
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


@pytest.fixture(scope="module")
def coach_token():
    """Get coach authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "coach.williams@capymatch.com",
        "password": "coach123"
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Coach login failed")


@pytest.fixture(scope="module")
def director_token():
    """Get director authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "director@capymatch.com",
        "password": "director123"
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Director login failed")


class TestSupportPodV2Fields:
    """Test new V2 fields in Support Pod API response"""

    def test_support_pod_returns_recruiting_timeline(self, coach_token):
        """Point 7: API returns recruiting_timeline array"""
        response = requests.get(
            f"{BASE_URL}/api/support-pods/athlete_1",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify recruiting_timeline exists and is an array
        assert "recruiting_timeline" in data
        assert isinstance(data["recruiting_timeline"], list)
        assert len(data["recruiting_timeline"]) > 0
        
        # Verify milestone structure
        milestone = data["recruiting_timeline"][0]
        assert "id" in milestone
        assert "type" in milestone
        assert "label" in milestone
        assert "date" in milestone
        print(f"PASS: recruiting_timeline has {len(data['recruiting_timeline'])} milestones")

    def test_recruiting_timeline_milestone_types(self, coach_token):
        """Point 7: Timeline milestones have correct types"""
        response = requests.get(
            f"{BASE_URL}/api/support-pods/athlete_1",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        data = response.json()
        
        valid_types = ["profile_created", "school_added", "outreach_sent", 
                      "coach_responded", "visit_scheduled", "offer_received", "last_activity"]
        for milestone in data["recruiting_timeline"]:
            assert milestone["type"] in valid_types, f"Invalid milestone type: {milestone['type']}"
        print(f"PASS: All milestone types are valid")

    def test_support_pod_returns_recruiting_signals(self, coach_token):
        """Point 8: API returns recruiting_signals array"""
        response = requests.get(
            f"{BASE_URL}/api/support-pods/athlete_1",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify recruiting_signals exists and is an array
        assert "recruiting_signals" in data
        assert isinstance(data["recruiting_signals"], list)
        print(f"PASS: recruiting_signals has {len(data['recruiting_signals'])} signals")

    def test_recruiting_signals_structure(self, coach_token):
        """Point 8: Each signal has title, description, recommendation, priority"""
        response = requests.get(
            f"{BASE_URL}/api/support-pods/athlete_1",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        data = response.json()
        
        if len(data["recruiting_signals"]) > 0:
            signal = data["recruiting_signals"][0]
            assert "id" in signal
            assert "type" in signal
            assert "title" in signal
            assert "description" in signal
            assert "recommendation" in signal
            assert "priority" in signal
            
            # Check priority is valid
            valid_priorities = ["critical", "high", "medium", "low"]
            assert signal["priority"] in valid_priorities
            print(f"PASS: Signal structure verified - {signal['title']} ({signal['priority']})")
        else:
            print("INFO: No signals for this athlete")

    def test_support_pod_returns_intervention_playbook(self, coach_token):
        """Point 9: API returns intervention_playbook object"""
        response = requests.get(
            f"{BASE_URL}/api/support-pods/athlete_1",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify intervention_playbook exists (may be null if no active intervention)
        assert "intervention_playbook" in data
        
        if data["intervention_playbook"]:
            pb = data["intervention_playbook"]
            assert "title" in pb
            assert "description" in pb
            assert "steps" in pb
            assert "estimated_days" in pb
            assert "success_criteria" in pb
            assert isinstance(pb["steps"], list)
            assert len(pb["steps"]) > 0
            print(f"PASS: Playbook found - {pb['title']} with {len(pb['steps'])} steps")
        else:
            print("INFO: No playbook (no active intervention)")

    def test_playbook_steps_structure(self, coach_token):
        """Point 9: Playbook steps have step number, action, owner, days"""
        response = requests.get(
            f"{BASE_URL}/api/support-pods/athlete_1",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        data = response.json()
        
        if data["intervention_playbook"] and data["intervention_playbook"]["steps"]:
            step = data["intervention_playbook"]["steps"][0]
            assert "step" in step
            assert "action" in step
            assert "owner" in step
            assert "days" in step
            print(f"PASS: Step 1 - {step['action'][:50]}... (Owner: {step['owner']})")

    def test_playbook_matches_active_intervention(self, coach_token):
        """Point 9: Playbook matches active intervention category"""
        response = requests.get(
            f"{BASE_URL}/api/support-pods/athlete_1",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        data = response.json()
        
        if data["active_intervention"] and data["intervention_playbook"]:
            category = data["active_intervention"]["category"]
            # The playbook title should relate to the intervention category
            pb_title = data["intervention_playbook"]["title"].lower()
            
            category_keywords = {
                "momentum_drop": ["momentum"],
                "blocker": ["blocker"],
                "deadline_proximity": ["deadline", "event", "prep"],
                "engagement_drop": ["engagement", "re-engage"],
                "ownership_gap": ["ownership", "assignment"],
                "readiness_issue": ["readiness"],
            }
            
            if category in category_keywords:
                matches = any(kw in pb_title for kw in category_keywords[category])
                assert matches, f"Playbook '{pb_title}' should match category '{category}'"
            print(f"PASS: Playbook matches intervention category '{category}'")


class TestActiveIssueBanner:
    """Test Active Issue Banner fields (Point 1)"""

    def test_active_intervention_has_recommended_action(self, coach_token):
        """Point 1: Active intervention has recommended_action for WHAT TO DO NOW"""
        response = requests.get(
            f"{BASE_URL}/api/support-pods/athlete_1",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        data = response.json()
        
        if data["active_intervention"]:
            ai = data["active_intervention"]
            assert "recommended_action" in ai
            assert len(ai["recommended_action"]) > 0
            print(f"PASS: recommended_action = {ai['recommended_action'][:60]}...")

    def test_active_intervention_has_why_and_what_changed(self, coach_token):
        """Point 1: Active intervention has why_this_surfaced and what_changed"""
        response = requests.get(
            f"{BASE_URL}/api/support-pods/athlete_1",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        data = response.json()
        
        if data["active_intervention"]:
            ai = data["active_intervention"]
            assert "why_this_surfaced" in ai
            assert "what_changed" in ai
            print(f"PASS: why = {ai['why_this_surfaced'][:40]}...")
            print(f"PASS: what_changed = {ai['what_changed'][:40]}...")

    def test_active_intervention_has_urgency_score(self, coach_token):
        """Point 1: Active intervention has score/urgency for ACT NOW badge logic"""
        response = requests.get(
            f"{BASE_URL}/api/support-pods/athlete_1",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        data = response.json()
        
        if data["active_intervention"]:
            ai = data["active_intervention"]
            # Either score or urgency should exist
            has_urgency_indicator = "score" in ai or "urgency" in ai
            assert has_urgency_indicator, "Missing score or urgency field"
            print(f"PASS: score={ai.get('score')}, urgency={ai.get('urgency')}")


class TestAthleteSnapshot:
    """Test Athlete Snapshot fields (Point 2)"""

    def test_athlete_has_recruiting_stage(self, coach_token):
        """Point 2: Athlete has recruiting_stage for progress bar"""
        response = requests.get(
            f"{BASE_URL}/api/support-pods/athlete_1",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        data = response.json()
        
        athlete = data.get("athlete", {})
        assert "recruiting_stage" in athlete
        valid_stages = ["exploring", "actively_recruiting", "narrowing", "committed"]
        assert athlete["recruiting_stage"] in valid_stages
        print(f"PASS: recruiting_stage = {athlete['recruiting_stage']}")

    def test_athlete_has_coach_engagement_fields(self, coach_token):
        """Point 2: Athlete has school_targets and active_interest for coach engagement"""
        response = requests.get(
            f"{BASE_URL}/api/support-pods/athlete_1",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        data = response.json()
        
        athlete = data.get("athlete", {})
        assert "school_targets" in athlete
        assert "active_interest" in athlete
        
        # active_interest should be <= school_targets
        assert athlete["active_interest"] <= athlete["school_targets"]
        engagement_pct = (athlete["active_interest"] / athlete["school_targets"] * 100) if athlete["school_targets"] > 0 else 0
        print(f"PASS: Coach engagement: {athlete['active_interest']}/{athlete['school_targets']} ({engagement_pct:.0f}%)")


class TestPodMembers:
    """Test Pod Members / Support Team fields (Point 3)"""

    def test_pod_members_structure(self, coach_token):
        """Point 3: Pod members have id, name, role, role_label"""
        response = requests.get(
            f"{BASE_URL}/api/support-pods/athlete_1",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        data = response.json()
        
        members = data.get("pod_members", [])
        assert len(members) > 0
        
        for member in members:
            assert "id" in member
            assert "name" in member
            assert "role" in member
            assert "role_label" in member
        print(f"PASS: {len(members)} pod members found")

    def test_pod_members_have_primary_flag(self, coach_token):
        """Point 3: At least one member is primary"""
        response = requests.get(
            f"{BASE_URL}/api/support-pods/athlete_1",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        data = response.json()
        
        members = data.get("pod_members", [])
        primary_count = sum(1 for m in members if m.get("is_primary"))
        assert primary_count >= 1, "No primary member found"
        print(f"PASS: {primary_count} primary member(s)")


class TestNextActions:
    """Test Next Actions fields (Point 4)"""

    def test_actions_have_required_fields(self, coach_token):
        """Point 4: Actions have id, title, owner, status, due_date"""
        response = requests.get(
            f"{BASE_URL}/api/support-pods/athlete_1",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        data = response.json()
        
        actions = data.get("actions", [])
        if len(actions) > 0:
            action = actions[0]
            assert "id" in action
            assert "title" in action
            assert "owner" in action
            assert "status" in action
            print(f"PASS: Actions have required fields, {len(actions)} total")
        else:
            print("INFO: No actions found")


class TestTreatmentHistory:
    """Test Treatment History / Timeline fields (Point 6)"""

    def test_timeline_structure(self, coach_token):
        """Point 6: Timeline has notes, assignments, messages, resolutions"""
        response = requests.get(
            f"{BASE_URL}/api/support-pods/athlete_1",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        data = response.json()
        
        timeline = data.get("timeline", {})
        assert "notes" in timeline
        assert "assignments" in timeline
        assert "messages" in timeline
        assert "resolutions" in timeline
        assert "action_events" in timeline
        print(f"PASS: Timeline structure verified")


class TestDirectorActions:
    """Test DirectorActionsCard bug fix (P0)"""

    def test_director_actions_endpoint(self, coach_token):
        """P0 Bug: Director actions endpoint works"""
        response = requests.get(
            f"{BASE_URL}/api/director/actions",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "actions" in data
        print(f"PASS: Director actions endpoint returns {len(data['actions'])} actions")

    def test_director_actions_acknowledge(self, coach_token):
        """P0 Bug: Acknowledge action endpoint works"""
        # First get an open action
        response = requests.get(
            f"{BASE_URL}/api/director/actions",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        data = response.json()
        
        open_actions = [a for a in data.get("actions", []) if a.get("status") == "open"]
        if open_actions:
            action_id = open_actions[0]["action_id"]
            ack_response = requests.post(
                f"{BASE_URL}/api/director/actions/{action_id}/acknowledge",
                headers={"Authorization": f"Bearer {coach_token}"}
            )
            assert ack_response.status_code == 200
            print(f"PASS: Acknowledged action {action_id}")
        else:
            print("INFO: No open actions to acknowledge")

    def test_director_actions_resolve(self, coach_token):
        """P0 Bug: Resolve action endpoint works"""
        # First get an acknowledged action
        response = requests.get(
            f"{BASE_URL}/api/director/actions",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        data = response.json()
        
        ack_actions = [a for a in data.get("actions", []) if a.get("status") == "acknowledged"]
        if ack_actions:
            action_id = ack_actions[0]["action_id"]
            resolve_response = requests.post(
                f"{BASE_URL}/api/director/actions/{action_id}/resolve",
                headers={"Authorization": f"Bearer {coach_token}"}
            )
            assert resolve_response.status_code == 200
            print(f"PASS: Resolved action {action_id}")
        else:
            print("INFO: No acknowledged actions to resolve")


class TestResolveIssueEndpoint:
    """Test resolve issue endpoint"""

    def test_resolve_issue_endpoint(self, coach_token):
        """Point 1: Mark Resolved button calls resolve endpoint"""
        response = requests.post(
            f"{BASE_URL}/api/support-pods/athlete_1/resolve",
            headers={"Authorization": f"Bearer {coach_token}"},
            json={
                "category": "momentum_drop",
                "resolution_note": "Test resolution from automated test"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "category" in data
        assert "resolution_note" in data
        print(f"PASS: Issue resolved successfully")


class TestNotesEndpoint:
    """Test notes endpoint for Log Check-in and Message buttons"""

    def test_create_note(self, coach_token):
        """Point 1 & 3: Log Check-in / Message creates notes"""
        response = requests.post(
            f"{BASE_URL}/api/athletes/athlete_1/notes",
            headers={"Authorization": f"Bearer {coach_token}"},
            json={
                "text": "Test check-in note from automated test",
                "tag": "Check-in"
            }
        )
        assert response.status_code in [200, 201]
        print(f"PASS: Note created successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
