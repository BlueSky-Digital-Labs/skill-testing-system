import json

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from grading.models import ObjectiveScore, ScoringPolicy

User = get_user_model()


class GradingViewsTest(TestCase):
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
        self.policy = ScoringPolicy.objects.create(
            name='standard',
            partial_credit=True,
            negative_marking=True,
            per_option_value='0.5',
        )

    def _authenticate(self, user):
        refresh = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

    def _post_json(self, url_name, payload):
        return self.client.post(
            reverse(url_name),
            data=json.dumps(payload),
            content_type='application/json',
        )

    def test_score_mcq_requires_authentication(self):
        response = self._post_json(
            'grading_score_mcq',
            {
                'attempt_id': 'attempt-1',
                'question_id': 'question-1',
                'question_version': 1,
                'selected_option': 'A',
                'correct_option': 'A',
                'max_points': '1.00',
            },
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_score_mcq_requires_staff(self):
        self._authenticate(self.regular_user)
        response = self._post_json(
            'grading_score_mcq',
            {
                'attempt_id': 'attempt-1',
                'question_id': 'question-1',
                'question_version': 1,
                'selected_option': 'A',
                'correct_option': 'A',
                'max_points': '1.00',
            },
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_score_mcq_persists_result(self):
        self._authenticate(self.staff_user)
        response = self._post_json(
            'grading_score_mcq',
            {
                'attempt_id': 'attempt-1',
                'question_id': 'question-1',
                'question_version': 1,
                'selected_option': 'A',
                'correct_option': 'A',
                'max_points': '2.00',
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['awarded_points'], '2.00')
        self.assertTrue(response.json()['is_correct'])
        self.assertEqual(ObjectiveScore.objects.count(), 1)

    def test_score_mcq_validation_error(self):
        self._authenticate(self.staff_user)
        response = self._post_json(
            'grading_score_mcq',
            {
                'attempt_id': 'attempt-1',
                'question_id': 'question-1',
                'question_version': 0,
                'selected_option': 'A',
                'correct_option': 'B',
                'max_points': '2.00',
            },
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('question_version', response.json())

    def test_score_true_false_accepts_boolean_payload(self):
        self._authenticate(self.staff_user)
        response = self._post_json(
            'grading_score_true_false',
            {
                'attempt_id': 'attempt-1',
                'question_id': 'question-2',
                'question_version': 1,
                'selected_answer': False,
                'correct_answer': True,
                'max_points': '1.00',
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['awarded_points'], '0.00')
        self.assertFalse(response.json()['is_correct'])

    def test_score_fib_endpoint(self):
        self._authenticate(self.staff_user)
        response = self._post_json(
            'grading_score_fib',
            {
                'attempt_id': 'attempt-1',
                'question_id': 'question-3',
                'question_version': 1,
                'submitted_answer': ' Paris ',
                'accepted_answers': ['paris'],
                'max_points': '3.00',
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['awarded_points'], '3.00')
        self.assertTrue(response.json()['is_correct'])

    def test_score_multi_select_with_policy(self):
        self._authenticate(self.staff_user)
        response = self._post_json(
            'grading_score_multi_select',
            {
                'attempt_id': 'attempt-1',
                'question_id': 'question-4',
                'question_version': 1,
                'selected_options': ['A', 'C'],
                'correct_options': ['A', 'B'],
                'max_points': '4.00',
                'scoring_policy_id': str(self.policy.id),
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['awarded_points'], '0.00')
        self.assertFalse(response.json()['is_correct'])

    def test_score_multi_select_validation_error(self):
        self._authenticate(self.staff_user)
        response = self._post_json(
            'grading_score_multi_select',
            {
                'attempt_id': 'attempt-1',
                'question_id': 'question-4',
                'question_version': 1,
                'selected_options': 'A',
                'correct_options': ['A'],
                'max_points': '4.00',
            },
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('selected_options', response.json())
