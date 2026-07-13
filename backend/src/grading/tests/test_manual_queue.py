import json

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from grading.models import FreeTextQueueItem, ManualGrade

User = get_user_model()


class ManualGradingQueueTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.staff_user = User.objects.create_user(
            email='grader@example.com',
            password='SecurePass123!',
            is_staff=True,
        )
        self.regular_user = User.objects.create_user(
            email='student@example.com',
            password='SecurePass123!',
        )

    def _authenticate(self, user):
        refresh = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

    def _post_json(self, url_name, payload, **kwargs):
        return self.client.post(
            reverse(url_name),
            data=json.dumps(payload),
            content_type='application/json',
            **kwargs,
        )

    def test_enqueue_free_text_requires_staff(self):
        response = self._post_json(
            'grading_enqueue_free_text',
            {
                'attempt_id': 'attempt-1',
                'test_id': 'test-1',
                'question_id': 'question-1',
                'response_text': 'My answer',
                'max_points': '5.00',
                'topic': 'essay',
            },
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_enqueue_and_list_free_text_item(self):
        self._authenticate(self.staff_user)
        enqueue_response = self._post_json(
            'grading_enqueue_free_text',
            {
                'attempt_id': 'attempt-1',
                'test_id': 'test-1',
                'question_id': 'question-1',
                'question_version': '2',
                'candidate_display': 'Jane Candidate',
                'blind_marking': False,
                'response_text': 'My detailed answer.',
                'max_points': '5.00',
                'topic': 'essay',
            },
        )

        self.assertEqual(enqueue_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(enqueue_response.json()['status'], 'queued')
        self.assertEqual(enqueue_response.json()['candidate_display'], 'Jane Candidate')

        list_response = self.client.get(reverse('grading_queue_list'))
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(list_response.json()['count'], 1)
        self.assertEqual(list_response.json()['results'][0]['response_text'], 'My detailed answer.')

    def test_blind_marking_masks_candidate_display(self):
        self._authenticate(self.staff_user)
        enqueue_response = self._post_json(
            'grading_enqueue_free_text',
            {
                'attempt_id': 'attempt-2',
                'test_id': 'test-1',
                'question_id': 'question-2',
                'candidate_display': 'Hidden Candidate',
                'blind_marking': True,
                'response_text': 'Blind response.',
                'max_points': '10.00',
                'topic': 'analysis',
            },
        )

        self.assertEqual(enqueue_response.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(enqueue_response.json()['candidate_display'])
        self.assertTrue(enqueue_response.json()['blind_marking'])

        list_response = self.client.get(reverse('grading_queue_list'), {'status': 'queued'})
        self.assertIsNone(list_response.json()['results'][0]['candidate_display'])

    def test_manual_grade_flow(self):
        self._authenticate(self.staff_user)
        queue_item = FreeTextQueueItem.objects.create(
            attempt_id='attempt-3',
            test_id='test-1',
            question_id='question-3',
            response_text='Answer text',
            max_points='8.00',
            topic='essay',
        )

        grade_response = self._post_json(
            'grading_manual_grade',
            {
                'queue_item_id': str(queue_item.id),
                'awarded_points': '6.50',
                'feedback': 'Strong answer with minor gaps.',
            },
        )

        self.assertEqual(grade_response.status_code, status.HTTP_200_OK)
        self.assertEqual(grade_response.json()['status'], 'graded')
        self.assertEqual(grade_response.json()['manual_grade']['awarded_points'], '6.50')
        self.assertEqual(
            grade_response.json()['manual_grade']['grader_user_id'],
            self.staff_user.id,
        )
        self.assertEqual(ManualGrade.objects.count(), 1)

    def test_manual_grade_rejects_already_graded_item(self):
        self._authenticate(self.staff_user)
        queue_item = FreeTextQueueItem.objects.create(
            attempt_id='attempt-4',
            test_id='test-1',
            question_id='question-4',
            response_text='Answer text',
            max_points='5.00',
            topic='essay',
            status=FreeTextQueueItem.STATUS_GRADED,
        )

        response = self._post_json(
            'grading_manual_grade',
            {
                'queue_item_id': str(queue_item.id),
                'awarded_points': '4.00',
            },
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('queue_item_id', response.json())

    def test_manual_grade_rejects_excess_points(self):
        self._authenticate(self.staff_user)
        queue_item = FreeTextQueueItem.objects.create(
            attempt_id='attempt-5',
            test_id='test-1',
            question_id='question-5',
            response_text='Answer text',
            max_points='5.00',
            topic='essay',
        )

        response = self._post_json(
            'grading_manual_grade',
            {
                'queue_item_id': str(queue_item.id),
                'awarded_points': '6.00',
            },
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('awarded_points', response.json())

    def test_queue_list_filters_by_status(self):
        self._authenticate(self.staff_user)
        FreeTextQueueItem.objects.create(
            attempt_id='attempt-6',
            test_id='test-1',
            question_id='question-6',
            response_text='Queued answer',
            max_points='5.00',
            topic='essay',
            status=FreeTextQueueItem.STATUS_QUEUED,
        )
        FreeTextQueueItem.objects.create(
            attempt_id='attempt-7',
            test_id='test-1',
            question_id='question-7',
            response_text='Graded answer',
            max_points='5.00',
            topic='essay',
            status=FreeTextQueueItem.STATUS_GRADED,
        )

        response = self.client.get(reverse('grading_queue_list'), {'status': 'queued'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['count'], 1)
        self.assertEqual(response.json()['results'][0]['status'], 'queued')
