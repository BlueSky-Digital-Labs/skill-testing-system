"""
Question version snapshot services.
"""

from __future__ import annotations

import hashlib
import json
from typing import Iterable

from question_bank.models import Question, QuestionType, QuestionVersion

SNAPSHOT_FIELDS = (
    "subject",
    "topic",
    "difficulty",
    "question_type",
    "prompt",
    "points",
    "image_url",
    "explanation",
    "options",
    "correct_answers",
)


def build_snapshot_payload(question: Question) -> dict:
    """Build canonical snapshot data from a live question."""
    options = list(
        question.options.order_by("order", "label").values(
            "label",
            "value",
            "is_correct",
            "order",
        ),
    )
    blank_keys = list(
        question.blank_answer_keys.order_by("answer").values(
            "answer",
            "case_sensitive",
        ),
    )

    if question.type in {
        QuestionType.MCQ,
        QuestionType.MULTI_SELECT,
        QuestionType.TRUE_FALSE,
    }:
        correct_answers = [
            option["value"] for option in options if option["is_correct"]
        ]
    elif question.type == QuestionType.FILL_IN_BLANK:
        correct_answers = [blank_key["answer"] for blank_key in blank_keys]
    else:
        correct_answers = []

    image_url = ""
    if question.image:
        image_url = question.image.url

    metadata = question.metadata or {}
    explanation = metadata.get("explanation", "")

    return {
        "subject": question.subject,
        "topic": question.topic,
        "difficulty": question.difficulty,
        "question_type": question.type,
        "prompt": question.text,
        "points": question.points,
        "image_url": image_url,
        "explanation": explanation,
        "options": options,
        "correct_answers": correct_answers,
    }


def compute_payload_hash(payload: dict) -> str:
    """Return a stable SHA-256 digest for snapshot payload data."""
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def get_next_version_number(question: Question) -> int:
    """Return the next monotonic version number for a question."""
    latest = (
        QuestionVersion.objects.filter(question=question)
        .order_by("-version_number")
        .values_list("version_number", flat=True)
        .first()
    )
    return 1 if latest is None else latest + 1


def create_snapshot(
    question: Question,
    *,
    created_by=None,
) -> QuestionVersion:
    """
    Persist a version snapshot for the current question state.

    Returns the latest existing version when the payload hash is unchanged.
    """
    payload = build_snapshot_payload(question)
    payload_hash = compute_payload_hash(payload)

    latest = (
        QuestionVersion.objects.filter(question=question)
        .order_by("-version_number")
        .first()
    )
    if latest is not None and latest.sha256 == payload_hash:
        return latest

    version_number = get_next_version_number(question)
    return QuestionVersion.objects.create(
        question=question,
        version_number=version_number,
        created_by=created_by,
        sha256=payload_hash,
        **payload,
    )


def snapshot_many(
    questions: Iterable[Question],
    *,
    created_by=None,
) -> list[QuestionVersion]:
    """Create snapshots for multiple questions."""
    return [create_snapshot(question, created_by=created_by) for question in questions]


def snapshot_questions_by_id(
    questions: Iterable[Question],
    *,
    created_by=None,
) -> dict:
    """
    Create snapshots for multiple questions and return a question_id mapping.

    Intended for test publish flows that need pinned QuestionVersion rows.
    """
    versions = snapshot_many(questions, created_by=created_by)
    return {version.question_id: version for version in versions}
