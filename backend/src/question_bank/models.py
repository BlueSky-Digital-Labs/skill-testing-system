"""
Question bank models.
"""

from __future__ import annotations

import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


class QuestionType(models.TextChoices):
    MCQ = 'MCQ', 'Multiple Choice'
    MULTI_SELECT = 'MULTI_SELECT', 'Multi Select'
    TRUE_FALSE = 'TRUE_FALSE', 'True/False'
    FILL_IN_BLANK = 'FILL_IN_BLANK', 'Fill in the Blank'
    FREE_TEXT = 'FREE_TEXT', 'Free Text'


class Difficulty(models.TextChoices):
    EASY = 'EASY', 'Easy'
    MEDIUM = 'MEDIUM', 'Medium'
    HARD = 'HARD', 'Hard'


class Question(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subject = models.CharField(max_length=128, db_index=True)
    topic = models.CharField(max_length=128, db_index=True)
    difficulty = models.CharField(
        max_length=16,
        choices=Difficulty.choices,
        default=Difficulty.MEDIUM,
        db_index=True,
    )
    type = models.CharField(
        max_length=32,
        choices=QuestionType.choices,
        db_index=True,
    )
    text = models.TextField()
    image = models.ImageField(upload_to='questions/', null=True, blank=True)
    points = models.PositiveIntegerField(default=1)
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='authored_questions',
    )
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['subject', 'topic']),
            models.Index(fields=['type', 'difficulty']),
        ]

    def __str__(self):
        return f'{self.subject}/{self.topic}: {self.text[:50]}'

    def clean(self):
        super().clean()
        if not self.pk:
            return

        options = list(self.options.all())
        blank_keys = list(self.blank_answer_keys.all())

        if self.type == QuestionType.MCQ:
            self._validate_mcq_options(options)
        elif self.type == QuestionType.MULTI_SELECT:
            self._validate_multi_select_options(options)
        elif self.type == QuestionType.TRUE_FALSE:
            self._validate_true_false_options(options)
        elif self.type == QuestionType.FILL_IN_BLANK:
            self._validate_fill_in_blank(blank_keys, options)
        elif self.type == QuestionType.FREE_TEXT:
            self._validate_free_text(options, blank_keys)

    @staticmethod
    def _validate_mcq_options(options):
        if len(options) < 2:
            raise ValidationError(
                {'options': 'MCQ questions must have at least two options.'},
            )
        correct_count = sum(1 for option in options if option.is_correct)
        if correct_count != 1:
            raise ValidationError(
                {'options': 'MCQ questions must have exactly one correct option.'},
            )

    @staticmethod
    def _validate_multi_select_options(options):
        if len(options) < 2:
            raise ValidationError(
                {'options': 'Multi-select questions must have at least two options.'},
            )
        correct_count = sum(1 for option in options if option.is_correct)
        if correct_count < 1:
            raise ValidationError(
                {'options': 'Multi-select questions must have at least one correct option.'},
            )

    @staticmethod
    def _validate_true_false_options(options):
        if len(options) != 2:
            raise ValidationError(
                {'options': 'True/false questions must have exactly two options.'},
            )
        correct_count = sum(1 for option in options if option.is_correct)
        if correct_count != 1:
            raise ValidationError(
                {'options': 'True/false questions must have exactly one correct option.'},
            )

    @staticmethod
    def _validate_fill_in_blank(blank_keys, options):
        if not blank_keys:
            raise ValidationError(
                {'blank_answer_keys': 'Fill-in-the-blank questions require at least one accepted answer.'},
            )
        if options:
            raise ValidationError(
                {'options': 'Fill-in-the-blank questions must not include options.'},
            )

    @staticmethod
    def _validate_free_text(options, blank_keys):
        if options:
            raise ValidationError(
                {'options': 'Free-text questions must not include options.'},
            )
        if blank_keys:
            raise ValidationError(
                {'blank_answer_keys': 'Free-text questions must not include blank answer keys.'},
            )


class Option(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name='options',
    )
    label = models.CharField(max_length=8)
    value = models.CharField(max_length=512)
    is_correct = models.BooleanField(default=False)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['order', 'label']
        constraints = [
            models.UniqueConstraint(
                fields=['question', 'label'],
                name='unique_option_label_per_question',
            ),
            models.UniqueConstraint(
                fields=['question', 'value'],
                name='unique_option_value_per_question',
            ),
        ]

    def __str__(self):
        return f'{self.label}: {self.value}'


class BlankAnswerKey(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name='blank_answer_keys',
    )
    answer = models.CharField(max_length=512)
    case_sensitive = models.BooleanField(default=False)

    class Meta:
        ordering = ['answer']
        constraints = [
            models.UniqueConstraint(
                fields=['question', 'answer'],
                name='unique_blank_answer_per_question',
            ),
        ]

    def __str__(self):
        return self.answer
