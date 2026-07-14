from django.contrib import admin

from tests.models import (
    SelectionRule,
    Test,
    TestLifecycle,
    TestQuestionLink,
    TestSection,
    TestShuffleSeed,
)


class ReadOnlyWhenPublishedMixin:
    """Make admin forms read-only for published or archived tests."""

    def _is_locked(self, obj):
        if obj is None:
            return False
        if isinstance(obj, Test):
            return obj.lifecycle != TestLifecycle.DRAFT
        if isinstance(obj, TestSection):
            return obj.test.lifecycle != TestLifecycle.DRAFT
        if isinstance(obj, (TestQuestionLink, SelectionRule)):
            return obj.section.test.lifecycle != TestLifecycle.DRAFT
        if isinstance(obj, TestShuffleSeed):
            return obj.test.lifecycle != TestLifecycle.DRAFT
        return False

    def has_add_permission(self, request, obj=None):
        return not self._is_locked(obj) and super().has_add_permission(request)

    def has_change_permission(self, request, obj=None):
        if self._is_locked(obj):
            return False
        return super().has_change_permission(request, obj)

    def has_delete_permission(self, request, obj=None):
        if self._is_locked(obj):
            return False
        return super().has_delete_permission(request, obj)


class TestQuestionLinkInline(ReadOnlyWhenPublishedMixin, admin.TabularInline):
    model = TestQuestionLink
    extra = 0
    readonly_fields = ('question_version', 'source', 'selection_rule')


class SelectionRuleInline(ReadOnlyWhenPublishedMixin, admin.TabularInline):
    model = SelectionRule
    extra = 0


class TestSectionInline(ReadOnlyWhenPublishedMixin, admin.TabularInline):
    model = TestSection
    extra = 0
    show_change_link = True


@admin.register(Test)
class TestAdmin(ReadOnlyWhenPublishedMixin, admin.ModelAdmin):
    list_display = ('title', 'lifecycle', 'created_by', 'published_at', 'created_at')
    list_filter = ('lifecycle',)
    search_fields = ('title', 'description')
    readonly_fields = ('id', 'published_at', 'created_at', 'updated_at')
    inlines = [TestSectionInline]


@admin.register(TestSection)
class TestSectionAdmin(ReadOnlyWhenPublishedMixin, admin.ModelAdmin):
    list_display = ('title', 'test', 'order')
    list_filter = ('test__lifecycle',)
    search_fields = ('title', 'test__title')
    inlines = [TestQuestionLinkInline, SelectionRuleInline]


@admin.register(TestQuestionLink)
class TestQuestionLinkAdmin(ReadOnlyWhenPublishedMixin, admin.ModelAdmin):
    list_display = ('section', 'question', 'order', 'source', 'question_version')
    list_filter = ('source',)


@admin.register(SelectionRule)
class SelectionRuleAdmin(ReadOnlyWhenPublishedMixin, admin.ModelAdmin):
    list_display = ('section', 'subject', 'topic', 'difficulty', 'count', 'order')


@admin.register(TestShuffleSeed)
class TestShuffleSeedAdmin(admin.ModelAdmin):
    list_display = ('test', 'seed_type', 'seed_value', 'created_at')
    readonly_fields = ('id', 'test', 'seed_type', 'seed_value', 'created_at')

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
