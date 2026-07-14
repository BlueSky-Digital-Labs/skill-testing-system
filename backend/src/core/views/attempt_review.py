"""
Attempt review API view.
"""

from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions.attempt_permissions import IsAttemptOwnerOrStaff
from results.models import DisclosureLevel, ReleaseControl
from results.serializers.attempt_review import serialize_attempt_for_review
from results.view_policies import (
    DisclosureMode,
    evaluate_disclosure,
    filter_attempt_payload,
)


def _build_test_settings(control):
    disclosure = DisclosureMode.SCORE_ONLY
    if control.disclosure == DisclosureLevel.DETAILED:
        disclosure = DisclosureMode.SCORE_AND_FEEDBACK
    return {
        'results_released': control.released,
        'results_disclosure': disclosure,
    }


@extend_schema(tags=['Attempts'])
class AttemptReviewView(APIView):
    permission_classes = [IsAttemptOwnerOrStaff]

    def get(self, request, attempt_id):
        control = get_object_or_404(ReleaseControl, attempt_id=attempt_id)
        self.check_object_permissions(request, control)

        attempt = {
            'id': control.attempt_id,
            'test_id': control.test_id,
            'candidate_user_id': control.candidate_user_id,
            'status': 'completed',
            'submitted_at': (
                control.released_at.isoformat() if control.released_at else None
            ),
        }

        test_settings = _build_test_settings(control)
        mode = evaluate_disclosure(attempt, test_settings)
        payload = serialize_attempt_for_review(attempt, include_questions=True)
        filtered = filter_attempt_payload(payload, mode)
        return Response(filtered, status=status.HTTP_200_OK)
