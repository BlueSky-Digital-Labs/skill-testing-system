from django.contrib import admin

from .models import EmailMessageLog, EmailTemplate


@admin.register(EmailTemplate)
class EmailTemplateAdmin(admin.ModelAdmin):
    list_display = ('key', 'subject', 'is_active', 'updated_at')
    list_filter = ('is_active',)
    search_fields = ('key', 'subject', 'description')
    readonly_fields = ('id', 'created_at', 'updated_at')


@admin.register(EmailMessageLog)
class EmailMessageLogAdmin(admin.ModelAdmin):
    list_display = (
        'sent_at',
        'recipient_email',
        'template_key',
        'status',
        'provider',
        'assignment_id',
        'test_id',
    )
    list_filter = ('status', 'template_key', 'provider')
    search_fields = ('recipient_email', 'subject', 'error_message')
    readonly_fields = (
        'id',
        'recipient_email',
        'template_key',
        'subject',
        'status',
        'provider',
        'assignment_id',
        'test_id',
        'metadata',
        'sent_at',
        'error_message',
        'triggered_by_user_id',
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
