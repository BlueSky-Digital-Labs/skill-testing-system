"""
Attempt summary helpers used by certificate issuance and other results flows.
"""

from __future__ import annotations

import uuid

from django.contrib.auth import get_user_model

from delivery.models import Attempt, AttemptStatus
from grading.models import CombinedResult

User = get_user_model()


class AttemptSummaryNotFoundError(Exception):
    """Raised when an attempt summary cannot be resolved."""


class AttemptSummaryError(Exception):
    """Raised when attempt data is incomplete for summary generation."""


def get_attempt_summary(attempt_id: str) -> dict:
    """
    Build a certificate-friendly summary for a submitted attempt.
    """
    try:
        attempt_uuid = uuid.UUID(attempt_id)
    except (TypeError, ValueError) as exc:
        raise AttemptSummaryNotFoundError('Attempt not found.') from exc

    attempt = (
        Attempt.objects.select_related('assignment')
        .filter(pk=attempt_uuid)
        .first()
    )
    if attempt is None:
        raise AttemptSummaryNotFoundError('Attempt not found.')

    if attempt.status not in {
        AttemptStatus.SUBMITTED,
        AttemptStatus.AUTO_SUBMITTED,
    }:
        raise AttemptSummaryError('Attempt has not been submitted.')

    combined = CombinedResult.objects.filter(attempt_id=str(attempt.id)).first()
    if combined is None:
        raise AttemptSummaryError('Combined result not found for attempt.')

    candidate = User.objects.filter(pk=attempt.candidate_id).first()
    candidate_name = ''
    candidate_email = ''
    if candidate is not None:
        candidate_name = candidate.get_full_name() or candidate.email
        candidate_email = candidate.email

    return {
        'attempt_id': str(attempt.id),
        'candidate_user_id': attempt.candidate_id,
        'candidate_name': candidate_name,
        'candidate_email': candidate_email,
        'test_id': str(attempt.test_id),
        'assignment_id': str(attempt.assignment_id),
        'submitted_at': (
            attempt.submitted_at.isoformat() if attempt.submitted_at else None
        ),
        'passed': combined.passed,
        'total_awarded': str(combined.total_awarded),
        'total_max': str(combined.total_max),
    }
