from django.contrib import admin

from .config import TestConfigSnapshot
from .models import (
    CombinedResult,
    FreeTextQueueItem,
    ManualGrade,
    ObjectiveScore,
    ScoringPolicy,
)


@admin.register(ScoringPolicy)
class ScoringPolicyAdmin(admin.ModelAdmin):
    list_display = (
        'name',
        'partial_credit',
        'negative_marking',
        'per_option_value',
        'created_at',
    )
    search_fields = ('name',)


@admin.register(ObjectiveScore)
class ObjectiveScoreAdmin(admin.ModelAdmin):
    list_display = (
        'attempt_id',
        'question_id',
        'question_type',
        'awarded_points',
        'max_points',
        'is_correct',
        'created_at',
    )
    list_filter = ('question_type', 'is_correct')
    search_fields = ('attempt_id', 'question_id')


@admin.register(FreeTextQueueItem)
class FreeTextQueueItemAdmin(admin.ModelAdmin):
    list_display = (
        'attempt_id',
        'test_id',
        'question_id',
        'topic',
        'status',
        'blind_marking',
        'created_at',
    )
    list_filter = ('status', 'blind_marking', 'topic')
    search_fields = ('attempt_id', 'test_id', 'question_id')


@admin.register(ManualGrade)
class ManualGradeAdmin(admin.ModelAdmin):
    list_display = (
        'queue_item',
        'grader_user_id',
        'awarded_points',
        'created_at',
    )
    search_fields = ('queue_item__attempt_id', 'queue_item__question_id')


@admin.register(CombinedResult)
class CombinedResultAdmin(admin.ModelAdmin):
    list_display = (
        'attempt_id',
        'test_id',
        'total_awarded',
        'total_max',
        'passed',
        'updated_at',
    )
    list_filter = ('passed',)
    search_fields = ('attempt_id', 'test_id')


@admin.register(TestConfigSnapshot)
class TestConfigSnapshotAdmin(admin.ModelAdmin):
    list_display = ('test_id', 'passing_score', 'pass_type', 'created_at')
    search_fields = ('test_id',)
