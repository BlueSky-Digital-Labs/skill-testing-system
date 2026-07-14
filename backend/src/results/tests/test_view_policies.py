from types import SimpleNamespace

from results.view_policies import (
    DisclosureMode,
    evaluate_disclosure,
    filter_attempt_payload,
)


SAMPLE_PAYLOAD = {
    'id': 'attempt-1',
    'test_id': 'test-1',
    'candidate_user_id': 42,
    'status': 'completed',
    'summary': {
        'total_awarded': '8.00',
        'total_max': '10.00',
        'passed': True,
    },
    'items': [
        {
            'question_id': 'q-1',
            'awarded_points': '5.00',
            'max_points': '5.00',
            'is_correct': True,
            'feedback': 'Great work.',
        },
        {
            'question_id': 'q-2',
            'awarded_points': '3.00',
            'max_points': '5.00',
            'is_correct': False,
            'feedback': 'Review chapter 2.',
        },
    ],
}


class TestEvaluateDisclosure:
    def test_withhold_when_results_not_released(self):
        attempt = SimpleNamespace(id='attempt-1')
        test_settings = {
            'results_released': False,
            'results_disclosure': DisclosureMode.SCORE_AND_FEEDBACK,
        }

        assert evaluate_disclosure(attempt, test_settings) == (
            DisclosureMode.WITHHOLD_UNTIL_RELEASE
        )

    def test_score_only_when_released_with_summary_disclosure(self):
        attempt = SimpleNamespace(id='attempt-1')
        test_settings = {
            'results_released': True,
            'results_disclosure': DisclosureMode.SCORE_ONLY,
        }

        assert evaluate_disclosure(attempt, test_settings) == DisclosureMode.SCORE_ONLY

    def test_score_and_feedback_when_released_with_detailed_disclosure(self):
        attempt = SimpleNamespace(id='attempt-1')
        test_settings = {
            'results_released': True,
            'results_disclosure': DisclosureMode.SCORE_AND_FEEDBACK,
        }

        assert evaluate_disclosure(attempt, test_settings) == (
            DisclosureMode.SCORE_AND_FEEDBACK
        )

    def test_defaults_to_score_only_when_released_without_disclosure(self):
        attempt = SimpleNamespace(id='attempt-1')
        test_settings = {'results_released': True}

        assert evaluate_disclosure(attempt, test_settings) == DisclosureMode.SCORE_ONLY


class TestFilterAttemptPayload:
    def test_withhold_until_release_strips_scores_and_items(self):
        filtered = filter_attempt_payload(
            SAMPLE_PAYLOAD,
            DisclosureMode.WITHHOLD_UNTIL_RELEASE,
        )

        assert filtered['disclosure_mode'] == DisclosureMode.WITHHOLD_UNTIL_RELEASE
        assert filtered['status'] == 'withheld'
        assert 'summary' not in filtered
        assert 'items' not in filtered
        assert filtered['id'] == 'attempt-1'

    def test_score_only_keeps_scores_but_removes_feedback(self):
        filtered = filter_attempt_payload(SAMPLE_PAYLOAD, DisclosureMode.SCORE_ONLY)

        assert filtered['disclosure_mode'] == DisclosureMode.SCORE_ONLY
        assert filtered['status'] == 'released'
        assert filtered['summary']['total_awarded'] == '8.00'
        assert len(filtered['items']) == 2
        assert all('feedback' not in item for item in filtered['items'])
        assert filtered['items'][0]['awarded_points'] == '5.00'

    def test_score_and_feedback_keeps_full_payload(self):
        filtered = filter_attempt_payload(
            SAMPLE_PAYLOAD,
            DisclosureMode.SCORE_AND_FEEDBACK,
        )

        assert filtered['disclosure_mode'] == DisclosureMode.SCORE_AND_FEEDBACK
        assert filtered['status'] == 'released'
        assert filtered['summary']['passed'] is True
        assert filtered['items'][0]['feedback'] == 'Great work.'
        assert filtered['items'][1]['feedback'] == 'Review chapter 2.'
