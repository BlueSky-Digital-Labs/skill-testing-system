"""
URL configuration for the project.
"""
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
    path('api/auth/', include('authentication.urls')),
    
    # API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]
