import uuid

from django.db import models


class ScoringPolicy(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)
    partial_credit = models.BooleanField(default=False)
    negative_marking = models.BooleanField(default=False)
    per_option_value = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'scoring policy'
        verbose_name_plural = 'scoring policies'

    def __str__(self):
        return self.name


class ObjectiveScore(models.Model):
    QUESTION_TYPE_CHOICES = [
        ('mcq', 'Multiple Choice'),
        ('true_false', 'True/False'),
        ('fib', 'Fill in the Blank'),
        ('multi_select', 'Multi Select'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    attempt_id = models.CharField(max_length=64, db_index=True)
    question_id = models.CharField(max_length=64, db_index=True)
    question_version = models.PositiveIntegerField()
    question_type = models.CharField(max_length=32, choices=QUESTION_TYPE_CHOICES)
    awarded_points = models.DecimalField(max_digits=8, decimal_places=2)
    max_points = models.DecimalField(max_digits=8, decimal_places=2)
    is_correct = models.BooleanField()
    detail = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'objective score'
        verbose_name_plural = 'objective scores'
        indexes = [
            models.Index(fields=['attempt_id', 'question_id']),
        ]

    def __str__(self):
        return (
            f'Score {self.id} attempt={self.attempt_id} '
            f'question={self.question_id}'
        )


class FreeTextQueueItem(models.Model):
    STATUS_QUEUED = 'queued'
    STATUS_GRADED = 'graded'
    STATUS_CHOICES = [
        (STATUS_QUEUED, 'Queued'),
        (STATUS_GRADED, 'Graded'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    attempt_id = models.CharField(max_length=64, db_index=True)
    test_id = models.CharField(max_length=64, db_index=True)
    question_id = models.CharField(max_length=64, db_index=True)
    question_version = models.CharField(max_length=32, null=True, blank=True)
    candidate_display = models.CharField(max_length=255, null=True, blank=True)
    blind_marking = models.BooleanField(default=False)
    response_text = models.TextField()
    max_points = models.DecimalField(max_digits=8, decimal_places=2)
    topic = models.CharField(max_length=128)
    status = models.CharField(
        max_length=16,
        choices=STATUS_CHOICES,
        default=STATUS_QUEUED,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'free text queue item'
        verbose_name_plural = 'free text queue items'
        indexes = [
            models.Index(fields=['status', 'test_id']),
            models.Index(fields=['attempt_id', 'question_id']),
        ]

    def __str__(self):
        return (
            f'Queue item {self.id} attempt={self.attempt_id} '
            f'question={self.question_id} ({self.status})'
        )


class ManualGrade(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    queue_item = models.OneToOneField(
        FreeTextQueueItem,
        on_delete=models.CASCADE,
        related_name='manual_grade',
    )
    grader_user_id = models.IntegerField()
    awarded_points = models.DecimalField(max_digits=8, decimal_places=2)
    feedback = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'manual grade'
        verbose_name_plural = 'manual grades'

    def __str__(self):
        return f'Manual grade {self.id} for queue item {self.queue_item_id}'


class CombinedResult(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    attempt_id = models.CharField(max_length=64, unique=True, db_index=True)
    test_id = models.CharField(max_length=64, db_index=True)
    total_awarded = models.DecimalField(max_digits=10, decimal_places=2)
    total_max = models.DecimalField(max_digits=10, decimal_places=2)
    by_topic = models.JSONField(default=dict, blank=True)
    passed = models.BooleanField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'combined result'
        verbose_name_plural = 'combined results'

    def __str__(self):
        return f'Combined result {self.attempt_id} passed={self.passed}'


from .config import TestConfigSnapshot  # noqa: E402,F401
