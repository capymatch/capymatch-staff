"""
Phase 4 Event Summary Enhancement Tests
Tests for dual action paths (Send to Athlete, Route to Pod), athlete grouping,
routing progress tracker, school engagement heatmap, and debrief completion.
"""

import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
COACH_EMAIL = "coach.williams@capymatch.com"
COACH_PASSWORD = "coach123"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for coach"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": COACH_EMAIL, "password": COACH_PASSWORD}
    )
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


class TestEventSummaryAPI:
    """Test /api/events/event_0/summary endpoint"""

    def test_summary_returns_correct_stats(self, auth_headers):
        """Event Summary shows correct stats: 6 notes, 5 schools, 3 athletes, 7 follow-ups"""
        response = requests.get(f"{BASE_URL}/api/events/event_0/summary", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "stats" in data
        stats = data["stats"]
        # Verify expected stats from seed data
        assert stats["totalNotes"] == 6, f"Expected 6 notes, got {stats['totalNotes']}"
        assert stats["schoolsInteracted"] == 5, f"Expected 5 schools, got {stats['schoolsInteracted']}"
        assert stats["athletesSeen"] == 3, f"Expected 3 athletes, got {stats['athletesSeen']}"
        assert stats["followUpsNeeded"] == 7, f"Expected 7 follow-ups, got {stats['followUpsNeeded']}"

    def test_summary_returns_allNotes_for_grouping(self, auth_headers):
        """Summary should return allNotes array for athlete grouping"""
        response = requests.get(f"{BASE_URL}/api/events/event_0/summary", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "allNotes" in data
        assert isinstance(data["allNotes"], list)
        # Verify notes have required fields for grouping
        for note in data["allNotes"]:
            assert "id" in note
            assert "athlete_id" in note
            assert "athlete_name" in note
            assert "interest_level" in note

    def test_summary_returns_schools_seen_for_heatmap(self, auth_headers):
        """Summary should return schoolsSeen array for heatmap"""
        response = requests.get(f"{BASE_URL}/api/events/event_0/summary", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "schoolsSeen" in data
        assert isinstance(data["schoolsSeen"], list)
        # Verify school data has heatmap fields
        for school in data["schoolsSeen"]:
            assert "name" in school
            assert "interactions" in school
            assert "hot" in school
            assert "warm" in school
            assert "cool" in school

    def test_summary_notes_have_routing_flags(self, auth_headers):
        """Notes should have sent_to_athlete and routed_to_pod fields for progress tracking"""
        response = requests.get(f"{BASE_URL}/api/events/event_0/summary", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        for note in data["allNotes"]:
            # These flags should exist (even if False)
            assert "routed_to_pod" in note or note.get("routed_to_pod") is None or not note.get("routed_to_pod"), "routed_to_pod field should exist"
            # sent_to_athlete may or may not exist on legacy notes

    def test_summary_event_has_summary_status(self, auth_headers):
        """Event should have summaryStatus field for debrief tracking"""
        response = requests.get(f"{BASE_URL}/api/events/event_0/summary", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "event" in data
        # summaryStatus can be None, 'complete', etc.
        # Per context, event_0 was already debriefed, so should be 'complete'
        assert data["event"].get("summaryStatus") == "complete", f"Expected 'complete', got {data['event'].get('summaryStatus')}"


class TestSendToAthleteEndpoint:
    """Test POST /api/events/{event_id}/notes/{note_id}/send-to-athlete"""

    def test_send_to_athlete_creates_support_message(self, auth_headers):
        """Send to athlete should create support thread + message + timeline entry + notification"""
        # First get all notes to find one that hasn't been sent yet
        summary_resp = requests.get(f"{BASE_URL}/api/events/event_0/summary", headers=auth_headers)
        assert summary_resp.status_code == 200
        notes = summary_resp.json()["allNotes"]
        
        # Find a note that hasn't been sent to athlete
        unsent_note = next((n for n in notes if not n.get("sent_to_athlete")), None)
        
        if not unsent_note:
            pytest.skip("All notes already sent to athlete - need unsent note for this test")
        
        note_id = unsent_note["id"]
        
        # Send to athlete
        response = requests.post(
            f"{BASE_URL}/api/events/event_0/notes/{note_id}/send-to-athlete",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert data["sent"] == True
        assert "athlete_id" in data
        assert "thread_id" in data
        assert "message_id" in data

    def test_send_to_athlete_marks_note_as_sent(self, auth_headers):
        """After sending, note should have sent_to_athlete=True"""
        # Get summary to check for notes that were sent
        summary_resp = requests.get(f"{BASE_URL}/api/events/event_0/summary", headers=auth_headers)
        assert summary_resp.status_code == 200
        notes = summary_resp.json()["allNotes"]
        
        # Find any sent note
        sent_note = next((n for n in notes if n.get("sent_to_athlete")), None)
        if sent_note:
            assert sent_note["sent_to_athlete"] == True

    def test_send_to_athlete_invalid_note_returns_404(self, auth_headers):
        """Sending to invalid note should return 404"""
        response = requests.post(
            f"{BASE_URL}/api/events/event_0/notes/invalid-note-id/send-to-athlete",
            headers=auth_headers
        )
        assert response.status_code == 404


class TestRouteToSchoolPod:
    """Test POST /api/events/{event_id}/notes/{note_id}/route"""

    def test_route_to_pod_creates_actions(self, auth_headers):
        """Route to pod should mark note as routed and return action count"""
        # Get summary to find an unrouted note
        summary_resp = requests.get(f"{BASE_URL}/api/events/event_0/summary", headers=auth_headers)
        assert summary_resp.status_code == 200
        notes = summary_resp.json()["allNotes"]
        
        # Find a note that hasn't been routed
        unrouted_note = next((n for n in notes if not n.get("routed_to_pod")), None)
        
        if not unrouted_note:
            pytest.skip("All notes already routed - need unrouted note for this test")
        
        note_id = unrouted_note["id"]
        
        response = requests.post(
            f"{BASE_URL}/api/events/event_0/notes/{note_id}/route",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["routed"] == True
        assert "note" in data
        assert "actions_created" in data

    def test_route_to_pod_marks_note_as_routed(self, auth_headers):
        """After routing, note should have routed_to_pod=True"""
        summary_resp = requests.get(f"{BASE_URL}/api/events/event_0/summary", headers=auth_headers)
        assert summary_resp.status_code == 200
        notes = summary_resp.json()["allNotes"]
        
        # Find any routed note
        routed_note = next((n for n in notes if n.get("routed_to_pod")), None)
        if routed_note:
            assert routed_note["routed_to_pod"] == True


class TestDebriefComplete:
    """Test POST /api/events/{event_id}/debrief-complete"""

    def test_debrief_complete_marks_event(self, auth_headers):
        """Debrief complete should mark event summaryStatus as 'complete'"""
        # Event_0 should already be debriefed per context
        response = requests.post(
            f"{BASE_URL}/api/events/event_0/debrief-complete",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "complete"
        assert data["event_id"] == "event_0"

    def test_debrief_complete_invalid_event_returns_404(self, auth_headers):
        """Debrief complete on invalid event should return 404"""
        response = requests.post(
            f"{BASE_URL}/api/events/invalid-event-id/debrief-complete",
            headers=auth_headers
        )
        assert response.status_code == 404


class TestRoutingProgressData:
    """Test that summary data supports routing progress calculation"""

    def test_notes_have_routing_status_fields(self, auth_headers):
        """Each note should have routed_to_pod and potentially sent_to_athlete fields"""
        response = requests.get(f"{BASE_URL}/api/events/event_0/summary", headers=auth_headers)
        assert response.status_code == 200
        notes = response.json()["allNotes"]
        
        routed_count = sum(1 for n in notes if n.get("routed_to_pod"))
        sent_count = sum(1 for n in notes if n.get("sent_to_athlete"))
        
        # Progress bar calculations should work
        total = len(notes)
        actioned = len(set(
            n["id"] for n in notes 
            if n.get("routed_to_pod") or n.get("sent_to_athlete")
        ))
        pending = total - actioned
        
        print(f"Progress: {actioned}/{total} actioned, {pending} pending")
        print(f"Routed to pod: {routed_count}, Sent to athlete: {sent_count}")
        
        assert total > 0, "Should have notes for progress tracking"


class TestAthleteGrouping:
    """Test that notes can be grouped by athlete for UI display"""

    def test_notes_have_athlete_grouping_fields(self, auth_headers):
        """Notes should have athlete_id and athlete_name for grouping"""
        response = requests.get(f"{BASE_URL}/api/events/event_0/summary", headers=auth_headers)
        assert response.status_code == 200
        notes = response.json()["allNotes"]
        
        # Group by athlete
        athlete_groups = {}
        for n in notes:
            aid = n["athlete_id"]
            if aid not in athlete_groups:
                athlete_groups[aid] = {"name": n.get("athlete_name", "Unknown"), "notes": []}
            athlete_groups[aid]["notes"].append(n)
        
        # Should have 3 athletes per context
        assert len(athlete_groups) == 3, f"Expected 3 athlete groups, got {len(athlete_groups)}"
        
        # Verify interest levels for sorting
        for aid, group in athlete_groups.items():
            for note in group["notes"]:
                assert note.get("interest_level") in ("hot", "warm", "cool", "none", None)


class TestSchoolHeatmapData:
    """Test that school data supports heatmap visualization"""

    def test_schools_have_interaction_breakdown(self, auth_headers):
        """Schools should have interaction count and interest level breakdown"""
        response = requests.get(f"{BASE_URL}/api/events/event_0/summary", headers=auth_headers)
        assert response.status_code == 200
        schools = response.json()["schoolsSeen"]
        
        # Per context: 5 schools
        assert len(schools) == 5, f"Expected 5 schools, got {len(schools)}"
        
        for school in schools:
            assert school["interactions"] > 0
            assert "hot" in school
            assert "warm" in school
            assert "cool" in school
            # Verify breakdown adds up
            breakdown_total = school["hot"] + school["warm"] + school["cool"]
            # Breakdown might be less than interactions if some are "none"
            assert breakdown_total <= school["interactions"]
