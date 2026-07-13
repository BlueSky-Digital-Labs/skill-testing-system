"""
Helpers for password reset token creation and email delivery.
"""

import secrets

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

from .models import PasswordResetToken


def create_password_reset_token(user):
    """
    Create a new password reset token for the given user.
    Invalidates any existing unused tokens for the user.
    """
    PasswordResetToken.objects.filter(user=user, used_at__isnull=True).update(
        used_at=timezone.now()
    )
    token = secrets.token_urlsafe(32)
    return PasswordResetToken.objects.create(user=user, token=token)


def send_password_reset_email(user, reset_token):
    """
    Send a password reset email containing the reset link.
    """
    frontend_url = settings.FRONTEND_URL or 'http://localhost:3000'
    reset_url = f'{frontend_url}/reset-password?token={reset_token.token}'
    subject = 'Password reset request'
    message = (
        f'Hello,\n\n'
        f'You requested a password reset. Use the link below to set a new password:\n\n'
        f'{reset_url}\n\n'
        f'If you did not request this, you can ignore this email.'
    )
    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [user.email],
        fail_silently=False,
    )
