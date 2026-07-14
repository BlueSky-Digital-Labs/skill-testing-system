from __future__ import annotations

import uuid
from decimal import Decimal

import pytest

from delivery.services.preview import (
    PreviewTestNotFound,
    PreviewValidationError,
    compute_question_score,
    fetch_questions_for_test,
    finish_preview_session,
    record_preview_answer,
    start_preview_session,
    validate_answer_format,
)
from question_bank.models import (
    BlankAnswerKey,
    Difficulty,
    Option,
    Question,
    QuestionType,
)


@pytest.fixture
def test_id():
    return uuid.uuid4()


@pytest.fixture
def mcq_question(test_id, db):
    question = Question.objects.create(
        subject='Preview',
        topic='Unit',
        text='Choose one',
        difficulty=Difficulty.EASY,
        type=QuestionType.MCQ,
        points=1,
        metadata={'test_id': str(test_id)},
    )
    Option.objects.create(
        question=question,
        label='A',
        value='Right',
        is_correct=True,
        order=0,
    )
    Option.objects.create(
        question=question,
        label='B',
        value='Wrong',
        is_correct=False,
        order=1,
    )
    return question


@pytest.mark.django_db
class TestPreviewService:
    def test_fetch_questions_raises_when_missing(self, test_id):
        with pytest.raises(PreviewTestNotFound):
            fetch_questions_for_test(test_id)

    def test_validate_answer_format_mcq(self, mcq_question):
        valid = validate_answer_format(mcq_question, {'selected_option': 'A'})
        invalid = validate_answer_format(mcq_question, {'selected_option': 1})

        assert valid['valid'] is True
        assert invalid['valid'] is False

    def test_compute_question_score_mcq(self, mcq_question):
        score = compute_question_score(mcq_question, {'selected_option': 'A'})
        assert score['is_correct'] is True
        assert score['awarded_points'] == '1.00'

    def test_preview_session_lifecycle(self, test_id, mcq_question):
        user_id = 101
        start_preview_session(user_id=user_id, test_id=test_id, seed=7)
        answer = record_preview_answer(
            user_id=user_id,
            test_id=test_id,
            question_id=mcq_question.id,
            answer='A',
        )
        assert answer['accepted'] is True

        finished = finish_preview_session(user_id=user_id, test_id=test_id)
        assert finished['preview'] is True
        assert Decimal(finished['total_auto_score']) == Decimal('1.00')

    def test_record_preview_answer_rejects_unknown_question(
        self,
        test_id,
        mcq_question,
    ):
        user_id = 102
        start_preview_session(user_id=user_id, test_id=test_id, seed=3)

        with pytest.raises(PreviewValidationError):
            record_preview_answer(
                user_id=user_id,
                test_id=test_id,
                question_id=uuid.uuid4(),
                answer='A',
            )

    def test_fib_scoring(self, test_id, db):
        question = Question.objects.create(
            subject='Preview',
            topic='Unit',
            text='Capital',
            difficulty=Difficulty.EASY,
            type=QuestionType.FILL_IN_BLANK,
            points=1,
            metadata={'test_id': str(test_id)},
        )
        BlankAnswerKey.objects.create(question=question, answer='Paris')

        user_id = 103
        start_preview_session(user_id=user_id, test_id=test_id, seed=1)
        record_preview_answer(
            user_id=user_id,
            test_id=test_id,
            question_id=question.id,
            answer='paris',
        )
        finished = finish_preview_session(user_id=user_id, test_id=test_id)
        assert finished['per_question'][str(question.id)]['is_correct'] is True
