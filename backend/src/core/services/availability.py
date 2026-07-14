"""
Temporal availability helpers for exam assignments.
"""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from core.models import Assignment


def is_within_window(
    opens_at: datetime,
    closes_at: Optional[datetime],
    now: datetime,
) -> bool:
    """Return True when ``now`` falls inside the assignment window."""
    if now < opens_at:
        return False
    if closes_at is not None and now >= closes_at:
        return False
    return True


def is_overdue(
    due_at: Optional[datetime],
    completed_at: Optional[datetime],
    now: datetime,
) -> bool:
    """Return True when the due date has passed without completion."""
    if due_at is None:
        return False
    if completed_at is not None:
        return False
    return now > due_at


def attempts_remaining(assignment: Assignment, attempts_made: int) -> int:
    """Return how many attempts the assignee still has."""
    return max(0, assignment.max_attempts - attempts_made)


def assignment_state(
    assignment: Assignment,
    now: datetime,
    completed_at: Optional[datetime] = None,
) -> str:
    """Derive the dashboard state for an assignment at a point in time."""
    from core.models import AssignmentStatus

    if assignment.status == AssignmentStatus.ARCHIVED:
        return 'archived'
    if now < assignment.opens_at:
        return 'upcoming'
    if assignment.closes_at is not None and now >= assignment.closes_at:
        return 'closed'
    if is_overdue(assignment.due_at, completed_at, now):
        return 'overdue'
    if is_within_window(assignment.opens_at, assignment.closes_at, now):
        return 'open'
    return 'closed'
