from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from authentication.models import Role, RoleKey, UserRole
from grading.models import (
    CombinedResult,
    FreeTextQueueItem,
    ManualGrade,
    ObjectiveScore,
)
from results.models import DisclosureLevel, ReleaseControl

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
def staff_user(roles):
    user = User.objects.create_user(
        email='staff@example.com',
        password='SecurePass123!',
        is_staff=True,
    )
    UserRole.objects.create(user=user, role=roles[RoleKey.SYSTEM_ADMIN])
    return user


@pytest.fixture
def candidate(roles):
    user = User.objects.create_user(
        email='candidate@example.com',
        password='CandPass123!',
    )
    UserRole.objects.create(user=user, role=roles[RoleKey.CANDIDATE])
    return user


@pytest.fixture
def other_candidate(roles):
    user = User.objects.create_user(
        email='other@example.com',
        password='OtherPass123!',
    )
    UserRole.objects.create(user=user, role=roles[RoleKey.CANDIDATE])
    return user


def auth_client(client, user):
    token = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token.access_token}')
    return client


@pytest.fixture
def attempt_review_data(staff_user, candidate):
    attempt_id = 'attempt-review-api'
    CombinedResult.objects.create(
        attempt_id=attempt_id,
        test_id='test-review',
        total_awarded=Decimal('7.00'),
        total_max=Decimal('10.00'),
        by_topic={'science': {'awarded': '7.00', 'max': '10.00'}},
        passed=False,
    )
    ObjectiveScore.objects.create(
        attempt_id=attempt_id,
        question_id='q-obj',
        question_version=1,
        question_type='mcq',
        awarded_points=Decimal('4.00'),
        max_points=Decimal('5.00'),
        is_correct=False,
    )
    queue_item = FreeTextQueueItem.objects.create(
        attempt_id=attempt_id,
        test_id='test-review',
        question_id='q-free',
        response_text='Candidate answer',
        max_points=Decimal('5.00'),
        topic='science',
        status=FreeTextQueueItem.STATUS_GRADED,
    )
    ManualGrade.objects.create(
        queue_item=queue_item,
        grader_user_id=staff_user.id,
        awarded_points=Decimal('3.00'),
        feedback='Needs more detail.',
    )
    ReleaseControl.objects.create(
        attempt_id=attempt_id,
        test_id='test-review',
        candidate_user_id=candidate.id,
        disclosure=DisclosureLevel.DETAILED,
        released=True,
        released_at=timezone.now(),
        released_by_user_id=staff_user.id,
    )
    return attempt_id


@pytest.mark.django_db
class TestAttemptReviewAPI:
    def test_requires_authentication(self, api_client, attempt_review_data):
        response = api_client.get(
            reverse('attempt_review', args=[attempt_review_data]),
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_owner_receives_score_and_feedback_when_detailed(
        self,
        api_client,
        candidate,
        attempt_review_data,
    ):
        auth_client(api_client, candidate)
        response = api_client.get(
            reverse('attempt_review', args=[attempt_review_data]),
        )

        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert body['id'] == attempt_review_data
        assert body['disclosure_mode'] == 'score_and_feedback'
        assert body['status'] == 'released'
        assert body['summary']['total_awarded'] == '7.00'
        assert len(body['items']) == 2
        feedback_items = [item for item in body['items'] if item.get('feedback')]
        assert len(feedback_items) == 1
        assert feedback_items[0]['feedback'] == 'Needs more detail.'

    def test_owner_receives_score_only_when_summary_disclosure(
        self,
        api_client,
        candidate,
        attempt_review_data,
    ):
        ReleaseControl.objects.filter(attempt_id=attempt_review_data).update(
            disclosure=DisclosureLevel.SUMMARY,
        )
        auth_client(api_client, candidate)
        response = api_client.get(
            reverse('attempt_review', args=[attempt_review_data]),
        )

        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert body['disclosure_mode'] == 'score_only'
        assert body['status'] == 'released'
        assert 'summary' in body
        assert all('feedback' not in item for item in body['items'])

    def test_owner_receives_withheld_payload_when_unreleased(
        self,
        api_client,
        candidate,
        attempt_review_data,
    ):
        ReleaseControl.objects.filter(attempt_id=attempt_review_data).update(
            released=False,
            released_at=None,
            disclosure=DisclosureLevel.NONE,
        )
        auth_client(api_client, candidate)
        response = api_client.get(
            reverse('attempt_review', args=[attempt_review_data]),
        )

        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert body['disclosure_mode'] == 'withhold_until_release'
        assert body['status'] == 'withheld'
        assert 'summary' not in body
        assert 'items' not in body

    def test_other_candidate_denied(
        self,
        api_client,
        other_candidate,
        attempt_review_data,
    ):
        auth_client(api_client, other_candidate)
        response = api_client.get(
            reverse('attempt_review', args=[attempt_review_data]),
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_staff_can_view_unreleased_attempt(
        self,
        api_client,
        staff_user,
        attempt_review_data,
    ):
        ReleaseControl.objects.filter(attempt_id=attempt_review_data).update(
            released=False,
            released_at=None,
            disclosure=DisclosureLevel.NONE,
        )
        auth_client(api_client, staff_user)
        response = api_client.get(
            reverse('attempt_review', args=[attempt_review_data]),
        )

        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert body['disclosure_mode'] == 'withhold_until_release'
        assert body['status'] == 'withheld'

    def test_not_found_for_missing_attempt(self, api_client, candidate):
        auth_client(api_client, candidate)
        response = api_client.get(reverse('attempt_review', args=['missing-attempt']))
        assert response.status_code == status.HTTP_404_NOT_FOUND
