from django.urls import path

from .views import (
    GroupComparisonReportView,
    IndividualReportView,
    ProgressReportView,
    QuestionPerformanceReportView,
    TestSummaryReportView,
)

urlpatterns = [
    path(
        'individual/<uuid:attempt_id>/',
        IndividualReportView.as_view(),
        name='report_individual',
    ),
    path(
        'test-summary/<uuid:test_id>/',
        TestSummaryReportView.as_view(),
        name='report_test_summary',
    ),
    path(
        'question-performance/<uuid:test_id>/',
        QuestionPerformanceReportView.as_view(),
        name='report_question_performance',
    ),
    path(
        'group-comparison/<uuid:test_id>/',
        GroupComparisonReportView.as_view(),
        name='report_group_comparison',
    ),
    path(
        'progress/',
        ProgressReportView.as_view(),
        name='report_progress',
    ),
]
