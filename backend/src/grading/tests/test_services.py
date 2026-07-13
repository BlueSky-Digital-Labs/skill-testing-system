from decimal import Decimal

from django.test import TestCase

from grading.models import ScoringPolicy
from grading.services import (
    normalize_fib_answer,
    score_fib,
    score_mcq,
    score_multi_select,
    score_true_false,
)


class ScoringServicesTest(TestCase):
    def test_score_mcq_correct_answer(self):
        result = score_mcq(
            selected_option='B',
            correct_option='B',
            max_points=2,
        )

        self.assertEqual(result['awarded_points'], Decimal('2'))
        self.assertEqual(result['max_points'], Decimal('2'))
        self.assertTrue(result['is_correct'])

    def test_score_mcq_incorrect_answer(self):
        result = score_mcq(
            selected_option='A',
            correct_option='B',
            max_points=2,
        )

        self.assertEqual(result['awarded_points'], Decimal('0'))
        self.assertFalse(result['is_correct'])

    def test_score_mcq_negative_marking(self):
        policy = ScoringPolicy(
            name='mcq-negative',
            negative_marking=True,
            per_option_value=Decimal('0.5'),
        )

        result = score_mcq(
            selected_option='A',
            correct_option='B',
            max_points=2,
            policy=policy,
        )

        self.assertEqual(result['awarded_points'], Decimal('-0.5'))
        self.assertFalse(result['is_correct'])

    def test_score_true_false_correct(self):
        result = score_true_false(
            selected_answer=True,
            correct_answer=True,
            max_points=1,
        )

        self.assertEqual(result['awarded_points'], Decimal('1'))
        self.assertTrue(result['is_correct'])

    def test_score_true_false_incorrect(self):
        result = score_true_false(
            selected_answer=False,
            correct_answer=True,
            max_points=1,
        )

        self.assertEqual(result['awarded_points'], Decimal('0'))
        self.assertFalse(result['is_correct'])

    def test_normalize_fib_answer(self):
        self.assertEqual(normalize_fib_answer('  Paris '), 'paris')
        self.assertEqual(normalize_fib_answer('New   York'), 'new york')

    def test_score_fib_accepts_normalized_match(self):
        result = score_fib(
            submitted_answer='  PARIS ',
            accepted_answers=['paris', 'Paris, France'],
            max_points=3,
        )

        self.assertEqual(result['awarded_points'], Decimal('3'))
        self.assertTrue(result['is_correct'])

    def test_score_fib_rejects_non_matching_answer(self):
        result = score_fib(
            submitted_answer='London',
            accepted_answers=['paris'],
            max_points=3,
        )

        self.assertEqual(result['awarded_points'], Decimal('0'))
        self.assertFalse(result['is_correct'])

    def test_score_multi_select_all_or_nothing(self):
        result = score_multi_select(
            selected_options=['A', 'C'],
            correct_options=['A', 'B'],
            max_points=4,
        )

        self.assertEqual(result['awarded_points'], Decimal('0'))
        self.assertFalse(result['is_correct'])

    def test_score_multi_select_exact_match(self):
        result = score_multi_select(
            selected_options=['A', 'B'],
            correct_options=['A', 'B'],
            max_points=4,
        )

        self.assertEqual(result['awarded_points'], Decimal('4'))
        self.assertTrue(result['is_correct'])

    def test_score_multi_select_partial_credit(self):
        policy = ScoringPolicy(
            name='multi-partial',
            partial_credit=True,
            per_option_value=Decimal('1'),
        )

        result = score_multi_select(
            selected_options=['A', 'C'],
            correct_options=['A', 'B'],
            max_points=4,
            policy=policy,
        )

        self.assertEqual(result['awarded_points'], Decimal('1'))
        self.assertFalse(result['is_correct'])
        self.assertEqual(result['detail']['matched_options'], ['A'])
        self.assertEqual(result['detail']['incorrect_selections'], ['C'])

    def test_score_multi_select_partial_credit_with_negative_marking(self):
        policy = ScoringPolicy.objects.create(
            name='multi-partial-negative',
            partial_credit=True,
            negative_marking=True,
            per_option_value=Decimal('1'),
        )

        result = score_multi_select(
            selected_options=['A', 'C'],
            correct_options=['A', 'B'],
            max_points=4,
            policy=policy,
        )

        self.assertEqual(result['awarded_points'], Decimal('0'))
        self.assertFalse(result['is_correct'])
