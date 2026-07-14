"""
URL routes for test assembly APIs.
"""

from django.urls import path

from tests import views

urlpatterns = [
    path('', views.test_create, name='test_create'),
    path('<uuid:test_id>/', views.test_detail, name='test_detail'),
    path('<uuid:test_id>/publish/', views.test_publish, name='test_publish'),
    path('<uuid:test_id>/archive/', views.test_archive, name='test_archive'),
]
