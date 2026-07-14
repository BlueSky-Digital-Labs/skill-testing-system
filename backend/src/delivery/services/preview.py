"""
Non-persistent preview/practice session services for examiners and test authors.
"""

from __future__ import annotations

import logging
import secrets
import uuid
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from typing import Any

from django.core.cache import cache
from django.utils import timezone

from core.models import Assignment
from delivery.services.attempts import build_option_map
from delivery.shuffle import build_order
from grading.services import score_fib, score_mcq, score_multi_select, score_true_false
from question_bank.models import Question, QuestionType

logger = logging.getLogger(__name__)

PREVIEW_SESSION_TTL_SECONDS = 3600
PREVIEW_CACHE_KEY_PREFIX = 'delivery:preview'


class PreviewServiceError(Exception):
    """Base class for preview session errors."""


class PreviewTestNotFound(PreviewServiceError):
    """Test has no questions available for preview."""


class PreviewSessionNotFound(PreviewServiceError):
    """No active preview session exists for this user and test."""


class PreviewValidationError(PreviewServiceError):
    """Answer payload failed validation."""


@dataclass(frozen=True)
class PreviewTestConfig:
    shuffle_questions: bool
    shuffle_options: bool


def _cache_key(*, user_id: int, test_id: uuid.UUID) -> str:
    return f'{PREVIEW_CACHE_KEY_PREFIX}:{user_id}:{test_id}'


def _serialize_decimal(value: Decimal | float | int) -> str:
    return format(Decimal(str(value)).quantize(Decimal('0.01')), 'f')


def fetch_test_config(test_id: uuid.UUID) -> PreviewTestConfig:
    assignment = (
        Assignment.objects.filter(test_id=test_id)
        .order_by('-created_at')
        .only('shuffle_questions', 'shuffle_options')
        .first()
    )
    if assignment is None:
        return PreviewTestConfig(shuffle_questions=True, shuffle_options=True)
    return PreviewTestConfig(
        shuffle_questions=assignment.shuffle_questions,
        shuffle_options=assignment.shuffle_options,
    )


def fetch_questions_for_test(test_id: uuid.UUID) -> list[Question]:
    questions = list(
        Question.objects.filter(metadata__test_id=str(test_id))
        .prefetch_related('options', 'blank_answer_keys')
        .order_by('created_at')
    )
    if not questions:
        raise PreviewTestNotFound('No questions found for this test.')
    return questions


def _build_preview_payload(
    *,
    test_id: uuid.UUID,
    seed: int,
    question_id_order: list[str],
    option_id_orders: dict[str, list[str]],
    answers: dict[str, Any],
    started_at: datetime,
) -> dict[str, Any]:
    return {
        'preview': True,
        'test_id': str(test_id),
        'status': 'in_progress',
        'seed': seed,
        'started_at': started_at,
        'question_id_order': question_id_order,
        'option_id_orders': option_id_orders,
        'answers': answers,
    }


def _load_session(*, user_id: int, test_id: uuid.UUID) -> dict[str, Any]:
    session = cache.get(_cache_key(user_id=user_id, test_id=test_id))
    if session is None:
        raise PreviewSessionNotFound(
            'No active preview session. Start a preview before answering.',
        )
    return session


def _save_session(
    *,
    user_id: int,
    test_id: uuid.UUID,
    session: dict[str, Any],
) -> None:
    cache.set(
        _cache_key(user_id=user_id, test_id=test_id),
        session,
        PREVIEW_SESSION_TTL_SECONDS,
    )


def start_preview_session(
    *,
    user_id: int,
    test_id: uuid.UUID,
    seed: int | None = None,
) -> dict[str, Any]:
    questions = fetch_questions_for_test(test_id)
    config = fetch_test_config(test_id)
    base_seed = seed if seed is not None else secrets.randbits(64)

    question_ids = [str(question.id) for question in questions]
    option_ids_by_question = build_option_map(questions)
    question_id_order, option_id_orders, _, _ = build_order(
        question_ids=question_ids,
        option_ids_by_question=option_ids_by_question,
        base_seed=base_seed,
        shuffle_questions=config.shuffle_questions,
        shuffle_options=config.shuffle_options,
    )

    started_at = timezone.now()
    session = {
        'test_id': str(test_id),
        'seed': base_seed,
        'question_id_order': question_id_order,
        'option_id_orders': option_id_orders,
        'answers': {},
        'started_at': started_at.isoformat(),
    }
    _save_session(user_id=user_id, test_id=test_id, session=session)

    logger.info(
        'Preview session started user_id=%s test_id=%s seed=%s question_count=%s',
        user_id,
        test_id,
        base_seed,
        len(question_id_order),
    )

    return _build_preview_payload(
        test_id=test_id,
        seed=base_seed,
        question_id_order=question_id_order,
        option_id_orders=option_id_orders,
        answers={},
        started_at=started_at,
    )


