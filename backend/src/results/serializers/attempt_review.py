"""
Serializer helpers for attempt review responses.
"""

from decimal import Decimal

from grading.models import CombinedResult, FreeTextQueueItem, ObjectiveScore

# TODO: Import Attempt model when the attempts app is available.
# from attempts.models import Attempt


def _get_attr(obj, name, default=None):
    if isinstance(obj, dict):
        return obj.get(name, default)
    return getattr(obj, name, default)


def _serialize_decimal(value):
    if isinstance(value, Decimal):
        return format(value.quantize(Decimal('0.01')), 'f')
    return value


def _serialize_summary(combined):
    return {
        'total_awarded': _serialize_decimal(combined.total_awarded),
        'total_max': _serialize_decimal(combined.total_max),
        'by_topic': combined.by_topic,
        'passed': combined.passed,
    }


def _serialize_objective_items(attempt_id):
    return [
        {
            'question_id': score.question_id,
            'question_type': score.question_type,
            'awarded_points': _serialize_decimal(score.awarded_points),
            'max_points': _serialize_decimal(score.max_points),
            'is_correct': score.is_correct,
            'feedback': None,
        }
        for score in ObjectiveScore.objects.filter(attempt_id=attempt_id).order_by(
            'question_id',
        )
    ]


def _serialize_free_text_items(attempt_id):
    items = []
    for queue_item in FreeTextQueueItem.objects.filter(
        attempt_id=attempt_id,
    ).order_by('question_id'):
        manual_grade = getattr(queue_item, 'manual_grade', None)
        items.append(
            {
                'question_id': queue_item.question_id,
                'question_type': 'free_text',
                'awarded_points': (
                    _serialize_decimal(manual_grade.awarded_points)
                    if manual_grade is not None
                    else None
                ),
                'max_points': _serialize_decimal(queue_item.max_points),
                'is_correct': None,
                'feedback': (
                    manual_grade.feedback if manual_grade is not None else None
                ),
            },
        )
    return items


def serialize_attempt_for_review(attempt, include_questions=True):
    """
    Build a dictionary payload for attempt review responses.
    """
    attempt_id = _get_attr(attempt, 'id') or _get_attr(attempt, 'attempt_id')
    payload = {
        'id': attempt_id,
        'test_id': _get_attr(attempt, 'test_id'),
        'candidate_user_id': _get_attr(attempt, 'candidate_user_id'),
        'status': _get_attr(attempt, 'status', 'completed'),
        'submitted_at': _get_attr(attempt, 'submitted_at'),
    }

    combined = CombinedResult.objects.filter(attempt_id=attempt_id).first()
    if combined is not None:
        payload['summary'] = _serialize_summary(combined)

    if include_questions:
        payload['items'] = (
            _serialize_objective_items(attempt_id)
            + _serialize_free_text_items(attempt_id)
        )

    return payload
