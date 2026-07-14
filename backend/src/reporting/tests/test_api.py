from __future__ import annotations

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status

from authentication.models import RoleKey, UserRole
from reporting.tests.conftest import auth_client

User = get_user_model()


@pytest.mark.django_db
class TestReportingAPI:
    def test_individual_report_owner_access(
        self,
        api_client,
        candidate,
        attempt_bundle,
    ):
        auth_client(api_client, candidate)
        attempt = attempt_bundle['attempt']
        response = api_client.get(
            reverse('report_individual', kwargs={'attempt_id': attempt.id}),
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.json()['attempt_id'] == str(attempt.id)

    def test_individual_report_denied_for_other_candidate(
        self,
        api_client,
        roles,
        attempt_bundle,
    ):
        other = User.objects.create_user(
            email='other-candidate@example.com',
            password='OtherPass123!',
        )
        UserRole.objects.create(user=other, role=roles[RoleKey.CANDIDATE])
        auth_client(api_client, other)
        response = api_client.get(
            reverse(
                'report_individual',
                kwargs={'attempt_id': attempt_bundle['attempt'].id},
            ),
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_test_summary_requires_analytics_role(
        self,
        api_client,
        candidate,
        attempt_bundle,
    ):
        auth_client(api_client, candidate)
        response = api_client.get(
            reverse(
                'report_test_summary',
                kwargs={'test_id': attempt_bundle['test_id']},
            ),
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_test_summary_for_coordinator(
        self,
        api_client,
        coordinator,
        attempt_bundle,
    ):
        auth_client(api_client, coordinator)
        response = api_client.get(
            reverse(
                'report_test_summary',
                kwargs={'test_id': attempt_bundle['test_id']},
            ),
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.json()['attempt_count'] == 1

    def test_question_performance_for_examiner(
        self,
        api_client,
        examiner,
        attempt_bundle,
    ):
        auth_client(api_client, examiner)
        response = api_client.get(
            reverse(
                'report_question_performance',
                kwargs={'test_id': attempt_bundle['test_id']},
            ),
        )
        assert response.status_code == status.HTTP_200_OK

    def test_group_comparison_for_coordinator(
        self,
        api_client,
        coordinator,
        attempt_bundle,
    ):
        auth_client(api_client, coordinator)
        response = api_client.get(
            reverse(
                'report_group_comparison',
                kwargs={'test_id': attempt_bundle['test_id']},
            ),
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.json()['groups'][0]['group_name'] == 'Reporting Group'

    def test_progress_requires_coordinator(
        self,
        api_client,
        examiner,
        attempt_bundle,
    ):
        auth_client(api_client, examiner)
        response = api_client.get(
            reverse('report_progress'),
            {'group_id': str(attempt_bundle['group'].id)},
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_progress_for_coordinator(self, api_client, coordinator, attempt_bundle):
        auth_client(api_client, coordinator)
        response = api_client.get(
            reverse('report_progress'),
            {'group_id': str(attempt_bundle['group'].id)},
        )
        assert response.status_code == status.HTTP_200_OK
