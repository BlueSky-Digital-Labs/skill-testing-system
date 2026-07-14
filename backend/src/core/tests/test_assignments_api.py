"""
Tests for assignment APIs and availability helpers.
"""

from __future__ import annotations

import uuid
from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from authentication.models import Role, RoleKey, UserRole
from core.models import Assignment, AssignmentStatus
from core.services.availability import (
    attempts_remaining,
    assignment_state,
    is_overdue,
    is_within_window,
)

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
def candidate(roles):
    user = User.objects.create_user(
        email='candidate@example.com',
        password='CandPass123!',
    )
    UserRole.objects.create(user=user, role=roles[RoleKey.CANDIDATE])
    return user


def auth_client(client, user):
    token = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token.access_token}')
    return client


def assignment_payload(**overrides):
    now = timezone.now()
    payload = {
        'test_id': str(uuid.uuid4()),
        'assignee_user_id': str(uuid.uuid4()),
        'opens_at': (now + timedelta(hours=1)).isoformat().replace('+00:00', 'Z'),
        'due_at': (now + timedelta(days=1)).isoformat().replace('+00:00', 'Z'),
        'closes_at': (now + timedelta(days=2)).isoformat().replace('+00:00', 'Z'),
        'max_attempts': 2,
        'shuffle_questions': True,
        'shuffle_options': False,
        'status': AssignmentStatus.ACTIVE,
    }
    payload.update(overrides)
    return payload


@pytest.mark.django_db
class TestAvailabilityHelpers:
    def test_is_within_window(self):
        now = timezone.now()
        opens_at = now - timedelta(hours=1)
        closes_at = now + timedelta(hours=1)
        assert is_within_window(opens_at, closes_at, now) is True
        assert is_within_window(opens_at, None, now) is True
        assert is_within_window(opens_at, closes_at, now - timedelta(hours=2)) is False
        assert is_within_window(opens_at, closes_at, now + timedelta(hours=2)) is False

    def test_is_overdue(self):
        now = timezone.now()
        due_at = now - timedelta(hours=1)
        assert is_overdue(due_at, None, now) is True
        assert is_overdue(due_at, now, now) is False
        assert is_overdue(None, None, now) is False

    def test_attempts_remaining(self):
        assignment = Assignment(max_attempts=3)
        assert attempts_remaining(assignment, 1) == 2
        assert attempts_remaining(assignment, 5) == 0


@pytest.mark.django_db
class TestAssignmentAPI:
    def test_create_assignment_requires_coordinator_or_admin(
        self,
        api_client,
        roles,
        candidate,
    ):
        auth_client(api_client, candidate)
        response = api_client.post(
            '/api/assignments/',
            assignment_payload(),
            format='json',
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_create_assignment_success(self, api_client, roles, coordinator):
        auth_client(api_client, coordinator)
        payload = assignment_payload()
        response = api_client.post('/api/assignments/', payload, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['test_id'] == payload['test_id']
        assert response.data['assignee_user_id'] == payload['assignee_user_id']
        assert response.data['state'] == 'upcoming'
        assert Assignment.objects.count() == 1

    def test_create_assignment_requires_assignee(self, api_client, roles, coordinator):
        auth_client(api_client, coordinator)
        payload = assignment_payload()
        payload.pop('assignee_user_id')
        response = api_client.post('/api/assignments/', payload, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'non_field_errors' in response.data

    def test_create_assignment_rejects_invalid_temporal_order(
        self,
        api_client,
        roles,
        coordinator,
    ):
        auth_client(api_client, coordinator)
        now = timezone.now()
        payload = assignment_payload(
            opens_at=(now + timedelta(days=2)).isoformat().replace('+00:00', 'Z'),
            due_at=(now + timedelta(days=1)).isoformat().replace('+00:00', 'Z'),
        )
        response = api_client.post('/api/assignments/', payload, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'due_at' in response.data

    def test_list_assignments_filter_by_state(self, api_client, roles, coordinator):
        auth_client(api_client, coordinator)
        now = timezone.now()
        test_id = uuid.uuid4()

        Assignment.objects.create(
            test_id=test_id,
            assignee_user_id=uuid.uuid4(),
            created_by_user_id=uuid.uuid4(),
            opens_at=now - timedelta(hours=2),
            due_at=now + timedelta(hours=2),
            closes_at=now + timedelta(days=1),
            status=AssignmentStatus.ACTIVE,
        )
        Assignment.objects.create(
            test_id=test_id,
            assignee_user_id=uuid.uuid4(),
            created_by_user_id=uuid.uuid4(),
            opens_at=now + timedelta(days=1),
            status=AssignmentStatus.ACTIVE,
        )

        response = api_client.get('/api/assignments/', {'state': 'open'})
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 1
        assert response.data['results'][0]['state'] == 'open'

    def test_list_assignments_filter_by_test_id(self, api_client, roles, coordinator):
        auth_client(api_client, coordinator)
        test_id = uuid.uuid4()
        other_test_id = uuid.uuid4()
        now = timezone.now()

        Assignment.objects.create(
            test_id=test_id,
            assignee_user_id=uuid.uuid4(),
            created_by_user_id=uuid.uuid4(),
            opens_at=now,
            status=AssignmentStatus.ACTIVE,
        )
        Assignment.objects.create(
            test_id=other_test_id,
            assignee_user_id=uuid.uuid4(),
            created_by_user_id=uuid.uuid4(),
            opens_at=now,
            status=AssignmentStatus.ACTIVE,
        )

        response = api_client.get('/api/assignments/', {'test_id': str(test_id)})
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 1
        assert response.data['results'][0]['test_id'] == str(test_id)

    def test_retrieve_assignment(self, api_client, roles, coordinator):
        auth_client(api_client, coordinator)
        assignment = Assignment.objects.create(
            test_id=uuid.uuid4(),
            assignee_user_id=uuid.uuid4(),
            created_by_user_id=uuid.uuid4(),
            opens_at=timezone.now(),
            status=AssignmentStatus.ACTIVE,
        )
        response = api_client.get(f'/api/assignments/{assignment.id}/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['id'] == str(assignment.id)

    def test_partial_update_assignment(self, api_client, roles, coordinator):
        auth_client(api_client, coordinator)
        assignment = Assignment.objects.create(
            test_id=uuid.uuid4(),
            assignee_user_id=uuid.uuid4(),
            created_by_user_id=uuid.uuid4(),
            opens_at=timezone.now(),
            max_attempts=1,
            status=AssignmentStatus.ACTIVE,
        )
        response = api_client.patch(
            f'/api/assignments/{assignment.id}/',
            {'max_attempts': 5},
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data['max_attempts'] == 5

    def test_archive_assignment(self, api_client, roles, coordinator):
        auth_client(api_client, coordinator)
        assignment = Assignment.objects.create(
            test_id=uuid.uuid4(),
            assignee_user_id=uuid.uuid4(),
            created_by_user_id=uuid.uuid4(),
            opens_at=timezone.now(),
            status=AssignmentStatus.ACTIVE,
        )
        response = api_client.post(f'/api/assignments/{assignment.id}/archive/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == AssignmentStatus.ARCHIVED
        assert response.data['state'] == 'archived'

    def test_assignment_state_helper(self):
        now = timezone.now()
        assignment = Assignment(
            opens_at=now - timedelta(hours=1),
            due_at=now - timedelta(minutes=30),
            closes_at=now + timedelta(hours=1),
            status=AssignmentStatus.ACTIVE,
        )
        assert assignment_state(assignment, now) == 'overdue'
