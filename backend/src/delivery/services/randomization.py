"""
Per-attempt question and option ordering for delivery flows.

Call ``initialize_attempt_order`` during attempt initialization after question
selection and before any answer persistence so each attempt receives a stable,
persisted shuffle. Resume flows should use ``rehydrate_attempt_order`` to
reproduce the same delivery sequence without re-randomizing.
"""

from __future__ import annotations

import secrets
from typing import TypedDict

from delivery.models import Attempt
from delivery.shuffle import build_order, build_order_from_seeds


class AttemptOrder(TypedDict):
    question_id_order: list[str]
    option_id_orders: dict[str, list[str]]
    question_order_seed: int
    option_order_seed: int


def initialize_attempt_order(
    attempt: Attempt,
    *,
    question_ids: list[str],
    option_ids_by_question: dict[str, list[str]],
    shuffle_questions: bool,
    shuffle_options: bool,
) -> Attempt:
    """
    Persist deterministic question/option orders for a new or in-flight attempt.

    Idempotent: if orders are already stored, the attempt is returned unchanged.
    """
    if attempt.is_order_initialized or attempt.question_order_seed is not None:
        return attempt

    base_seed = secrets.randbits(64)
    question_id_order, option_id_orders, question_seed, option_seed = build_order(
        question_ids=question_ids,
        option_ids_by_question=option_ids_by_question,
        base_seed=base_seed,
        shuffle_questions=shuffle_questions,
        shuffle_options=shuffle_options,
    )

    attempt.question_order_seed = question_seed
    attempt.option_order_seed = option_seed
    attempt.question_id_order = question_id_order
    attempt.option_id_orders = option_id_orders
    attempt.save(
        update_fields=[
            'question_order_seed',
            'option_order_seed',
            'question_id_order',
            'option_id_orders',
            'updated_at',
        ]
    )
    return attempt


def rehydrate_attempt_order(
    attempt: Attempt,
    *,
    question_ids: list[str],
    option_ids_by_question: dict[str, list[str]],
    shuffle_questions: bool,
    shuffle_options: bool,
) -> AttemptOrder:
    """
    Return persisted delivery order for an attempt.

    When only legacy seeds are present, orders are recomputed deterministically
    from the stored seeds.
    """
    if attempt.question_order_seed is None or attempt.option_order_seed is None:
        raise ValueError('Attempt order has not been initialized.')

    question_seed = int(attempt.question_order_seed)
    option_seed = int(attempt.option_order_seed)

    if attempt.is_order_initialized:
        return AttemptOrder(
            question_id_order=list(attempt.question_id_order),
            option_id_orders=dict(attempt.option_id_orders),
            question_order_seed=question_seed,
            option_order_seed=option_seed,
        )

    question_id_order, option_id_orders = build_order_from_seeds(
        question_ids=question_ids,
        option_ids_by_question=option_ids_by_question,
        question_order_seed=question_seed,
        option_order_seed=option_seed,
        shuffle_questions=shuffle_questions,
        shuffle_options=shuffle_options,
    )

    return AttemptOrder(
        question_id_order=question_id_order,
        option_id_orders=option_id_orders,
        question_order_seed=question_seed,
        option_order_seed=option_seed,
    )
