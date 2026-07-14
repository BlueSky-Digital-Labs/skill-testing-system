"""
Attempt lifecycle services: start, save, resume, submit, and timing helpers.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any

from django.db import transaction
from django.utils import timezone

from core.models import Assignment, AssignmentStatus, CandidateGroup
from core.services.availability import attempts_remaining, is_within_window
from delivery.models import Attempt, AttemptAnswer, AttemptStatus
from delivery.services.randomization import (
    initialize_attempt_order,
    rehydrate_attempt_order,
)
from question_bank.models import Question

DEFAULT_TIME_LIMIT_SECONDS = 3600


class AttemptServiceError(Exception):
    """Base class for attempt lifecycle errors."""


class AttemptNotEligible(AttemptServiceError):
    """Candidate cannot start or access the attempt."""


class AttemptExpired(AttemptServiceError):
    """Attempt time limit has elapsed."""


class AttemptAlreadySubmitted(AttemptServiceError):
    """Attempt is already in a terminal submitted state."""


class AttemptIntegrityError(AttemptServiceError):
    """Answer or state violates attempt integrity rules."""


@dataclass(frozen=True)
class AnswerPayload:
    question_id: uuid.UUID
    question_version: int
    response: dict[str, Any]


def user_uuid(user_pk: int) -> uuid.UUID:
    return uuid.UUID(int=user_pk)


def candidate_can_access_assignment(assignment: Assignment, user_pk: int) -> bool:
    candidate_uuid = user_uuid(user_pk)
    if assignment.assignee_user_id == candidate_uuid:
        return True
    if assignment.assignee_group_id is None:
        return False
    return CandidateGroup.objects.filter(
        pk=assignment.assignee_group_id,
        members__id=user_pk,
        is_active=True,
    ).exists()


def resolve_questions_for_test(test_id: uuid.UUID) -> list[Question]:
    tagged = list(
        Question.objects.filter(metadata__test_id=str(test_id)).prefetch_related(
            'options',
        )
    )
    if tagged:
        return tagged
    return list(Question.objects.all().prefetch_related('options'))


def build_option_map(questions: list[Question]) -> dict[str, list[str]]:
    option_ids_by_question: dict[str, list[str]] = {}
    for question in questions:
        option_ids_by_question[str(question.id)] = [
            str(option.id) for option in question.options.all()
        ]
    return option_ids_by_question


def calculate_time_limit_seconds(assignment: Assignment, now: datetime) -> int:
    if assignment.closes_at is not None:
        remaining = int((assignment.closes_at - now).total_seconds())
        if remaining <= 0:
            return 0
        return min(DEFAULT_TIME_LIMIT_SECONDS, remaining)
    return DEFAULT_TIME_LIMIT_SECONDS


def calculate_expires_at(started_at: datetime, time_limit_seconds: int) -> datetime:
    return started_at + timedelta(seconds=time_limit_seconds)


def remaining_time_seconds(attempt: Attempt, now: datetime | None = None) -> int:
    if now is None:
        now = timezone.now()
    if attempt.is_terminal:
        return 0
    return max(0, int((attempt.expires_at - now).total_seconds()))


def count_completed_attempts(assignment: Assignment, candidate_id: int) -> int:
    return Attempt.objects.filter(
        assignment=assignment,
        candidate_id=candidate_id,
        status__in=[
            AttemptStatus.SUBMITTED,
            AttemptStatus.AUTO_SUBMITTED,
        ],
    ).count()


def _validate_assignment_eligible(
    assignment: Assignment,
    candidate_id: int,
    now: datetime,
):
    if assignment.status != AssignmentStatus.ACTIVE:
        raise AttemptNotEligible('Assignment is not active.')

    if not candidate_can_access_assignment(assignment, candidate_id):
        raise AttemptNotEligible('You are not assigned to this test.')

    if not is_within_window(assignment.opens_at, assignment.closes_at, now):
        raise AttemptNotEligible('Assignment is not currently available.')

    made = count_completed_attempts(assignment, candidate_id)
    in_progress = Attempt.objects.filter(
        assignment=assignment,
        candidate_id=candidate_id,
        status=AttemptStatus.IN_PROGRESS,
    ).exists()
    remaining = attempts_remaining(assignment, made)
    if remaining <= 0 and not in_progress:
        raise AttemptNotEligible('No attempts remaining for this assignment.')


def _get_questions_for_attempt(attempt: Attempt) -> list[Question]:
    if attempt.question_id_order:
        question_ids = [
            uuid.UUID(question_id) for question_id in attempt.question_id_order
        ]
        questions = list(
            Question.objects.filter(id__in=question_ids).prefetch_related('options')
        )
        by_id = {question.id: question for question in questions}
        return [
            by_id[question_id]
            for question_id in question_ids
            if question_id in by_id
        ]
    return resolve_questions_for_test(attempt.test_id)


@transaction.atomic
def start_attempt(*, assignment_id: uuid.UUID, candidate_id: int) -> Attempt:
    now = timezone.now()
    assignment = Assignment.objects.select_for_update().get(pk=assignment_id)
    _validate_assignment_eligible(assignment, candidate_id, now)

    existing = Attempt.objects.filter(
        assignment=assignment,
        candidate_id=candidate_id,
        status=AttemptStatus.IN_PROGRESS,
    ).first()
    if existing is not None:
        if remaining_time_seconds(existing, now) > 0:
            return existing
        auto_submit_attempt(existing)

    made = count_completed_attempts(assignment, candidate_id)
    if attempts_remaining(assignment, made) <= 0:
        raise AttemptNotEligible('No attempts remaining for this assignment.')

    time_limit_seconds = calculate_time_limit_seconds(assignment, now)
    if time_limit_seconds <= 0:
        raise AttemptNotEligible('Assignment window has closed.')

    started_at = now
    attempt = Attempt.objects.create(
        assignment=assignment,
        candidate_id=candidate_id,
        test_id=assignment.test_id,
        time_limit_seconds=time_limit_seconds,
        expires_at=calculate_expires_at(started_at, time_limit_seconds),
    )

    questions = resolve_questions_for_test(assignment.test_id)
    if not questions:
        raise AttemptNotEligible('No questions are available for this test.')

    question_ids = [str(question.id) for question in questions]
    option_ids_by_question = build_option_map(questions)
    initialize_attempt_order(
        attempt,
        question_ids=question_ids,
        option_ids_by_question=option_ids_by_question,
        shuffle_questions=assignment.shuffle_questions,
        shuffle_options=assignment.shuffle_options,
    )
    attempt.refresh_from_db()
    return attempt


def build_attempt_payload(
    attempt: Attempt,
    now: datetime | None = None,
) -> dict[str, Any]:
    if now is None:
        now = timezone.now()

    questions = _get_questions_for_attempt(attempt)
    option_ids_by_question = build_option_map(questions)
    order = rehydrate_attempt_order(
        attempt,
        question_ids=[str(question.id) for question in questions],
        option_ids_by_question=option_ids_by_question,
        shuffle_questions=attempt.assignment.shuffle_questions,
        shuffle_options=attempt.assignment.shuffle_options,
    )
    answers = {
        str(answer.question_id): {
            'question_version': answer.question_version,
            'response': answer.response,
            'saved_at': answer.saved_at,
        }
        for answer in attempt.answers.all()
    }

    return {
        'id': str(attempt.id),
        'assignment_id': str(attempt.assignment_id),
        'candidate_id': attempt.candidate_id,
        'test_id': str(attempt.test_id),
        'status': attempt.status,
        'started_at': attempt.started_at,
        'expires_at': attempt.expires_at,
        'submitted_at': attempt.submitted_at,
        'last_saved_at': attempt.last_saved_at,
        'time_limit_seconds': attempt.time_limit_seconds,
        'remaining_time_seconds': remaining_time_seconds(attempt, now),
        'question_id_order': order['question_id_order'],
        'option_id_orders': order['option_id_orders'],
        'answers': answers,
    }


def _load_writable_attempt(attempt_id: uuid.UUID, candidate_id: int) -> Attempt:
    attempt = Attempt.objects.select_for_update().select_related('assignment').get(
        pk=attempt_id,
    )
    if attempt.candidate_id != candidate_id:
        raise AttemptNotEligible('You do not own this attempt.')
    if attempt.is_terminal:
        raise AttemptAlreadySubmitted('Attempt has already been submitted.')
    if remaining_time_seconds(attempt) <= 0:
        raise AttemptExpired('Attempt time limit has elapsed.')
    return attempt


def _validate_answer_payloads(
    attempt: Attempt,
    answer_payloads: list[AnswerPayload],
) -> None:
    allowed_question_ids = set(attempt.question_id_order)
    for payload in answer_payloads:
        question_key = str(payload.question_id)
        if question_key not in allowed_question_ids:
            raise AttemptIntegrityError(
                f'Question {payload.question_id} is not part of this attempt.',
            )
        if payload.question_version < 1:
            raise AttemptIntegrityError('question_version must be at least 1.')


@transaction.atomic
def save_attempt_answers(
    *,
    attempt_id: uuid.UUID,
    candidate_id: int,
    answer_payloads: list[AnswerPayload],
) -> Attempt:
    attempt = _load_writable_attempt(attempt_id, candidate_id)
    _validate_answer_payloads(attempt, answer_payloads)

    now = timezone.now()
    for payload in answer_payloads:
        AttemptAnswer.objects.update_or_create(
            attempt=attempt,
            question_id=payload.question_id,
            defaults={
                'question_version': payload.question_version,
                'response': payload.response,
            },
        )

    attempt.last_saved_at = now
    attempt.save(update_fields=['last_saved_at', 'updated_at'])
    return attempt


@transaction.atomic
def resume_attempt(*, attempt_id: uuid.UUID, candidate_id: int) -> dict[str, Any]:
    attempt = Attempt.objects.select_related('assignment').get(pk=attempt_id)
    if attempt.candidate_id != candidate_id:
        raise AttemptNotEligible('You do not own this attempt.')
    if attempt.is_terminal:
        raise AttemptAlreadySubmitted('Attempt has already been submitted.')
    if remaining_time_seconds(attempt) <= 0:
        raise AttemptExpired('Attempt time limit has elapsed.')
    return build_attempt_payload(attempt)


@transaction.atomic
def submit_attempt(
    attempt: Attempt,
    *,
    auto_submitted: bool = False,
) -> Attempt:
    if attempt.is_terminal:
        raise AttemptAlreadySubmitted('Attempt has already been submitted.')

    now = timezone.now()
    if not auto_submitted and remaining_time_seconds(attempt, now) <= 0:
        raise AttemptExpired('Attempt time limit has elapsed.')

    attempt.status = (
        AttemptStatus.AUTO_SUBMITTED if auto_submitted else AttemptStatus.SUBMITTED
    )
    attempt.submitted_at = now
    attempt.save(update_fields=['status', 'submitted_at', 'updated_at'])
    return attempt


@transaction.atomic
def submit_attempt_by_id(
    *,
    attempt_id: uuid.UUID,
    candidate_id: int,
) -> Attempt:
    attempt = _load_writable_attempt(attempt_id, candidate_id)
    return submit_attempt(attempt, auto_submitted=False)


@transaction.atomic
def auto_submit_attempt(attempt: Attempt) -> Attempt:
    if attempt.is_terminal:
        return attempt
    return submit_attempt(attempt, auto_submitted=True)


def auto_submit_due_attempts(now: datetime | None = None) -> int:
    if now is None:
        now = timezone.now()

    due_attempts = Attempt.objects.select_for_update().filter(
        status=AttemptStatus.IN_PROGRESS,
        expires_at__lte=now,
    )
    count = 0
    for attempt in due_attempts:
        auto_submit_attempt(attempt)
        count += 1
    return count
