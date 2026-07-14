from __future__ import annotations

import uuid

from django.db import models


class EmailTemplate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    key = models.CharField(max_length=64, unique=True, db_index=True)
    subject = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    html_body = models.TextField(blank=True, default='')
    text_body = models.TextField(blank=True, default='')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'notifications_email_template'
        ordering = ['key']

    def __str__(self):
        return self.key


class EmailMessageLog(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        SENT = 'sent', 'Sent'
        FAILED = 'failed', 'Failed'
        THROTTLED = 'throttled', 'Throttled'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient_email = models.EmailField(db_index=True)
    template_key = models.CharField(max_length=64, db_index=True)
    subject = models.CharField(max_length=255)
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    provider = models.CharField(max_length=32, blank=True, default='')
    assignment_id = models.UUIDField(null=True, blank=True, db_index=True)
    test_id = models.UUIDField(null=True, blank=True, db_index=True)
    metadata = models.JSONField(default=dict, blank=True)
    sent_at = models.DateTimeField(auto_now_add=True, db_index=True)
    error_message = models.TextField(blank=True, default='')
    triggered_by_user_id = models.IntegerField(null=True, blank=True)

    class Meta:
        db_table = 'notifications_email_message_log'
        ordering = ['-sent_at']
        indexes = [
            models.Index(fields=['template_key', 'assignment_id', 'sent_at']),
            models.Index(fields=['template_key', 'test_id', 'sent_at']),
        ]

    def __str__(self):
        return f'{self.template_key} -> {self.recipient_email} ({self.status})'
