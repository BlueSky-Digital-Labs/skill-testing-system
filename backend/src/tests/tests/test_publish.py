"""
Tests for test publish workflow.
"""

from __future__ import annotations

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from authentication.models import Role, RoleKey, UserRole
from question_bank.models import (
    Difficulty,
    Option,
    Question,
    QuestionType,
    QuestionVersion,
)
from tests.models import (
    QuestionLinkSource,
    Test,
    TestLifecycle,
    TestQuestionLink,
    TestSection,
)
from tests.services.publish import PublishError, publish_test

User = get_user_model()
TESTS_URL = '/api/tests/'


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def roles(db):
    defaults = {
        RoleKey.SYSTEM_ADMIN: ('System Administrator', 'Full platform administration'),
        RoleKey.EXAMINER: ('Examiner', 'Grades exams'),
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
def examiner(roles):
    user = User.objects.create_user(
        email='examiner-publish@example.com',
        password='ExamPass123!',
    )
    UserRole.objects.create(user=user, role=roles[RoleKey.EXAMINER])
    return user


def auth_client(client, user):
    token = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token.access_token}')
    return client


@pytest.fixture
def mcq_question(db, examiner):
    question = Question.objects.create(
        subject='Mathematics',
        topic='Algebra',
        difficulty=Difficulty.MEDIUM,
        type=QuestionType.MCQ,
        text='What is 2 + 2?',
        points=2,
        author=examiner,
    )
    Option.objects.create(
        question=question,
        label='A',
        value='3',
        is_correct=False,
        order=0,
    )
    Option.objects.create(
        question=question,
        label='B',
        value='4',
        is_correct=True,
        order=1,
    )
    return question


def make_draft_test(examiner, mcq_question):
    test = Test.objects.create(
        title='Algebra Quiz',
        description='Draft quiz',
        created_by=examiner,
        settings={'shuffle_questions': True},
    )
    section = TestSection.objects.create(
        test=test,
        title='Section 1',
        order=0,
    )
    TestQuestionLink.objects.create(
        section=section,
        question=mcq_question,
        order=0,
        source=QuestionLinkSource.MANUAL,
    )
    return test


@pytest.mark.django_db
class TestPublishService:
    def test_publish_creates_question_versions(self, examiner, mcq_question):
        test = make_draft_test(examiner, mcq_question)

        published = publish_test(test, created_by=examiner)

        assert published.lifecycle == TestLifecycle.PUBLISHED
        assert published.published_at is not None
        assert QuestionVersion.objects.filter(question=mcq_question).count() == 1

        link = TestQuestionLink.objects.get(section__test=test)
        assert link.question_version is not None
        assert link.question_version.version_number == 1

    def test_publish_requires_draft_state(self, examiner, mcq_question):
        test = make_draft_test(examiner, mcq_question)
        publish_test(test, created_by=examiner)

        with pytest.raises(PublishError, match='Only draft tests'):
            publish_test(test, created_by=examiner)

    def test_publish_requires_section_with_questions(self, examiner):
        test = Test.objects.create(title='Empty', created_by=examiner)
        TestSection.objects.create(test=test, title='Empty section', order=0)

        with pytest.raises(PublishError, match='must include questions'):
            publish_test(test, created_by=examiner)


@pytest.mark.django_db
class TestPublishAPI:
    def test_publish_endpoint(self, api_client, examiner, mcq_question):
        test = make_draft_test(examiner, mcq_question)
        client = auth_client(api_client, examiner)

        response = client.post(f'{TESTS_URL}{test.id}/publish/')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['lifecycle'] == TestLifecycle.PUBLISHED
        assert response.data['sections'][0]['question_links'][0]['version_number'] == 1

    def test_patch_blocked_after_publish(self, api_client, examiner, mcq_question):
        test = make_draft_test(examiner, mcq_question)
        publish_test(test, created_by=examiner)
        client = auth_client(api_client, examiner)

        response = client.patch(
            f'{TESTS_URL}{test.id}/',
            {'title': 'Renamed'},
            format='json',
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_archive_published_test(self, api_client, examiner, mcq_question):
        test = make_draft_test(examiner, mcq_question)
        publish_test(test, created_by=examiner)
        client = auth_client(api_client, examiner)

        response = client.post(f'{TESTS_URL}{test.id}/archive/')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['lifecycle'] == TestLifecycle.ARCHIVED
