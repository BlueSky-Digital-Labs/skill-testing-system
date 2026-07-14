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
from delivery.models import Attempt, AttemptAnswer, AttemptStatus
from delivery.services.attempts import user_uuid
from question_bank.models import Difficulty, Option, Question, QuestionType

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def roles(db):
    defaults = {
        RoleKey.CANDIDATE: ('Candidate', 'Takes exams'),
        RoleKey.COORDINATOR: ('Coordinator', 'Coordinates exam sessions'),
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
def candidate(roles):
    user = User.objects.create_user(
        email='delivery-candidate@example.com',
        password='CandPass123!',
    )
    UserRole.objects.create(user=user, role=roles[RoleKey.CANDIDATE])
    return user


@pytest.fixture
def other_candidate(roles):
    user = User.objects.create_user(
        email='delivery-other@example.com',
        password='OtherPass123!',
    )
    UserRole.objects.create(user=user, role=roles[RoleKey.CANDIDATE])
    return user


@pytest.fixture
def test_id():
    return uuid.uuid4()


@pytest.fixture
def questions(test_id, db):
    created = []
    for index in range(2):
        question = Question.objects.create(
            subject='Delivery',
            topic='API',
            text=f'Question {index + 1}',
            difficulty=Difficulty.EASY,
            type=QuestionType.MCQ,
            points=1,
            metadata={'test_id': str(test_id)},
        )
        Option.objects.create(
            question=question,
            label='A',
            value='Alpha',
            is_correct=True,
            order=0,
        )
        Option.objects.create(
            question=question,
            label='B',
            value='Beta',
            is_correct=False,
            order=1,
        )
        created.append(question)
    return created


@pytest.fixture
def assignment(candidate, test_id):
    now = timezone.now()
    return Assignment.objects.create(
        test_id=test_id,
        assignee_user_id=user_uuid(candidate.id),
        created_by_user_id=user_uuid(candidate.id),
        opens_at=now - timedelta(hours=1),
        closes_at=now + timedelta(hours=2),
        max_attempts=2,
        shuffle_questions=False,
        shuffle_options=False,
        status=AssignmentStatus.ACTIVE,
    )


@pytest.fixture
def group_assignment(candidate, test_id, questions):
    now = timezone.now()
    group = CandidateGroup.objects.create(name='Delivery test group')
    group.members.add(candidate)
    return Assignment.objects.create(
        test_id=test_id,
        assignee_group_id=group.id,
        created_by_user_id=user_uuid(candidate.id),
        opens_at=now - timedelta(hours=1),
        closes_at=now + timedelta(hours=2),
        max_attempts=1,
        shuffle_questions=False,
        shuffle_options=False,
        status=AssignmentStatus.ACTIVE,
    )


def auth_client(client, user):
    token = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token.access_token}')
    return client


