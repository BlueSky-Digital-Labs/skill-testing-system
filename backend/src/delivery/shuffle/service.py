"""
Deterministic shuffle helpers for per-attempt question and option ordering.
"""

from __future__ import annotations

import hashlib
import random
from typing import TypeVar

T = TypeVar('T')


def stable_shuffle(items: list[T], seed: int) -> list[T]:
    """Return a deterministically shuffled copy of ``items`` using ``seed``."""
    shuffled = list(items)
    random.Random(seed).shuffle(shuffled)
    return shuffled


def derive_seed(base_seed: int, namespace: str) -> int:
    """Derive a stable 64-bit seed for a shuffle namespace."""
    digest = hashlib.sha256(f'{base_seed}:{namespace}'.encode()).digest()
    return int.from_bytes(digest[:8], byteorder='big', signed=True)


def build_order_from_seeds(
    question_ids: list[str],
    option_ids_by_question: dict[str, list[str]],
    question_order_seed: int,
    option_order_seed: int,
    shuffle_questions: bool,
    shuffle_options: bool,
) -> tuple[list[str], dict[str, list[str]]]:
    """Build orders using explicit namespace seeds."""
    if shuffle_questions:
        question_id_order = stable_shuffle(question_ids, question_order_seed)
    else:
        question_id_order = list(question_ids)

    option_id_orders: dict[str, list[str]] = {}
    for question_id in question_id_order:
        option_ids = option_ids_by_question.get(question_id, [])
        if shuffle_options:
            per_question_seed = derive_seed(option_order_seed, question_id)
            option_id_orders[question_id] = stable_shuffle(
                option_ids,
                per_question_seed,
            )
        else:
            option_id_orders[question_id] = list(option_ids)

    return question_id_order, option_id_orders


def build_order(
    question_ids: list[str],
    option_ids_by_question: dict[str, list[str]],
    base_seed: int,
    shuffle_questions: bool,
    shuffle_options: bool,
) -> tuple[list[str], dict[str, list[str]], int, int]:
    """
    Build deterministic question and option orders from ``base_seed``.

    Returns ``(question_id_order, option_id_orders, question_order_seed,
    option_order_seed)``.
    """
    question_order_seed = derive_seed(base_seed, 'q')
    option_order_seed = derive_seed(base_seed, 'o')
    question_id_order, option_id_orders = build_order_from_seeds(
        question_ids=question_ids,
        option_ids_by_question=option_ids_by_question,
        question_order_seed=question_order_seed,
        option_order_seed=option_order_seed,
        shuffle_questions=shuffle_questions,
        shuffle_options=shuffle_options,
    )
    return question_id_order, option_id_orders, question_order_seed, option_order_seed
