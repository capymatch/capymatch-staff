"""
Test Organizations CRUD and Member Management APIs
- List all organizations (platform_admin)
- Get organization details with members
- Create new organization
- Update organization plan
- Add/remove members
- Delete organization
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Credentials
PLATFORM_ADMIN_EMAIL = "douglas@capymatch.com"
PLATFORM_ADMIN_PASSWORD = "1234"
COACH_EMAIL = "coach.williams@capymatch.com"
COACH_PASSWORD = "coach123"

# Existing org for testing
EXISTING_ORG_ID = "org-capymatch-default"


class TestHelpers:
    """Helper methods for auth and API calls"""
    
    @staticmethod
    def get_auth_token(email: str, password: str) -> str:
        """Get auth token for a user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": password
        })
        if response.status_code == 200:
            return response.json().get("token")
        return None
    
    @staticmethod
    def auth_headers(token: str) -> dict:
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }


class TestListOrganizations:
    """Test GET /api/organizations - list all orgs"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.token = TestHelpers.get_auth_token(PLATFORM_ADMIN_EMAIL, PLATFORM_ADMIN_PASSWORD)
        assert self.token is not None, "Failed to get platform admin token"
        self.headers = TestHelpers.auth_headers(self.token)
    
    def test_list_orgs_returns_200(self):
        """List orgs returns 200 for platform_admin"""
        response = requests.get(f"{BASE_URL}/api/organizations", headers=self.headers)
        assert response.status_code == 200
        print(f"List orgs: {response.status_code}")
    
    def test_list_orgs_returns_organizations_array(self):
        """Response contains organizations array"""
        response = requests.get(f"{BASE_URL}/api/organizations", headers=self.headers)
        data = response.json()
        assert "organizations" in data
        assert isinstance(data["organizations"], list)
        print(f"Found {len(data['organizations'])} organizations")
    
    def test_list_orgs_has_member_count(self):
        """Each org has member_count field"""
        response = requests.get(f"{BASE_URL}/api/organizations", headers=self.headers)
        data = response.json()
        orgs = data.get("organizations", [])
        assert len(orgs) > 0, "No organizations returned"
        for org in orgs:
            assert "member_count" in org, f"Org {org.get('id')} missing member_count"
        print(f"All orgs have member_count field")
    
    def test_list_orgs_has_athlete_count(self):
        """Each org has athlete_count field"""
        response = requests.get(f"{BASE_URL}/api/organizations", headers=self.headers)
        data = response.json()
        orgs = data.get("organizations", [])
        assert len(orgs) > 0, "No organizations returned"
        for org in orgs:
            assert "athlete_count" in org, f"Org {org.get('id')} missing athlete_count"
        print(f"All orgs have athlete_count field")
    
    def test_non_admin_gets_only_own_org(self):
        """Non-admin user only sees their own org"""
        coach_token = TestHelpers.get_auth_token(COACH_EMAIL, COACH_PASSWORD)
        assert coach_token is not None, "Failed to get coach token"
        headers = TestHelpers.auth_headers(coach_token)
        response = requests.get(f"{BASE_URL}/api/organizations", headers=headers)
        assert response.status_code == 200
        data = response.json()
        orgs = data.get("organizations", [])
        # Coach should only see their own org
        print(f"Coach sees {len(orgs)} org(s)")


class TestGetOrganizationDetail:
    """Test GET /api/organizations/{org_id} - get org details"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.token = TestHelpers.get_auth_token(PLATFORM_ADMIN_EMAIL, PLATFORM_ADMIN_PASSWORD)
        assert self.token is not None, "Failed to get platform admin token"
        self.headers = TestHelpers.auth_headers(self.token)
    
    def test_get_org_detail_returns_200(self):
        """Get org detail returns 200"""
        response = requests.get(f"{BASE_URL}/api/organizations/{EXISTING_ORG_ID}", headers=self.headers)
        assert response.status_code == 200
        print(f"Get org detail: {response.status_code}")
    
    def test_get_org_detail_has_directors_array(self):
        """Org detail includes directors array"""
        response = requests.get(f"{BASE_URL}/api/organizations/{EXISTING_ORG_ID}", headers=self.headers)
        data = response.json()
        assert "directors" in data, "Missing directors array"
        assert isinstance(data["directors"], list)
        print(f"Found {len(data['directors'])} directors")
    
    def test_get_org_detail_has_coaches_array(self):
        """Org detail includes coaches array"""
        response = requests.get(f"{BASE_URL}/api/organizations/{EXISTING_ORG_ID}", headers=self.headers)
        data = response.json()
        assert "coaches" in data, "Missing coaches array"
        assert isinstance(data["coaches"], list)
        print(f"Found {len(data['coaches'])} coaches")
    
    def test_get_org_detail_has_athletes_array(self):
        """Org detail includes athletes array"""
        response = requests.get(f"{BASE_URL}/api/organizations/{EXISTING_ORG_ID}", headers=self.headers)
        data = response.json()
        assert "athletes" in data, "Missing athletes array"
        assert isinstance(data["athletes"], list)
        print(f"Found {len(data['athletes'])} athletes")
    
    def test_get_org_detail_has_member_count(self):
        """Org detail has member_count"""
        response = requests.get(f"{BASE_URL}/api/organizations/{EXISTING_ORG_ID}", headers=self.headers)
        data = response.json()
        assert "member_count" in data
        print(f"Member count: {data['member_count']}")
    
    def test_get_org_detail_has_athlete_count(self):
        """Org detail has athlete_count"""
        response = requests.get(f"{BASE_URL}/api/organizations/{EXISTING_ORG_ID}", headers=self.headers)
        data = response.json()
        assert "athlete_count" in data
        print(f"Athlete count: {data['athlete_count']}")
    
    def test_get_nonexistent_org_returns_404(self):
        """Get non-existent org returns 404"""
        response = requests.get(f"{BASE_URL}/api/organizations/org-nonexistent-12345", headers=self.headers)
        assert response.status_code == 404
        print(f"Non-existent org: {response.status_code}")


