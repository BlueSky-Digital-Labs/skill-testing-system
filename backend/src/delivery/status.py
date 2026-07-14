"""
Query utilities for per-test and per-group delivery status summaries.
"""

from __future__ import annotations

import uuid
from typing import Any

from django.contrib.auth import get_user_model
from django.db.models import Count
from django.utils import timezone

from core.models import Assignment, AssignmentStatus, CandidateGroup
from core.services.availability import assignment_state, is_overdue
from delivery.models import Attempt, AttemptStatus

User = get_user_model()


def _assignment_recipients(assignment: Assignment) -> list[User]:
    """
    Resolve candidate recipients for an assignment.
    """
    if assignment.assignee_user_id is not None:
        # TODO: replace UUID lookup with direct FK when Assignment links to User.
        user_pk = assignment.assignee_user_id.int
        user = User.objects.filter(id=user_pk).first()
        return [user] if user is not None else []

    if assignment.assignee_group_id is not None:
        group = CandidateGroup.objects.filter(
            pk=assignment.assignee_group_id,
        ).prefetch_related('members').first()
        if group is None:
            return []
        return list(group.members.filter(is_active=True))

    return []


def get_assignment_recipient_emails(assignment: Assignment) -> list[str]:
    return [
        user.email
        for user in _assignment_recipients(assignment)
        if user.email
    ]


def get_test_status_summary(test_id: uuid.UUID) -> dict[str, Any]:
    """
    Build per-test status counts and group breakdowns.
    """
    now = timezone.now()
    assignments = Assignment.objects.filter(test_id=test_id)
    assignment_ids = list(assignments.values_list('id', flat=True))

    attempt_counts = (
        Attempt.objects.filter(test_id=test_id)
        .values('status')
        .annotate(count=Count('id'))
    )
    attempt_status_counts = {
        row['status']: row['count']
        for row in attempt_counts
    }

    assignment_status_counts = {
        'draft': assignments.filter(status=AssignmentStatus.DRAFT).count(),
        'active': assignments.filter(status=AssignmentStatus.ACTIVE).count(),
        'archived': assignments.filter(status=AssignmentStatus.ARCHIVED).count(),
    }

    # TODO: replace state computation with Assignment model helper when available.
    assignment_state_counts = {
        'upcoming': 0,
        'open': 0,
        'overdue': 0,
        'closed': 0,
        'archived': 0,
    }
    for assignment in assignments:
        state = assignment_state(assignment, now=now)
        assignment_state_counts[state] = assignment_state_counts.get(state, 0) + 1

    group_breakdown: list[dict[str, Any]] = []
    group_ids = (
        assignments.exclude(assignee_group_id__isnull=True)
        .values_list('assignee_group_id', flat=True)
        .distinct()
    )
    for group_id in group_ids:
        group_breakdown.append(
            get_group_status_summary(test_id=test_id, group_id=group_id),
        )

    return {
        'test_id': str(test_id),
        'assignment_count': len(assignment_ids),
        'assignment_status_counts': assignment_status_counts,
        'assignment_state_counts': assignment_state_counts,
        'attempt_status_counts': attempt_status_counts,
        'group_breakdown': group_breakdown,
    }


def get_group_status_summary(
    *,
    test_id: uuid.UUID,
    group_id: uuid.UUID,
) -> dict[str, Any]:
    """
    Build per-group status counts for a test.
    """
    group = CandidateGroup.objects.filter(pk=group_id).first()
    group_name = group.name if group is not None else ''

    assignments = Assignment.objects.filter(
        test_id=test_id,
        assignee_group_id=group_id,
    )
    assignment_ids = list(assignments.values_list('id', flat=True))
    member_count = group.members.count() if group is not None else 0

    attempts = Attempt.objects.filter(
        test_id=test_id,
        assignment_id__in=assignment_ids,
    )
    attempt_status_counts = {
        row['status']: row['count']
        for row in attempts.values('status').annotate(count=Count('id'))
    }

    submitted_count = attempts.filter(
        status__in=[AttemptStatus.SUBMITTED, AttemptStatus.AUTO_SUBMITTED],
    ).count()
    in_progress_count = attempts.filter(status=AttemptStatus.IN_PROGRESS).count()
    not_started_count = max(
        member_count - attempts.values('candidate_id').distinct().count(),
        0,
    )

    return {
        'group_id': str(group_id),
        'group_name': group_name,
        'member_count': member_count,
        'assignment_count': len(assignment_ids),
        'not_started_count': not_started_count,
        'in_progress_count': in_progress_count,
        'submitted_count': submitted_count,
        'attempt_status_counts': attempt_status_counts,
    }


def get_reminder_candidates(
    *,
    test_id: uuid.UUID,
    group_id: uuid.UUID | None = None,
    include_not_started: bool = True,
    include_in_progress: bool = True,
    include_overdue: bool = True,
) -> list[dict[str, Any]]:
    """
    Resolve candidates eligible for reminder emails for a test.
    """
    now = timezone.now()
    assignments = Assignment.objects.filter(
        test_id=test_id,
        status=AssignmentStatus.ACTIVE,
    )
    if group_id is not None:
        assignments = assignments.filter(assignee_group_id=group_id)

    candidates: list[dict[str, Any]] = []
    seen_emails: set[str] = set()

    for assignment in assignments:
        for user in _assignment_recipients(assignment):
            if not user.email or user.email.lower() in seen_emails:
                continue

            attempt = (
                Attempt.objects.filter(
                    assignment=assignment,
                    candidate_id=user.id,
                )
                .order_by('-started_at')
                .first()
            )

            overdue = is_overdue(assignment.due_at, None, now)
            if attempt is None:
                if not include_not_started:
                    continue
                bucket = 'not_started'
            elif attempt.status == AttemptStatus.IN_PROGRESS:
                if not include_in_progress:
                    continue
                bucket = 'in_progress'
            elif overdue and include_overdue:
                bucket = 'overdue'
            else:
                continue

            seen_emails.add(user.email.lower())
            candidates.append(
                {
                    'user': user,
                    'assignment': assignment,
                    'attempt': attempt,
                    'bucket': bucket,
                }
            )

    return candidates