@pytest.mark.django_db
class TestAttemptDeliveryAPI:
    def test_start_requires_auth(self, api_client, assignment):
        response = api_client.post(
            reverse('attempt_start'),
            {'assignment_id': str(assignment.id)},
            format='json',
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_start_creates_attempt_with_order_and_timing(
        self,
        api_client,
        candidate,
        assignment,
        questions,
    ):
        client = auth_client(api_client, candidate)
        response = client.post(
            reverse('attempt_start'),
            {'assignment_id': str(assignment.id)},
            format='json',
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['assignment_id'] == str(assignment.id)
        assert response.data['candidate_id'] == candidate.id
        assert response.data['status'] == AttemptStatus.IN_PROGRESS
        assert len(response.data['question_id_order']) == 2
        assert response.data['remaining_time_seconds'] > 0
        assert Attempt.objects.filter(
            assignment=assignment,
            candidate_id=candidate.id,
        ).exists()

    def test_start_is_idempotent_for_in_progress_attempt(
        self,
        api_client,
        candidate,
        assignment,
        questions,
    ):
        client = auth_client(api_client, candidate)
        first = client.post(
            reverse('attempt_start'),
            {'assignment_id': str(assignment.id)},
            format='json',
        )
        second = client.post(
            reverse('attempt_start'),
            {'assignment_id': str(assignment.id)},
            format='json',
        )

        assert first.status_code == status.HTTP_201_CREATED
        assert second.status_code == status.HTTP_201_CREATED
        assert first.data['id'] == second.data['id']

    def test_start_rejects_unassigned_candidate(
        self,
        api_client,
        other_candidate,
        assignment,
        questions,
    ):
        client = auth_client(api_client, other_candidate)
        response = client.post(
            reverse('attempt_start'),
            {'assignment_id': str(assignment.id)},
            format='json',
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_save_and_resume_persist_answers(
        self,
        api_client,
        candidate,
        assignment,
        questions,
    ):
        client = auth_client(api_client, candidate)
        started = client.post(
            reverse('attempt_start'),
            {'assignment_id': str(assignment.id)},
            format='json',
        )
        attempt_id = started.data['id']
        question_id = started.data['question_id_order'][0]

        save_response = client.put(
            reverse('attempt_save', args=[attempt_id]),
            {
                'answers': [
                    {
                        'question_id': question_id,
                        'question_version': 1,
                        'response': {'selected_option': 'A'},
                    }
                ]
            },
            format='json',
        )
        assert save_response.status_code == status.HTTP_200_OK
        assert question_id in save_response.data['answers']

        resume_response = client.get(reverse('attempt_resume', args=[attempt_id]))
        assert resume_response.status_code == status.HTTP_200_OK
        assert resume_response.data['answers'][question_id]['response'] == {
            'selected_option': 'A',
        }
        assert AttemptAnswer.objects.filter(attempt_id=attempt_id).count() == 1

    def test_save_rejects_foreign_question(
        self,
        api_client,
        candidate,
        assignment,
        questions,
    ):
        client = auth_client(api_client, candidate)
        started = client.post(
            reverse('attempt_start'),
            {'assignment_id': str(assignment.id)},
            format='json',
        )
        attempt_id = started.data['id']

        response = client.put(
            reverse('attempt_save', args=[attempt_id]),
            {
                'answers': [
                    {
                        'question_id': str(uuid.uuid4()),
                        'question_version': 1,
                        'response': {'selected_option': 'A'},
                    }
                ]
            },
            format='json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_submit_marks_attempt_submitted(
        self,
        api_client,
        candidate,
        assignment,
        questions,
    ):
        client = auth_client(api_client, candidate)
        started = client.post(
            reverse('attempt_start'),
            {'assignment_id': str(assignment.id)},
            format='json',
        )
        attempt_id = started.data['id']

        submit_response = client.post(reverse('attempt_submit', args=[attempt_id]))
        assert submit_response.status_code == status.HTTP_200_OK
        assert submit_response.data['status'] == AttemptStatus.SUBMITTED
        assert submit_response.data['submitted_at'] is not None

        resume_response = client.get(reverse('attempt_resume', args=[attempt_id]))
        assert resume_response.status_code == status.HTTP_409_CONFLICT

    def test_resume_rejects_other_candidate(
        self,
        api_client,
        candidate,
        other_candidate,
        assignment,
        questions,
    ):
        owner_client = auth_client(api_client, candidate)
        started = owner_client.post(
            reverse('attempt_start'),
            {'assignment_id': str(assignment.id)},
            format='json',
        )
        attempt_id = started.data['id']

        other_client = auth_client(APIClient(), other_candidate)
        response = other_client.get(reverse('attempt_resume', args=[attempt_id]))
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_expired_attempt_cannot_be_saved(
        self,
        api_client,
        candidate,
        assignment,
        questions,
    ):
        client = auth_client(api_client, candidate)
        started = client.post(
            reverse('attempt_start'),
            {'assignment_id': str(assignment.id)},
            format='json',
        )
        attempt_id = started.data['id']
        Attempt.objects.filter(pk=attempt_id).update(
            expires_at=timezone.now() - timedelta(minutes=1),
        )

        response = client.put(
            reverse('attempt_save', args=[attempt_id]),
            {
                'answers': [
                    {
                        'question_id': started.data['question_id_order'][0],
                        'question_version': 1,
                        'response': {'selected_option': 'A'},
                    }
                ]
            },
            format='json',
        )
        assert response.status_code == status.HTTP_410_GONE


@pytest.mark.django_db
class TestAutoSubmitCommand:
    def test_auto_submit_due_attempts(self, candidate, assignment, questions):
        from django.core.management import call_command

        from delivery.services.randomization import initialize_attempt_order

        now = timezone.now()
        attempt = Attempt.objects.create(
            assignment=assignment,
            candidate_id=candidate.id,
            test_id=assignment.test_id,
            time_limit_seconds=60,
            expires_at=now - timedelta(minutes=5),
        )
        initialize_attempt_order(
            attempt,
            question_ids=[str(question.id) for question in questions],
            option_ids_by_question={
                str(question.id): [str(option.id) for option in question.options.all()]
                for question in questions
            },
            shuffle_questions=False,
            shuffle_options=False,
        )

        call_command('auto_submit_due_attempts')
        attempt.refresh_from_db()
        assert attempt.status == AttemptStatus.AUTO_SUBMITTED
        assert attempt.submitted_at is not None
