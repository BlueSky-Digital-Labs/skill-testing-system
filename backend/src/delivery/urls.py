from django.urls import path

from delivery.views import (
    ResumeAttemptView,
    SaveAttemptView,
    StartAttemptView,
    SubmitAttemptView,
)

urlpatterns = [
    path('start/', StartAttemptView.as_view(), name='attempt_start'),
    path(
        '<uuid:attempt_id>/save',
        SaveAttemptView.as_view(),
        name='attempt_save',
    ),
    path(
        '<uuid:attempt_id>/resume',
        ResumeAttemptView.as_view(),
        name='attempt_resume',
    ),
    path(
        '<uuid:attempt_id>/submit',
        SubmitAttemptView.as_view(),
        name='attempt_submit',
    ),
]