def validate_answer_format(question: Question, answer: Any) -> dict[str, Any]:
    errors: list[str] = []

    if question.type == QuestionType.MCQ:
        selected = _extract_selected_option(answer)
        if selected is None:
            errors.append('MCQ answers require a selected option string or object.')
        elif not isinstance(selected, str) or not selected.strip():
            errors.append('selected_option must be a non-empty string.')
    elif question.type == QuestionType.MULTI_SELECT:
        selected_options = _extract_selected_options(answer)
        if selected_options is None:
            errors.append(
                'Multi-select answers require a list of options or object.',
            )
        elif not isinstance(selected_options, list):
            errors.append('selected_options must be a list.')
        elif not all(isinstance(option, str) for option in selected_options):
            errors.append('selected_options must contain only strings.')
    elif question.type == QuestionType.TRUE_FALSE:
        selected = _extract_selected_boolean(answer)
        if selected is None:
            errors.append('True/false answers require a boolean value or object.')
        elif not isinstance(selected, bool):
            errors.append('selected_answer must be a boolean.')
    elif question.type == QuestionType.FILL_IN_BLANK:
        submitted = _extract_submitted_text(answer)
        if submitted is None:
            errors.append('Fill-in-the-blank answers require a text value or object.')
        elif not isinstance(submitted, str):
            errors.append('submitted_answer must be a string.')
    elif question.type == QuestionType.FREE_TEXT:
        submitted = _extract_submitted_text(answer, free_text=True)
        if submitted is None:
            errors.append('Free-text answers require a text value or object.')
        elif not isinstance(submitted, str):
            errors.append('response_text must be a string.')
    else:
        errors.append(f'Unsupported question type: {question.type}')

    return {
        'valid': not errors,
        'question_id': str(question.id),
        'question_type': question.type,
        'errors': errors,
    }


def _extract_selected_option(answer: Any) -> str | None:
    if isinstance(answer, str):
        return answer
    if isinstance(answer, dict) and 'selected_option' in answer:
        value = answer['selected_option']
        return value if isinstance(value, str) else None
    return None


def _extract_selected_options(answer: Any) -> list[str] | None:
    if isinstance(answer, list):
        return answer
    if isinstance(answer, dict) and 'selected_options' in answer:
        value = answer['selected_options']
        return value if isinstance(value, list) else None
    return None


def _extract_selected_boolean(answer: Any) -> bool | None:
    if isinstance(answer, bool):
        return answer
    if isinstance(answer, dict) and 'selected_answer' in answer:
        value = answer['selected_answer']
        return value if isinstance(value, bool) else None
    return None


def _extract_submitted_text(answer: Any, *, free_text: bool = False) -> str | None:
    if isinstance(answer, str):
        return answer
    if isinstance(answer, dict):
        for key in ('response_text', 'submitted_answer', 'answer'):
            if key in answer and isinstance(answer[key], str):
                return answer[key]
    if free_text and isinstance(answer, dict) and 'text' in answer:
        value = answer['text']
        return value if isinstance(value, str) else None
    return None


def _get_question_by_id(
    question_id: uuid.UUID,
    *,
    session: dict[str, Any],
) -> Question:
    question_key = str(question_id)
    if question_key not in session['question_id_order']:
        raise PreviewValidationError(
            f'Question {question_id} is not part of this preview session.',
        )

    try:
        return Question.objects.prefetch_related('options', 'blank_answer_keys').get(
            pk=question_id,
        )
    except Question.DoesNotExist as exc:
        raise PreviewValidationError(f'Question {question_id} was not found.') from exc


