from __future__ import annotations

import uuid
from datetime import timedelta
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from authentication.models import Role, RoleKey, UserRole
from core.models import Assignment, AssignmentStatus, CandidateGroup
from delivery.models import Attempt, AttemptStatus
from delivery.services.attempts import user_uuid
from grading.models import CombinedResult

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
        email='report-coordinator@example.com',
        password='CoordPass123!',
    )
    UserRole.objects.create(user=user, role=roles[RoleKey.COORDINATOR])
    return user


@pytest.fixture
def examiner(roles):
    user = User.objects.create_user(
        email='report-examiner@example.com',
        password='ExamPass123!',
    )
    UserRole.objects.create(user=user, role=roles[RoleKey.EXAMINER])
    return user


@pytest.fixture
def candidate(roles):
    user = User.objects.create_user(
        email='report-candidate@example.com',
        password='CandPass123!',
    )
    UserRole.objects.create(user=user, role=roles[RoleKey.CANDIDATE])
    return user


@pytest.fixture
def test_id():
    return uuid.uuid4()


@pytest.fixture
def attempt_bundle(candidate, coordinator, test_id):
    now = timezone.now()
    group = CandidateGroup.objects.create(
        name='Reporting Group',
        created_by=coordinator,
    )
    group.members.add(candidate)
    assignment = Assignment.objects.create(
        test_id=test_id,
        assignee_group_id=group.id,
        created_by_user_id=user_uuid(coordinator.id),
        opens_at=now - timedelta(hours=2),
        closes_at=now + timedelta(hours=2),
        max_attempts=2,
        status=AssignmentStatus.ACTIVE,
    )
    attempt = Attempt.objects.create(
        assignment=assignment,
        candidate_id=candidate.id,
        test_id=test_id,
        status=AttemptStatus.SUBMITTED,
        time_limit_seconds=3600,
        expires_at=now + timedelta(hours=1),
        submitted_at=now,
    )
    CombinedResult.objects.create(
        attempt_id=str(attempt.id),
        test_id=str(test_id),
        total_awarded=Decimal('6.00'),
        total_max=Decimal('10.00'),
        by_topic={'science': {'awarded': '6.00', 'max': '10.00'}},
        passed=False,
    )
    return {'attempt': attempt, 'group': group, 'test_id': test_id}


def auth_client(client, user):
    token = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token.access_token}')
    return client
