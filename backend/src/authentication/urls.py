"""
Authentication URL configuration.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    register_view, 
    login_view, 
    profile_view, 
    UserViewSet,
    DocumentedTokenObtainPairView,
    DocumentedTokenRefreshView,
    DocumentedTokenVerifyView
)



# Create a router and register our viewsets with it.
router = DefaultRouter()
router.register(r'users', UserViewSet)

urlpatterns = [
    # Custom auth endpoints
    path('register/', register_view, name='register'),
    path('login/', login_view, name='login'),
    path('me/', profile_view, name='profile'),
    
    # JWT endpoints
    path('jwt/create/', DocumentedTokenObtainPairView.as_view(), name='jwt_create'),
    path('jwt/refresh/', DocumentedTokenRefreshView.as_view(), name='jwt_refresh'),
    path('jwt/verify/', DocumentedTokenVerifyView.as_view(), name='jwt_verify'),
    
    # Include router URLs
    path('', include(router.urls)),
]
