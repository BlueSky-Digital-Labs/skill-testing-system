from __future__ import annotations

from decimal import Decimal

from .config import TestConfigSnapshot
from .models import CombinedResult, FreeTextQueueItem, ManualGrade, ObjectiveScore

OBJECTIVE_TOPIC_KEY = 'objective'
DECIMAL_ZERO = Decimal('0.00')


def _decimal(value: Decimal | float | int | str) -> Decimal:
    return Decimal(str(value))


def _topic_bucket(by_topic: dict[str, dict[str, Decimal]], topic: str) -> dict[str, Decimal]:
    if topic not in by_topic:
        by_topic[topic] = {
            'awarded': DECIMAL_ZERO,
            'max': DECIMAL_ZERO,
        }
    return by_topic[topic]


def _infer_test_id(attempt_id: str) -> str | None:
    combined = CombinedResult.objects.filter(attempt_id=attempt_id).first()
    if combined is not None:
        return combined.test_id

    queue_item = FreeTextQueueItem.objects.filter(attempt_id=attempt_id).first()
    if queue_item is not None:
        return queue_item.test_id

    return None


def _evaluate_passed(
    *,
    total_awarded: Decimal,
    total_max: Decimal,
    test_id: str | None,
) -> bool:
    if not test_id:
        return False

    config = TestConfigSnapshot.objects.filter(test_id=test_id).first()
    if config is None:
        return False

    passing_score = _decimal(config.passing_score)
    if config.pass_type == TestConfigSnapshot.PASS_TYPE_PERCENT:
        if total_max <= DECIMAL_ZERO:
            return False
        percent_score = (total_awarded / total_max) * Decimal('100')
        return percent_score >= passing_score

    return total_awarded >= passing_score


def compile_attempt_scores(attempt_id: str, *, test_id: str | None = None) -> dict:
    by_topic: dict[str, dict[str, Decimal]] = {}
    total_awarded = DECIMAL_ZERO
    total_max = DECIMAL_ZERO

    for objective_score in ObjectiveScore.objects.filter(attempt_id=attempt_id):
        topic = objective_score.detail.get('topic', OBJECTIVE_TOPIC_KEY)
        bucket = _topic_bucket(by_topic, topic)
        awarded = _decimal(objective_score.awarded_points)
        maximum = _decimal(objective_score.max_points)
        bucket['awarded'] += awarded
        bucket['max'] += maximum
        total_awarded += awarded
        total_max += maximum

    manual_grades = ManualGrade.objects.select_related('queue_item').filter(
        queue_item__attempt_id=attempt_id,
    )
    for manual_grade in manual_grades:
        queue_item = manual_grade.queue_item
        bucket = _topic_bucket(by_topic, queue_item.topic)
        awarded = _decimal(manual_grade.awarded_points)
        maximum = _decimal(queue_item.max_points)
        bucket['awarded'] += awarded
        bucket['max'] += maximum
        total_awarded += awarded
        total_max += maximum

    resolved_test_id = test_id or _infer_test_id(attempt_id)
    passed = _evaluate_passed(
        total_awarded=total_awarded,
        total_max=total_max,
        test_id=resolved_test_id,
    )

    serialized_by_topic = {
        topic: {
            'awarded': values['awarded'],
            'max': values['max'],
        }
        for topic, values in sorted(by_topic.items())
    }

    return {
        'attempt_id': attempt_id,
        'test_id': resolved_test_id,
        'total_awarded': total_awarded,
        'total_max': total_max,
        'by_topic': serialized_by_topic,
        'passed': passed,
    }
