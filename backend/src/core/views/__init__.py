from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from drf_spectacular.utils import OpenApiResponse, extend_schema

from audit.utils import log_action


@extend_schema(
    tags=['Audit'],
    summary='Create a development test audit log entry',
    description='Logs a DEV_TEST action. Only available when DEBUG=True.',
    responses={
        201: OpenApiResponse(description='Test audit log entry created'),
        404: OpenApiResponse(description='Endpoint unavailable when DEBUG is False'),
    },
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def test_audit_log(request):
    if not settings.DEBUG:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

    entry = log_action(
        action='DEV_TEST',
        entity_type='system',
        entity_id='audit-test',
        metadata={'source': 'test-log-endpoint'},
        request=request,
    )
    return Response(
        {
            'id': entry.id,
            'action': entry.action,
            'hash': entry.hash,
            'prev_hash': entry.prev_hash,
        },
        status=status.HTTP_201_CREATED,
    )
