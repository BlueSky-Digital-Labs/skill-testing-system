from __future__ import annotations

import uuid
from datetime import timedelta
from decimal import Decimal

import pytest
from django.utils import timezone

from grading.models import ObjectiveScore
from reporting import queries


@pytest.mark.django_db
class TestReportingQueries:
    def test_individual_report_returns_attempt_and_scores(self, attempt_bundle):
        attempt = attempt_bundle['attempt']
        ObjectiveScore.objects.create(
            attempt_id=str(attempt.id),
            question_id='q-1',
            question_version=1,
            question_type='mcq',
            awarded_points=Decimal('6.00'),
            max_points=Decimal('10.00'),
            is_correct=False,
            detail={'topic': 'science'},
        )
        data = queries.individual_report(attempt.id)

        assert data['attempt_id'] == str(attempt.id)
        assert data['candidate_id'] == attempt.candidate_id
        assert data['total_awarded'] == Decimal('6.00')
        assert len(data['questions']) == 1

    def test_individual_report_missing_attempt(self):
        data = queries.individual_report(uuid.uuid4())
        assert data['error'] == 'attempt_not_found'

    def test_test_summary_aggregates_metrics(self, attempt_bundle):
        data = queries.test_summary(attempt_bundle['test_id'])
        assert data['attempt_count'] == 1
        assert data['completed_count'] == 1

    def test_question_performance_by_version(self, attempt_bundle):
        attempt = attempt_bundle['attempt']
        ObjectiveScore.objects.create(
            attempt_id=str(attempt.id),
            question_id='q-1',
            question_version=1,
            question_type='mcq',
            awarded_points=Decimal('6.00'),
            max_points=Decimal('10.00'),
            is_correct=False,
            detail={'topic': 'science'},
        )
        data = queries.question_performance(attempt_bundle['test_id'])
        assert len(data['questions']) == 1

    def test_group_comparison_includes_group_metrics(self, attempt_bundle):
        data = queries.group_comparison(attempt_bundle['test_id'])
        assert len(data['groups']) == 1

    def test_progress_returns_time_buckets(self, attempt_bundle):
        group = attempt_bundle['group']
        now = timezone.now()
        data = queries.progress(
            group.id,
            topic='science',
            from_dt=now - timedelta(days=1),
            to_dt=now + timedelta(days=1),
        )
        assert data['group_id'] == str(group.id)
        assert len(data['buckets']) >= 1

    def test_progress_unknown_group(self):
        data = queries.progress(uuid.uuid4(), None, None, None)
        assert data['error'] == 'group_not_found'
