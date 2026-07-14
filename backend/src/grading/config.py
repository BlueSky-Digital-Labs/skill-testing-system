from django.db import models


class TestConfigSnapshot(models.Model):
    PASS_TYPE_ABSOLUTE = 'absolute'
    PASS_TYPE_PERCENT = 'percent'
    PASS_TYPE_CHOICES = [
        (PASS_TYPE_ABSOLUTE, 'Absolute'),
        (PASS_TYPE_PERCENT, 'Percent'),
    ]

    test_id = models.CharField(max_length=64, unique=True, db_index=True)
    passing_score = models.DecimalField(max_digits=8, decimal_places=2)
    pass_type = models.CharField(
        max_length=16,
        choices=PASS_TYPE_CHOICES,
        default=PASS_TYPE_ABSOLUTE,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'test config snapshot'
        verbose_name_plural = 'test config snapshots'

    def __str__(self):
        return f'Test config {self.test_id} ({self.pass_type})'