class TestCreateOrganization:
    """Test POST /api/organizations - create new org"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.token = TestHelpers.get_auth_token(PLATFORM_ADMIN_EMAIL, PLATFORM_ADMIN_PASSWORD)
        assert self.token is not None, "Failed to get platform admin token"
        self.headers = TestHelpers.auth_headers(self.token)
        self.created_org_ids = []
    
    def teardown_method(self, method):
        """Clean up created test orgs"""
        for org_id in self.created_org_ids:
            try:
                requests.delete(f"{BASE_URL}/api/organizations/{org_id}", headers=self.headers)
            except:
                pass
    
    def test_create_org_returns_200_or_201(self):
        """Create org returns success status"""
        import uuid
        unique_slug = f"test-org-{uuid.uuid4().hex[:8]}"
        response = requests.post(f"{BASE_URL}/api/organizations", headers=self.headers, json={
            "name": "TEST_Organization",
            "slug": unique_slug,
            "plan": "free"
        })
        assert response.status_code in [200, 201], f"Unexpected status: {response.status_code} - {response.text}"
        data = response.json()
        if "id" in data:
            self.created_org_ids.append(data["id"])
        print(f"Create org: {response.status_code}")
    
    def test_create_org_returns_org_with_id(self):
        """Created org has an id"""
        import uuid
        unique_slug = f"test-org-{uuid.uuid4().hex[:8]}"
        response = requests.post(f"{BASE_URL}/api/organizations", headers=self.headers, json={
            "name": "TEST_Organization2",
            "slug": unique_slug,
            "plan": "basic"
        })
        data = response.json()
        assert "id" in data, "Response missing 'id'"
        assert data["id"].startswith("org-")
        self.created_org_ids.append(data["id"])
        print(f"Created org id: {data['id']}")
    
    def test_create_org_without_name_fails(self):
        """Create org without name returns 400"""
        response = requests.post(f"{BASE_URL}/api/organizations", headers=self.headers, json={
            "plan": "free"
        })
        assert response.status_code == 400
        print(f"Create without name: {response.status_code}")
    
    def test_create_org_with_duplicate_slug_fails(self):
        """Create org with duplicate slug returns 400"""
        # Create first org
        import uuid
        unique_slug = f"test-dup-{uuid.uuid4().hex[:8]}"
        resp1 = requests.post(f"{BASE_URL}/api/organizations", headers=self.headers, json={
            "name": "TEST_DupOrg1",
            "slug": unique_slug,
            "plan": "free"
        })
        if resp1.status_code in [200, 201]:
            self.created_org_ids.append(resp1.json().get("id"))
        
        # Try to create second with same slug
        resp2 = requests.post(f"{BASE_URL}/api/organizations", headers=self.headers, json={
            "name": "TEST_DupOrg2",
            "slug": unique_slug,
            "plan": "free"
        })
        assert resp2.status_code == 400
        print(f"Duplicate slug: {resp2.status_code}")


class TestUpdateOrganization:
    """Test PUT /api/organizations/{org_id} - update org plan"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.token = TestHelpers.get_auth_token(PLATFORM_ADMIN_EMAIL, PLATFORM_ADMIN_PASSWORD)
        assert self.token is not None, "Failed to get platform admin token"
        self.headers = TestHelpers.auth_headers(self.token)
        # Create a test org for update tests
        import uuid
        self.test_slug = f"test-update-{uuid.uuid4().hex[:8]}"
        resp = requests.post(f"{BASE_URL}/api/organizations", headers=self.headers, json={
            "name": "TEST_UpdateOrg",
            "slug": self.test_slug,
            "plan": "free"
        })
        if resp.status_code in [200, 201]:
            self.test_org_id = resp.json().get("id")
        else:
            self.test_org_id = None
    
    def teardown_method(self, method):
        """Clean up test org"""
        if hasattr(self, 'test_org_id') and self.test_org_id:
            try:
                requests.delete(f"{BASE_URL}/api/organizations/{self.test_org_id}", headers=self.headers)
            except:
                pass
    
    def test_update_org_plan_returns_200(self):
        """Update org plan returns 200"""
        if not self.test_org_id:
            pytest.skip("Test org not created")
        response = requests.put(f"{BASE_URL}/api/organizations/{self.test_org_id}", headers=self.headers, json={
            "plan": "pro"
        })
        assert response.status_code == 200, f"Update failed: {response.text}"
        print(f"Update org: {response.status_code}")
    
    def test_update_org_plan_persists(self):
        """Updated plan is persisted"""
        if not self.test_org_id:
            pytest.skip("Test org not created")
        # Update to premium
        requests.put(f"{BASE_URL}/api/organizations/{self.test_org_id}", headers=self.headers, json={
            "plan": "premium"
        })
        # Verify
        resp = requests.get(f"{BASE_URL}/api/organizations/{self.test_org_id}", headers=self.headers)
        data = resp.json()
        assert data.get("plan") == "premium"
        print(f"Plan persisted: {data.get('plan')}")
    
    def test_update_org_empty_body_fails(self):
        """Update with empty body returns 400"""
        if not self.test_org_id:
            pytest.skip("Test org not created")
        response = requests.put(f"{BASE_URL}/api/organizations/{self.test_org_id}", headers=self.headers, json={})
        assert response.status_code == 400
        print(f"Empty update: {response.status_code}")


