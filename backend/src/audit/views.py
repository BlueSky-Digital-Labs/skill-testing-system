from django.utils.dateparse import parse_datetime
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema

from .models import AuditLog
from .utils import verify_hash_chain


def _serialize_log(entry):
    return {
        'id': entry.id,
        'timestamp': entry.timestamp.isoformat(),
        'actor_id': entry.actor_id,
        'actor_display': entry.actor_display,
        'action': entry.action,
        'entity_type': entry.entity_type,
        'entity_id': entry.entity_id,
        'metadata': entry.metadata,
        'prev_hash': entry.prev_hash,
        'hash': entry.hash,
    }


@extend_schema(
    tags=['Audit'],
    summary='List audit logs',
    description='Retrieve audit logs with optional filters. Admin access required.',
    parameters=[
        OpenApiParameter(name='actor', description='Filter by actor_id', required=False, type=str),
        OpenApiParameter(name='action', description='Filter by action', required=False, type=str),
        OpenApiParameter(name='entity_type', description='Filter by entity type', required=False, type=str),
        OpenApiParameter(name='entity_id', description='Filter by entity id', required=False, type=str),
        OpenApiParameter(name='from', description='Inclusive start timestamp (ISO 8601)', required=False, type=str),
        OpenApiParameter(name='to', description='Inclusive end timestamp (ISO 8601)', required=False, type=str),
        OpenApiParameter(name='page', description='Page number (1-based)', required=False, type=int),
        OpenApiParameter(name='page_size', description='Results per page', required=False, type=int),
    ],
    responses={
        200: OpenApiResponse(description='Paginated audit log entries'),
        403: OpenApiResponse(description='Admin access required'),
    },
)
@api_view(['GET'])
@permission_classes([IsAdminUser])
def list_logs(request):
    queryset = AuditLog.objects.all().order_by('-id')

    actor = request.query_params.get('actor')
    if actor:
        queryset = queryset.filter(actor_id=actor)

    action = request.query_params.get('action')
    if action:
        queryset = queryset.filter(action=action)

    entity_type = request.query_params.get('entity_type')
    if entity_type:
        queryset = queryset.filter(entity_type=entity_type)

    entity_id = request.query_params.get('entity_id')
    if entity_id:
        queryset = queryset.filter(entity_id=entity_id)

    from_value = request.query_params.get('from')
    if from_value:
        from_dt = parse_datetime(from_value)
        if from_dt is None:
            return Response(
                {'detail': 'Invalid "from" timestamp. Use ISO 8601 format.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        queryset = queryset.filter(timestamp__gte=from_dt)

    to_value = request.query_params.get('to')
    if to_value:
        to_dt = parse_datetime(to_value)
        if to_dt is None:
            return Response(
                {'detail': 'Invalid "to" timestamp. Use ISO 8601 format.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        queryset = queryset.filter(timestamp__lte=to_dt)

    try:
        page = max(int(request.query_params.get('page', 1)), 1)
    except (TypeError, ValueError):
        return Response(
            {'detail': 'Invalid page number.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        page_size = int(request.query_params.get('page_size', 20))
    except (TypeError, ValueError):
        return Response(
            {'detail': 'Invalid page_size.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    page_size = min(max(page_size, 1), 100)

    total_count = queryset.count()
    offset = (page - 1) * page_size
    results = [_serialize_log(entry) for entry in queryset[offset:offset + page_size]]

    return Response(
        {
            'count': total_count,
            'page': page,
            'page_size': page_size,
            'results': results,
        }
    )


@extend_schema(
    tags=['Audit'],
    summary='Verify audit log hash chain',
    description='Check integrity of the hash-chained audit log. Admin access required.',
    responses={
        200: OpenApiResponse(description='Hash chain verification result'),
        403: OpenApiResponse(description='Admin access required'),
    },
)
@api_view(['GET'])
@permission_classes([IsAdminUser])
def verify(request):
    result = verify_hash_chain()
    return Response(result)
