from __future__ import annotations

import logging
import re
from typing import Any

import boto3
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils import timezone

from notifications.models import EmailMessageLog, EmailTemplate

logger = logging.getLogger(__name__)

_PLACEHOLDER_PATTERN = re.compile(r'\{\{\s*([a-zA-Z0-9_]+)\s*\}\}')


class EmailSendError(Exception):
    """Raised when an email cannot be delivered."""


def _render_placeholders(template: str, context: dict[str, Any]) -> str:
    def _replace(match: re.Match) -> str:
        key = match.group(1)
        value = context.get(key, '')
        return '' if value is None else str(value)

    return _PLACEHOLDER_PATTERN.sub(_replace, template)


def _load_template_bodies(
    template_key: str,
    context: dict[str, Any],
) -> tuple[str, str, str]:
    db_template = (
        EmailTemplate.objects.filter(key=template_key, is_active=True).first()
    )
    if db_template is not None:
        html_body = _render_placeholders(db_template.html_body, context)
        text_body = _render_placeholders(db_template.text_body, context)
        subject = _render_placeholders(db_template.subject, context)
        return subject, html_body, text_body

    html_body = render_to_string(f'email/{template_key}.html', context)
    text_body = render_to_string(f'email/{template_key}.txt', context)
    subject = _default_subject_for_template(template_key, context)
    return subject, html_body, text_body


def _default_subject_for_template(template_key: str, context: dict[str, Any]) -> str:
    defaults = {
        'invite': 'You have been invited to take an exam',
        'reminder': 'Reminder: your exam is due soon',
        'results_release': 'Your exam results are available',
    }
    subject_template = defaults.get(template_key, 'Notification')
    return _render_placeholders(subject_template, context)


def _resolve_provider() -> str:
    return getattr(settings, 'EMAIL_PROVIDER', 'console').upper()


def _send_via_django(
    *,
    subject: str,
    text_body: str,
    html_body: str,
    recipient_email: str,
) -> None:
    message = EmailMultiAlternatives(
        subject=subject,
        body=text_body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[recipient_email],
    )
    if html_body:
        message.attach_alternative(html_body, 'text/html')
    message.send(fail_silently=False)


def _send_via_ses(
    *,
    subject: str,
    text_body: str,
    html_body: str,
    recipient_email: str,
) -> None:
    client = boto3.client(
        'ses',
        region_name=getattr(settings, 'AWS_REGION', 'us-east-1'),
        aws_access_key_id=getattr(settings, 'AWS_ACCESS_KEY_ID', '') or None,
        aws_secret_access_key=getattr(settings, 'AWS_SECRET_ACCESS_KEY', '') or None,
    )
    body: dict[str, Any] = {'Text': {'Data': text_body, 'Charset': 'UTF-8'}}
    if html_body:
        body['Html'] = {'Data': html_body, 'Charset': 'UTF-8'}

    client.send_email(
        Source=settings.DEFAULT_FROM_EMAIL,
        Destination={'ToAddresses': [recipient_email]},
        Message={
            'Subject': {'Data': subject, 'Charset': 'UTF-8'},
            'Body': body,
        },
    )


def send_email(
    *,
    recipient_email: str,
    template_key: str,
    context: dict[str, Any],
    assignment_id=None,
    test_id=None,
    triggered_by_user_id: int | None = None,
    metadata: dict[str, Any] | None = None,
) -> EmailMessageLog:
    """
    Render a template and deliver email via the configured provider.
    """
    subject, html_body, text_body = _load_template_bodies(template_key, context)
    provider = _resolve_provider()

    log = EmailMessageLog.objects.create(
        recipient_email=recipient_email,
        template_key=template_key,
        subject=subject,
        status=EmailMessageLog.Status.PENDING,
        provider=provider,
        assignment_id=assignment_id,
        test_id=test_id,
        metadata=metadata or {},
        triggered_by_user_id=triggered_by_user_id,
    )

    try:
        if provider == 'SES':
            _send_via_ses(
                subject=subject,
                text_body=text_body,
                html_body=html_body,
                recipient_email=recipient_email,
            )
        else:
            _send_via_django(
                subject=subject,
                text_body=text_body,
                html_body=html_body,
                recipient_email=recipient_email,
            )
        log.status = EmailMessageLog.Status.SENT
        log.error_message = ''
    except Exception as exc:
        log.status = EmailMessageLog.Status.FAILED
        log.error_message = str(exc)
        logger.exception(
            'Failed to send email template=%s recipient=%s',
            template_key,
            recipient_email,
        )
        log.save(update_fields=['status', 'error_message'])
        raise EmailSendError(str(exc)) from exc

    log.save(update_fields=['status', 'error_message'])
    return log


def was_recently_sent(
    *,
    template_key: str,
    recipient_email: str,
    assignment_id=None,
    within_seconds: int | None = None,
) -> bool:
    """
    Return True when an invite was sent recently for throttling checks.
    """
    if within_seconds is None:
        from notifications.utils import resend_invite_throttle_seconds

        within_seconds = resend_invite_throttle_seconds()

    cutoff = timezone.now() - timezone.timedelta(seconds=within_seconds)
    queryset = EmailMessageLog.objects.filter(
        template_key=template_key,
        recipient_email__iexact=recipient_email,
        status=EmailMessageLog.Status.SENT,
        sent_at__gte=cutoff,
    )
    if assignment_id is not None:
        queryset = queryset.filter(assignment_id=assignment_id)
    return queryset.exists()


def log_throttled_send(
    *,
    recipient_email: str,
    template_key: str,
    assignment_id=None,
    test_id=None,
    triggered_by_user_id: int | None = None,
    metadata: dict[str, Any] | None = None,
) -> EmailMessageLog:
    return EmailMessageLog.objects.create(
        recipient_email=recipient_email,
        template_key=template_key,
        subject='',
        status=EmailMessageLog.Status.THROTTLED,
        provider=_resolve_provider(),
        assignment_id=assignment_id,
        test_id=test_id,
        metadata=metadata or {},
        triggered_by_user_id=triggered_by_user_id,
    )
