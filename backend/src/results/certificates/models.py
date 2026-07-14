import uuid

from django.db import models


class Certificate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    attempt_id = models.CharField(max_length=64, db_index=True)
    issued_at = models.DateTimeField(auto_now_add=True)
    template_version = models.CharField(max_length=32)
    pdf_s3_key = models.CharField(max_length=512)
    checksum_sha256 = models.CharField(max_length=64)
    revoked_at = models.DateTimeField(null=True, blank=True)
    meta = models.JSONField(default=dict, blank=True)

    class Meta:
        verbose_name = 'certificate'
        verbose_name_plural = 'certificates'
        constraints = [
            models.UniqueConstraint(
                fields=['attempt_id', 'template_version'],
                name='results_certificates_unique_attempt_template',
            ),
        ]
        indexes = [
            models.Index(fields=['attempt_id']),
        ]

    def __str__(self):
        return (
            f'Certificate {self.id} attempt={self.attempt_id} '
            f'template={self.template_version}'
        )

    @property
    def is_revoked(self) -> bool:
        return self.revoked_at is not None
