from __future__ import annotations

import uuid

from django.conf import settings
from django.utils.dateparse import parse_datetime
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from authentication.report_permissions import (
    CanExportReport,
    CanViewAnalyticsReports,
    CanViewIndividualReport,
    CanViewProgressReport,
)
from core.storage import StorageError, create_presigned_download_url, upload_object

from . import queries
from .exports import csv_export, pdf_export
from .serializers import (
    ExportRequestSerializer,
    ExportResponseSerializer,
    GroupComparisonSerializer,
    IndividualReportSerializer,
    ProgressReportSerializer,
    QuestionPerformanceSerializer,
    TestSummarySerializer,
)


def _not_found(message: str) -> Response:
    return Response({'detail': message}, status=status.HTTP_404_NOT_FOUND)


def _fetch_report_data(report_type: str, parameters: dict) -> dict | None:
    if report_type == 'individual':
        attempt_id = parameters.get('attempt_id')
        if not attempt_id:
            return None
        data = queries.individual_report(attempt_id)
        if data.get('error') == 'attempt_not_found':
            return None
        return data

    if report_type == 'test_summary':
        test_id = parameters.get('test_id')
        if not test_id:
            return None
        return queries.test_summary(test_id)

    if report_type == 'question_performance':
        test_id = parameters.get('test_id')
        if not test_id:
            return None
        return queries.question_performance(test_id)

    if report_type == 'group_comparison':
        test_id = parameters.get('test_id')
        if not test_id:
            return None
        return queries.group_comparison(test_id)

    if report_type == 'progress':
        group_id = parameters.get('group_id')
        if not group_id:
            return None
        topic = parameters.get('topic') or None
        from_dt = (
            parse_datetime(parameters['from_dt'])
            if parameters.get('from_dt')
            else None
        )
        to_dt = (
            parse_datetime(parameters['to_dt'])
            if parameters.get('to_dt')
            else None
        )
        data = queries.progress(group_id, topic, from_dt, to_dt)
        if data.get('error') == 'group_not_found':
            return None
        return data

    return None


class IndividualReportView(APIView):
    permission_classes = [CanViewIndividualReport]

    @extend_schema(
        tags=['Reporting'],
        responses={200: IndividualReportSerializer},
    )
    def get(self, request, attempt_id):
        data = queries.individual_report(attempt_id)
        if data.get('error') == 'attempt_not_found':
            return _not_found('Attempt not found.')
        serializer = IndividualReportSerializer(data)
        return Response(serializer.data)


class TestSummaryReportView(APIView):
    permission_classes = [CanViewAnalyticsReports]

    @extend_schema(
        tags=['Reporting'],
        responses={200: TestSummarySerializer},
    )
    def get(self, request, test_id):
        serializer = TestSummarySerializer(queries.test_summary(test_id))
        return Response(serializer.data)


class QuestionPerformanceReportView(APIView):
    permission_classes = [CanViewAnalyticsReports]

    @extend_schema(
        tags=['Reporting'],
        responses={200: QuestionPerformanceSerializer},
    )
    def get(self, request, test_id):
        serializer = QuestionPerformanceSerializer(
            queries.question_performance(test_id),
        )
        return Response(serializer.data)


class GroupComparisonReportView(APIView):
    permission_classes = [CanViewAnalyticsReports]

    @extend_schema(
        tags=['Reporting'],
        responses={200: GroupComparisonSerializer},
    )
    def get(self, request, test_id):
        serializer = GroupComparisonSerializer(queries.group_comparison(test_id))
        return Response(serializer.data)


class ProgressReportView(APIView):
    permission_classes = [CanViewProgressReport]

    @extend_schema(
        tags=['Reporting'],
        responses={200: ProgressReportSerializer},
    )
    def get(self, request):
        group_id = request.query_params.get('group_id')
        if not group_id:
            return Response(
                {'detail': 'group_id query parameter is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        topic = request.query_params.get('topic') or None
        from_dt = (
            parse_datetime(request.query_params['from_dt'])
            if request.query_params.get('from_dt')
            else None
        )
        to_dt = (
            parse_datetime(request.query_params['to_dt'])
            if request.query_params.get('to_dt')
            else None
        )
        data = queries.progress(group_id, topic, from_dt, to_dt)
        if data.get('error') == 'group_not_found':
            return _not_found('Group not found.')
        serializer = ProgressReportSerializer(data)
        return Response(serializer.data)


class ExportReportView(APIView):
    permission_classes = [CanExportReport]

    @extend_schema(
        tags=['Reporting'],
        request=ExportRequestSerializer,
        responses={200: ExportResponseSerializer},
    )
    def post(self, request):
        serializer = ExportRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        report_type = serializer.validated_data['report_type']
        export_format = serializer.validated_data['format']
        parameters = serializer.validated_data.get('parameters', {})

        data = _fetch_report_data(report_type, parameters)
        if data is None:
            return _not_found('Report data not found for the given parameters.')

        if export_format == 'csv':
            payload = csv_export(report_type, data)
            content_type = 'text/csv'
            extension = 'csv'
        else:
            payload = pdf_export(report_type, data)
            content_type = 'application/pdf'
            extension = 'pdf'

        export_id = uuid.uuid4()
        s3_key = (
            f'reports/{report_type}/{request.user.id}/'
            f'{report_type}-{export_id}.{extension}'
        )
        try:
            upload_object(payload, s3_key, content_type=content_type)
            expires = settings.REPORT_PRESIGNED_URL_EXPIRES
            download_url = create_presigned_download_url(s3_key, expires=expires)
        except StorageError as exc:
            return Response(
                {'detail': str(exc)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        response = ExportResponseSerializer(
            {
                'download_url': download_url,
                's3_key': s3_key,
                'expires_in': expires,
            }
        )
        return Response(response.data, status=status.HTTP_201_CREATED)
