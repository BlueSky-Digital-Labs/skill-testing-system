from __future__ import annotations

from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any
from uuid import UUID

from django.db.models import Avg, Count, Q
from django.utils import timezone

from core.models import Assignment, CandidateGroup
from delivery.models import Attempt, AttemptStatus
from grading.models import CombinedResult, ObjectiveScore

DECIMAL_ZERO = Decimal('0.00')
TERMINAL_STATUSES = {
    AttemptStatus.SUBMITTED,
    AttemptStatus.AUTO_SUBMITTED,
}


def _decimal(value: Decimal | float | int | str | None) -> Decimal:
    if value is None:
        return DECIMAL_ZERO
    return Decimal(str(value))


def _percent(awarded: Decimal, maximum: Decimal) -> Decimal:
    if maximum <= DECIMAL_ZERO:
        return DECIMAL_ZERO
    return (awarded / maximum) * Decimal('100')


def _normalize_test_id(test_id: str | UUID) -> str:
    return str(test_id)


def _attempt_not_found(attempt_id: str | UUID) -> dict[str, Any]:
    return {'error': 'attempt_not_found', 'attempt_id': str(attempt_id)}


def individual_report(attempt_id: str | UUID) -> dict[str, Any]:
    """
    Join Attempt, CombinedResult, and score records for a single attempt.
    """
    attempt = (
        Attempt.objects.select_related('assignment')
        .filter(pk=attempt_id)
        .first()
    )
    if attempt is None:
        return _attempt_not_found(attempt_id)

    combined = CombinedResult.objects.filter(attempt_id=str(attempt.id)).first()
    objective_scores = ObjectiveScore.objects.filter(
        attempt_id=str(attempt.id),
    ).order_by('question_id', 'question_version')

    questions = []
    for score in objective_scores:
        topic = score.detail.get('topic', 'general')
        questions.append(
            {
                'question_id': score.question_id,
                'question_version': score.question_version,
                'question_type': score.question_type,
                'awarded_points': score.awarded_points,
                'max_points': score.max_points,
                'is_correct': score.is_correct,
                'topic': topic,
            }
        )

    by_topic = combined.by_topic if combined is not None else {}
    return {
        'attempt_id': str(attempt.id),
        'test_id': str(attempt.test_id),
        'candidate_id': attempt.candidate_id,
        'status': attempt.status,
        'started_at': attempt.started_at,
        'submitted_at': attempt.submitted_at,
        'total_awarded': combined.total_awarded if combined else None,
        'total_max': combined.total_max if combined else None,
        'passed': combined.passed if combined else None,
        'by_topic': by_topic,
        'questions': questions,
    }


def test_summary(test_id: str | UUID) -> dict[str, Any]:
    """
    Aggregate attempt counts, average scores, and pass rates for a test.
    """
    normalized = _normalize_test_id(test_id)
    attempts = Attempt.objects.filter(test_id=normalized)
    attempt_count = attempts.count()
    completed = attempts.filter(status__in=TERMINAL_STATUSES)
    completed_count = completed.count()

    combined_results = CombinedResult.objects.filter(test_id=normalized)
    result_count = combined_results.count()
    passed_count = combined_results.filter(passed=True).count()

    aggregates = combined_results.aggregate(
        avg_awarded=Avg('total_awarded'),
        avg_max=Avg('total_max'),
    )
    avg_awarded = _decimal(aggregates['avg_awarded'])
    avg_max = _decimal(aggregates['avg_max'])
    average_percent = _percent(avg_awarded, avg_max)

    pass_rate = (
        Decimal(passed_count) / Decimal(result_count)
        if result_count
        else DECIMAL_ZERO
    )
    completion_rate = (
        Decimal(completed_count) / Decimal(attempt_count)
        if attempt_count
        else DECIMAL_ZERO
    )

    return {
        'test_id': normalized,
        'attempt_count': attempt_count,
        'completed_count': completed_count,
        'completion_rate': completion_rate,
        'result_count': result_count,
        'passed_count': passed_count,
        'pass_rate': pass_rate,
        'average_awarded': avg_awarded,
        'average_max': avg_max,
        'average_percent': average_percent,
    }


def question_performance(test_id: str | UUID) -> dict[str, Any]:
    """
    Analyze correctness metrics per question version for a test.
    """
    normalized = _normalize_test_id(test_id)
    attempt_ids = list(
        CombinedResult.objects.filter(test_id=normalized).values_list(
            'attempt_id',
            flat=True,
        )
    )
    if not attempt_ids:
        return {'test_id': normalized, 'questions': []}

    rows = (
        ObjectiveScore.objects.filter(attempt_id__in=attempt_ids)
        .values('question_id', 'question_version')
        .annotate(
            attempts=Count('id'),
            correct_count=Count('id', filter=Q(is_correct=True)),
            average_awarded=Avg('awarded_points'),
        )
        .order_by('question_id', 'question_version')
    )

    questions = []
    for row in rows:
        attempts = row['attempts'] or 0
        correct_count = row['correct_count'] or 0
        correctness_rate = (
            Decimal(correct_count) / Decimal(attempts)
            if attempts
            else DECIMAL_ZERO
        )
        questions.append(
            {
                'question_id': row['question_id'],
                'question_version': row['question_version'],
                'attempts': attempts,
                'correct_count': correct_count,
                'correctness_rate': correctness_rate,
                'average_awarded': _decimal(row['average_awarded']),
            }
        )

    return {'test_id': normalized, 'questions': questions}


