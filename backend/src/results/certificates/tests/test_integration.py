import uuid
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from core.models import Assignment, AssignmentStatus
from delivery.models import Attempt, AttemptStatus
from grading.models import CombinedResult
from results.certificates.models import Certificate

User = get_user_model()


@override_settings(
    CERTIFICATES_BUCKET='test-bucket',
    AWS_REGION='us-east-1',
    AWS_ACCESS_KEY_ID='test-key',
    AWS_SECRET_ACCESS_KEY='test-secret',
)
class CertificateIntegrationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.staff = User.objects.create_user(
            email='staff@example.com',
            password='SecurePass123!',
            is_staff=True,
        )
        self.candidate = User.objects.create_user(
            email='candidate@example.com',
            password='SecurePass123!',
            first_name='Jane',
            last_name='Candidate',
        )
        self.other = User.objects.create_user(
            email='other@example.com',
            password='SecurePass123!',
        )
        self.test_id = uuid.uuid4()
        self.assignment = Assignment.objects.create(
            test_id=self.test_id,
            assignee_user_id=uuid.UUID(int=self.candidate.id),
            created_by_user_id=uuid.UUID(int=self.staff.id),
            status=AssignmentStatus.ACTIVE,
            opens_at=timezone.now() - timezone.timedelta(hours=1),
            closes_at=timezone.now() + timezone.timedelta(hours=1),
        )
        self.attempt = Attempt.objects.create(
            assignment=self.assignment,
            candidate_id=self.candidate.id,
            test_id=self.test_id,
            status=AttemptStatus.SUBMITTED,
            time_limit_seconds=3600,
            expires_at=timezone.now() + timezone.timedelta(hours=1),
            submitted_at=timezone.now(),
        )
        CombinedResult.objects.create(
            attempt_id=str(self.attempt.id),
            test_id=str(self.test_id),
            total_awarded=Decimal('9.00'),
            total_max=Decimal('10.00'),
            by_topic={},
            passed=True,
        )

    def _auth(self, user):
        token = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token.access_token}')

    @patch('results.certificates.serializers.create_presigned_url')
    @patch('results.certificates.services.store_pdf')
    @patch('results.certificates.services.render_pdf')
    def test_issue_and_retrieve_certificate_flow(
        self,
        mock_render,
        mock_store,
        mock_presign,
    ):
        mock_render.return_value = b'%PDF certificate'
        mock_presign.return_value = 'https://signed.example/cert.pdf'

        self._auth(self.candidate)
        issue_response = self.client.post(
            reverse('results_certificate', args=[str(self.attempt.id)]),
            {'template_version': 'v1'},
            format='json',
        )

        self.assertEqual(issue_response.status_code, status.HTTP_201_CREATED)
        body = issue_response.json()
        self.assertEqual(body['attempt_id'], str(self.attempt.id))
        self.assertEqual(body['template_version'], 'v1')
        self.assertEqual(body['download_url'], 'https://signed.example/cert.pdf')

        get_response = self.client.get(
            reverse('results_certificate', args=[str(self.attempt.id)]),
        )
        self.assertEqual(get_response.status_code, status.HTTP_200_OK)
        self.assertEqual(get_response.json()['id'], body['id'])

        detail_response = self.client.get(
            reverse('certificate_detail', args=[body['id']]),
        )
        self.assertEqual(detail_response.status_code, status.HTTP_200_OK)

    @patch('delivery.services.get_attempt_summary')
    def test_eligibility_uses_delivery_summary(self, mock_summary):
        from results.certificates.services import get_eligibility

        mock_summary.return_value = {
            'attempt_id': str(self.attempt.id),
            'passed': True,
        }

        result = get_eligibility(str(self.attempt.id))

        self.assertTrue(result.eligible)
        mock_summary.assert_called_once_with(str(self.attempt.id))

    @patch('results.certificates.services.store_pdf')
    @patch('results.certificates.services.render_pdf')
    def test_post_is_idempotent_for_same_template(self, mock_render, mock_store):
        mock_render.return_value = b'%PDF certificate'

        self._auth(self.staff)
        first = self.client.post(
            reverse('results_certificate', args=[str(self.attempt.id)]),
            {'template_version': 'v1'},
            format='json',
        )
        second = self.client.post(
            reverse('results_certificate', args=[str(self.attempt.id)]),
            {'template_version': 'v1'},
            format='json',
        )

        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(first.json()['id'], second.json()['id'])
        self.assertEqual(Certificate.objects.count(), 1)

    def test_candidate_cannot_access_other_attempt_certificate(self):
        Certificate.objects.create(
            attempt_id=str(self.attempt.id),
            template_version='v1',
            pdf_s3_key='certificates/x/v1.pdf',
            checksum_sha256='abc',
            meta={'candidate_user_id': self.candidate.id},
        )
        self._auth(self.other)
        response = self.client.get(
            reverse('results_certificate', args=[str(self.attempt.id)]),
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_request_is_rejected(self):
        response = self.client.get(
            reverse('results_certificate', args=[str(self.attempt.id)]),
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
