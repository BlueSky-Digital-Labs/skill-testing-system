"""
Signals guarding edits to questions referenced by published tests.
"""

from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db.models.signals import pre_delete, pre_save
from django.dispatch import receiver

from question_bank.models import BlankAnswerKey, Option, Question

GUARDED_QUESTION_FIELDS = frozenset(
    {
        "subject",
        "topic",
        "difficulty",
        "type",
        "text",
        "image",
        "points",
        "metadata",
    }
)


def is_in_published_test(question: Question) -> bool:
    """Return True when a question is referenced by a published test."""
    from tests.models import TestLifecycle, TestQuestionLink

    return TestQuestionLink.objects.filter(
        question=question,
        section__test__lifecycle=TestLifecycle.PUBLISHED,
    ).exists()


def _raise_if_published(question: Question, *, action: str) -> None:
    if is_in_published_test(question):
        raise ValidationError(
            f"Cannot {action} content for a question used in a published test.",
        )


@receiver(pre_save, sender=Question)
def guard_question_save(sender, instance: Question, **kwargs) -> None:
    if not instance.pk or not is_in_published_test(instance):
        return

    original = Question.objects.get(pk=instance.pk)
    changed_fields = [
        field
        for field in GUARDED_QUESTION_FIELDS
        if getattr(original, field) != getattr(instance, field)
    ]
    if changed_fields:
        raise ValidationError(
            "Cannot modify question fields used in a published test: "
            f'{", ".join(sorted(changed_fields))}.',
        )


@receiver(pre_delete, sender=Question)
def guard_question_delete(sender, instance: Question, **kwargs) -> None:
    _raise_if_published(instance, action="delete")


@receiver(pre_save, sender=Option)
def guard_option_save(sender, instance: Option, **kwargs) -> None:
    _raise_if_published(instance.question, action="modify options for")


@receiver(pre_delete, sender=Option)
def guard_option_delete(sender, instance: Option, **kwargs) -> None:
    _raise_if_published(instance.question, action="delete options for")


@receiver(pre_save, sender=BlankAnswerKey)
def guard_blank_answer_key_save(sender, instance: BlankAnswerKey, **kwargs) -> None:
    _raise_if_published(
        instance.question,
        action="modify blank answer keys for",
    )


@receiver(pre_delete, sender=BlankAnswerKey)
def guard_blank_answer_key_delete(sender, instance: BlankAnswerKey, **kwargs) -> None:
    _raise_if_published(
        instance.question,
        action="delete blank answer keys for",
    )