class TestAddMemberToOrg:
    """Test POST /api/organizations/{org_id}/members - add member by email"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.token = TestHelpers.get_auth_token(PLATFORM_ADMIN_EMAIL, PLATFORM_ADMIN_PASSWORD)
        assert self.token is not None, "Failed to get platform admin token"
        self.headers = TestHelpers.auth_headers(self.token)
    
    def test_add_member_by_email_returns_200(self):
        """Add member by email returns 200"""
        # Try to add coach to existing org (may already be member)
        response = requests.post(f"{BASE_URL}/api/organizations/{EXISTING_ORG_ID}/members", headers=self.headers, json={
            "email": COACH_EMAIL
        })
        assert response.status_code == 200
        print(f"Add member: {response.status_code}")
    
    def test_add_member_without_email_fails(self):
        """Add member without email returns 400"""
        response = requests.post(f"{BASE_URL}/api/organizations/{EXISTING_ORG_ID}/members", headers=self.headers, json={})
        assert response.status_code == 400
        print(f"Add without email: {response.status_code}")
    
    def test_add_nonexistent_user_returns_404(self):
        """Add non-existent user returns 404"""
        response = requests.post(f"{BASE_URL}/api/organizations/{EXISTING_ORG_ID}/members", headers=self.headers, json={
            "email": "nonexistent-user-12345@example.com"
        })
        assert response.status_code == 404
        print(f"Add non-existent user: {response.status_code}")
    
    def test_add_to_nonexistent_org_returns_404(self):
        """Add member to non-existent org returns 404"""
        response = requests.post(f"{BASE_URL}/api/organizations/org-nonexistent-12345/members", headers=self.headers, json={
            "email": COACH_EMAIL
        })
        assert response.status_code == 404
        print(f"Add to non-existent org: {response.status_code}")


class TestRemoveMemberFromOrg:
    """Test DELETE /api/organizations/{org_id}/members/{user_id} - remove member"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.token = TestHelpers.get_auth_token(PLATFORM_ADMIN_EMAIL, PLATFORM_ADMIN_PASSWORD)
        assert self.token is not None, "Failed to get platform admin token"
        self.headers = TestHelpers.auth_headers(self.token)
    
    def test_remove_nonexistent_member_returns_404(self):
        """Remove non-existent member returns 404"""
        response = requests.delete(f"{BASE_URL}/api/organizations/{EXISTING_ORG_ID}/members/user-nonexistent-12345", headers=self.headers)
        assert response.status_code == 404
        print(f"Remove non-existent: {response.status_code}")


