"""
Multi-tenant Organization Architecture Tests
Tests coach→club_coach migration, platform_admin role, organizations CRUD,
athlete_user_links, and access control for multi-tenant architecture.
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from the migration
PLATFORM_ADMIN_CREDS = {"email": "douglas@capymatch.com", "password": "1234"}
DIRECTOR_CREDS = {"email": "director@capymatch.com", "password": "director123"}
CLUB_COACH_CREDS = {"email": "coach.williams@capymatch.com", "password": "coach123"}
ATHLETE_CREDS = {"email": "emma.chen@athlete.capymatch.com", "password": "password123"}
DEFAULT_ORG_ID = "org-capymatch-default"


def get_token(email: str, password: str) -> str:
    """Login and return JWT token"""
    resp = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": email, "password": password}
    )
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    return resp.json()["token"]


class TestPlatformAdminLogin:
    """Platform admin login and role verification"""
    
    def test_platform_admin_login_returns_correct_role(self):
        """Platform admin login returns role=platform_admin"""
        resp = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=PLATFORM_ADMIN_CREDS
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["user"]["role"] == "platform_admin"
        assert data["user"]["email"] == "douglas@capymatch.com"
        assert data["user"]["org_id"] is None  # platform_admin has no org
        assert "token" in data
    
    def test_platform_admin_has_null_org_id(self):
        """Platform admin account has org_id=null (superadmin)"""
        resp = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=PLATFORM_ADMIN_CREDS
        )
        assert resp.status_code == 200
        user = resp.json()["user"]
        assert user["org_id"] is None


class TestDirectorLogin:
    """Director login and role verification"""
    
    def test_director_login_returns_correct_role(self):
        """Director login returns role=director with org_id"""
        resp = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=DIRECTOR_CREDS
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["user"]["role"] == "director"
        assert data["user"]["org_id"] == DEFAULT_ORG_ID
        assert data["user"]["email"] == "director@capymatch.com"


class TestClubCoachLogin:
    """Club coach (migrated from coach) login and role verification"""
    
    def test_club_coach_login_returns_correct_role(self):
        """Club coach login returns role=club_coach (not 'coach')"""
        resp = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=CLUB_COACH_CREDS
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["user"]["role"] == "club_coach"  # migrated from 'coach'
        assert data["user"]["org_id"] == DEFAULT_ORG_ID
        assert data["user"]["email"] == "coach.williams@capymatch.com"


class TestAthleteLogin:
    """Athlete login and role verification"""
    
    def test_athlete_login_returns_correct_role(self):
        """Athlete login returns role=athlete with org_id"""
        resp = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=ATHLETE_CREDS
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["user"]["role"] == "athlete"
        assert data["user"]["org_id"] == DEFAULT_ORG_ID
        assert data["user"]["email"] == "emma.chen@athlete.capymatch.com"


class TestOrganizationsListEndpoint:
    """GET /api/organizations tests"""
    
    def test_platform_admin_sees_all_orgs(self):
        """Platform admin can see all organizations"""
        token = get_token(**PLATFORM_ADMIN_CREDS)
        resp = requests.get(
            f"{BASE_URL}/api/organizations",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "organizations" in data
        assert len(data["organizations"]) >= 1
        # Should include the default org
        org_ids = [o["id"] for o in data["organizations"]]
        assert DEFAULT_ORG_ID in org_ids
    
    def test_director_sees_own_org(self):
        """Director sees only their own organization"""
        token = get_token(**DIRECTOR_CREDS)
        resp = requests.get(
            f"{BASE_URL}/api/organizations",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "organizations" in data
        # Director sees their org
        if data["organizations"]:
            assert data["organizations"][0]["id"] == DEFAULT_ORG_ID


class TestOrganizationDetailEndpoint:
    """GET /api/organizations/{org_id} tests"""
    
    def test_get_org_returns_details_with_members(self):
        """Organization detail includes members and athletes count"""
        token = get_token(**PLATFORM_ADMIN_CREDS)
        resp = requests.get(
            f"{BASE_URL}/api/organizations/{DEFAULT_ORG_ID}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == DEFAULT_ORG_ID
        assert "member_count" in data
        assert "athlete_count" in data
        assert "directors" in data
        assert "coaches" in data
    
    def test_org_detail_includes_directors_and_coaches(self):
        """Organization detail includes directors and coaches lists"""
        token = get_token(**DIRECTOR_CREDS)
        resp = requests.get(
            f"{BASE_URL}/api/organizations/{DEFAULT_ORG_ID}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data["directors"], list)
        assert isinstance(data["coaches"], list)
        # Should have at least director
        assert len(data["directors"]) >= 1


class TestCreateOrganization:
    """POST /api/organizations tests"""
    
    def test_director_can_create_org(self):
        """Director can create a new organization"""
        token = get_token(**DIRECTOR_CREDS)
        unique_slug = f"test-org-{uuid.uuid4().hex[:8]}"
        resp = requests.post(
            f"{BASE_URL}/api/organizations",
            headers={"Authorization": f"Bearer {token}"},
            json={"name": f"Test Org {unique_slug}", "slug": unique_slug}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == f"Test Org {unique_slug}"
        assert data["slug"] == unique_slug
        assert "id" in data
    
    def test_platform_admin_can_create_org(self):
        """Platform admin can create a new organization"""
        token = get_token(**PLATFORM_ADMIN_CREDS)
        unique_slug = f"admin-org-{uuid.uuid4().hex[:8]}"
        resp = requests.post(
            f"{BASE_URL}/api/organizations",
            headers={"Authorization": f"Bearer {token}"},
            json={"name": f"Admin Test Org", "slug": unique_slug}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "id" in data
    
    def test_athlete_cannot_create_org(self):
        """Athlete cannot create an organization (403)"""
        token = get_token(**ATHLETE_CREDS)
        resp = requests.post(
            f"{BASE_URL}/api/organizations",
            headers={"Authorization": f"Bearer {token}"},
            json={"name": "Should Fail", "slug": "should-fail"}
        )
        assert resp.status_code == 403


class TestOrganizationInvites:
    """POST/GET /api/organizations/{org_id}/invites tests"""
    
    def test_director_can_create_invite(self):
        """Director can create an invite code"""
        token = get_token(**DIRECTOR_CREDS)
        resp = requests.post(
            f"{BASE_URL}/api/organizations/{DEFAULT_ORG_ID}/invites",
            headers={"Authorization": f"Bearer {token}"},
            json={"role": "athlete", "email": f"invite-{uuid.uuid4().hex[:8]}@test.com"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "code" in data
        assert data["org_id"] == DEFAULT_ORG_ID
        assert data["role"] == "athlete"
        assert data["used"] is False
    
    def test_club_coach_can_create_invite(self):
        """Club coach can create an invite code"""
        token = get_token(**CLUB_COACH_CREDS)
        resp = requests.post(
            f"{BASE_URL}/api/organizations/{DEFAULT_ORG_ID}/invites",
            headers={"Authorization": f"Bearer {token}"},
            json={"role": "athlete"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "code" in data
    
    def test_list_pending_invites(self):
        """GET invites lists pending invites"""
        token = get_token(**DIRECTOR_CREDS)
        resp = requests.get(
            f"{BASE_URL}/api/organizations/{DEFAULT_ORG_ID}/invites",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "invites" in data
        assert isinstance(data["invites"], list)


class TestAdminEndpointsAccess:
    """Admin endpoint access control tests"""
    
    def test_platform_admin_can_access_admin_dashboard(self):
        """Platform admin can access /api/admin/dashboard/stats"""
        token = get_token(**PLATFORM_ADMIN_CREDS)
        resp = requests.get(
            f"{BASE_URL}/api/admin/dashboard/stats",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "users" in data
        assert "subscriptions" in data
    
    def test_director_can_access_admin_dashboard(self):
        """Director can access /api/admin/dashboard/stats"""
        token = get_token(**DIRECTOR_CREDS)
        resp = requests.get(
            f"{BASE_URL}/api/admin/dashboard/stats",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp.status_code == 200
    
    def test_athlete_cannot_access_admin_dashboard(self):
        """Athlete returns 403 for admin endpoints"""
        token = get_token(**ATHLETE_CREDS)
        resp = requests.get(
            f"{BASE_URL}/api/admin/dashboard/stats",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp.status_code == 403
        data = resp.json()
        assert "Admin access required" in data["detail"]
    
    def test_club_coach_cannot_access_admin_dashboard(self):
        """Club coach returns 403 for admin endpoints"""
        token = get_token(**CLUB_COACH_CREDS)
        resp = requests.get(
            f"{BASE_URL}/api/admin/dashboard/stats",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp.status_code == 403


class TestRoleBasedRouting:
    """Test that roles are correctly returned for frontend routing"""
    
    def test_athlete_me_endpoint_works(self):
        """Athlete can access auth/me endpoint correctly"""
        token = get_token(**ATHLETE_CREDS)
        resp = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["role"] == "athlete"
        assert data["org_id"] == DEFAULT_ORG_ID
    
    def test_coach_mission_control_endpoint_works(self):
        """Club coach can access mission control endpoints"""
        token = get_token(**CLUB_COACH_CREDS)
        resp = requests.get(
            f"{BASE_URL}/api/mission-control/summary",
            headers={"Authorization": f"Bearer {token}"}
        )
        # Should work for club_coach
        assert resp.status_code in [200, 404]  # 404 if no data, but not 403


class TestRegistrationRoles:
    """Test that registration allows club_coach role"""
    
    def test_registration_allows_club_coach_role(self):
        """Registration accepts 'club_coach' as a valid role"""
        unique_email = f"test-coach-{uuid.uuid4().hex[:8]}@test.com"
        resp = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": unique_email,
                "password": "testpass123",
                "name": "Test Coach Registration",
                "role": "club_coach"
            }
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["user"]["role"] == "club_coach"
    
    def test_registration_rejects_director_self_register(self):
        """Directors cannot self-register"""
        unique_email = f"test-dir-{uuid.uuid4().hex[:8]}@test.com"
        resp = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": unique_email,
                "password": "testpass123",
                "name": "Test Director",
                "role": "director"
            }
        )
        assert resp.status_code == 403


class TestSmartMatchAfterMigration:
    """Verify Smart Match still works after role migration"""
    
    def test_smart_match_recommendations_work(self):
        """Smart Match recommendations endpoint works for athlete"""
        token = get_token(**ATHLETE_CREDS)
        resp = requests.get(
            f"{BASE_URL}/api/smart-match/recommendations",
            headers={"Authorization": f"Bearer {token}"}
        )
        # Should work - 200 with data or 404 if not onboarded
        assert resp.status_code in [200, 404]
        if resp.status_code == 200:
            data = resp.json()
            assert "schools" in data or "recommendations" in data or "error" not in data
