"""
Core API URL configuration.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from core.views.group_views import CandidateGroupViewSet

router = DefaultRouter()
router.register(r'groups', CandidateGroupViewSet, basename='candidate-group')

urlpatterns = [
    path('', include(router.urls)),
]
