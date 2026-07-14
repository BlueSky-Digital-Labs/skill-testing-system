"""
Question import API endpoints.
"""

from __future__ import annotations

from django.contrib.auth.decorators import login_required
from django.http import HttpResponse
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.parsers import JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from question_bank.importers.parser import detect_format, parse_spreadsheet
from question_bank.importers.template import generate_template
from question_bank.importers.upsert import ImportUpsertError, bulk_upsert
from question_bank.importers.validator import validate_rows

# Examiner role checks are deferred; any authenticated user may import for now.
_login_required = login_required


@extend_schema(
    tags=['Question Import'],
    summary='Download question import template',
    description='Returns a CSV or XLSX template with headers and sample rows.',
    responses={
        200: OpenApiResponse(description='Template file bytes'),
        400: OpenApiResponse(description='Unsupported format'),
    },
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
@_login_required
def download_template(request):
    file_format = request.query_params.get('file_format', 'csv')
    if file_format == 'csv' and 'format' in request.query_params:
        file_format = request.query_params.get('format', 'csv')
    try:
        content = generate_template(file_format)
    except ValueError as exc:
        return Response({'format': [str(exc)]}, status=status.HTTP_400_BAD_REQUEST)

    normalized = file_format.strip().lower()
    if normalized == 'xlsx':
        content_type = (
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        filename = 'question_import_template.xlsx'
    else:
        content_type = 'text/csv; charset=utf-8'
        filename = 'question_import_template.csv'

    response = HttpResponse(content, content_type=content_type)
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response


@extend_schema(
    tags=['Question Import'],
    summary='Parse and validate an import spreadsheet',
    request={
        'multipart/form-data': {
            'type': 'object',
            'properties': {
                'file': {'type': 'string', 'format': 'binary'},
            },
            'required': ['file'],
        },
    },
    responses={
        200: OpenApiResponse(description='Validation summary with valid and error rows'),
        400: OpenApiResponse(description='Missing or invalid upload'),
    },
)
@api_view(['POST'])
@parser_classes([MultiPartParser])
@permission_classes([IsAuthenticated])
@_login_required
def parse_import(request):
    upload = request.FILES.get('file')
    if upload is None:
        return Response(
            {'file': ['No spreadsheet file provided.']},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        file_format = detect_format(upload.name)
    except ValueError as exc:
        return Response({'file': [str(exc)]}, status=status.HTTP_400_BAD_REQUEST)

    try:
        rows = parse_spreadsheet(upload, upload.name)
    except ValueError as exc:
        return Response({'file': [str(exc)]}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as exc:
        return Response(
            {'file': [f'Unable to read {file_format.upper()} file: {exc}']},
            status=status.HTTP_400_BAD_REQUEST,
        )

    valid_rows, error_rows = validate_rows(rows)
    return Response(
        {
            'filename': upload.name,
            'format': file_format,
            'total_rows': len(rows),
            'valid_count': len(valid_rows),
            'error_count': len(error_rows),
            'valid_rows': valid_rows,
            'errors': error_rows,
        },
    )


@extend_schema(
    tags=['Question Import'],
    summary='Commit validated import rows',
    request={
        'application/json': {
            'type': 'object',
            'properties': {
                'rows': {
                    'type': 'array',
                    'items': {'type': 'object'},
                },
            },
            'required': ['rows'],
        },
    },
    responses={
        200: OpenApiResponse(description='Import summary'),
        400: OpenApiResponse(description='Validation or upsert failure'),
    },
)
@api_view(['POST'])
@parser_classes([JSONParser])
@permission_classes([IsAuthenticated])
@_login_required
def commit_import(request):
    rows = request.data.get('rows')
    if not isinstance(rows, list):
        return Response(
            {'rows': ['A list of validated rows is required.']},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not rows:
        return Response(
            {'rows': ['At least one valid row is required to commit an import.']},
            status=status.HTTP_400_BAD_REQUEST,
        )

    valid_rows, error_rows = validate_rows(rows)
    if error_rows:
        return Response(
            {
                'rows': ['One or more rows failed validation during commit.'],
                'errors': error_rows,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        summary = bulk_upsert(valid_rows, author=request.user)
    except ImportUpsertError as exc:
        return Response(
            {'detail': [str(exc)]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return Response(summary)
