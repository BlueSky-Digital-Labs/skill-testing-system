from django.urls import path

from delivery.preview_views import (
    PreviewAnswerView,
    PreviewFinishView,
    PreviewStartView,
)

urlpatterns = [
    path(
        'tests/<uuid:test_id>/start/',
        PreviewStartView.as_view(),
        name='preview_start',
    ),
    path(
        'tests/<uuid:test_id>/answer/',
        PreviewAnswerView.as_view(),
        name='preview_answer',
    ),
    path(
        'tests/<uuid:test_id>/finish/',
        PreviewFinishView.as_view(),
        name='preview_finish',
    ),
]
