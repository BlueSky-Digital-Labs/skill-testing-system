from django.urls import path

from .views import CertificateAttemptView, CertificateDetailView

attempt_urlpatterns = [
    path(
        '<str:attempt_id>/certificate/',
        CertificateAttemptView.as_view(),
        name='results_certificate',
    ),
]

certificate_urlpatterns = [
    path(
        '<uuid:certificate_id>/',
        CertificateDetailView.as_view(),
        name='certificate_detail',
    ),
]
