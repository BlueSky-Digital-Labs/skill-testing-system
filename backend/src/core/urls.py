"""
URL configuration for the project.
"""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiExample

from rest_framework.routers import DefaultRouter

from core.views import test_audit_log
from core.views.assignments import AssignmentViewSet
from core.views.attempt_review import AttemptReviewView

assignments_router = DefaultRouter()
assignments_router.register(
    r'assignments',
    AssignmentViewSet,
    basename='assignment',
)


@extend_schema(
    tags=['Health'],
    summary='Health check',
    description='Simple health check endpoint to verify the API is running.',
    responses={
        200: OpenApiResponse(
            description='API is healthy',
            examples=[
                OpenApiExample(
                    'Health Check Success',
                    value={'status': 'ok'}
                )
            ]
        )
    }
)
@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """Simple health check endpoint."""
    return Response({"status": "ok"})


urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Health checks (multiple endpoints to catch different variations)
    path('health/', health_check, name='health_check'),
    path('api/health/', health_check, name='api_health_check'),
    
    # Authentication
    path('api/', include('authentication.urls')),

    # Assignments
    path('api/', include(assignments_router.urls)),

    # Attempt review
    path(
        'api/attempts/<str:attempt_id>/review/',
        AttemptReviewView.as_view(),
        name='attempt_review',
    ),

    # Core APIs (candidate groups, etc.)
    path('api/core/', include('core.api_urls')),

    # Branding / organization settings
    path('', include('branding.urls')),

    # Auto-scoring
    path('api/grading/', include('grading.urls')),

    # Audit logging
    path('api/audit/', include('audit.urls')),
    path('api/audit/test-log', test_audit_log, name='audit_test_log'),

    # Question bank
    path('api/question-bank/', include('question_bank.urls')),

    # Results release and candidate visibility
    path('api/results/', include('results.urls')),
    
    # API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
