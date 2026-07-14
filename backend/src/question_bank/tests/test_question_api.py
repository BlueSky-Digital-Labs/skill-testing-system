"""
Tests for question bank APIs.
"""

from __future__ import annotations

import io

import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from authentication.models import Role, RoleKey, UserRole
from question_bank.models import Difficulty, Question, QuestionType

User = get_user_model()
QUESTIONS_URL = '/api/question-bank/questions/'


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
        email='examiner@example.com',
        password='ExamPass123!',
    )
    UserRole.objects.create(user=user, role=roles[RoleKey.EXAMINER])
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


def make_mcq_payload(**overrides):
    payload = {
        'subject': 'Mathematics',
        'topic': 'Algebra',
        'difficulty': Difficulty.MEDIUM,
        'type': QuestionType.MCQ,
        'text': 'What is 2 + 2?',
        'points': 2,
        'metadata': {'source': 'unit-test'},
        'options': [
            {'label': 'A', 'value': '3', 'is_correct': False, 'order': 0},
            {'label': 'B', 'value': '4', 'is_correct': True, 'order': 1},
            {'label': 'C', 'value': '5', 'is_correct': False, 'order': 2},
        ],
    }
    payload.update(overrides)
    return payload


def make_test_image(name='question.png'):
    image_buffer = io.BytesIO()
    Image.new('RGB', (8, 8), color='blue').save(image_buffer, format='PNG')
    image_buffer.seek(0)
    return SimpleUploadedFile(name, image_buffer.read(), content_type='image/png')


@pytest.mark.django_db
class TestQuestionCRUD:
    def test_examiner_can_create_mcq(self, api_client, examiner):
        client = auth_client(api_client, examiner)
        response = client.post(QUESTIONS_URL, make_mcq_payload(), format='json')

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['subject'] == 'Mathematics'
        assert response.data['author'] == examiner.pk
        assert len(response.data['options']) == 3
        assert Question.objects.count() == 1

    def test_examiner_can_list_and_retrieve(self, api_client, examiner):
        client = auth_client(api_client, examiner)
        create_response = client.post(QUESTIONS_URL, make_mcq_payload(), format='json')
        question_id = create_response.data['id']

        list_response = client.get(QUESTIONS_URL)
        assert list_response.status_code == status.HTTP_200_OK
        assert list_response.data['count'] == 1

        detail_response = client.get(f'{QUESTIONS_URL}{question_id}/')
        assert detail_response.status_code == status.HTTP_200_OK
        assert detail_response.data['text'] == 'What is 2 + 2?'

    def test_examiner_can_update_question(self, api_client, examiner):
        client = auth_client(api_client, examiner)
        create_response = client.post(QUESTIONS_URL, make_mcq_payload(), format='json')
        question_id = create_response.data['id']

        update_response = client.patch(
            f'{QUESTIONS_URL}{question_id}/',
            {'text': 'Updated question text'},
            format='json',
        )
        assert update_response.status_code == status.HTTP_200_OK
        assert update_response.data['text'] == 'Updated question text'

    def test_examiner_can_delete_question(self, api_client, examiner):
        client = auth_client(api_client, examiner)
        create_response = client.post(QUESTIONS_URL, make_mcq_payload(), format='json')
        question_id = create_response.data['id']

        delete_response = client.delete(f'{QUESTIONS_URL}{question_id}/')
        assert delete_response.status_code == status.HTTP_204_NO_CONTENT
        assert Question.objects.count() == 0

    def test_system_admin_can_modify_questions(self, api_client, system_admin):
        client = auth_client(api_client, system_admin)
        response = client.post(QUESTIONS_URL, make_mcq_payload(), format='json')
        assert response.status_code == status.HTTP_201_CREATED


