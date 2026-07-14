from __future__ import annotations

import uuid

from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from delivery.permissions import IsExaminerOrAuthor
from delivery.serializers import PreviewAnswerSerializer, PreviewStartSerializer
from delivery.services.preview import (
    PreviewServiceError,
    PreviewSessionNotFound,
    PreviewTestNotFound,
    PreviewValidationError,
    finish_preview_session,
    record_preview_answer,
    start_preview_session,
)


def _preview_error_response(exc: PreviewServiceError) -> Response:
    if isinstance(exc, PreviewTestNotFound):
        return Response({'detail': str(exc)}, status=status.HTTP_404_NOT_FOUND)
    if isinstance(exc, PreviewSessionNotFound):
        return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    if isinstance(exc, PreviewValidationError):
        return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(tags=['Preview'])
class PreviewStartView(APIView):
    permission_classes = [IsAuthenticated, IsExaminerOrAuthor]

    @extend_schema(
        request=PreviewStartSerializer,
        summary='Start a non-persistent preview session for a test',
    )
    def post(self, request, test_id):
        serializer = PreviewStartSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            test_uuid = uuid.UUID(str(test_id))
        except ValueError:
            return Response(
                {'detail': 'Invalid test_id.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            payload = start_preview_session(
                user_id=request.user.id,
                test_id=test_uuid,
                seed=serializer.validated_data.get('seed'),
            )
        except PreviewServiceError as exc:
            return _preview_error_response(exc)

        return Response(payload, status=status.HTTP_201_CREATED)


@extend_schema(tags=['Preview'])
class PreviewAnswerView(APIView):
    permission_classes = [IsAuthenticated, IsExaminerOrAuthor]

    @extend_schema(
        request=PreviewAnswerSerializer,
        summary='Validate and score a preview answer without persistence',
    )
    def post(self, request, test_id):
        serializer = PreviewAnswerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            test_uuid = uuid.UUID(str(test_id))
        except ValueError:
            return Response(
                {'detail': 'Invalid test_id.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            payload = record_preview_answer(
                user_id=request.user.id,
                test_id=test_uuid,
                question_id=serializer.validated_data['question_id'],
                answer=serializer.validated_data['answer'],
            )
        except PreviewServiceError as exc:
            return _preview_error_response(exc)

        return Response(payload, status=status.HTTP_200_OK)


@extend_schema(tags=['Preview'])
class PreviewFinishView(APIView):
    permission_classes = [IsAuthenticated, IsExaminerOrAuthor]

    @extend_schema(summary='Finish a preview session and return mocked scores')
    def post(self, request, test_id):
        try:
            test_uuid = uuid.UUID(str(test_id))
        except ValueError:
            return Response(
                {'detail': 'Invalid test_id.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            payload = finish_preview_session(
                user_id=request.user.id,
                test_id=test_uuid,
            )
        except PreviewServiceError as exc:
            return _preview_error_response(exc)

        return Response(payload, status=status.HTTP_200_OK)
