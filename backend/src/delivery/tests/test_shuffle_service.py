from __future__ import annotations

from delivery.shuffle import (
    build_order,
    build_order_from_seeds,
    derive_seed,
    stable_shuffle,
)


def test_stable_shuffle_is_deterministic_for_same_seed():
    items = ['a', 'b', 'c', 'd', 'e']
    assert stable_shuffle(items, seed=42) == stable_shuffle(items, seed=42)


def test_stable_shuffle_differs_for_different_seeds():
    items = ['a', 'b', 'c', 'd', 'e']
    assert stable_shuffle(items, seed=1) != stable_shuffle(items, seed=2)


def test_derive_seed_is_stable_and_namespaced():
    base_seed = 123456789
    assert derive_seed(base_seed, 'q') == derive_seed(base_seed, 'q')
    assert derive_seed(base_seed, 'q') != derive_seed(base_seed, 'o')


def test_build_order_respects_shuffle_question_flag():
    question_ids = ['q1', 'q2', 'q3']
    option_ids = {
        question_id: [f'{question_id}-o1', f'{question_id}-o2']
        for question_id in question_ids
    }

    shuffled_order, _, question_seed, option_seed = build_order(
        question_ids=question_ids,
        option_ids_by_question=option_ids,
        base_seed=99,
        shuffle_questions=True,
        shuffle_options=False,
    )
    unshuffled_order, _, _, _ = build_order(
        question_ids=question_ids,
        option_ids_by_question=option_ids,
        base_seed=99,
        shuffle_questions=False,
        shuffle_options=False,
    )

    assert shuffled_order == stable_shuffle(question_ids, question_seed)
    assert unshuffled_order == question_ids


def test_build_order_respects_shuffle_option_flag():
    question_ids = ['q1', 'q2']
    option_ids = {
        'q1': ['q1-a', 'q1-b', 'q1-c'],
        'q2': ['q2-a', 'q2-b', 'q2-c'],
    }

    _, shuffled_options, _, option_seed = build_order(
        question_ids=question_ids,
        option_ids_by_question=option_ids,
        base_seed=77,
        shuffle_questions=False,
        shuffle_options=True,
    )
    _, unshuffled_options, _, _ = build_order(
        question_ids=question_ids,
        option_ids_by_question=option_ids,
        base_seed=77,
        shuffle_questions=False,
        shuffle_options=False,
    )

    assert shuffled_options['q1'] == stable_shuffle(
        option_ids['q1'],
        derive_seed(option_seed, 'q1'),
    )
    assert unshuffled_options == option_ids


def test_build_order_from_seeds_matches_build_order():
    question_ids = ['q1', 'q2', 'q3']
    option_ids = {
        question_id: [f'{question_id}-1', f'{question_id}-2']
        for question_id in question_ids
    }
    base_seed = 555

    built_order, built_options, question_seed, option_seed = build_order(
        question_ids=question_ids,
        option_ids_by_question=option_ids,
        base_seed=base_seed,
        shuffle_questions=True,
        shuffle_options=True,
    )
    seeded_order, seeded_options = build_order_from_seeds(
        question_ids=question_ids,
        option_ids_by_question=option_ids,
        question_order_seed=question_seed,
        option_order_seed=option_seed,
        shuffle_questions=True,
        shuffle_options=True,
    )

    assert seeded_order == built_order
    assert seeded_options == built_options
