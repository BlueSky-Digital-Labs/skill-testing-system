from django.urls import path

from .views import (
    AggregateAttemptView,
    AttemptResultView,
    EnqueueFreeTextView,
    ManualGradeView,
    QueueListView,
    ScoreFIBView,
    ScoreMCQView,
    ScoreMultiSelectView,
    ScoreTrueFalseView,
)

urlpatterns = [
    path('mcq/', ScoreMCQView.as_view(), name='grading_score_mcq'),
    path('true-false/', ScoreTrueFalseView.as_view(), name='grading_score_true_false'),
    path('fib/', ScoreFIBView.as_view(), name='grading_score_fib'),
    path('multi-select/', ScoreMultiSelectView.as_view(), name='grading_score_multi_select'),
    path('queue/enqueue-free-text/', EnqueueFreeTextView.as_view(), name='grading_enqueue_free_text'),
    path('queue/list/', QueueListView.as_view(), name='grading_queue_list'),
    path('grade/', ManualGradeView.as_view(), name='grading_manual_grade'),
    path('aggregate/attempt/', AggregateAttemptView.as_view(), name='grading_aggregate_attempt'),
    path('result/<str:attempt_id>/', AttemptResultView.as_view(), name='grading_attempt_result'),
]
