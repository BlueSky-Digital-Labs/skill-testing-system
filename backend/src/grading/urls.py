from django.urls import path

from .views import ScoreFIBView, ScoreMCQView, ScoreMultiSelectView, ScoreTrueFalseView

urlpatterns = [
    path('mcq/', ScoreMCQView.as_view(), name='grading_score_mcq'),
    path('true-false/', ScoreTrueFalseView.as_view(), name='grading_score_true_false'),
    path('fib/', ScoreFIBView.as_view(), name='grading_score_fib'),
    path('multi-select/', ScoreMultiSelectView.as_view(), name='grading_score_multi_select'),
]
