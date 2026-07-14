from django.contrib import admin

from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = (
        'timestamp',
        'actor_display',
        'action',
        'entity_type',
        'entity_id',
    )
    list_filter = ('action', 'entity_type')
    search_fields = ('actor_display', 'actor_id', 'entity_id', 'action')
    readonly_fields = (
        'id',
        'timestamp',
        'actor_id',
        'actor_display',
        'action',
        'entity_type',
        'entity_id',
        'metadata',
        'prev_hash',
        'hash',
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
