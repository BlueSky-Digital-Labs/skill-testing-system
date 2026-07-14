from django.urls import path

from .views import list_logs, verify

urlpatterns = [
    path('logs/', list_logs, name='audit_list_logs'),
    path('verify/', verify, name='audit_verify'),
]
