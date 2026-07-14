"""
Test publish workflow.
"""

from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from question_bank.services.versioning import snapshot_questions_by_id
from tests.models import (
    QuestionLinkSource,
    ShuffleSeedType,
    Test,
    TestLifecycle,
    TestQuestionLink,
    TestShuffleSeed,
)
from tests.services.rules import evaluate_section_rules, section_has_questions


class PublishError(Exception):
    """Raised when a test cannot be published."""


def _validate_publishable(test: Test) -> None:
    if test.lifecycle != TestLifecycle.DRAFT:
        raise PublishError('Only draft tests can be published.')

    sections = list(test.sections.order_by('order'))
    if not sections:
        raise PublishError('Test must have at least one section.')

    for section in sections:
        if not section_has_questions(section):
            raise PublishError(
                f'Section "{section.title}" must include questions or selection rules.',
            )


def _resolve_rule_links(test: Test, *, created_by=None) -> list:
    """Resolve selection rules into question links and return all questions."""
    questions: list = []
    seen_ids: set = set()

    for section in test.sections.order_by('order'):
        for rule, selected in evaluate_section_rules(section):
            for index, question in enumerate(selected):
                if question.id in seen_ids:
                    continue
                seen_ids.add(question.id)
                questions.append(question)

                TestQuestionLink.objects.create(
                    section=section,
                    question=question,
                    order=section.question_links.count() + index,
                    source=QuestionLinkSource.RULE,
                    selection_rule=rule,
                )

    return questions


def _collect_questions(test: Test) -> list:
    """Return all distinct questions referenced by a test."""
    question_ids = (
        TestQuestionLink.objects.filter(section__test=test)
        .values_list('question_id', flat=True)
        .distinct()
    )
    from question_bank.models import Question

    return list(Question.objects.filter(id__in=question_ids))


def _pin_versions(test: Test, versions_by_question: dict) -> None:
    for link in TestQuestionLink.objects.filter(section__test=test):
        version = versions_by_question.get(link.question_id)
        if version is None:
            raise PublishError(
                f'No version snapshot for question {link.question_id}.',
            )
        link.question_version = version
        link.save(update_fields=['question_version'])


def _create_shuffle_seeds(test: Test) -> None:
    settings = test.settings or {}
    if settings.get('shuffle_questions'):
        TestShuffleSeed.objects.get_or_create(
            test=test,
            seed_type=ShuffleSeedType.QUESTIONS,
            defaults={'seed_value': abs(hash(test.id)) % (2**31)},
        )
    if settings.get('shuffle_options'):
        TestShuffleSeed.objects.get_or_create(
            test=test,
            seed_type=ShuffleSeedType.OPTIONS,
            defaults={'seed_value': abs(hash(str(test.id))) % (2**31)},
        )


@transaction.atomic
def publish_test(test: Test, *, created_by=None) -> Test:
    """
    Validate, snapshot questions, resolve rules, and publish a test.
    """
    _validate_publishable(test)

    try:
        rule_questions = _resolve_rule_links(test, created_by=created_by)
    except ValueError as exc:
        raise PublishError(str(exc)) from exc

    manual_questions = _collect_questions(test)
    all_questions = {question.id: question for question in manual_questions}
    for question in rule_questions:
        all_questions[question.id] = question

    if not all_questions:
        raise PublishError('Test must include at least one question.')

    versions_by_question = snapshot_questions_by_id(
        all_questions.values(),
        created_by=created_by,
    )
    _pin_versions(test, versions_by_question)
    _create_shuffle_seeds(test)

    test.lifecycle = TestLifecycle.PUBLISHED
    test.published_at = timezone.now()
    test.save(update_fields=['lifecycle', 'published_at', 'updated_at'])

    return test


@transaction.atomic
def archive_test(test: Test) -> Test:
    """Archive a published test."""
    if test.lifecycle != TestLifecycle.PUBLISHED:
        raise PublishError('Only published tests can be archived.')

    test.lifecycle = TestLifecycle.ARCHIVED
    test.save(update_fields=['lifecycle', 'updated_at'])
    return test
