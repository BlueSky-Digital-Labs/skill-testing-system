"""
Tests for selection rule evaluation.
"""

from __future__ import annotations

import pytest
from django.contrib.auth import get_user_model

from question_bank.models import Difficulty, Option, Question, QuestionType
from tests.models import SelectionRule, Test, TestSection
from tests.services.publish import PublishError, publish_test
from tests.services.rules import (
    build_rule_queryset,
    evaluate_rule,
    evaluate_section_rules,
)

User = get_user_model()


@pytest.fixture
def author(db):
    return User.objects.create_user(
        email='rules@example.com',
        password='RulesPass123!',
    )


@pytest.fixture
def test_section(db, author):
    test = Test.objects.create(title='Rule Test', created_by=author)
    return TestSection.objects.create(test=test, title='Main', order=0)


def create_mcq(subject, topic, difficulty=Difficulty.MEDIUM, text='Sample'):
    question = Question.objects.create(
        subject=subject,
        topic=topic,
        difficulty=difficulty,
        type=QuestionType.MCQ,
        text=text,
        points=1,
    )
    Option.objects.create(
        question=question,
        label='A',
        value='yes',
        is_correct=True,
        order=0,
    )
    Option.objects.create(
        question=question,
        label='B',
        value='no',
        is_correct=False,
        order=1,
    )
    return question


@pytest.mark.django_db
class TestRuleQueryset:
    def test_build_rule_queryset_filters_subject_and_topic(self, test_section):
        create_mcq('Math', 'Algebra')
        create_mcq('Math', 'Geometry')
        create_mcq('Science', 'Biology')

        rule = SelectionRule.objects.create(
            section=test_section,
            subject='Math',
            topic='Algebra',
            count=1,
            order=0,
        )

        results = list(build_rule_queryset(rule))

        assert len(results) == 1
        assert results[0].subject == 'Math'
        assert results[0].topic == 'Algebra'


@pytest.mark.django_db
class TestRuleEvaluation:
    def test_evaluate_rule_selects_requested_count(self, test_section):
        for index in range(3):
            create_mcq('Math', 'Algebra', text=f'Q{index}')

        rule = SelectionRule.objects.create(
            section=test_section,
            subject='Math',
            count=2,
            order=0,
        )

        selected = evaluate_rule(rule)

        assert len(selected) == 2

    def test_evaluate_rule_raises_when_insufficient_questions(self, test_section):
        create_mcq('Math', 'Algebra')

        rule = SelectionRule.objects.create(
            section=test_section,
            subject='Math',
            count=3,
            order=0,
        )

        with pytest.raises(ValueError, match='requires 3'):
            evaluate_rule(rule)

    def test_evaluate_section_rules_respects_order(self, test_section):
        create_mcq('Math', 'Algebra', text='A')
        create_mcq('Math', 'Geometry', text='B')

        rule_one = SelectionRule.objects.create(
            section=test_section,
            subject='Math',
            topic='Algebra',
            count=1,
            order=0,
        )
        rule_two = SelectionRule.objects.create(
            section=test_section,
            subject='Math',
            topic='Geometry',
            count=1,
            order=1,
        )

        results = evaluate_section_rules(test_section)

        assert len(results) == 2
        assert results[0][0].pk == rule_one.pk
        assert results[1][0].pk == rule_two.pk
        assert results[0][1][0].topic == 'Algebra'
        assert results[1][1][0].topic == 'Geometry'


@pytest.mark.django_db
class TestRulePublishIntegration:
    def test_publish_resolves_rules_into_links(self, test_section, author):
        question = create_mcq('Math', 'Algebra')

        SelectionRule.objects.create(
            section=test_section,
            subject='Math',
            topic='Algebra',
            count=1,
            order=0,
        )

        published = publish_test(test_section.test, created_by=author)

        links = published.sections.first().question_links.all()
        assert links.count() == 1
        assert links.first().question_id == question.id
        assert links.first().source == 'rule'
        assert links.first().question_version is not None

    def test_publish_fails_when_rules_unsatisfiable(self, test_section, author):
        SelectionRule.objects.create(
            section=test_section,
            subject='Math',
            count=1,
            order=0,
        )

        with pytest.raises(PublishError, match='requires 1'):
            publish_test(test_section.test, created_by=author)
