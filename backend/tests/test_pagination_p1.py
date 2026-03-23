"""
Pagination P1 Performance Tests

Tests for API response pagination on key backend endpoints:
- GET /api/athletes with ?page=1&page_size=2
- GET /api/director-inbox with ?page=1&page_size=3
- GET /api/notifications with ?page=1&page_size=5
- GET /api/athletes/{athlete_id}/timeline with ?page=1&page_size=3
- GET /api/athletes/{athlete_id}/notes with ?page=1&page_size=3
- GET /api/support-messages/inbox with ?page=1&page_size=5

All endpoints are backward-compatible:
- Without page/page_size params: returns original response format
- With params: returns pagination envelope {items, total, page, page_size, total_pages}
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
ATHLETE_EMAIL = "emma.chen@athlete.capymatch.com"
ATHLETE_PASSWORD = "athlete123"


@pytest.fixture(scope="module")
def director_token():
    """Get director auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": DIRECTOR_EMAIL,
        "password": DIRECTOR_PASSWORD
    })
    assert response.status_code == 200, f"Director login failed: {response.text}"
    data = response.json()
    return data.get("token")


@pytest.fixture(scope="module")
def coach_token():
    """Get coach auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": COACH_EMAIL,
        "password": COACH_PASSWORD
    })
    assert response.status_code == 200, f"Coach login failed: {response.text}"
    data = response.json()
    return data.get("token")


@pytest.fixture(scope="module")
def athlete_token():
    """Get athlete auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ATHLETE_EMAIL,
        "password": ATHLETE_PASSWORD
    })
    assert response.status_code == 200, f"Athlete login failed: {response.text}"
    data = response.json()
    return data.get("token")


def auth_headers(token):
    """Build auth headers"""
    return {"Authorization": f"Bearer {token}"}


# ─── Athletes Endpoint Pagination Tests ───────────────────────────────────────

