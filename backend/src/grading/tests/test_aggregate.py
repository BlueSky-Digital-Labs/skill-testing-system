import json
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from grading.aggregates import compile_attempt_scores
from grading.config import TestConfigSnapshot
from grading.models import CombinedResult, FreeTextQueueItem, ManualGrade, ObjectiveScore

User = get_user_model()


class AggregateScoresTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.staff_user = User.objects.create_user(
            email='grader@example.com',
            password='SecurePass123!',
            is_staff=True,
        )
        TestConfigSnapshot.objects.create(
            test_id='test-1',
            passing_score=Decimal('70.00'),
            pass_type=TestConfigSnapshot.PASS_TYPE_PERCENT,
        )

    def _authenticate(self):
        refresh = RefreshToken.for_user(self.staff_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

    def _post_json(self, url_name, payload):
        return self.client.post(
            reverse(url_name),
            data=json.dumps(payload),
            content_type='application/json',
        )

    def test_compile_attempt_scores_combines_objective_and_manual(self):
        ObjectiveScore.objects.create(
            attempt_id='attempt-1',
            question_id='q-objective',
            question_version=1,
            question_type='mcq',
            awarded_points=Decimal('4.00'),
            max_points=Decimal('5.00'),
            is_correct=True,
            detail={'topic': 'math'},
        )
        queue_item = FreeTextQueueItem.objects.create(
            attempt_id='attempt-1',
            test_id='test-1',
            question_id='q-free-text',
            response_text='Essay answer',
            max_points=Decimal('10.00'),
            topic='essay',
            status=FreeTextQueueItem.STATUS_GRADED,
        )
        ManualGrade.objects.create(
            queue_item=queue_item,
            grader_user_id=1,
            awarded_points=Decimal('8.00'),
        )

        compiled = compile_attempt_scores('attempt-1')

        self.assertEqual(compiled['test_id'], 'test-1')
        self.assertEqual(compiled['total_awarded'], Decimal('12.00'))
        self.assertEqual(compiled['total_max'], Decimal('15.00'))
        self.assertEqual(compiled['by_topic']['math']['awarded'], Decimal('4.00'))
        self.assertEqual(compiled['by_topic']['essay']['awarded'], Decimal('8.00'))
        self.assertTrue(compiled['passed'])

    def test_compile_attempt_scores_absolute_pass_type(self):
        TestConfigSnapshot.objects.create(
            test_id='test-absolute',
            passing_score=Decimal('10.00'),
            pass_type=TestConfigSnapshot.PASS_TYPE_ABSOLUTE,
        )
        queue_item = FreeTextQueueItem.objects.create(
            attempt_id='attempt-absolute',
            test_id='test-absolute',
            question_id='q-1',
            response_text='Answer',
            max_points=Decimal('15.00'),
            topic='essay',
            status=FreeTextQueueItem.STATUS_GRADED,
        )
        ManualGrade.objects.create(
            queue_item=queue_item,
            grader_user_id=1,
            awarded_points=Decimal('12.00'),
        )

        compiled = compile_attempt_scores('attempt-absolute')

        self.assertTrue(compiled['passed'])

    def test_compile_attempt_scores_fails_without_config(self):
        queue_item = FreeTextQueueItem.objects.create(
            attempt_id='attempt-no-config',
            test_id='missing-test',
            question_id='q-1',
            response_text='Answer',
            max_points=Decimal('5.00'),
            topic='essay',
            status=FreeTextQueueItem.STATUS_GRADED,
        )
        ManualGrade.objects.create(
            queue_item=queue_item,
            grader_user_id=1,
            awarded_points=Decimal('5.00'),
        )

        compiled = compile_attempt_scores('attempt-no-config')

        self.assertFalse(compiled['passed'])

    def test_aggregate_attempt_endpoint_persists_combined_result(self):
        self._authenticate()
        ObjectiveScore.objects.create(
            attempt_id='attempt-api',
            question_id='q-objective',
            question_version=1,
            question_type='mcq',
            awarded_points=Decimal('3.00'),
            max_points=Decimal('5.00'),
            is_correct=True,
            detail={},
        )
        queue_item = FreeTextQueueItem.objects.create(
            attempt_id='attempt-api',
            test_id='test-1',
            question_id='q-free-text',
            response_text='Essay answer',
            max_points=Decimal('10.00'),
            topic='essay',
            status=FreeTextQueueItem.STATUS_GRADED,
        )
        ManualGrade.objects.create(
            queue_item=queue_item,
            grader_user_id=self.staff_user.id,
            awarded_points=Decimal('9.00'),
        )

        response = self._post_json(
            'grading_aggregate_attempt',
            {'attempt_id': 'attempt-api'},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['total_awarded'], '12.00')
        self.assertEqual(response.json()['total_max'], '15.00')
        self.assertTrue(response.json()['passed'])
        self.assertEqual(CombinedResult.objects.count(), 1)

    def test_attempt_result_endpoint_returns_persisted_result(self):
        self._authenticate()
        CombinedResult.objects.create(
            attempt_id='attempt-result',
            test_id='test-1',
            total_awarded=Decimal('8.00'),
            total_max=Decimal('10.00'),
            by_topic={'essay': {'awarded': '8.00', 'max': '10.00'}},
            passed=True,
        )

        response = self.client.get(reverse('grading_attempt_result', args=['attempt-result']))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['attempt_id'], 'attempt-result')
        self.assertEqual(response.json()['total_awarded'], '8.00')
        self.assertTrue(response.json()['passed'])

    def test_attempt_result_endpoint_returns_404_when_missing(self):
        self._authenticate()
        response = self.client.get(reverse('grading_attempt_result', args=['missing-attempt']))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_aggregate_attempt_accepts_test_id_override(self):
        self._authenticate()
        ObjectiveScore.objects.create(
            attempt_id='attempt-override',
            question_id='q-objective',
            question_version=1,
            question_type='mcq',
            awarded_points=Decimal('4.00'),
            max_points=Decimal('5.00'),
            is_correct=True,
            detail={},
        )

        response = self._post_json(
            'grading_aggregate_attempt',
            {
                'attempt_id': 'attempt-override',
                'test_id': 'test-1',
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['test_id'], 'test-1')
        self.assertTrue(response.json()['passed'])