def group_comparison(test_id: str | UUID) -> dict[str, Any]:
    """
    Compare completion rates, average scores, and pass rates across groups.
    """
    normalized = _normalize_test_id(test_id)
    group_assignments = Assignment.objects.filter(
        test_id=normalized,
        assignee_group_id__isnull=False,
    ).select_related()

    group_ids = {
        assignment.assignee_group_id
        for assignment in group_assignments
        if assignment.assignee_group_id is not None
    }
    groups = CandidateGroup.objects.filter(id__in=group_ids, is_active=True)

    comparison = []
    for group in groups:
        member_ids = list(group.members.values_list('id', flat=True))
        member_count = len(member_ids)

        group_attempts = Attempt.objects.filter(
            test_id=normalized,
        ).filter(
            Q(assignment__assignee_group_id=group.id)
            | Q(candidate_id__in=member_ids),
        )
        attempt_count = group_attempts.count()
        completed_count = group_attempts.filter(
            status__in=TERMINAL_STATUSES,
        ).count()

        attempt_id_strings = [
            str(attempt_id)
            for attempt_id in group_attempts.values_list('id', flat=True)
        ]
        combined = CombinedResult.objects.filter(
            attempt_id__in=attempt_id_strings,
        )
        result_count = combined.count()
        passed_count = combined.filter(passed=True).count()
        aggregates = combined.aggregate(
            avg_awarded=Avg('total_awarded'),
            avg_max=Avg('total_max'),
        )
        avg_awarded = _decimal(aggregates['avg_awarded'])
        avg_max = _decimal(aggregates['avg_max'])

        comparison.append(
            {
                'group_id': str(group.id),
                'group_name': group.name,
                'member_count': member_count,
                'attempt_count': attempt_count,
                'completed_count': completed_count,
                'completion_rate': (
                    Decimal(completed_count) / Decimal(attempt_count)
                    if attempt_count
                    else DECIMAL_ZERO
                ),
                'result_count': result_count,
                'passed_count': passed_count,
                'pass_rate': (
                    Decimal(passed_count) / Decimal(result_count)
                    if result_count
                    else DECIMAL_ZERO
                ),
                'average_awarded': avg_awarded,
                'average_max': avg_max,
                'average_percent': _percent(avg_awarded, avg_max),
            }
        )

    return {'test_id': normalized, 'groups': comparison}


def progress(
    group_id: str | UUID,
    topic: str | None,
    from_dt: datetime | None,
    to_dt: datetime | None,
) -> dict[str, Any]:
    """
    Calculate time-bucketed averages for scores and completions.
    """
    group = CandidateGroup.objects.filter(pk=group_id, is_active=True).first()
    if group is None:
        return {'error': 'group_not_found', 'group_id': str(group_id)}

    member_ids = list(group.members.values_list('id', flat=True))
    if not member_ids:
        return {
            'group_id': str(group.id),
            'group_name': group.name,
            'topic': topic,
            'from_dt': from_dt,
            'to_dt': to_dt,
            'buckets': [],
        }

    attempts = Attempt.objects.filter(candidate_id__in=member_ids)
    if from_dt is not None:
        attempts = attempts.filter(started_at__gte=from_dt)
    if to_dt is not None:
        attempts = attempts.filter(started_at__lte=to_dt)

    attempt_rows = list(
        attempts.filter(status__in=TERMINAL_STATUSES).values(
            'id',
            'started_at',
            'submitted_at',
        )
    )
    if not attempt_rows:
        return {
            'group_id': str(group.id),
            'group_name': group.name,
            'topic': topic,
            'from_dt': from_dt,
            'to_dt': to_dt,
            'buckets': [],
        }

    start = from_dt or min(row['started_at'] for row in attempt_rows)
    end = to_dt or timezone.now()
    if end <= start:
        end = start + timedelta(days=1)

    total_days = max((end - start).days, 1)
    bucket_days = 7 if total_days > 14 else 1

    bucket_starts: list[datetime] = []
    cursor = start
    while cursor < end:
        bucket_starts.append(cursor)
        cursor = cursor + timedelta(days=bucket_days)

    attempt_ids = [str(row['id']) for row in attempt_rows]
    combined_by_attempt = {
        result.attempt_id: result
        for result in CombinedResult.objects.filter(attempt_id__in=attempt_ids)
    }

    buckets: list[dict[str, Any]] = []
    for index, bucket_start in enumerate(bucket_starts):
        bucket_end = (
            bucket_starts[index + 1]
            if index + 1 < len(bucket_starts)
            else end
        )
        bucket_attempts = [
            row
            for row in attempt_rows
            if bucket_start <= row['started_at'] < bucket_end
        ]
        completion_count = len(bucket_attempts)

        percents: list[Decimal] = []
        for row in bucket_attempts:
            combined = combined_by_attempt.get(str(row['id']))
            if combined is None:
                continue
            if topic:
                topic_data = combined.by_topic.get(topic)
                if not topic_data:
                    continue
                awarded = _decimal(topic_data.get('awarded'))
                maximum = _decimal(topic_data.get('max'))
            else:
                awarded = _decimal(combined.total_awarded)
                maximum = _decimal(combined.total_max)
            percents.append(_percent(awarded, maximum))

        average_percent = (
            sum(percents, DECIMAL_ZERO) / Decimal(len(percents))
            if percents
            else DECIMAL_ZERO
        )
        buckets.append(
            {
                'period_start': bucket_start,
                'period_end': bucket_end,
                'completion_count': completion_count,
                'average_percent': average_percent,
            }
        )

    return {
        'group_id': str(group.id),
        'group_name': group.name,
        'topic': topic,
        'from_dt': from_dt,
        'to_dt': to_dt,
        'buckets': buckets,
    }
