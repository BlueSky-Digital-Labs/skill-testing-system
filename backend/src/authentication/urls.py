"""
Authentication URL configuration.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    register_view,
    login_view,
    profile_view,
    AuthUserViewSet,
    RoleViewSet,
    UserViewSet,
    DocumentedTokenObtainPairView,
    DocumentedTokenRefreshView,
    DocumentedTokenVerifyView,
    EmailTokenObtainPairView,
    TokenRefreshView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
)

# Create routers for auth and admin endpoints.
auth_router = DefaultRouter()
auth_router.register(r'users', AuthUserViewSet, basename='auth-user')

admin_router = DefaultRouter()
admin_router.register(r'roles', RoleViewSet, basename='admin-role')
admin_router.register(r'users', UserViewSet, basename='admin-user')

urlpatterns = [
    # Custom auth endpoints
    path('auth/register/', register_view, name='register'),
    path('auth/login/', login_view, name='login'),
    path('auth/me/', profile_view, name='profile'),

    # JWT endpoints (legacy)
    path('auth/jwt/create/', DocumentedTokenObtainPairView.as_view(), name='jwt_create'),
    path('auth/jwt/refresh/', DocumentedTokenRefreshView.as_view(), name='jwt_refresh'),
    path('auth/jwt/verify/', DocumentedTokenVerifyView.as_view(), name='jwt_verify'),

    # JWT and password reset endpoints
    path('auth/token/', EmailTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/password/forgot/', PasswordResetRequestView.as_view(), name='password_reset_request'),
    path('auth/password/reset/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),

    # Include router URLs
    path('auth/', include(auth_router.urls)),
    path('admin/', include(admin_router.urls)),
]
