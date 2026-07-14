from __future__ import annotations

import pytest
from django.core import mail
from django.test import override_settings
from unittest.mock import MagicMock, patch

from notifications.models import EmailMessageLog, EmailTemplate
from notifications.services import (
    EmailSendError,
    log_throttled_send,
    send_email,
    was_recently_sent,
)
from notifications.utils import (
    InvitationTokenError,
    generate_signed_invitation_url,
    verify_signed_invitation_url,
)


@pytest.mark.django_db
class TestSignedInvitationUrls:
    def test_generate_and_verify_round_trip(self):
        url = generate_signed_invitation_url(
            assignment_id='00000000-0000-0000-0000-000000000001',
            recipient_email='Candidate@Example.com',
        )
        token = url.split('token=')[1]
        payload = verify_signed_invitation_url(token)
        assert payload['email'] == 'candidate@example.com'

    @override_settings(INVITATION_URL_EXPIRE_SECONDS=1)
    def test_verify_expired_token_raises(self):
        url = generate_signed_invitation_url(
            assignment_id='00000000-0000-0000-0000-000000000001',
            recipient_email='candidate@example.com',
        )
        token = url.split('token=')[1]
        import time

        time.sleep(2)
        with pytest.raises(InvitationTokenError):
            verify_signed_invitation_url(token)


@pytest.mark.django_db
class TestSendEmailService:
    def test_send_email_uses_console_backend_and_logs(self):
        log = send_email(
            recipient_email='candidate@example.com',
            template_key='invite',
            context={
                'candidate_name': 'Candidate',
                'invite_url': 'http://localhost/invite',
                'test_title': 'Sample Test',
                'due_at': 'Tomorrow',
                'organization_name': 'Org',
            },
        )
        assert log.status == EmailMessageLog.Status.SENT
        assert log.provider == 'CONSOLE'
        assert len(mail.outbox) == 1
        assert mail.outbox[0].to == ['candidate@example.com']

    def test_send_email_uses_db_template_when_present(self):
        EmailTemplate.objects.create(
            key='invite',
            subject='Custom invite for {{ candidate_name }}',
            html_body='<p>{{ invite_url }}</p>',
            text_body='{{ invite_url }}',
        )
        log = send_email(
            recipient_email='candidate@example.com',
            template_key='invite',
            context={
                'candidate_name': 'Candidate',
                'invite_url': 'http://localhost/invite',
                'test_title': 'Sample Test',
                'due_at': 'Tomorrow',
                'organization_name': 'Org',
            },
        )
        assert log.status == EmailMessageLog.Status.SENT
        assert log.subject == 'Custom invite for Candidate'

    @override_settings(EMAIL_PROVIDER='SES')
    @patch('notifications.services.boto3.client')
    def test_send_email_uses_ses_provider(self, mock_boto_client):
        ses_client = MagicMock()
        mock_boto_client.return_value = ses_client

        log = send_email(
            recipient_email='candidate@example.com',
            template_key='reminder',
            context={
                'candidate_name': 'Candidate',
                'invite_url': 'http://localhost/invite',
                'test_title': 'Sample Test',
                'due_at': 'Tomorrow',
                'organization_name': 'Org',
            },
        )

        assert log.status == EmailMessageLog.Status.SENT
        assert log.provider == 'SES'
        ses_client.send_email.assert_called_once()

    @override_settings(EMAIL_PROVIDER='SES')
    @patch('notifications.services.boto3.client')
    def test_send_email_marks_failed_on_ses_error(self, mock_boto_client):
        ses_client = MagicMock()
        ses_client.send_email.side_effect = RuntimeError('SES unavailable')
        mock_boto_client.return_value = ses_client

        with pytest.raises(EmailSendError):
            send_email(
                recipient_email='candidate@example.com',
                template_key='invite',
                context={
                    'candidate_name': 'Candidate',
                    'invite_url': 'http://localhost/invite',
                    'test_title': 'Sample Test',
                    'due_at': 'Tomorrow',
                    'organization_name': 'Org',
                },
            )

        log = EmailMessageLog.objects.latest('sent_at')
        assert log.status == EmailMessageLog.Status.FAILED
        assert 'SES unavailable' in log.error_message

    def test_was_recently_sent_and_throttled_log(self):
        send_email(
            recipient_email='candidate@example.com',
            template_key='invite',
            context={
                'candidate_name': 'Candidate',
                'invite_url': 'http://localhost/invite',
                'test_title': 'Sample Test',
                'due_at': 'Tomorrow',
                'organization_name': 'Org',
            },
            assignment_id='00000000-0000-0000-0000-000000000001',
        )
        assert was_recently_sent(
            template_key='invite',
            recipient_email='candidate@example.com',
            assignment_id='00000000-0000-0000-0000-000000000001',
        )

        throttled = log_throttled_send(
            recipient_email='candidate@example.com',
            template_key='invite',
            assignment_id='00000000-0000-0000-0000-000000000001',
        )
        assert throttled.status == EmailMessageLog.Status.THROTTLED
