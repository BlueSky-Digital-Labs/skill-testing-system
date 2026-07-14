"""
Tests for question version snapshots.
"""

from __future__ import annotations

import pytest
from django.contrib.auth import get_user_model

from question_bank.models import (
    Difficulty,
    Option,
    Question,
    QuestionType,
    QuestionVersion,
)
from question_bank.services.versioning import (
    compute_payload_hash,
    create_snapshot,
    get_next_version_number,
    snapshot_many,
)

User = get_user_model()


@pytest.fixture
def author(db):
    return User.objects.create_user(
        email="versioning@example.com",
        password="VersionPass123!",
    )


@pytest.fixture
def mcq_question(db, author):
    question = Question.objects.create(
        subject="Mathematics",
        topic="Algebra",
        difficulty=Difficulty.MEDIUM,
        type=QuestionType.MCQ,
        text="What is 2 + 2?",
        points=2,
        author=author,
        metadata={"explanation": "Basic arithmetic."},
    )
    Option.objects.create(
        question=question,
        label="A",
        value="3",
        is_correct=False,
        order=0,
    )
    Option.objects.create(
        question=question,
        label="B",
        value="4",
        is_correct=True,
        order=1,
    )
    return question


@pytest.mark.django_db
class TestSnapshotCreation:
    def test_create_snapshot_persists_version_one(self, mcq_question, author):
        version = create_snapshot(mcq_question, created_by=author)

        assert version.version_number == 1
        assert version.question_id == mcq_question.pk
        assert version.created_by_id == author.pk
        assert version.subject == "Mathematics"
        assert version.topic == "Algebra"
        assert version.difficulty == Difficulty.MEDIUM
        assert version.question_type == QuestionType.MCQ
        assert version.prompt == "What is 2 + 2?"
        assert version.points == 2
        assert version.explanation == "Basic arithmetic."
        assert len(version.options) == 2
        assert version.correct_answers == ["4"]
        assert version.sha256
        assert QuestionVersion.objects.filter(question=mcq_question).count() == 1

    def test_get_next_version_number_starts_at_one(self, mcq_question):
        assert get_next_version_number(mcq_question) == 1

    def test_compute_payload_hash_is_stable(self, mcq_question):
        from question_bank.services.versioning import build_snapshot_payload

        payload = build_snapshot_payload(mcq_question)
        first_hash = compute_payload_hash(payload)
        second_hash = compute_payload_hash(payload)

        assert first_hash == second_hash
        assert len(first_hash) == 64


@pytest.mark.django_db
class TestVersionIncrement:
    def test_changed_question_creates_new_version(self, mcq_question, author):
        first_version = create_snapshot(mcq_question, created_by=author)

        mcq_question.text = "What is 3 + 3?"
        mcq_question.save(update_fields=["text"])

        second_version = create_snapshot(mcq_question, created_by=author)

        assert first_version.version_number == 1
        assert second_version.version_number == 2
        assert second_version.pk != first_version.pk
        assert second_version.prompt == "What is 3 + 3?"
        assert QuestionVersion.objects.filter(question=mcq_question).count() == 2

    def test_get_next_version_number_increments(self, mcq_question, author):
        create_snapshot(mcq_question, created_by=author)
        assert get_next_version_number(mcq_question) == 2


@pytest.mark.django_db
class TestSnapshotIdempotency:
    def test_repeated_snapshot_returns_existing_version(self, mcq_question, author):
        first_version = create_snapshot(mcq_question, created_by=author)
        second_version = create_snapshot(mcq_question, created_by=author)

        assert first_version.pk == second_version.pk
        assert QuestionVersion.objects.filter(question=mcq_question).count() == 1

    def test_snapshot_many_is_idempotent(self, mcq_question, author):
        versions = snapshot_many([mcq_question], created_by=author)
        repeated_versions = snapshot_many([mcq_question], created_by=author)

        assert len(versions) == 1
        assert versions[0].pk == repeated_versions[0].pk
        assert QuestionVersion.objects.filter(question=mcq_question).count() == 1
