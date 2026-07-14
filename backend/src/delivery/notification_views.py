from __future__ import annotations

import uuid

from django.conf import settings
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import Assignment
from core.permissions import HasAnyRole, IsCoordinatorOrAdmin
from delivery.serializers import (
    ReminderRequestSerializer,
    ReminderResponseSerializer,
    ResendInviteResponseSerializer,
    TestStatusSummarySerializer,
)
from delivery.status import (
    get_assignment_recipient_emails,
    get_reminder_candidates,
    get_test_status_summary,
)
from notifications.services import (
    EmailSendError,
    log_throttled_send,
    send_email,
    was_recently_sent,
)
from notifications.utils import generate_signed_invitation_url

User = get_user_model()

IsCoordinatorExaminerOrAdmin = HasAnyRole(
    'COORDINATOR',
    'EXAMINER',
    'SYSTEM_ADMIN',
)


def _format_due_at(assignment: Assignment) -> str:
    if assignment.due_at is None:
        return 'No due date'
    return assignment.due_at.isoformat()


def _build_invite_context(user: User, assignment: Assignment) -> dict:
    invite_url = generate_signed_invitation_url(
        assignment.id,
        user.email,
        extra={'test_id': str(assignment.test_id)},
    )
    return {
        'candidate_name': user.get_full_name() or user.email,
        'invite_url': invite_url,
        'test_title': str(assignment.test_id),
        'due_at': _format_due_at(assignment),
        'organization_name': getattr(settings, 'DEFAULT_FROM_EMAIL', ''),
    }


@extend_schema(tags=['Notifications'])
class ResendInviteView(APIView):
    permission_classes = [IsAuthenticated, IsCoordinatorOrAdmin]

    @extend_schema(
        request=None,
        responses={200: ResendInviteResponseSerializer},
        summary='Resend assignment invitation emails',
    )
    def post(self, request, assignment_id: uuid.UUID):
        assignment = get_object_or_404(Assignment, pk=assignment_id)
        recipients = get_assignment_recipient_emails(assignment)

        sent_count = 0
        throttled_count = 0
        failed_count = 0
        details: list[dict] = []

        for email in recipients:
            if was_recently_sent(
                template_key='invite',
                recipient_email=email,
                assignment_id=assignment.id,
            ):
                log_throttled_send(
                    recipient_email=email,
                    template_key='invite',
                    assignment_id=assignment.id,
                    test_id=assignment.test_id,
                    triggered_by_user_id=request.user.id,
                )
                throttled_count += 1
                details.append({'email': email, 'status': 'throttled'})
                continue

            user = User.objects.filter(email__iexact=email).first()
            if user is None:
                failed_count += 1
                details.append({
                    'email': email,
                    'status': 'failed',
                    'detail': 'User not found',
                })
                continue

            try:
                send_email(
                    recipient_email=email,
                    template_key='invite',
                    context=_build_invite_context(user, assignment),
                    assignment_id=assignment.id,
                    test_id=assignment.test_id,
                    triggered_by_user_id=request.user.id,
                )
                sent_count += 1
                details.append({'email': email, 'status': 'sent'})
            except EmailSendError:
                failed_count += 1
                details.append({'email': email, 'status': 'failed'})

        payload = {
            'assignment_id': str(assignment.id),
            'sent_count': sent_count,
            'throttled_count': throttled_count,
            'failed_count': failed_count,
            'details': details,
        }
        serializer = ResendInviteResponseSerializer(payload)
        return Response(serializer.data, status=status.HTTP_200_OK)


@extend_schema(tags=['Notifications'])
class SendRemindersView(APIView):
    permission_classes = [IsAuthenticated, IsCoordinatorOrAdmin]

    @extend_schema(
        request=ReminderRequestSerializer,
        responses={200: ReminderResponseSerializer},
        summary='Send reminder emails for a test',
    )
    def post(self, request, test_id: uuid.UUID):
        serializer = ReminderRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        filters = serializer.validated_data

        candidates = get_reminder_candidates(
            test_id=test_id,
            group_id=filters.get('group_id'),
            include_not_started=filters.get('include_not_started', True),
            include_in_progress=filters.get('include_in_progress', True),
            include_overdue=filters.get('include_overdue', True),
        )

        sent_count = 0
        failed_count = 0
        details: list[dict] = []

        for item in candidates:
            user = item['user']
            assignment = item['assignment']
            try:
                send_email(
                    recipient_email=user.email,
                    template_key='reminder',
                    context=_build_invite_context(user, assignment),
                    assignment_id=assignment.id,
                    test_id=test_id,
                    triggered_by_user_id=request.user.id,
                    metadata={'bucket': item['bucket']},
                )
                sent_count += 1
                details.append({
                    'email': user.email,
                    'status': 'sent',
                    'bucket': item['bucket'],
                })
            except EmailSendError:
                failed_count += 1
                details.append({
                    'email': user.email,
                    'status': 'failed',
                    'bucket': item['bucket'],
                })

        payload = {
            'test_id': str(test_id),
            'sent_count': sent_count,
            'failed_count': failed_count,
            'details': details,
        }
        response_serializer = ReminderResponseSerializer(payload)
        return Response(response_serializer.data, status=status.HTTP_200_OK)


@extend_schema(tags=['Monitoring'])
class TestMonitoringStatusView(APIView):
    permission_classes = [IsAuthenticated, IsCoordinatorExaminerOrAdmin]

    @extend_schema(
        responses={200: TestStatusSummarySerializer},
        summary='Return delivery status counts for a test',
    )
    def get(self, request, test_id: uuid.UUID):
        summary = get_test_status_summary(test_id)
        serializer = TestStatusSummarySerializer(summary)
        return Response(serializer.data, status=status.HTTP_200_OK)
