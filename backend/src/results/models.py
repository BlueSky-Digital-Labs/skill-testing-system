import uuid

from django.db import models


class DisclosureLevel(models.TextChoices):
    NONE = "none", "None"
    SUMMARY = "summary", "Summary"
    DETAILED = "detailed", "Detailed"


class ReleaseControl(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    attempt_id = models.CharField(max_length=64, unique=True, db_index=True)
    test_id = models.CharField(max_length=64, db_index=True)
    candidate_user_id = models.IntegerField(db_index=True)
    disclosure = models.CharField(
        max_length=16,
        choices=DisclosureLevel.choices,
        default=DisclosureLevel.NONE,
    )
    released = models.BooleanField(default=False)
    released_at = models.DateTimeField(null=True, blank=True)
    released_by_user_id = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "release control"
        verbose_name_plural = "release controls"
        indexes = [
            models.Index(fields=["candidate_user_id", "attempt_id"]),
        ]

    def __str__(self):
        return (
            f"ReleaseControl attempt={self.attempt_id} "
            f"released={self.released} disclosure={self.disclosure}"
        )
