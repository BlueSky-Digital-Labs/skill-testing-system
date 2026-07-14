from __future__ import annotations

import uuid

from django.core.exceptions import ValidationError
from django.db import models


class AttemptStatus(models.TextChoices):
    IN_PROGRESS = 'in_progress', 'In Progress'
    SUBMITTED = 'submitted', 'Submitted'
    AUTO_SUBMITTED = 'auto_submitted', 'Auto Submitted'
    ABANDONED = 'abandoned', 'Abandoned'


_ORDER_FIELDS = (
    'question_order_seed',
    'option_order_seed',
    'question_id_order',
    'option_id_orders',
)


class Attempt(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    assignment = models.ForeignKey(
        'core.Assignment',
        on_delete=models.CASCADE,
        related_name='attempts',
    )
    candidate_id = models.IntegerField(db_index=True)
    test_id = models.UUIDField(db_index=True)
    status = models.CharField(
        max_length=16,
        choices=AttemptStatus.choices,
        default=AttemptStatus.IN_PROGRESS,
        db_index=True,
    )
    time_limit_seconds = models.PositiveIntegerField()
    started_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(db_index=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    last_saved_at = models.DateTimeField(null=True, blank=True)
    question_order_seed = models.BigIntegerField(null=True, blank=True)
    option_order_seed = models.BigIntegerField(null=True, blank=True)
    question_id_order = models.JSONField(default=list, blank=True)
    option_id_orders = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'delivery_attempt'
        ordering = ['-started_at']
        indexes = [
            models.Index(fields=['assignment', 'candidate_id']),
            models.Index(fields=['status', 'expires_at']),
            models.Index(fields=['candidate_id', 'test_id']),
        ]

    def __str__(self):
        return f'Attempt {self.id} test={self.test_id} candidate={self.candidate_id}'

    @property
    def is_order_initialized(self) -> bool:
        return bool(self.question_id_order)

    @property
    def is_terminal(self) -> bool:
        return self.status in {
            AttemptStatus.SUBMITTED,
            AttemptStatus.AUTO_SUBMITTED,
            AttemptStatus.ABANDONED,
        }

    def _order_fields_locked(self) -> bool:
        if not self.pk:
            return False
        previous = (
            Attempt.objects.filter(pk=self.pk)
            .values(*_ORDER_FIELDS)
            .first()
        )
        if previous is None:
            return False
        return (
            previous['question_order_seed'] is not None
            or previous['option_order_seed'] is not None
            or bool(previous['question_id_order'])
        )

    def clean(self):
        super().clean()
        if not self.pk or not self._order_fields_locked():
            return

        previous = Attempt.objects.get(pk=self.pk)
        for field_name in _ORDER_FIELDS:
            if getattr(self, field_name) != getattr(previous, field_name):
                raise ValidationError(
                    {
                        field_name: (
                            'Question and option order fields are read-only '
                            'after initialization.'
                        )
                    }
                )

    def save(self, *args, **kwargs):
        if self.pk and self._order_fields_locked():
            previous = Attempt.objects.get(pk=self.pk)
            for field_name in _ORDER_FIELDS:
                if getattr(self, field_name) != getattr(previous, field_name):
                    raise ValidationError(
                        {
                            field_name: (
                                'Question and option order fields are read-only '
                                'after initialization.'
                            )
                        }
                    )
        super().save(*args, **kwargs)


class AttemptAnswer(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    attempt = models.ForeignKey(
        Attempt,
        on_delete=models.CASCADE,
        related_name='answers',
    )
    question_id = models.UUIDField(db_index=True)
    question_version = models.PositiveIntegerField(default=1)
    response = models.JSONField(default=dict, blank=True)
    saved_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'delivery_attempt_answer'
        ordering = ['saved_at']
        constraints = [
            models.UniqueConstraint(
                fields=['attempt', 'question_id'],
                name='delivery_unique_answer_per_question',
            ),
        ]
        indexes = [
            models.Index(fields=['attempt', 'question_id']),
        ]

    def __str__(self):
        return f'Answer {self.id} attempt={self.attempt_id} question={self.question_id}'
