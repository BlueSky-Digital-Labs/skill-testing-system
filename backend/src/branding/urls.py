from django.urls import path

from .views import get_settings, update_settings

urlpatterns = [
    path('api/admin/settings', get_settings, name='branding_get_settings'),
    path('api/admin/settings/update', update_settings, name='branding_update_settings'),
]
