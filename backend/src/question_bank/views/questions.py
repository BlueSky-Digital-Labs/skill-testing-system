"""
Question bank API views.
"""

from __future__ import annotations

from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from question_bank.models import Question
from question_bank.permissions import IsExaminerOrAdmin
from question_bank.serializers import QuestionSerializer


@extend_schema(tags=['Question Bank'])
class QuestionViewSet(viewsets.ModelViewSet):
    serializer_class = QuestionSerializer
    lookup_field = 'pk'
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    filter_fields = ('subject', 'topic', 'difficulty', 'type')

    def get_queryset(self):
        queryset = Question.objects.prefetch_related(
            'options',
            'blank_answer_keys',
        ).select_related('author')

        for field in self.filter_fields:
            value = self.request.query_params.get(field)
            if value:
                queryset = queryset.filter(**{field: value})
        return queryset

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [IsAuthenticated()]
        return [IsExaminerOrAdmin()]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    @extend_schema(
        summary='Upload a question image',
        request={
            'multipart/form-data': {
                'type': 'object',
                'properties': {
                    'image': {'type': 'string', 'format': 'binary'},
                },
                'required': ['image'],
            }
        },
        responses={200: QuestionSerializer},
    )
    @action(
        detail=True,
        methods=['post'],
        url_path='upload-image',
        parser_classes=[MultiPartParser, FormParser],
    )
    def upload_image(self, request, pk=None):
        question = self.get_object()
        image = request.FILES.get('image')
        if image is None:
            return Response(
                {'image': ['No image file provided.']},
                status=status.HTTP_400_BAD_REQUEST,
            )

        question.image = image
        question.save(update_fields=['image', 'updated_at'])
        serializer = self.get_serializer(question)
        return Response(serializer.data)
