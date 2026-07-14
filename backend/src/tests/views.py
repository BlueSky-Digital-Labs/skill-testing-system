"""
Test assembly API views.
"""

from __future__ import annotations

from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from tests.models import (
    QuestionLinkSource,
    SelectionRule,
    Test,
    TestLifecycle,
    TestQuestionLink,
    TestSection,
)
from tests.permissions import IsExaminerOrAdmin
from tests.serializers import (
    TestCreateSerializer,
    TestSerializer,
    TestUpdateSerializer,
)
from tests.services.publish import PublishError, archive_test, publish_test


def _sync_sections(test: Test, sections_data: list[dict]) -> None:
    """Replace draft test sections with payload data."""
    test.sections.all().delete()

    for section_data in sections_data:
        question_links_data = section_data.pop('question_links', [])
        selection_rules_data = section_data.pop('selection_rules', [])
        section_data.pop('id', None)

        section = TestSection.objects.create(test=test, **section_data)

        for link_data in question_links_data:
            TestQuestionLink.objects.create(
                section=section,
                question_id=link_data['question_id'],
                order=link_data.get('order', 0),
                source=QuestionLinkSource.MANUAL,
            )

        for rule_data in selection_rules_data:
            SelectionRule.objects.create(section=section, **rule_data)


@extend_schema(
    tags=['Tests'],
    request=TestCreateSerializer,
    responses={201: TestSerializer},
)
@api_view(['POST'])
@permission_classes([IsExaminerOrAdmin])
def test_create(request):
    serializer = TestCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    sections_data = data.pop('sections', [])
    test = Test.objects.create(created_by=request.user, **data)
    if sections_data:
        _sync_sections(test, sections_data)

    return Response(
        TestSerializer(test).data,
        status=status.HTTP_201_CREATED,
    )


@extend_schema(tags=['Tests'], responses={200: TestSerializer})
@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def test_detail(request, test_id):
    test = get_object_or_404(
        Test.objects.prefetch_related(
            'sections__question_links__question',
            'sections__question_links__question_version',
            'sections__selection_rules',
            'shuffle_seeds',
        ),
        pk=test_id,
    )

    if request.method == 'GET':
        return Response(TestSerializer(test).data)

    if test.lifecycle != TestLifecycle.DRAFT:
        return Response(
            {'detail': 'Only draft tests can be modified.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    if not IsExaminerOrAdmin().has_permission(request, test_detail):
        return Response(status=status.HTTP_403_FORBIDDEN)

    serializer = TestUpdateSerializer(
        data=request.data,
        partial=True,
        context={'test': test},
    )
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    sections_data = data.pop('sections', None)
    for field, value in data.items():
        setattr(test, field, value)
    test.save()

    if sections_data is not None:
        _sync_sections(test, sections_data)

    test.refresh_from_db()
    return Response(TestSerializer(test).data)


@extend_schema(tags=['Tests'], responses={200: TestSerializer})
@api_view(['POST'])
@permission_classes([IsExaminerOrAdmin])
def test_publish(request, test_id):
    test = get_object_or_404(Test, pk=test_id)

    try:
        publish_test(test, created_by=request.user)
    except PublishError as exc:
        return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    test.refresh_from_db()
    return Response(TestSerializer(test).data)


@extend_schema(tags=['Tests'], responses={200: TestSerializer})
@api_view(['POST'])
@permission_classes([IsExaminerOrAdmin])
def test_archive(request, test_id):
    test = get_object_or_404(Test, pk=test_id)

    try:
        archive_test(test)
    except PublishError as exc:
        return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    test.refresh_from_db()
    return Response(TestSerializer(test).data)
