"""
Tests for candidate group APIs.
"""

from __future__ import annotations

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from authentication.models import Role, RoleKey, UserRole
from core.models import CandidateGroup

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def roles(db):
    defaults = {
        RoleKey.SYSTEM_ADMIN: ('System Administrator', 'Full platform administration'),
        RoleKey.COORDINATOR: ('Coordinator', 'Coordinates exam sessions'),
        RoleKey.CANDIDATE: ('Candidate', 'Takes exams'),
        RoleKey.EXAMINER: ('Examiner', 'Grades exams'),
    }
    created = {}
    for key, (name, description) in defaults.items():
        created[key], _ = Role.objects.get_or_create(
            key=key,
            defaults={
                'name': name,
                'description': description,
                'is_active': True,
            },
        )
    return created


@pytest.fixture
def coordinator(roles):
    user = User.objects.create_user(
        email='coordinator@example.com',
        password='CoordPass123!',
    )
    UserRole.objects.create(user=user, role=roles[RoleKey.COORDINATOR])
    return user


@pytest.fixture
def system_admin(roles):
    user = User.objects.create_user(
        email='admin@example.com',
        password='AdminPass123!',
    )
    UserRole.objects.create(user=user, role=roles[RoleKey.SYSTEM_ADMIN])
    return user


@pytest.fixture
def candidate_user(roles):
    user = User.objects.create_user(
        email='candidate@example.com',
        password='CandPass123!',
        first_name='Jane',
        last_name='Candidate',
    )
    UserRole.objects.create(user=user, role=roles[RoleKey.CANDIDATE])
    return user


@pytest.fixture
def second_candidate(roles):
    user = User.objects.create_user(
        email='candidate2@example.com',
        password='CandPass123!',
    )
    UserRole.objects.create(user=user, role=roles[RoleKey.CANDIDATE])
    return user


@pytest.fixture
def examiner(roles):
    user = User.objects.create_user(
        email='examiner@example.com',
        password='ExamPass123!',
    )
    UserRole.objects.create(user=user, role=roles[RoleKey.EXAMINER])
    return user


def auth_client(client, user):
    token = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token.access_token}')
    return client


def group_payload(**overrides):
    payload = {
        'name': 'Spring Cohort',
        'description': 'Candidates for the spring intake',
        'is_active': True,
    }
    payload.update(overrides)
    return payload


