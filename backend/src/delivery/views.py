from __future__ import annotations

from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from delivery.serializers import SaveAttemptSerializer, StartAttemptSerializer
from delivery.services.attempts import (
    AttemptAlreadySubmitted,
    AttemptExpired,
    AttemptIntegrityError,
    AttemptNotEligible,
    AttemptServiceError,
    build_attempt_payload,
    resume_attempt,
    save_attempt_answers,
    start_attempt,
    submit_attempt_by_id,
)


def _error_response(exc: AttemptServiceError, default_status: int) -> Response:
    if isinstance(exc, AttemptNotEligible):
        return Response({'detail': str(exc)}, status=status.HTTP_403_FORBIDDEN)
    if isinstance(exc, AttemptExpired):
        return Response({'detail': str(exc)}, status=status.HTTP_410_GONE)
    if isinstance(exc, AttemptAlreadySubmitted):
        return Response({'detail': str(exc)}, status=status.HTTP_409_CONFLICT)
    if isinstance(exc, AttemptIntegrityError):
        return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    return Response({'detail': str(exc)}, status=default_status)


@extend_schema(tags=['Attempts'])
class StartAttemptView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=StartAttemptSerializer,
        summary='Start a new attempt or resume an in-progress attempt',
    )
    def post(self, request):
        serializer = StartAttemptSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            attempt = start_attempt(
                assignment_id=serializer.validated_data['assignment_id'],
                candidate_id=request.user.id,
            )
        except AttemptServiceError as exc:
            return _error_response(exc, status.HTTP_400_BAD_REQUEST)

        return Response(
            build_attempt_payload(attempt),
            status=status.HTTP_201_CREATED,
        )


@extend_schema(tags=['Attempts'])
class SaveAttemptView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=SaveAttemptSerializer,
        summary='Autosave attempt answers',
    )
    def put(self, request, attempt_id):
        serializer = SaveAttemptSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            attempt = save_attempt_answers(
                attempt_id=attempt_id,
                candidate_id=request.user.id,
                answer_payloads=serializer.to_answer_payloads(),
            )
        except AttemptServiceError as exc:
            return _error_response(exc, status.HTTP_400_BAD_REQUEST)

        return Response(build_attempt_payload(attempt), status=status.HTTP_200_OK)


@extend_schema(tags=['Attempts'])
class ResumeAttemptView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(summary='Resume an in-progress attempt')
    def get(self, request, attempt_id):
        try:
            payload = resume_attempt(
                attempt_id=attempt_id,
                candidate_id=request.user.id,
            )
        except AttemptServiceError as exc:
            return _error_response(exc, status.HTTP_400_BAD_REQUEST)

        return Response(payload, status=status.HTTP_200_OK)


@extend_schema(tags=['Attempts'])
class SubmitAttemptView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(summary='Submit an attempt')
    def post(self, request, attempt_id):
        try:
            attempt = submit_attempt_by_id(
                attempt_id=attempt_id,
                candidate_id=request.user.id,
            )
        except AttemptServiceError as exc:
            return _error_response(exc, status.HTTP_400_BAD_REQUEST)

        return Response(build_attempt_payload(attempt), status=status.HTTP_200_OK)