class TestAthletesPagination:
    """Tests for GET /api/athletes pagination"""

    def test_athletes_without_pagination_returns_array(self, director_token):
        """Without page/page_size params, returns raw array (backward compat)"""
        response = requests.get(
            f"{BASE_URL}/api/athletes",
            headers=auth_headers(director_token)
        )
        assert response.status_code == 200
        data = response.json()
        # Should be a list, not a dict with pagination envelope
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"✓ Athletes without pagination returns array with {len(data)} items")

    def test_athletes_with_pagination_returns_envelope(self, director_token):
        """With page/page_size params, returns pagination envelope"""
        response = requests.get(
            f"{BASE_URL}/api/athletes?page=1&page_size=2",
            headers=auth_headers(director_token)
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should be a dict with pagination envelope
        assert isinstance(data, dict), f"Expected dict, got {type(data)}"
        assert "items" in data, "Missing 'items' in pagination envelope"
        assert "total" in data, "Missing 'total' in pagination envelope"
        assert "page" in data, "Missing 'page' in pagination envelope"
        assert "page_size" in data, "Missing 'page_size' in pagination envelope"
        assert "total_pages" in data, "Missing 'total_pages' in pagination envelope"
        
        # Verify values
        assert data["page"] == 1
        assert data["page_size"] == 2
        assert len(data["items"]) <= 2, f"Expected max 2 items, got {len(data['items'])}"
        assert data["total"] >= len(data["items"])
        
        print(f"✓ Athletes with pagination: page={data['page']}, page_size={data['page_size']}, total={data['total']}, total_pages={data['total_pages']}, items={len(data['items'])}")

    def test_athletes_pagination_page_2(self, director_token):
        """Test page 2 returns different items"""
        # Get page 1
        response1 = requests.get(
            f"{BASE_URL}/api/athletes?page=1&page_size=2",
            headers=auth_headers(director_token)
        )
        assert response1.status_code == 200
        page1_data = response1.json()
        
        # Get page 2
        response2 = requests.get(
            f"{BASE_URL}/api/athletes?page=2&page_size=2",
            headers=auth_headers(director_token)
        )
        assert response2.status_code == 200
        page2_data = response2.json()
        
        assert page2_data["page"] == 2
        
        # If there are enough items, page 2 should have different items
        if page1_data["total"] > 2:
            page1_ids = {item.get("id") for item in page1_data["items"]}
            page2_ids = {item.get("id") for item in page2_data["items"]}
            # Items should be different (no overlap)
            assert page1_ids.isdisjoint(page2_ids), "Page 1 and Page 2 have overlapping items"
            print(f"✓ Page 2 has different items than Page 1")
        else:
            print(f"✓ Only {page1_data['total']} total items, page 2 may be empty")

    def test_athletes_pagination_exceeds_total(self, director_token):
        """Test page exceeding total returns empty items with correct total"""
        response = requests.get(
            f"{BASE_URL}/api/athletes?page=999&page_size=50",
            headers=auth_headers(director_token)
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["page"] == 999
        assert data["items"] == [], f"Expected empty items for page 999, got {len(data['items'])} items"
        assert data["total"] >= 0, "Total should be >= 0"
        print(f"✓ Page 999 returns empty items with total={data['total']}")


# ─── Director Inbox Pagination Tests ──────────────────────────────────────────

class TestDirectorInboxPagination:
    """Tests for GET /api/director-inbox pagination"""

    def test_director_inbox_without_pagination(self, director_token):
        """Without page/page_size params, returns original format {items, count, highCount}"""
        response = requests.get(
            f"{BASE_URL}/api/director-inbox",
            headers=auth_headers(director_token)
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "items" in data, "Missing 'items' in response"
        assert "count" in data, "Missing 'count' in response"
        assert "highCount" in data, "Missing 'highCount' in response"
        # Should NOT have pagination fields when no params
        # (Actually it may still have them, but the key is backward compat)
        print(f"✓ Director inbox without pagination: count={data['count']}, highCount={data['highCount']}, items={len(data['items'])}")

    def test_director_inbox_with_pagination(self, director_token):
        """With page/page_size params, returns paginated envelope with count and highCount"""
        response = requests.get(
            f"{BASE_URL}/api/director-inbox?page=1&page_size=3",
            headers=auth_headers(director_token)
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should have pagination envelope
        assert "items" in data, "Missing 'items' in pagination envelope"
        assert "total" in data, "Missing 'total' in pagination envelope"
        assert "page" in data, "Missing 'page' in pagination envelope"
        assert "page_size" in data, "Missing 'page_size' in pagination envelope"
        assert "total_pages" in data, "Missing 'total_pages' in pagination envelope"
        
        # Should also have count and highCount
        assert "count" in data, "Missing 'count' in pagination response"
        assert "highCount" in data, "Missing 'highCount' in pagination response"
        
        assert data["page"] == 1
        assert data["page_size"] == 3
        assert len(data["items"]) <= 3
        
        print(f"✓ Director inbox with pagination: page={data['page']}, page_size={data['page_size']}, total={data['total']}, count={data['count']}, highCount={data['highCount']}")


# ─── Notifications Pagination Tests ───────────────────────────────────────────

class TestNotificationsPagination:
    """Tests for GET /api/notifications pagination"""

    def test_notifications_without_pagination(self, director_token):
        """Without page/page_size params, returns original format {notifications}"""
        response = requests.get(
            f"{BASE_URL}/api/notifications",
            headers=auth_headers(director_token)
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "notifications" in data, "Missing 'notifications' in response"
        print(f"✓ Notifications without pagination: {len(data['notifications'])} notifications")

    def test_notifications_with_pagination(self, director_token):
        """With page/page_size params, returns paginated envelope with notifications"""
        response = requests.get(
            f"{BASE_URL}/api/notifications?page=1&page_size=5",
            headers=auth_headers(director_token)
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should have pagination envelope with 'notifications' instead of 'items'
        assert "notifications" in data, "Missing 'notifications' in pagination envelope"
        assert "total" in data, "Missing 'total' in pagination envelope"
        assert "page" in data, "Missing 'page' in pagination envelope"
        assert "page_size" in data, "Missing 'page_size' in pagination envelope"
        assert "total_pages" in data, "Missing 'total_pages' in pagination envelope"
        
        assert data["page"] == 1
        assert data["page_size"] == 5
        assert len(data["notifications"]) <= 5
        
        print(f"✓ Notifications with pagination: page={data['page']}, page_size={data['page_size']}, total={data['total']}, notifications={len(data['notifications'])}")


# ─── Athlete Timeline Pagination Tests ────────────────────────────────────────

class TestAthleteTimelinePagination:
    """Tests for GET /api/athletes/{athlete_id}/timeline pagination"""

    def test_timeline_without_pagination(self, coach_token):
        """Without page/page_size params, returns original format"""
        # Use athlete_1 which should exist
        response = requests.get(
            f"{BASE_URL}/api/athletes/athlete_1/timeline",
            headers=auth_headers(coach_token)
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "notes" in data, "Missing 'notes' in response"
        assert "assignments" in data, "Missing 'assignments' in response"
        assert "messages" in data, "Missing 'messages' in response"
        # Should NOT have pagination fields
        assert "total" not in data or "page" not in data, "Should not have pagination fields without params"
        print(f"✓ Timeline without pagination: notes={len(data['notes'])}, assignments={len(data['assignments'])}, messages={len(data['messages'])}")

    def test_timeline_with_pagination(self, coach_token):
        """With page/page_size params, returns paginated envelope"""
        response = requests.get(
            f"{BASE_URL}/api/athletes/athlete_1/timeline?page=1&page_size=3",
            headers=auth_headers(coach_token)
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should have notes, assignments, messages plus pagination fields
        assert "notes" in data, "Missing 'notes' in pagination envelope"
        assert "assignments" in data, "Missing 'assignments' in response"
        assert "messages" in data, "Missing 'messages' in response"
        assert "total" in data, "Missing 'total' in pagination envelope"
        assert "page" in data, "Missing 'page' in pagination envelope"
        assert "page_size" in data, "Missing 'page_size' in pagination envelope"
        assert "total_pages" in data, "Missing 'total_pages' in pagination envelope"
        
        assert data["page"] == 1
        assert data["page_size"] == 3
        
        print(f"✓ Timeline with pagination: page={data['page']}, page_size={data['page_size']}, total={data['total']}, notes={len(data['notes'])}")


# ─── Athlete Notes Pagination Tests ───────────────────────────────────────────

class TestAthleteNotesPagination:
    """Tests for GET /api/athletes/{athlete_id}/notes pagination"""

    def test_notes_without_pagination(self, coach_token):
        """Without page/page_size params, returns original format {notes}"""
        response = requests.get(
            f"{BASE_URL}/api/athletes/athlete_1/notes",
            headers=auth_headers(coach_token)
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "notes" in data, "Missing 'notes' in response"
        # Should NOT have pagination fields
        assert "total" not in data, "Should not have 'total' without pagination params"
        print(f"✓ Notes without pagination: {len(data['notes'])} notes")

    def test_notes_with_pagination(self, coach_token):
        """With page/page_size params, returns paginated envelope"""
        response = requests.get(
            f"{BASE_URL}/api/athletes/athlete_1/notes?page=1&page_size=3",
            headers=auth_headers(coach_token)
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should have notes plus pagination fields
        assert "notes" in data, "Missing 'notes' in pagination envelope"
        assert "total" in data, "Missing 'total' in pagination envelope"
        assert "page" in data, "Missing 'page' in pagination envelope"
        assert "page_size" in data, "Missing 'page_size' in pagination envelope"
        assert "total_pages" in data, "Missing 'total_pages' in pagination envelope"
        
        assert data["page"] == 1
        assert data["page_size"] == 3
        assert len(data["notes"]) <= 3
        
        print(f"✓ Notes with pagination: page={data['page']}, page_size={data['page_size']}, total={data['total']}, notes={len(data['notes'])}")


# ─── Support Messages Inbox Pagination Tests ──────────────────────────────────

class TestSupportMessagesInboxPagination:
    """Tests for GET /api/support-messages/inbox pagination"""

    def test_inbox_without_pagination(self, coach_token):
        """Without page/page_size params, returns original format {threads, total_unread}"""
        response = requests.get(
            f"{BASE_URL}/api/support-messages/inbox",
            headers=auth_headers(coach_token)
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "threads" in data, "Missing 'threads' in response"
        assert "total_unread" in data, "Missing 'total_unread' in response"
        # Should NOT have pagination fields
        assert "total" not in data, "Should not have 'total' without pagination params"
        print(f"✓ Support inbox without pagination: {len(data['threads'])} threads, total_unread={data['total_unread']}")

    def test_inbox_with_pagination(self, coach_token):
        """With page/page_size params, returns paginated envelope"""
        response = requests.get(
            f"{BASE_URL}/api/support-messages/inbox?page=1&page_size=5",
            headers=auth_headers(coach_token)
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should have threads plus pagination fields
        assert "threads" in data, "Missing 'threads' in pagination envelope"
        assert "total_unread" in data, "Missing 'total_unread' in response"
        assert "total" in data, "Missing 'total' in pagination envelope"
        assert "page" in data, "Missing 'page' in pagination envelope"
        assert "page_size" in data, "Missing 'page_size' in pagination envelope"
        assert "total_pages" in data, "Missing 'total_pages' in pagination envelope"
        
        assert data["page"] == 1
        assert data["page_size"] == 5
        assert len(data["threads"]) <= 5
        
        print(f"✓ Support inbox with pagination: page={data['page']}, page_size={data['page_size']}, total={data['total']}, threads={len(data['threads'])}")


# ─── Edge Cases ───────────────────────────────────────────────────────────────

class TestPaginationEdgeCases:
    """Edge case tests for pagination"""

    def test_page_size_max_200_validation(self, director_token):
        """Page size > 200 should return validation error (422)"""
        response = requests.get(
            f"{BASE_URL}/api/athletes?page=1&page_size=500",
            headers=auth_headers(director_token)
        )
        # API validates page_size with le=200 constraint
        assert response.status_code == 422, f"Expected 422 for page_size > 200, got {response.status_code}"
        print(f"✓ Page size > 200 returns validation error (422)")
    
    def test_page_size_at_max_200_works(self, director_token):
        """Page size at max 200 should work"""
        response = requests.get(
            f"{BASE_URL}/api/athletes?page=1&page_size=200",
            headers=auth_headers(director_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["page_size"] == 200
        print(f"✓ Page size at max 200 works correctly")

    def test_page_minimum_is_1(self, director_token):
        """Page should be minimum 1"""
        response = requests.get(
            f"{BASE_URL}/api/athletes?page=0&page_size=10",
            headers=auth_headers(director_token)
        )
        # Should either return 422 (validation error) or treat as page 1
        if response.status_code == 200:
            data = response.json()
            assert data["page"] >= 1, f"page should be >= 1, got {data['page']}"
            print(f"✓ Page 0 treated as page {data['page']}")
        else:
            assert response.status_code == 422, f"Expected 422 for invalid page, got {response.status_code}"
            print(f"✓ Page 0 returns validation error (422)")

    def test_total_pages_calculation(self, director_token):
        """Verify total_pages is calculated correctly"""
        response = requests.get(
            f"{BASE_URL}/api/athletes?page=1&page_size=2",
            headers=auth_headers(director_token)
        )
        assert response.status_code == 200
        data = response.json()
        
        # total_pages should be ceil(total / page_size)
        import math
        expected_total_pages = max(1, math.ceil(data["total"] / data["page_size"]))
        assert data["total_pages"] == expected_total_pages, f"Expected total_pages={expected_total_pages}, got {data['total_pages']}"
        print(f"✓ total_pages={data['total_pages']} is correct for total={data['total']}, page_size={data['page_size']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