@pytest.mark.django_db
class TestCandidateGroupAPI:
    def test_list_groups_requires_coordinator_or_admin(
        self,
        api_client,
        roles,
        candidate_user,
    ):
        auth_client(api_client, candidate_user)
        response = api_client.get('/api/core/groups/')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_create_group_success(self, api_client, roles, coordinator):
        auth_client(api_client, coordinator)
        payload = group_payload()
        response = api_client.post('/api/core/groups/', payload, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['name'] == payload['name']
        assert response.data['description'] == payload['description']
        assert response.data['members'] == []
        assert CandidateGroup.objects.count() == 1
        group = CandidateGroup.objects.get()
        assert group.created_by_id == coordinator.pk

    def test_create_group_as_system_admin(self, api_client, roles, system_admin):
        auth_client(api_client, system_admin)
        response = api_client.post(
            '/api/core/groups/',
            group_payload(name='Admin Group'),
            format='json',
        )
        assert response.status_code == status.HTTP_201_CREATED

    def test_create_group_rejects_duplicate_name(self, api_client, roles, coordinator):
        auth_client(api_client, coordinator)
        CandidateGroup.objects.create(name='Existing Group')
        response = api_client.post(
            '/api/core/groups/',
            group_payload(name='existing group'),
            format='json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'name' in response.data

    def test_list_groups(self, api_client, roles, coordinator, candidate_user):
        auth_client(api_client, coordinator)
        group = CandidateGroup.objects.create(name='Listed Group')
        group.members.add(candidate_user)

        response = api_client.get('/api/core/groups/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 1
        assert response.data['results'][0]['name'] == 'Listed Group'
        assert response.data['results'][0]['member_count'] == 1

    def test_retrieve_group(self, api_client, roles, coordinator, candidate_user):
        auth_client(api_client, coordinator)
        group = CandidateGroup.objects.create(name='Detail Group')
        group.members.add(candidate_user)

        response = api_client.get(f'/api/core/groups/{group.id}/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['id'] == str(group.id)
        assert len(response.data['members']) == 1
        assert response.data['members'][0]['email'] == candidate_user.email

    def test_partial_update_group(self, api_client, roles, coordinator):
        auth_client(api_client, coordinator)
        group = CandidateGroup.objects.create(name='Old Name', description='Old')

        response = api_client.patch(
            f'/api/core/groups/{group.id}/',
            {'description': 'Updated description', 'is_active': False},
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data['description'] == 'Updated description'
        assert response.data['is_active'] is False

    def test_delete_group(self, api_client, roles, coordinator):
        auth_client(api_client, coordinator)
        group = CandidateGroup.objects.create(name='Delete Me')

        response = api_client.delete(f'/api/core/groups/{group.id}/')
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert CandidateGroup.objects.count() == 0

    def test_add_members_by_user_ids(
        self,
        api_client,
        roles,
        coordinator,
        candidate_user,
        second_candidate,
    ):
        auth_client(api_client, coordinator)
        group = CandidateGroup.objects.create(name='Member Group')

        response = api_client.post(
            f'/api/core/groups/{group.id}/add-members/',
            {'user_ids': [candidate_user.pk, second_candidate.pk]},
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['added']) == 2
        assert response.data['already_members'] == []
        assert response.data['invalid_users'] == []
        assert response.data['not_found'] == {'user_ids': [], 'emails': []}
        assert group.members.count() == 2

    def test_add_members_by_emails(
        self,
        api_client,
        roles,
        coordinator,
        candidate_user,
    ):
        auth_client(api_client, coordinator)
        group = CandidateGroup.objects.create(name='Email Group')

        response = api_client.post(
            f'/api/core/groups/{group.id}/add-members/',
            {'emails': [candidate_user.email.upper()]},
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['added']) == 1
        assert group.members.filter(pk=candidate_user.pk).exists()

    def test_add_members_reports_not_found_and_invalid(
        self,
        api_client,
        roles,
        coordinator,
        candidate_user,
        examiner,
    ):
        auth_client(api_client, coordinator)
        group = CandidateGroup.objects.create(name='Mixed Group')
        group.members.add(candidate_user)

        response = api_client.post(
            f'/api/core/groups/{group.id}/add-members/',
            {
                'user_ids': [candidate_user.pk, 99999, examiner.pk],
                'emails': ['missing@example.com'],
            },
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data['added'] == []
        assert len(response.data['already_members']) == 1
        assert len(response.data['invalid_users']) == 1
        assert response.data['invalid_users'][0]['email'] == examiner.email
        assert response.data['not_found']['user_ids'] == [99999]
        assert response.data['not_found']['emails'] == ['missing@example.com']

    def test_add_members_requires_payload(self, api_client, roles, coordinator):
        auth_client(api_client, coordinator)
        group = CandidateGroup.objects.create(name='Empty Payload Group')

        response = api_client.post(
            f'/api/core/groups/{group.id}/add-members/',
            {},
            format='json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_remove_members_by_user_ids_and_emails(
        self,
        api_client,
        roles,
        coordinator,
        candidate_user,
        second_candidate,
    ):
        auth_client(api_client, coordinator)
        group = CandidateGroup.objects.create(name='Remove Group')
        group.members.add(candidate_user, second_candidate)

        response = api_client.post(
            f'/api/core/groups/{group.id}/remove-members/',
            {
                'user_ids': [candidate_user.pk],
                'emails': [second_candidate.email],
            },
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['removed']) == 2
        assert response.data['not_members'] == []
        assert group.members.count() == 0

    def test_remove_members_reports_not_members_and_not_found(
        self,
        api_client,
        roles,
        coordinator,
        candidate_user,
    ):
        auth_client(api_client, coordinator)
        group = CandidateGroup.objects.create(name='Remove Partial Group')

        response = api_client.post(
            f'/api/core/groups/{group.id}/remove-members/',
            {
                'user_ids': [candidate_user.pk, 424242],
                'emails': ['ghost@example.com'],
            },
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data['removed'] == []
        assert len(response.data['not_members']) == 1
        assert response.data['not_found']['user_ids'] == [424242]
        assert response.data['not_found']['emails'] == ['ghost@example.com']
