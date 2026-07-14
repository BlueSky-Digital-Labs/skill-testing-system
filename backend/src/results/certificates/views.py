from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema, OpenApiResponse
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Certificate
from .permissions import IsCertificateViewer
from .serializers import CertificateSerializer
from .services import (
    CertificateNotEligible,
    CertificateNotFound,
    CertificateServiceError,
    get_certificate_for_attempt,
    issue_certificate,
)


def _serialize_certificate(certificate, request):
    serializer = CertificateSerializer(
        certificate,
        context={'request': request},
    )
    return serializer.data


def _attempt_owner_id(attempt_id: str) -> int | None:
    certificate = (
        Certificate.objects.filter(attempt_id=attempt_id)
        .order_by('-issued_at')
        .first()
    )
    if certificate is not None and isinstance(certificate.meta, dict):
        return certificate.meta.get('candidate_user_id')

    from delivery import services as delivery_services

    try:
        summary = delivery_services.get_attempt_summary(attempt_id)
    except Exception:
        return None
    return summary.get('candidate_user_id')


class CertificateAttemptView(APIView):
    permission_classes = [IsCertificateViewer]

    def get_permissions(self):
        return [IsCertificateViewer()]

    def _check_attempt_access(self, request, attempt_id: str) -> Response | None:
        if request.user.is_staff:
            return None
        if self.permission_classes[0]().has_object_permission(
            request,
            self,
            {'candidate_user_id': _attempt_owner_id(attempt_id)},
        ):
            return None
        return Response(
            {'detail': IsCertificateViewer.message},
            status=status.HTTP_403_FORBIDDEN,
        )

    @extend_schema(
        tags=['Results'],
        summary='Get certificate for attempt',
        responses={
            200: OpenApiResponse(description='Certificate metadata and download URL'),
            403: OpenApiResponse(description='Forbidden'),
            404: OpenApiResponse(description='Certificate not found'),
        },
    )
    def get(self, request, attempt_id: str):
        denied = self._check_attempt_access(request, attempt_id)
        if denied is not None:
            return denied

        try:
            certificate = get_certificate_for_attempt(attempt_id)
        except CertificateNotFound as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_404_NOT_FOUND)

        self.check_object_permissions(request, certificate)
        return Response(_serialize_certificate(certificate, request))

    @extend_schema(
        tags=['Results'],
        summary='Issue certificate for attempt',
        request={
            'application/json': {
                'type': 'object',
                'properties': {
                    'template_version': {'type': 'string'},
                },
            }
        },
        responses={
            201: OpenApiResponse(description='Certificate issued'),
            200: OpenApiResponse(description='Existing certificate returned'),
            400: OpenApiResponse(description='Not eligible'),
            403: OpenApiResponse(description='Forbidden'),
        },
    )
    def post(self, request, attempt_id: str):
        denied = self._check_attempt_access(request, attempt_id)
        if denied is not None:
            return denied

        template_version = request.data.get('template_version', 'v1')
        if not isinstance(template_version, str) or not template_version.strip():
            return Response(
                {'detail': 'template_version must be a non-empty string.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        existed = Certificate.objects.filter(
            attempt_id=attempt_id,
            template_version=template_version,
            revoked_at__isnull=True,
        ).exists()

        try:
            certificate = issue_certificate(attempt_id, template_version.strip())
        except CertificateNotEligible as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except CertificateServiceError as exc:
            return Response(
                {'detail': str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        self.check_object_permissions(request, certificate)
        response_status = status.HTTP_200_OK if existed else status.HTTP_201_CREATED
        return Response(
            _serialize_certificate(certificate, request),
            status=response_status,
        )


@extend_schema(tags=['Results'])
class CertificateDetailView(APIView):
    permission_classes = [IsCertificateViewer]

    @extend_schema(
        summary='Get certificate by ID',
        responses={
            200: OpenApiResponse(description='Certificate metadata and download URL'),
            403: OpenApiResponse(description='Forbidden'),
            404: OpenApiResponse(description='Certificate not found'),
        },
    )
    def get(self, request, certificate_id):
        certificate = get_object_or_404(Certificate, pk=certificate_id)
        self.check_object_permissions(request, certificate)
        return Response(_serialize_certificate(certificate, request))
