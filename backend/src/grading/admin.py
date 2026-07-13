from django.contrib import admin

from .models import ObjectiveScore, ScoringPolicy


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