def compute_question_score(question: Question, answer: Any) -> dict[str, Any]:
    if question.type == QuestionType.FREE_TEXT:
        return {
            'awarded_points': _serialize_decimal(0),
            'max_points': _serialize_decimal(question.points),
            'is_correct': None,
            'requires_manual_grading': True,
            'detail': {
                'response_text': _extract_submitted_text(answer, free_text=True),
            },
        }

    max_points = Decimal(str(question.points))

    if question.type == QuestionType.MCQ:
        selected = _extract_selected_option(answer)
        correct_option = _correct_option_label(question)
        result = score_mcq(
            selected_option=selected or '',
            correct_option=correct_option,
            max_points=max_points,
        )
    elif question.type == QuestionType.MULTI_SELECT:
        selected = _extract_selected_options(answer) or []
        correct_options = _correct_option_labels(question)
        result = score_multi_select(
            selected_options=selected,
            correct_options=correct_options,
            max_points=max_points,
        )
    elif question.type == QuestionType.TRUE_FALSE:
        selected = _extract_selected_boolean(answer)
        correct_answer = _correct_boolean_answer(question)
        result = score_true_false(
            selected_answer=selected if selected is not None else False,
            correct_answer=correct_answer,
            max_points=max_points,
        )
    elif question.type == QuestionType.FILL_IN_BLANK:
        submitted = _extract_submitted_text(answer) or ''
        accepted_answers = _accepted_blank_answers(question)
        result = score_fib(
            submitted_answer=submitted,
            accepted_answers=accepted_answers,
            max_points=max_points,
        )
    else:
        raise PreviewValidationError(f'Unsupported question type: {question.type}')

    return {
        'awarded_points': _serialize_decimal(result['awarded_points']),
        'max_points': _serialize_decimal(result['max_points']),
        'is_correct': result['is_correct'],
        'requires_manual_grading': False,
        'detail': result['detail'],
    }


def _correct_option_label(question: Question) -> str:
    for option in question.options.all():
        if option.is_correct:
            return option.label
    return ''


def _correct_option_labels(question: Question) -> list[str]:
    return [
        option.label
        for option in question.options.all()
        if option.is_correct
    ]


def _correct_boolean_answer(question: Question) -> bool:
    for option in question.options.all():
        if option.is_correct:
            return option.label.upper() in {'T', 'TRUE'}
    return False


def _accepted_blank_answers(question: Question) -> list[str]:
    return [blank.answer for blank in question.blank_answer_keys.all()]


def record_preview_answer(
    *,
    user_id: int,
    test_id: uuid.UUID,
    question_id: uuid.UUID,
    answer: Any,
) -> dict[str, Any]:
    session = _load_session(user_id=user_id, test_id=test_id)
    question = _get_question_by_id(question_id, session=session)

    validation = validate_answer_format(question, answer)
    if not validation['valid']:
        raise PreviewValidationError('; '.join(validation['errors']))

    partial_score = compute_question_score(question, answer)
    session['answers'][str(question_id)] = answer
    _save_session(user_id=user_id, test_id=test_id, session=session)

    logger.info(
        'Preview answer recorded user_id=%s test_id=%s question_id=%s',
        user_id,
        test_id,
        question_id,
    )

    return {
        'accepted': True,
        'server_ts': timezone.now(),
        'validation': validation,
        'partial_score': partial_score,
    }


def finish_preview_session(
    *,
    user_id: int,
    test_id: uuid.UUID,
) -> dict[str, Any]:
    session = _load_session(user_id=user_id, test_id=test_id)
    per_question: dict[str, Any] = {}
    total_auto_score = Decimal('0')

    for question_key in session['question_id_order']:
        question_uuid = uuid.UUID(question_key)
        question = _get_question_by_id(question_uuid, session=session)
        answer = session['answers'].get(question_key)
        if answer is None:
            score = {
                'awarded_points': _serialize_decimal(0),
                'max_points': _serialize_decimal(question.points),
                'is_correct': False,
                'answered': False,
                'requires_manual_grading': question.type == QuestionType.FREE_TEXT,
            }
        else:
            computed = compute_question_score(question, answer)
            score = {
                **computed,
                'answered': True,
            }
            if not computed.get('requires_manual_grading'):
                total_auto_score += Decimal(computed['awarded_points'])

        per_question[question_key] = score

    cache.delete(_cache_key(user_id=user_id, test_id=test_id))

    logger.info(
        'Preview session finished user_id=%s test_id=%s total_auto_score=%s',
        user_id,
        test_id,
        total_auto_score,
    )

    return {
        'preview': True,
        'total_auto_score': _serialize_decimal(total_auto_score),
        'per_question': per_question,
    }
