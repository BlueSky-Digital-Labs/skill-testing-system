"""
Helpers for invitation token creation and email delivery.
"""

import secrets

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

from .models import Invitation


def create_invitation(email, role_key, created_by):
    """
    Create a new invitation for the given email and role.
    Invalidates any existing pending invitations for the email.
    """
    Invitation.objects.filter(
        email__iexact=email,
        accepted_at__isnull=True,
    ).update(accepted_at=timezone.now())
    token = secrets.token_urlsafe(32)
    return Invitation.objects.create(
        email=email,
        token=token,
        created_by=created_by,
        role_key=role_key,
    )


def send_invitation_email(invitation):
    """
    Send an invitation email containing the acceptance link.
    """
    frontend_url = settings.FRONTEND_URL or 'http://localhost:3000'
    invite_url = f'{frontend_url}/accept-invitation?token={invitation.token}'
    subject = 'You have been invited'
    message = (
        f'Hello,\n\n'
        f'You have been invited to join the platform. '
        f'Use the link below to accept your invitation and set up your account:\n\n'
        f'{invite_url}\n\n'
        f'If you did not expect this invitation, you can ignore this email.'
    )
    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [invitation.email],
        fail_silently=False,
    )
