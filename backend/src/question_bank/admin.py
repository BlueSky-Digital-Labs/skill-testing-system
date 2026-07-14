from django.contrib import admin

from .models import BlankAnswerKey, Option, Question, QuestionVersion


class OptionInline(admin.TabularInline):
    model = Option
    extra = 0


class BlankAnswerKeyInline(admin.TabularInline):
    model = BlankAnswerKey
    extra = 0


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "subject",
        "topic",
        "difficulty",
        "type",
        "points",
        "author",
        "created_at",
    )
    list_filter = ("subject", "topic", "difficulty", "type")
    search_fields = ("text", "subject", "topic")
    readonly_fields = ("id", "created_at", "updated_at")
    inlines = [OptionInline, BlankAnswerKeyInline]


@admin.register(Option)
class OptionAdmin(admin.ModelAdmin):
    list_display = ("id", "question", "label", "value", "is_correct", "order")
    list_filter = ("is_correct",)
    search_fields = ("label", "value", "question__text")


@admin.register(BlankAnswerKey)
class BlankAnswerKeyAdmin(admin.ModelAdmin):
    list_display = ("id", "question", "answer", "case_sensitive")
    search_fields = ("answer", "question__text")


@admin.register(QuestionVersion)
class QuestionVersionAdmin(admin.ModelAdmin):
    list_display = (
        "question",
        "version_number",
        "subject",
        "topic",
        "question_type",
        "created_at",
        "created_by",
    )
    list_filter = ("subject", "topic", "question_type", "difficulty")
    search_fields = ("subject", "topic", "prompt", "question__id")
    readonly_fields = (
        "id",
        "question",
        "version_number",
        "created_at",
        "created_by",
        "subject",
        "topic",
        "difficulty",
        "question_type",
        "prompt",
        "points",
        "image_url",
        "explanation",
        "options",
        "correct_answers",
        "sha256",
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
