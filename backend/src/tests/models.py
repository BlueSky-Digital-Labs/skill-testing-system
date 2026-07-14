"""
Test assembly models.
"""

from __future__ import annotations

import uuid

from django.conf import settings as django_settings
from django.core.exceptions import ValidationError
from django.db import models

from question_bank.models import Difficulty, Question, QuestionType


class TestLifecycle(models.TextChoices):
    DRAFT = 'draft', 'Draft'
    PUBLISHED = 'published', 'Published'
    ARCHIVED = 'archived', 'Archived'


class QuestionLinkSource(models.TextChoices):
    MANUAL = 'manual', 'Manual'
    RULE = 'rule', 'Rule'


class ShuffleSeedType(models.TextChoices):
    QUESTIONS = 'questions', 'Questions'
    OPTIONS = 'options', 'Options'


class Test(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    lifecycle = models.CharField(
        max_length=16,
        choices=TestLifecycle.choices,
        default=TestLifecycle.DRAFT,
        db_index=True,
    )
    settings = models.JSONField(default=dict, blank=True)
    created_by = models.ForeignKey(
        django_settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_tests',
    )
    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['lifecycle', 'created_at']),
        ]

    def __str__(self):
        return self.title

    @property
    def is_editable(self) -> bool:
        return self.lifecycle == TestLifecycle.DRAFT


class TestSection(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    test = models.ForeignKey(
        Test,
        on_delete=models.CASCADE,
        related_name='sections',
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    order = models.PositiveIntegerField(default=0)
    settings = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['order', 'title']
        constraints = [
            models.UniqueConstraint(
                fields=['test', 'order'],
                name='unique_section_order_per_test',
            ),
        ]

    def __str__(self):
        return f'{self.test.title}: {self.title}'


class TestQuestionLink(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    section = models.ForeignKey(
        TestSection,
        on_delete=models.CASCADE,
        related_name='question_links',
    )
    question = models.ForeignKey(
        Question,
        on_delete=models.PROTECT,
        related_name='test_links',
    )
    question_version = models.ForeignKey(
        'question_bank.QuestionVersion',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='test_links',
    )
    order = models.PositiveIntegerField(default=0)
    source = models.CharField(
        max_length=16,
        choices=QuestionLinkSource.choices,
        default=QuestionLinkSource.MANUAL,
    )
    selection_rule = models.ForeignKey(
        'SelectionRule',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='resolved_links',
    )

    class Meta:
        ordering = ['order']
        constraints = [
            models.UniqueConstraint(
                fields=['section', 'question'],
                name='unique_question_per_section',
            ),
        ]

    def __str__(self):
        return f'{self.section.title}: {self.question_id}'


class SelectionRule(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    section = models.ForeignKey(
        TestSection,
        on_delete=models.CASCADE,
        related_name='selection_rules',
    )
    subject = models.CharField(max_length=128, blank=True, default='')
    topic = models.CharField(max_length=128, blank=True, default='')
    difficulty = models.CharField(
        max_length=16,
        choices=Difficulty.choices,
        blank=True,
        default='',
    )
    question_type = models.CharField(
        max_length=32,
        choices=QuestionType.choices,
        blank=True,
        default='',
    )
    count = models.PositiveIntegerField()
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']
        constraints = [
            models.UniqueConstraint(
                fields=['section', 'order'],
                name='unique_rule_order_per_section',
            ),
        ]

    def __str__(self):
        return f'{self.section.title} rule ({self.count})'

    def clean(self):
        super().clean()
        if self.count < 1:
            raise ValidationError({'count': 'Selection count must be at least 1.'})


class TestShuffleSeed(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    test = models.ForeignKey(
        Test,
        on_delete=models.CASCADE,
        related_name='shuffle_seeds',
    )
    seed_type = models.CharField(
        max_length=16,
        choices=ShuffleSeedType.choices,
    )
    seed_value = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['test', 'seed_type'],
                name='unique_shuffle_seed_type_per_test',
            ),
        ]

    def __str__(self):
        return f'{self.test.title} {self.seed_type}={self.seed_value}'
