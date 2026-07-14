from django.db import models
from django.utils import timezone


class AuditLog(models.Model):
    """Immutable, hash-chained audit log entry."""

    id = models.BigAutoField(primary_key=True)
    timestamp = models.DateTimeField(default=timezone.now, db_index=True)
    actor_id = models.CharField(max_length=255, blank=True, default='')
    actor_display = models.CharField(max_length=255, blank=True, default='')
    action = models.CharField(max_length=128, db_index=True)
    entity_type = models.CharField(max_length=128, blank=True, default='', db_index=True)
    entity_id = models.CharField(max_length=255, blank=True, default='', db_index=True)
    metadata = models.JSONField(default=dict, blank=True)
    prev_hash = models.CharField(max_length=64, blank=True, default='')
    hash = models.CharField(max_length=64)

    class Meta:
        ordering = ['id']
        indexes = [
            models.Index(fields=['action', 'timestamp']),
            models.Index(fields=['entity_type', 'entity_id']),
        ]

    def __str__(self):
        return f'{self.action} by {self.actor_display or "system"} at {self.timestamp}'
