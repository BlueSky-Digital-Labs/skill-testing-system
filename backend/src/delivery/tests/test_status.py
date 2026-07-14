from __future__ import annotations

import uuid
from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone

from authentication.models import Role, RoleKey, UserRole
from core.models import Assignment, AssignmentStatus, CandidateGroup
from delivery.models import Attempt, AttemptStatus
from delivery.services.attempts import user_uuid
from delivery.status import get_group_status_summary, get_test_status_summary

User = get_user_model()


@pytest.fixture
def roles(db):
    role, _ = Role.objects.get_or_create(
        key=RoleKey.COORDINATOR,
        defaults={
            'name': 'Coordinator',
            'description': 'Coordinates exams',
            'is_active': True,
        },
    )
    return role


@pytest.fixture
def coordinator(roles):
    user = User.objects.create_user(
        email='status-coordinator@example.com',
        password='CoordPass123!',
    )
    UserRole.objects.create(user=user, role=roles)
    return user


@pytest.fixture
def candidate(roles):
    candidate_role, _ = Role.objects.get_or_create(
        key=RoleKey.CANDIDATE,
        defaults={
            'name': 'Candidate',
            'description': 'Takes exams',
            'is_active': True,
        },
    )
    user = User.objects.create_user(
        email='status-candidate@example.com',
        password='CandPass123!',
    )
    UserRole.objects.create(user=user, role=candidate_role)
    return user


@pytest.mark.django_db
class TestDeliveryStatusQueries:
    def test_get_test_status_summary(self, coordinator, candidate):
        now = timezone.now()
        test_id = uuid.uuid4()
        group = CandidateGroup.objects.create(name='Status Group', created_by=coordinator)
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
        Attempt.objects.create(
            assignment=assignment,
            candidate_id=candidate.id,
            test_id=test_id,
            status=AttemptStatus.IN_PROGRESS,
            time_limit_seconds=3600,
            expires_at=now + timedelta(hours=1),
        )

        summary = get_test_status_summary(test_id)
        assert summary['assignment_count'] == 1
        assert summary['attempt_status_counts']['in_progress'] == 1
        assert summary['group_breakdown'][0]['in_progress_count'] == 1

    def test_get_group_status_summary(self, coordinator, candidate):
        now = timezone.now()
        test_id = uuid.uuid4()
        group = CandidateGroup.objects.create(name='Group A', created_by=coordinator)
        group.members.add(candidate)
        Assignment.objects.create(
            test_id=test_id,
            assignee_group_id=group.id,
            created_by_user_id=user_uuid(coordinator.id),
            opens_at=now - timedelta(hours=1),
            due_at=now + timedelta(days=1),
            closes_at=now + timedelta(days=2),
            max_attempts=1,
            status=AssignmentStatus.ACTIVE,
        )

        summary = get_group_status_summary(test_id=test_id, group_id=group.id)
        assert summary['member_count'] == 1
        assert summary['not_started_count'] == 1
