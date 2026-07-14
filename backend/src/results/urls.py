from django.urls import path

from .views import CandidateResultView, ReleaseStatusView, ReleaseView

urlpatterns = [
    path("release/", ReleaseView.as_view(), name="results_release"),
    path(
        "status/<str:attempt_id>/",
        ReleaseStatusView.as_view(),
        name="results_status",
    ),
    path(
        "candidate/<str:attempt_id>/",
        CandidateResultView.as_view(),
        name="results_candidate",
    ),
]
