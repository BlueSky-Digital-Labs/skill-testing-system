"""
Signed invitation URL helpers for assignment delivery emails.
"""

from __future__ import annotations

import uuid
from typing import Any

from django.conf import settings
from django.core import signing

INVITATION_SIGNING_SALT = 'notifications.assignment-invitation'


class InvitationTokenError(Exception):
    """Raised when a signed invitation token is invalid or expired."""


def invitation_url_expiry_seconds() -> int:
    return getattr(settings, 'INVITATION_URL_EXPIRE_SECONDS', 604800)


def resend_invite_throttle_seconds() -> int:
    return getattr(settings, 'RESEND_INVITE_THROTTLE_SECONDS', 3600)


def generate_signed_invitation_url(
    assignment_id: uuid.UUID,
    recipient_email: str,
    *,
    extra: dict[str, Any] | None = None,
) -> str:
    """
    Build a signed invitation URL with an expiration policy from settings.
    """
    payload: dict[str, Any] = {
        'assignment_id': str(assignment_id),
        'email': recipient_email.lower(),
    }
    if extra:
        payload.update(extra)

    token = signing.dumps(payload, salt=INVITATION_SIGNING_SALT)
    frontend_url = settings.FRONTEND_URL or 'http://localhost:3000'
    return f'{frontend_url.rstrip("/")}/accept-assignment?token={token}'


def verify_signed_invitation_url(token: str) -> dict[str, Any]:
    """
    Validate and decode a signed invitation token.
    """
    try:
        return signing.loads(
            token,
            salt=INVITATION_SIGNING_SALT,
            max_age=invitation_url_expiry_seconds(),
        )
    except signing.BadSignature as exc:
        raise InvitationTokenError('Invalid or expired invitation token.') from exc
