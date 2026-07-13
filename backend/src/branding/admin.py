from django.contrib import admin

from .models import OrganizationSettings


@admin.register(OrganizationSettings)
class OrganizationSettingsAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'primary_color',
        'secondary_color',
        'logo',
        'updated_at',
    )
    readonly_fields = ('id', 'updated_at')
