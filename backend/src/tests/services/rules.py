"""
Selection rule evaluation for test assembly.
"""

from __future__ import annotations

from django.db.models import QuerySet

from question_bank.models import Question
from tests.models import SelectionRule, TestQuestionLink


def build_rule_queryset(rule: SelectionRule) -> QuerySet[Question]:
    """Return questions matching a selection rule's filters."""
    queryset = Question.objects.all().order_by('created_at', 'id')

    if rule.subject:
        queryset = queryset.filter(subject=rule.subject)
    if rule.topic:
        queryset = queryset.filter(topic=rule.topic)
    if rule.difficulty:
        queryset = queryset.filter(difficulty=rule.difficulty)
    if rule.question_type:
        queryset = queryset.filter(type=rule.question_type)

    return queryset


def get_excluded_question_ids(section) -> set:
    """Collect question IDs already linked or reserved in a section."""
    manual_ids = set(
        TestQuestionLink.objects.filter(section=section)
        .values_list('question_id', flat=True),
    )
    return manual_ids


def evaluate_rule(
    rule: SelectionRule,
    *,
    excluded_ids: set | None = None,
) -> list[Question]:
    """
    Select questions for a rule, excluding already-used question IDs.

    Raises ValueError when insufficient questions are available.
    """
    excluded = excluded_ids or set()
    excluded |= get_excluded_question_ids(rule.section)

    queryset = build_rule_queryset(rule).exclude(id__in=excluded)
    selected = list(queryset[: rule.count])

    if len(selected) < rule.count:
        raise ValueError(
            f'Rule in section "{rule.section.title}" requires {rule.count} '
            f'question(s) but only {len(selected)} match the criteria.',
        )

    return selected


def evaluate_section_rules(section) -> list[tuple[SelectionRule, list[Question]]]:
    """Evaluate all rules for a section in order."""
    results: list[tuple[SelectionRule, list[Question]]] = []
    excluded: set = get_excluded_question_ids(section)

    for rule in section.selection_rules.order_by('order'):
        selected = evaluate_rule(rule, excluded_ids=excluded)
        results.append((rule, selected))
        excluded.update(question.id for question in selected)

    return results


def section_has_questions(section) -> bool:
    """Return True when a section has manual links or satisfiable rules."""
    if section.question_links.filter(source='manual').exists():
        return True
    return section.selection_rules.exists()
