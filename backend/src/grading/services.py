"""
Deterministic, side-effect-free scoring functions for objective questions.
"""

from __future__ import annotations

import re
from decimal import Decimal
from typing import Any

from .models import ScoringPolicy


def _decimal(value: Decimal | float | int | str) -> Decimal:
    return Decimal(str(value))


def _clamp_awarded_points(
    awarded: Decimal,
    max_points: Decimal,
    *,
    negative_marking: bool,
) -> Decimal:
    upper = max_points
    lower = -max_points if negative_marking else Decimal('0')
    if awarded > upper:
        return upper
    if awarded < lower:
        return lower
    return awarded


def _policy_flags(policy: ScoringPolicy | None) -> tuple[bool, bool, Decimal]:
    if policy is None:
        return False, False, Decimal('0')
    return (
        policy.partial_credit,
        policy.negative_marking,
        _decimal(policy.per_option_value),
    )


def score_mcq(
    *,
    selected_option: str,
    correct_option: str,
    max_points: Decimal | float | int,
    policy: ScoringPolicy | None = None,
) -> dict[str, Any]:
    max_pts = _decimal(max_points)
    _, negative_marking, per_option_value = _policy_flags(policy)
    is_correct = selected_option == correct_option

    if is_correct:
        awarded = max_pts
    elif negative_marking:
        awarded = -per_option_value
    else:
        awarded = Decimal('0')

    awarded = _clamp_awarded_points(
        awarded,
        max_pts,
        negative_marking=negative_marking,
    )

    return {
        'awarded_points': awarded,
        'max_points': max_pts,
        'is_correct': is_correct,
        'detail': {
            'selected_option': selected_option,
            'correct_option': correct_option,
        },
    }


def score_true_false(
    *,
    selected_answer: bool,
    correct_answer: bool,
    max_points: Decimal | float | int,
    policy: ScoringPolicy | None = None,
) -> dict[str, Any]:
    max_pts = _decimal(max_points)
    _, negative_marking, per_option_value = _policy_flags(policy)
    is_correct = selected_answer is correct_answer

    if is_correct:
        awarded = max_pts
    elif negative_marking:
        awarded = -per_option_value
    else:
        awarded = Decimal('0')

    awarded = _clamp_awarded_points(
        awarded,
        max_pts,
        negative_marking=negative_marking,
    )

    return {
        'awarded_points': awarded,
        'max_points': max_pts,
        'is_correct': is_correct,
        'detail': {
            'selected_answer': selected_answer,
            'correct_answer': correct_answer,
        },
    }


def normalize_fib_answer(answer: str) -> str:
    normalized = answer.strip().casefold()
    normalized = re.sub(r'\s+', ' ', normalized)
    return normalized


def score_fib(
    *,
    submitted_answer: str,
    accepted_answers: list[str],
    max_points: Decimal | float | int,
    policy: ScoringPolicy | None = None,
) -> dict[str, Any]:
    max_pts = _decimal(max_points)
    partial_credit, negative_marking, _ = _policy_flags(policy)

    normalized_submitted = normalize_fib_answer(submitted_answer)
    normalized_accepted = [normalize_fib_answer(answer) for answer in accepted_answers]
    is_correct = normalized_submitted in normalized_accepted

    if is_correct:
        awarded = max_pts
    elif partial_credit:
        awarded = Decimal('0')
    elif negative_marking:
        awarded = Decimal('0')
    else:
        awarded = Decimal('0')

    return {
        'awarded_points': awarded,
        'max_points': max_pts,
        'is_correct': is_correct,
        'detail': {
            'submitted_answer': submitted_answer,
            'normalized_submitted_answer': normalized_submitted,
            'accepted_answers': accepted_answers,
            'normalized_accepted_answers': normalized_accepted,
        },
    }


def score_multi_select(
    *,
    selected_options: list[str],
    correct_options: list[str],
    max_points: Decimal | float | int,
    policy: ScoringPolicy | None = None,
) -> dict[str, Any]:
    max_pts = _decimal(max_points)
    partial_credit, negative_marking, per_option_value = _policy_flags(policy)

    selected_set = set(selected_options)
    correct_set = set(correct_options)
    true_positives = selected_set & correct_set
    false_positives = selected_set - correct_set
    false_negatives = correct_set - selected_set
    is_correct = selected_set == correct_set and not false_positives

    if partial_credit and per_option_value > 0:
        awarded = per_option_value * len(true_positives)
        if negative_marking:
            awarded -= per_option_value * len(false_positives)
        awarded = _clamp_awarded_points(
            awarded,
            max_pts,
            negative_marking=negative_marking,
        )
    elif is_correct:
        awarded = max_pts
    else:
        awarded = Decimal('0')

    return {
        'awarded_points': awarded,
        'max_points': max_pts,
        'is_correct': is_correct,
        'detail': {
            'selected_options': sorted(selected_set),
            'correct_options': sorted(correct_set),
            'matched_options': sorted(true_positives),
            'incorrect_selections': sorted(false_positives),
            'missed_options': sorted(false_negatives),
        },
    }
