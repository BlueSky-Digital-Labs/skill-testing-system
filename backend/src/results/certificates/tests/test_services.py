import hashlib
from decimal import Decimal
from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings

from grading.models import CombinedResult
from results.certificates.models import Certificate
from results.certificates.services import (
    CertificateNotEligible,
    CertificateStorageError,
    create_presigned_url,
    get_eligibility,
    issue_certificate,
    render_pdf,
    store_pdf,
)

User = get_user_model()


class EligibilityTests(TestCase):
    @patch('delivery.services.get_attempt_summary')
    def test_eligible_when_passed(self, mock_summary):
        mock_summary.return_value = {
            'attempt_id': 'attempt-1',
            'passed': True,
        }
        CombinedResult.objects.create(
            attempt_id='attempt-1',
            test_id='test-1',
            total_awarded=Decimal('8.00'),
            total_max=Decimal('10.00'),
            by_topic={},
            passed=True,
        )

        result = get_eligibility('attempt-1')

        self.assertTrue(result.eligible)
        self.assertIsNone(result.reason)

    @patch('delivery.services.get_attempt_summary')
    def test_not_eligible_when_failed(self, mock_summary):
        mock_summary.return_value = {
            'attempt_id': 'attempt-1',
            'passed': False,
        }
        CombinedResult.objects.create(
            attempt_id='attempt-1',
            test_id='test-1',
            total_awarded=Decimal('4.00'),
            total_max=Decimal('10.00'),
            by_topic={},
            passed=False,
        )

        result = get_eligibility('attempt-1')

        self.assertFalse(result.eligible)
        self.assertIn('passing', result.reason.lower())

    @patch('delivery.services.get_attempt_summary')
    def test_not_eligible_when_summary_missing(self, mock_summary):
        mock_summary.side_effect = Exception('Attempt not found.')

        result = get_eligibility('missing')

        self.assertFalse(result.eligible)
        self.assertEqual(result.reason, 'Attempt not found.')


@override_settings(
    CERTIFICATES_BUCKET='test-bucket',
    AWS_REGION='us-east-1',
    AWS_ACCESS_KEY_ID='test-key',
    AWS_SECRET_ACCESS_KEY='test-secret',
)
class S3ServiceTests(TestCase):
    @patch('results.certificates.services._get_s3_client')
    def test_store_pdf_uploads_to_bucket(self, mock_client_factory):
        client = MagicMock()
        mock_client_factory.return_value = client
        pdf_bytes = b'%PDF-1.4 certificate'

        store_pdf(pdf_bytes, 'certificates/attempt-1/v1.pdf')

        client.put_object.assert_called_once_with(
            Bucket='test-bucket',
            Key='certificates/attempt-1/v1.pdf',
            Body=pdf_bytes,
            ContentType='application/pdf',
        )

    @patch('results.certificates.services._get_s3_client')
    def test_create_presigned_url(self, mock_client_factory):
        client = MagicMock()
        client.generate_presigned_url.return_value = 'https://signed.example/cert.pdf'
        mock_client_factory.return_value = client

        url = create_presigned_url('certificates/attempt-1/v1.pdf', 900)

        self.assertEqual(url, 'https://signed.example/cert.pdf')
        client.generate_presigned_url.assert_called_once_with(
            'get_object',
            Params={'Bucket': 'test-bucket', 'Key': 'certificates/attempt-1/v1.pdf'},
            ExpiresIn=900,
        )

    @override_settings(CERTIFICATES_BUCKET='')
    def test_store_pdf_requires_bucket(self):
        with self.assertRaises(CertificateStorageError):
            store_pdf(b'pdf', 'key.pdf')


class IssueCertificateTests(TestCase):
    def setUp(self):
        self.summary = {
            'attempt_id': 'attempt-1',
            'candidate_user_id': 42,
            'candidate_name': 'Jane Candidate',
            'candidate_email': 'jane@example.com',
            'test_id': 'test-1',
            'passed': True,
            'total_awarded': '8.00',
            'total_max': '10.00',
        }
        CombinedResult.objects.create(
            attempt_id='attempt-1',
            test_id='test-1',
            total_awarded=Decimal('8.00'),
            total_max=Decimal('10.00'),
            by_topic={},
            passed=True,
        )

    @patch('results.certificates.services.store_pdf')
    @patch('results.certificates.services.render_pdf')
    @patch('delivery.services.get_attempt_summary')
    def test_issue_certificate_persists_record(
        self,
        mock_summary,
        mock_render,
        mock_store,
    ):
        mock_summary.return_value = self.summary
        mock_render.return_value = b'%PDF certificate bytes'

        certificate = issue_certificate('attempt-1', 'v1')

        self.assertEqual(certificate.attempt_id, 'attempt-1')
        self.assertEqual(certificate.template_version, 'v1')
        self.assertEqual(
            certificate.checksum_sha256,
            hashlib.sha256(b'%PDF certificate bytes').hexdigest(),
        )
        mock_store.assert_called_once()
        self.assertEqual(Certificate.objects.count(), 1)

    @patch('results.certificates.services.store_pdf')
    @patch('results.certificates.services.render_pdf')
    @patch('delivery.services.get_attempt_summary')
    def test_issue_certificate_is_idempotent(
        self,
        mock_summary,
        mock_render,
        mock_store,
    ):
        mock_summary.return_value = self.summary
        mock_render.return_value = b'%PDF certificate bytes'

        first = issue_certificate('attempt-1', 'v1')
        second = issue_certificate('attempt-1', 'v1')

        self.assertEqual(first.id, second.id)
        self.assertEqual(Certificate.objects.count(), 1)
        mock_render.assert_called_once()
        mock_store.assert_called_once()

    @patch('delivery.services.get_attempt_summary')
    def test_issue_certificate_rejects_ineligible(self, mock_summary):
        mock_summary.return_value = {
            **self.summary,
            'passed': False,
        }
        CombinedResult.objects.filter(attempt_id='attempt-1').update(passed=False)

        with self.assertRaises(CertificateNotEligible):
            issue_certificate('attempt-1', 'v1')


class RenderPdfTests(TestCase):
    @patch('weasyprint.HTML')
    def test_render_pdf_uses_template(self, mock_html):
        pdf_buffer = MagicMock()
        pdf_buffer.getvalue.return_value = b'%PDF'
        mock_html.return_value.write_pdf.side_effect = lambda buf: buf.write(b'%PDF')

        pdf = render_pdf(
            {
                'candidate_name': 'Jane Candidate',
                'attempt_id': 'attempt-1',
                'test_id': 'test-1',
                'template_version': 'v1',
                'issued_at': '2026-01-01',
                'total_awarded': '8.00',
                'total_max': '10.00',
            }
        )

        self.assertEqual(pdf, b'%PDF')
        mock_html.assert_called_once()
