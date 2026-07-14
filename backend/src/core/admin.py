from django.contrib import admin

from core.models import CandidateGroup


@admin.register(CandidateGroup)
class CandidateGroupAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_active', 'created_by', 'created_at', 'updated_at')
    list_filter = ('is_active',)
    search_fields = ('name', 'description')
    filter_horizontal = ('members',)
    readonly_fields = ('id', 'created_at', 'updated_at')
