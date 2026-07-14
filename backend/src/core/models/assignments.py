import uuid

from django.db import models


class AssignmentStatus(models.TextChoices):
    DRAFT = 'draft', 'Draft'
    ACTIVE = 'active', 'Active'
    ARCHIVED = 'archived', 'Archived'


class Assignment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    # TODO: replace with ForeignKey when the Test model is available.
    test_id = models.UUIDField(db_index=True)
    assignee_user_id = models.UUIDField(null=True, blank=True, db_index=True)
    assignee_group_id = models.UUIDField(null=True, blank=True, db_index=True)
    created_by_user_id = models.UUIDField(db_index=True)
    opens_at = models.DateTimeField()
    due_at = models.DateTimeField(null=True, blank=True)
    closes_at = models.DateTimeField(null=True, blank=True)
    max_attempts = models.PositiveIntegerField(default=1)
    shuffle_questions = models.BooleanField(default=False)
    shuffle_options = models.BooleanField(default=False)
    status = models.CharField(
        max_length=16,
        choices=AssignmentStatus.choices,
        default=AssignmentStatus.DRAFT,
        db_index=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'core_assignment'
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['test_id', 'assignee_user_id'],
                name='core_assignment_unique_test_user',
            ),
            models.UniqueConstraint(
                fields=['test_id', 'assignee_group_id'],
                name='core_assignment_unique_test_group',
            ),
        ]
        indexes = [
            models.Index(fields=['test_id', 'status']),
            models.Index(fields=['opens_at', 'closes_at']),
        ]

    def __str__(self):
        target = self.assignee_user_id or self.assignee_group_id
        return f'Assignment {self.id} test={self.test_id} assignee={target}'