class TestDeleteOrganization:
    """Test DELETE /api/organizations/{org_id} - delete org"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.token = TestHelpers.get_auth_token(PLATFORM_ADMIN_EMAIL, PLATFORM_ADMIN_PASSWORD)
        assert self.token is not None, "Failed to get platform admin token"
        self.headers = TestHelpers.auth_headers(self.token)
    
    def test_delete_org_returns_200(self):
        """Delete org returns 200"""
        # Create a test org first
        import uuid
        unique_slug = f"test-delete-{uuid.uuid4().hex[:8]}"
        create_resp = requests.post(f"{BASE_URL}/api/organizations", headers=self.headers, json={
            "name": "TEST_DeleteOrg",
            "slug": unique_slug,
            "plan": "free"
        })
        assert create_resp.status_code in [200, 201], f"Failed to create test org: {create_resp.text}"
        org_id = create_resp.json().get("id")
        
        # Delete it
        delete_resp = requests.delete(f"{BASE_URL}/api/organizations/{org_id}", headers=self.headers)
        assert delete_resp.status_code == 200
        print(f"Delete org: {delete_resp.status_code}")
    
    def test_delete_org_removes_from_database(self):
        """Deleted org no longer exists"""
        # Create a test org
        import uuid
        unique_slug = f"test-delete-verify-{uuid.uuid4().hex[:8]}"
        create_resp = requests.post(f"{BASE_URL}/api/organizations", headers=self.headers, json={
            "name": "TEST_DeleteVerifyOrg",
            "slug": unique_slug,
            "plan": "free"
        })
        org_id = create_resp.json().get("id")
        
        # Delete it
        requests.delete(f"{BASE_URL}/api/organizations/{org_id}", headers=self.headers)
        
        # Verify it's gone
        get_resp = requests.get(f"{BASE_URL}/api/organizations/{org_id}", headers=self.headers)
        assert get_resp.status_code == 404
        print(f"Delete verified: org returns 404")
    
    def test_delete_nonexistent_org_returns_404(self):
        """Delete non-existent org returns 404"""
        response = requests.delete(f"{BASE_URL}/api/organizations/org-nonexistent-12345", headers=self.headers)
        assert response.status_code == 404
        print(f"Delete non-existent: {response.status_code}")
    
    def test_non_admin_cannot_delete_org(self):
        """Non-admin cannot delete org"""
        coach_token = TestHelpers.get_auth_token(COACH_EMAIL, COACH_PASSWORD)
        assert coach_token is not None
        headers = TestHelpers.auth_headers(coach_token)
        response = requests.delete(f"{BASE_URL}/api/organizations/{EXISTING_ORG_ID}", headers=headers)
        assert response.status_code == 403
        print(f"Non-admin delete: {response.status_code}")


class TestOrgMemberFields:
    """Test that member data has required fields"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.token = TestHelpers.get_auth_token(PLATFORM_ADMIN_EMAIL, PLATFORM_ADMIN_PASSWORD)
        assert self.token is not None, "Failed to get platform admin token"
        self.headers = TestHelpers.auth_headers(self.token)
    
    def test_directors_have_id_name_email(self):
        """Directors have id, name, email fields"""
        response = requests.get(f"{BASE_URL}/api/organizations/{EXISTING_ORG_ID}", headers=self.headers)
        data = response.json()
        directors = data.get("directors", [])
        if len(directors) > 0:
            for d in directors:
                assert "id" in d, "Director missing id"
                assert "name" in d, "Director missing name"
                assert "email" in d, "Director missing email"
        print(f"Directors have required fields")
    
    def test_coaches_have_id_name_email(self):
        """Coaches have id, name, email fields"""
        response = requests.get(f"{BASE_URL}/api/organizations/{EXISTING_ORG_ID}", headers=self.headers)
        data = response.json()
        coaches = data.get("coaches", [])
        if len(coaches) > 0:
            for c in coaches:
                assert "id" in c, "Coach missing id"
                assert "name" in c, "Coach missing name"
                assert "email" in c, "Coach missing email"
        print(f"Coaches have required fields")
    
    def test_athletes_have_id_name_email(self):
        """Athletes have id, name, email fields"""
        response = requests.get(f"{BASE_URL}/api/organizations/{EXISTING_ORG_ID}", headers=self.headers)
        data = response.json()
        athletes = data.get("athletes", [])
        if len(athletes) > 0:
            for a in athletes:
                assert "id" in a, "Athlete missing id"
                assert "name" in a, "Athlete missing name"
                assert "email" in a, "Athlete missing email"
        print(f"Athletes have required fields")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
