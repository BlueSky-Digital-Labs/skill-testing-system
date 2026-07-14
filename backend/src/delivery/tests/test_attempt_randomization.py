from __future__ import annotations

import uuid
from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.utils import timezone

from core.models import Assignment, AssignmentStatus
from delivery.models import Attempt
from delivery.services.randomization import (
    initialize_attempt_order,
    rehydrate_attempt_order,
)

User = get_user_model()


@pytest.fixture
def assignment(db):
    now = timezone.now()
    return Assignment.objects.create(
        test_id=uuid.uuid4(),
        assignee_user_id=uuid.uuid4(),
        created_by_user_id=uuid.uuid4(),
        opens_at=now - timedelta(hours=1),
        closes_at=now + timedelta(hours=1),
        shuffle_questions=True,
        shuffle_options=True,
        status=AssignmentStatus.ACTIVE,
    )


@pytest.fixture
def candidate(db):
    return User.objects.create_user(
        email='shuffle-candidate@example.com',
        password='CandPass123!',
    )


@pytest.fixture
def attempt(assignment, candidate):
    now = timezone.now()
    return Attempt.objects.create(
        assignment=assignment,
        candidate_id=candidate.id,
        test_id=assignment.test_id,
        time_limit_seconds=3600,
        expires_at=now + timedelta(hours=1),
    )


QUESTION_IDS = ['q-1', 'q-2', 'q-3']
OPTION_IDS = {
    'q-1': ['q-1-o1', 'q-1-o2'],
    'q-2': ['q-2-o1', 'q-2-o2'],
    'q-3': ['q-3-o1', 'q-3-o2'],
}


def test_initialize_attempt_order_populates_fields(attempt):
    initialized = initialize_attempt_order(
        attempt,
        question_ids=QUESTION_IDS,
        option_ids_by_question=OPTION_IDS,
        shuffle_questions=True,
        shuffle_options=True,
    )

    initialized.refresh_from_db()
    assert initialized.question_order_seed is not None
    assert initialized.option_order_seed is not None
    assert initialized.question_id_order == list(QUESTION_IDS) or set(
        initialized.question_id_order
    ) == set(QUESTION_IDS)
    assert set(initialized.option_id_orders.keys()) == set(QUESTION_IDS)


def test_initialize_attempt_order_is_idempotent(attempt):
    first = initialize_attempt_order(
        attempt,
        question_ids=QUESTION_IDS,
        option_ids_by_question=OPTION_IDS,
        shuffle_questions=True,
        shuffle_options=True,
    )
    snapshot = (
        first.question_order_seed,
        first.option_order_seed,
        list(first.question_id_order),
        dict(first.option_id_orders),
    )

    second = initialize_attempt_order(
        first,
        question_ids=['different'],
        option_ids_by_question={'different': ['x']},
        shuffle_questions=False,
        shuffle_options=False,
    )
    second.refresh_from_db()

    assert (
        second.question_order_seed,
        second.option_order_seed,
        list(second.question_id_order),
        dict(second.option_id_orders),
    ) == snapshot


def test_rehydrate_attempt_order_returns_persisted_orders(attempt):
    initialize_attempt_order(
        attempt,
        question_ids=QUESTION_IDS,
        option_ids_by_question=OPTION_IDS,
        shuffle_questions=True,
        shuffle_options=True,
    )
    attempt.refresh_from_db()

    hydrated = rehydrate_attempt_order(
        attempt,
        question_ids=QUESTION_IDS,
        option_ids_by_question=OPTION_IDS,
        shuffle_questions=True,
        shuffle_options=True,
    )

    assert hydrated['question_id_order'] == attempt.question_id_order
    assert hydrated['option_id_orders'] == attempt.option_id_orders
    assert hydrated['question_order_seed'] == attempt.question_order_seed
    assert hydrated['option_order_seed'] == attempt.option_order_seed


def test_rehydrate_attempt_order_recomputes_from_legacy_seeds(attempt):
    initialize_attempt_order(
        attempt,
        question_ids=QUESTION_IDS,
        option_ids_by_question=OPTION_IDS,
        shuffle_questions=True,
        shuffle_options=True,
    )
    attempt.refresh_from_db()

    question_seed = attempt.question_order_seed
    option_seed = attempt.option_order_seed
    expected_question_order = list(attempt.question_id_order)
    expected_option_orders = dict(attempt.option_id_orders)

    Attempt.objects.filter(pk=attempt.pk).update(
        question_id_order=[],
        option_id_orders={},
    )
    attempt.refresh_from_db()

    hydrated = rehydrate_attempt_order(
        attempt,
        question_ids=QUESTION_IDS,
        option_ids_by_question=OPTION_IDS,
        shuffle_questions=True,
        shuffle_options=True,
    )

    assert hydrated['question_order_seed'] == question_seed
    assert hydrated['option_order_seed'] == option_seed
    assert hydrated['question_id_order'] == expected_question_order
    assert hydrated['option_id_orders'] == expected_option_orders


def test_attempt_order_fields_are_read_only_after_initialization(attempt):
    initialize_attempt_order(
        attempt,
        question_ids=QUESTION_IDS,
        option_ids_by_question=OPTION_IDS,
        shuffle_questions=True,
        shuffle_options=True,
    )
    attempt.refresh_from_db()

    attempt.question_id_order = list(reversed(attempt.question_id_order))
    with pytest.raises(ValidationError):
        attempt.save()
