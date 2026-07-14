"""
Transactional bulk upsert for validated question import rows.
"""

from __future__ import annotations

from typing import Any

from django.db import transaction

from question_bank.models import BlankAnswerKey, Option, Question


def bulk_upsert(
    rows: list[dict],
    *,
    author=None,
) -> dict[str, Any]:
    """
    Create or update questions from validated import rows inside a transaction.

    Rows with an ``id`` field update an existing question; rows without ``id``
    create new questions. Returns a summary dict suitable for API responses.
    """
    if not rows:
        return {
            'created': 0,
            'updated': 0,
            'total': 0,
            'question_ids': [],
        }

    created = 0
    updated = 0
    question_ids: list[str] = []

    try:
        with transaction.atomic():
            for row in rows:
                question, was_created = _upsert_row(row, author=author)
                question_ids.append(str(question.pk))
                if was_created:
                    created += 1
                else:
                    updated += 1
    except Exception as exc:
        raise ImportUpsertError(str(exc)) from exc

    return {
        'created': created,
        'updated': updated,
        'total': len(rows),
        'question_ids': question_ids,
    }


class ImportUpsertError(Exception):
    """Raised when a bulk upsert fails and the transaction is rolled back."""


def _upsert_row(row: dict, *, author=None) -> tuple[Question, bool]:
    options_data = row.get('options') or []
    blank_keys_data = row.get('blank_answer_keys') or []
    question_id = row.get('id')

    if question_id:
        question = Question.objects.get(pk=question_id)
        question.subject = row['subject']
        question.topic = row['topic']
        question.difficulty = row['difficulty']
        question.type = row['type']
        question.text = row['text']
        question.points = row['points']
        question.metadata = row.get('metadata') or {}
        if author is not None and question.author_id is None:
            question.author = author
        question.save()
        _replace_nested(question, options_data, blank_keys_data)
        question.full_clean()
        return question, False

    create_kwargs = {
        'subject': row['subject'],
        'topic': row['topic'],
        'difficulty': row['difficulty'],
        'type': row['type'],
        'text': row['text'],
        'points': row['points'],
        'metadata': row.get('metadata') or {},
    }
    if author is not None:
        create_kwargs['author'] = author

    question = Question.objects.create(**create_kwargs)
    _replace_nested(question, options_data, blank_keys_data)
    question.full_clean()
    return question, True


def _replace_nested(
    question: Question,
    options_data: list[dict],
    blank_keys_data: list[dict],
) -> None:
    question.options.all().delete()
    question.blank_answer_keys.all().delete()

    for option_data in options_data:
        Option.objects.create(question=question, **option_data)

    for blank_key_data in blank_keys_data:
        BlankAnswerKey.objects.create(question=question, **blank_key_data)
