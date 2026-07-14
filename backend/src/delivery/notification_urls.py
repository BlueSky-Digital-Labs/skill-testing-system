from django.urls import path

from delivery.notification_views import (
    ResendInviteView,
    SendRemindersView,
    TestMonitoringStatusView,
)

urlpatterns = [
    path(
        'assignments/<uuid:assignment_id>/resend-invite/',
        ResendInviteView.as_view(),
        name='assignment_resend_invite',
    ),
    path(
        'tests/<uuid:test_id>/reminders/',
        SendRemindersView.as_view(),
        name='test_send_reminders',
    ),
    path(
        'monitoring/tests/<uuid:test_id>/status/',
        TestMonitoringStatusView.as_view(),
        name='monitoring_test_status',
    ),
]
