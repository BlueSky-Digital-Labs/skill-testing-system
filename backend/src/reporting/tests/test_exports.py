from __future__ import annotations

from decimal import Decimal
from unittest.mock import patch

import pytest

from reporting.exports import csv_export, pdf_export
from reporting.tests.conftest import auth_client


class TestReportExports:
    def test_csv_export_individual_report(self):
        data = {
            'attempt_id': 'attempt-1',
            'test_id': 'test-1',
            'candidate_id': 1,
            'status': 'submitted',
            'total_awarded': Decimal('8.00'),
            'total_max': Decimal('10.00'),
            'passed': True,
            'questions': [
                {
                    'question_id': 'q-1',
                    'question_version': 1,
                    'is_correct': True,
                    'topic': 'science',
                }
            ],
        }
        payload = csv_export('individual', data)
        text = payload.decode('utf-8')
        assert 'attempt_id' in text
        assert 'q-1' in text

    def test_pdf_export_test_summary(self):
        data = {
            'test_id': 'test-1',
            'attempt_count': 2,
            'completed_count': 2,
            'pass_rate': Decimal('0.5'),
        }
        payload = pdf_export('test_summary', data)
        assert payload.startswith(b'%PDF')


@pytest.mark.django_db
class TestExportAPI:
    @patch('reporting.views.create_presigned_download_url')
    @patch('reporting.views.upload_object')
    def test_export_returns_presigned_url(
        self,
        mock_upload,
        mock_presign,
        api_client,
        coordinator,
        attempt_bundle,
    ):
        mock_presign.return_value = 'https://example.test/download'
        auth_client(api_client, coordinator)

        response = api_client.post(
            '/api/exports/',
            {
                'report_type': 'test_summary',
                'format': 'csv',
                'parameters': {'test_id': str(attempt_bundle['test_id'])},
            },
            format='json',
        )

        assert response.status_code == 201
        body = response.json()
        assert body['download_url'] == 'https://example.test/download'
        assert body['s3_key'].startswith('reports/test_summary/')
        assert body['expires_in'] == 3600
        mock_upload.assert_called_once()
        mock_presign.assert_called_once()

    def test_export_denied_for_candidate(self, api_client, candidate, attempt_bundle):
        auth_client(api_client, candidate)
        response = api_client.post(
            '/api/exports/',
            {
                'report_type': 'test_summary',
                'format': 'pdf',
                'parameters': {'test_id': str(attempt_bundle['test_id'])},
            },
            format='json',
        )
        assert response.status_code == 403

    @patch('reporting.views.create_presigned_download_url')
    @patch('reporting.views.upload_object')
    def test_individual_export_allowed_for_owner(
        self,
        mock_upload,
        mock_presign,
        api_client,
        candidate,
        attempt_bundle,
    ):
        mock_presign.return_value = 'https://example.test/individual'
        auth_client(api_client, candidate)
        attempt = attempt_bundle['attempt']

        response = api_client.post(
            '/api/exports/',
            {
                'report_type': 'individual',
                'format': 'csv',
                'parameters': {'attempt_id': str(attempt.id)},
            },
            format='json',
        )

        assert response.status_code == 201
        mock_upload.assert_called_once()
