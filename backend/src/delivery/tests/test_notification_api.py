from __future__ import annotations

import uuid
from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from authentication.models import Role, RoleKey, UserRole
from core.models import Assignment, AssignmentStatus, CandidateGroup
from delivery.services.attempts import user_uuid
from notifications.models import EmailMessageLog

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def roles(db):
    defaults = {
        RoleKey.CANDIDATE: ('Candidate', 'Takes exams'),
        RoleKey.COORDINATOR: ('Coordinator', 'Coordinates exams'),
        RoleKey.EXAMINER: ('Examiner', 'Authors tests'),
        RoleKey.SYSTEM_ADMIN: ('System Admin', 'Full admin access'),
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
        email='notify-coordinator@example.com',
        password='CoordPass123!',
    )
    UserRole.objects.create(user=user, role=roles[RoleKey.COORDINATOR])
    return user


@pytest.fixture
def examiner(roles):
    user = User.objects.create_user(
        email='notify-examiner@example.com',
        password='ExamPass123!',
    )
    UserRole.objects.create(user=user, role=roles[RoleKey.EXAMINER])
    return user


@pytest.fixture
def candidate(roles):
    user = User.objects.create_user(
        email='notify-candidate@example.com',
        password='CandPass123!',
    )
    UserRole.objects.create(user=user, role=roles[RoleKey.CANDIDATE])
    return user


@pytest.fixture
def assignment_bundle(coordinator, candidate):
    now = timezone.now()
    test_id = uuid.uuid4()
    group = CandidateGroup.objects.create(
        name='Notification Group',
        created_by=coordinator,
    )
    group.members.add(candidate)
    assignment = Assignment.objects.create(
        test_id=test_id,
        assignee_group_id=group.id,
        created_by_user_id=user_uuid(coordinator.id),
        opens_at=now - timedelta(hours=1),
        due_at=now + timedelta(days=1),
        closes_at=now + timedelta(days=2),
        max_attempts=1,
        status=AssignmentStatus.ACTIVE,
    )
    return {
        'assignment': assignment,
        'group': group,
        'test_id': test_id,
        'candidate': candidate,
    }


def auth_client(client, user):
    token = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token.access_token}')
    return client


@pytest.mark.django_db
class TestNotificationAPI:
    def test_resend_invite_requires_coordinator(
        self,
        api_client,
        candidate,
        assignment_bundle,
    ):
        auth_client(api_client, candidate)
        assignment = assignment_bundle['assignment']
        response = api_client.post(
            reverse('assignment_resend_invite', kwargs={'assignment_id': assignment.id}),
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_resend_invite_sends_email(
        self,
        api_client,
        coordinator,
        assignment_bundle,
    ):
        auth_client(api_client, coordinator)
        assignment = assignment_bundle['assignment']
        response = api_client.post(
            reverse('assignment_resend_invite', kwargs={'assignment_id': assignment.id}),
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data['sent_count'] == 1
        assert EmailMessageLog.objects.filter(
            template_key='invite',
            status=EmailMessageLog.Status.SENT,
        ).exists()

    def test_resend_invite_throttles_recent_send(
        self,
        api_client,
        coordinator,
        assignment_bundle,
    ):
        auth_client(api_client, coordinator)
        assignment = assignment_bundle['assignment']
        url = reverse('assignment_resend_invite', kwargs={'assignment_id': assignment.id})

        first = api_client.post(url)
        second = api_client.post(url)

        assert first.data['sent_count'] == 1
        assert second.data['throttled_count'] == 1
        assert EmailMessageLog.objects.filter(status=EmailMessageLog.Status.THROTTLED).exists()

    def test_send_reminders_for_test(
        self,
        api_client,
        coordinator,
        assignment_bundle,
    ):
        auth_client(api_client, coordinator)
        test_id = assignment_bundle['test_id']
        response = api_client.post(
            reverse('test_send_reminders', kwargs={'test_id': test_id}),
            data={'include_not_started': True},
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data['sent_count'] == 1

    def test_monitoring_status_for_examiner(
        self,
        api_client,
        examiner,
        assignment_bundle,
    ):
        auth_client(api_client, examiner)
        test_id = assignment_bundle['test_id']
        response = api_client.get(
            reverse('monitoring_test_status', kwargs={'test_id': test_id}),
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data['assignment_count'] == 1
        assert len(response.data['group_breakdown']) == 1

    def test_monitoring_status_denied_for_candidate(
        self,
        api_client,
        candidate,
        assignment_bundle,
    ):
        auth_client(api_client, candidate)
        test_id = assignment_bundle['test_id']
        response = api_client.get(
            reverse('monitoring_test_status', kwargs={'test_id': test_id}),
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN
