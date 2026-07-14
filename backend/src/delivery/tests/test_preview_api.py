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
from core.models import Assignment, AssignmentStatus
from delivery.services.attempts import user_uuid
from question_bank.models import (
    BlankAnswerKey,
    Difficulty,
    Option,
    Question,
    QuestionType,
)

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def roles(db):
    defaults = {
        RoleKey.CANDIDATE: ('Candidate', 'Takes exams'),
        RoleKey.EXAMINER: ('Examiner', 'Authors and grades tests'),
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
def examiner(roles):
    user = User.objects.create_user(
        email='preview-examiner@example.com',
        password='ExamPass123!',
    )
    UserRole.objects.create(user=user, role=roles[RoleKey.EXAMINER])
    return user


@pytest.fixture
def candidate(roles):
    user = User.objects.create_user(
        email='preview-candidate@example.com',
        password='CandPass123!',
    )
    UserRole.objects.create(user=user, role=roles[RoleKey.CANDIDATE])
    return user


@pytest.fixture
def test_id():
    return uuid.uuid4()


@pytest.fixture
def questions(test_id, examiner, db):
    mcq = Question.objects.create(
        subject='Preview',
        topic='API',
        text='Pick Alpha',
        difficulty=Difficulty.EASY,
        type=QuestionType.MCQ,
        points=2,
        author=examiner,
        metadata={'test_id': str(test_id)},
    )
    Option.objects.create(
        question=mcq,
        label='A',
        value='Alpha',
        is_correct=True,
        order=0,
    )
    Option.objects.create(
        question=mcq,
        label='B',
        value='Beta',
        is_correct=False,
        order=1,
    )

    fib = Question.objects.create(
        subject='Preview',
        topic='API',
        text='Fill blank',
        difficulty=Difficulty.EASY,
        type=QuestionType.FILL_IN_BLANK,
        points=1,
        author=examiner,
        metadata={'test_id': str(test_id)},
    )
    BlankAnswerKey.objects.create(question=fib, answer='Paris')

    return [mcq, fib]


@pytest.fixture
def assignment(examiner, test_id):
    now = timezone.now()
    return Assignment.objects.create(
        test_id=test_id,
        assignee_user_id=user_uuid(examiner.id),
        created_by_user_id=user_uuid(examiner.id),
        opens_at=now - timedelta(hours=1),
        closes_at=now + timedelta(hours=2),
        max_attempts=1,
        shuffle_questions=True,
        shuffle_options=True,
        status=AssignmentStatus.ACTIVE,
    )


def auth_client(client, user):
    token = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token.access_token}')
    return client


@pytest.mark.django_db
class TestPreviewAPI:
    def test_start_requires_auth(self, api_client, test_id):
        response = api_client.post(
            reverse('preview_start', kwargs={'test_id': test_id}),
            {},
            format='json',
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_start_forbidden_for_candidate(
        self,
        api_client,
        candidate,
        test_id,
        questions,
    ):
        client = auth_client(api_client, candidate)
        response = client.post(
            reverse('preview_start', kwargs={'test_id': test_id}),
            {},
            format='json',
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_start_returns_preview_payload(
        self,
        api_client,
        examiner,
        test_id,
        questions,
        assignment,
    ):
        client = auth_client(api_client, examiner)
        response = client.post(
            reverse('preview_start', kwargs={'test_id': test_id}),
            {'seed': 42},
            format='json',
        )

        assert response.status_code == status.HTTP_201_CREATED
        payload = response.json()
        assert payload['preview'] is True
        assert payload['test_id'] == str(test_id)
        assert payload['seed'] == 42
        assert payload['status'] == 'in_progress'
        assert len(payload['question_id_order']) == 2
        assert payload['answers'] == {}

    def test_start_is_deterministic_with_seed(
        self,
        api_client,
        examiner,
        test_id,
        questions,
        assignment,
    ):
        client = auth_client(api_client, examiner)

        first = client.post(
            reverse('preview_start', kwargs={'test_id': test_id}),
            {'seed': 99},
            format='json',
        ).json()
        second = client.post(
            reverse('preview_start', kwargs={'test_id': test_id}),
            {'seed': 99},
            format='json',
        ).json()

        assert first['question_id_order'] == second['question_id_order']
        assert first['option_id_orders'] == second['option_id_orders']

    def test_start_not_found_without_questions(self, api_client, examiner):
        missing_test_id = uuid.uuid4()
        client = auth_client(api_client, examiner)
        response = client.post(
            reverse('preview_start', kwargs={'test_id': missing_test_id}),
            {},
            format='json',
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_answer_requires_active_session(
        self,
        api_client,
        examiner,
        test_id,
        questions,
    ):
        client = auth_client(api_client, examiner)
        response = client.post(
            reverse('preview_answer', kwargs={'test_id': test_id}),
            {
                'question_id': str(questions[0].id),
                'answer': {'selected_option': 'A'},
            },
            format='json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_answer_validates_and_scores(
        self,
        api_client,
        examiner,
        test_id,
        questions,
        assignment,
    ):
        client = auth_client(api_client, examiner)
        client.post(
            reverse('preview_start', kwargs={'test_id': test_id}),
            {'seed': 1},
            format='json',
        )

        response = client.post(
            reverse('preview_answer', kwargs={'test_id': test_id}),
            {
                'question_id': str(questions[0].id),
                'answer': {'selected_option': 'A'},
            },
            format='json',
        )

        assert response.status_code == status.HTTP_200_OK
        payload = response.json()
        assert payload['accepted'] is True
        assert payload['validation']['valid'] is True
        assert payload['partial_score']['is_correct'] is True
        assert payload['partial_score']['awarded_points'] == '2.00'

    def test_answer_rejects_invalid_payload(
        self,
        api_client,
        examiner,
        test_id,
        questions,
        assignment,
    ):
        client = auth_client(api_client, examiner)
        client.post(
            reverse('preview_start', kwargs={'test_id': test_id}),
            {},
            format='json',
        )

        response = client.post(
            reverse('preview_answer', kwargs={'test_id': test_id}),
            {
                'question_id': str(questions[0].id),
                'answer': {'selected_option': 123},
            },
            format='json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_finish_returns_mocked_scores(
        self,
        api_client,
        examiner,
        test_id,
        questions,
        assignment,
    ):
        client = auth_client(api_client, examiner)
        client.post(
            reverse('preview_start', kwargs={'test_id': test_id}),
            {'seed': 1},
            format='json',
        )
        client.post(
            reverse('preview_answer', kwargs={'test_id': test_id}),
            {
                'question_id': str(questions[0].id),
                'answer': {'selected_option': 'A'},
            },
            format='json',
        )
        client.post(
            reverse('preview_answer', kwargs={'test_id': test_id}),
            {
                'question_id': str(questions[1].id),
                'answer': 'Paris',
            },
            format='json',
        )

        response = client.post(
            reverse('preview_finish', kwargs={'test_id': test_id}),
            format='json',
        )

        assert response.status_code == status.HTTP_200_OK
        payload = response.json()
        assert payload['preview'] is True
        assert payload['total_auto_score'] == '3.00'
        assert len(payload['per_question']) == 2
        assert payload['per_question'][str(questions[0].id)]['answered'] is True
        assert payload['per_question'][str(questions[1].id)]['answered'] is True

    def test_finish_clears_session(
        self,
        api_client,
        examiner,
        test_id,
        questions,
        assignment,
    ):
        client = auth_client(api_client, examiner)
        client.post(
            reverse('preview_start', kwargs={'test_id': test_id}),
            {},
            format='json',
        )
        client.post(
            reverse('preview_finish', kwargs={'test_id': test_id}),
            format='json',
        )

        response = client.post(
            reverse('preview_finish', kwargs={'test_id': test_id}),
            format='json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_no_attempt_persisted(
        self,
        api_client,
        examiner,
        test_id,
        questions,
        assignment,
    ):
        from delivery.models import Attempt

        client = auth_client(api_client, examiner)
        client.post(
            reverse('preview_start', kwargs={'test_id': test_id}),
            {},
            format='json',
        )
        client.post(
            reverse('preview_answer', kwargs={'test_id': test_id}),
            {
                'question_id': str(questions[0].id),
                'answer': {'selected_option': 'A'},
            },
            format='json',
        )
        client.post(
            reverse('preview_finish', kwargs={'test_id': test_id}),
            format='json',
        )

        assert Attempt.objects.count() == 0