@pytest.mark.django_db
class TestQuestionTypeValidation:
    def test_mcq_requires_exactly_one_correct_option(self, api_client, examiner):
        client = auth_client(api_client, examiner)
        payload = make_mcq_payload(
            options=[
                {'label': 'A', 'value': '3', 'is_correct': False, 'order': 0},
                {'label': 'B', 'value': '4', 'is_correct': False, 'order': 1},
            ],
        )
        response = client.post(QUESTIONS_URL, payload, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'options' in response.data

    def test_mcq_rejects_multiple_correct_options(self, api_client, examiner):
        client = auth_client(api_client, examiner)
        payload = make_mcq_payload(
            options=[
                {'label': 'A', 'value': '3', 'is_correct': True, 'order': 0},
                {'label': 'B', 'value': '4', 'is_correct': True, 'order': 1},
            ],
        )
        response = client.post(QUESTIONS_URL, payload, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'options' in response.data

    def test_multi_select_requires_at_least_one_correct_option(self, api_client, examiner):
        client = auth_client(api_client, examiner)
        payload = make_mcq_payload(
            type=QuestionType.MULTI_SELECT,
            options=[
                {'label': 'A', 'value': 'Red', 'is_correct': False, 'order': 0},
                {'label': 'B', 'value': 'Blue', 'is_correct': False, 'order': 1},
            ],
        )
        response = client.post(QUESTIONS_URL, payload, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'options' in response.data

    def test_true_false_requires_two_options(self, api_client, examiner):
        client = auth_client(api_client, examiner)
        payload = make_mcq_payload(
            type=QuestionType.TRUE_FALSE,
            text='The sky is blue.',
            options=[
                {'label': 'T', 'value': 'True', 'is_correct': True, 'order': 0},
            ],
        )
        response = client.post(QUESTIONS_URL, payload, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'options' in response.data

    def test_fill_in_blank_requires_blank_answer_keys(self, api_client, examiner):
        client = auth_client(api_client, examiner)
        payload = {
            'subject': 'Science',
            'topic': 'Biology',
            'difficulty': Difficulty.EASY,
            'type': QuestionType.FILL_IN_BLANK,
            'text': 'Water is made of hydrogen and ____.',
            'points': 1,
            'blank_answer_keys': [],
        }
        response = client.post(QUESTIONS_URL, payload, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'blank_answer_keys' in response.data

    def test_fill_in_blank_rejects_options(self, api_client, examiner):
        client = auth_client(api_client, examiner)
        payload = {
            'subject': 'Science',
            'topic': 'Biology',
            'difficulty': Difficulty.EASY,
            'type': QuestionType.FILL_IN_BLANK,
            'text': 'Water is made of hydrogen and ____.',
            'points': 1,
            'blank_answer_keys': [{'answer': 'oxygen', 'case_sensitive': False}],
            'options': [
                {'label': 'A', 'value': 'oxygen', 'is_correct': True, 'order': 0},
            ],
        }
        response = client.post(QUESTIONS_URL, payload, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'options' in response.data

    def test_free_text_rejects_nested_fields(self, api_client, examiner):
        client = auth_client(api_client, examiner)
        payload = {
            'subject': 'English',
            'topic': 'Essays',
            'difficulty': Difficulty.HARD,
            'type': QuestionType.FREE_TEXT,
            'text': 'Describe your favorite book.',
            'points': 10,
            'options': [
                {'label': 'A', 'value': 'N/A', 'is_correct': False, 'order': 0},
                {'label': 'B', 'value': 'N/A2', 'is_correct': True, 'order': 1},
            ],
        }
        response = client.post(QUESTIONS_URL, payload, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'options' in response.data


@pytest.mark.django_db
class TestQuestionFiltering:
    def test_filter_by_subject_topic_difficulty_and_type(self, api_client, examiner):
        client = auth_client(api_client, examiner)
        client.post(QUESTIONS_URL, make_mcq_payload(), format='json')
        client.post(
            QUESTIONS_URL,
            make_mcq_payload(
                subject='Physics',
                topic='Motion',
                difficulty=Difficulty.HARD,
                type=QuestionType.MULTI_SELECT,
                options=[
                    {'label': 'A', 'value': 'Speed', 'is_correct': True, 'order': 0},
                    {'label': 'B', 'value': 'Color', 'is_correct': False, 'order': 1},
                ],
            ),
            format='json',
        )

        filtered = client.get(
            f'{QUESTIONS_URL}?subject=Physics&topic=Motion&difficulty={Difficulty.HARD}&type={QuestionType.MULTI_SELECT}',
        )
        assert filtered.status_code == status.HTTP_200_OK
        assert filtered.data['count'] == 1
        assert filtered.data['results'][0]['subject'] == 'Physics'


@pytest.mark.django_db
class TestQuestionPermissions:
    def test_unauthenticated_requests_are_rejected(self, api_client):
        response = api_client.get(QUESTIONS_URL)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_candidate_can_read_but_not_modify(self, api_client, candidate, examiner):
        examiner_client = auth_client(APIClient(), examiner)
        create_response = examiner_client.post(
            QUESTIONS_URL,
            make_mcq_payload(),
            format='json',
        )
        question_id = create_response.data['id']

        candidate_client = auth_client(api_client, candidate)
        list_response = candidate_client.get(QUESTIONS_URL)
        assert list_response.status_code == status.HTTP_200_OK

        create_response = candidate_client.post(
            QUESTIONS_URL,
            make_mcq_payload(),
            format='json',
        )
        assert create_response.status_code == status.HTTP_403_FORBIDDEN

        update_response = candidate_client.patch(
            f'{QUESTIONS_URL}{question_id}/',
            {'text': 'Candidate edit attempt'},
            format='json',
        )
        assert update_response.status_code == status.HTTP_403_FORBIDDEN

        delete_response = candidate_client.delete(f'{QUESTIONS_URL}{question_id}/')
        assert delete_response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestQuestionImageUpload:
    def test_examiner_can_upload_image(self, api_client, examiner):
        client = auth_client(api_client, examiner)
        create_response = client.post(QUESTIONS_URL, make_mcq_payload(), format='json')
        question_id = create_response.data['id']

        upload_response = client.post(
            f'{QUESTIONS_URL}{question_id}/upload-image/',
            {'image': make_test_image()},
            format='multipart',
        )
        assert upload_response.status_code == status.HTTP_200_OK
        assert upload_response.data['image']

    def test_upload_image_requires_file(self, api_client, examiner):
        client = auth_client(api_client, examiner)
        create_response = client.post(QUESTIONS_URL, make_mcq_payload(), format='json')
        question_id = create_response.data['id']

        upload_response = client.post(
            f'{QUESTIONS_URL}{question_id}/upload-image/',
            {},
            format='multipart',
        )
        assert upload_response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'image' in upload_response.data

    def test_candidate_cannot_upload_image(self, api_client, candidate, examiner):
        examiner_client = auth_client(APIClient(), examiner)
        create_response = examiner_client.post(
            QUESTIONS_URL,
            make_mcq_payload(),
            format='json',
        )
        question_id = create_response.data['id']

        candidate_client = auth_client(api_client, candidate)
        upload_response = candidate_client.post(
            f'{QUESTIONS_URL}{question_id}/upload-image/',
            {'image': make_test_image()},
            format='multipart',
        )
        assert upload_response.status_code == status.HTTP_403_FORBIDDEN
