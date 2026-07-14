from django.contrib import admin

from .models import Certificate


@admin.register(Certificate)
class CertificateAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'attempt_id',
        'template_version',
        'issued_at',
        'revoked_at',
    )
    list_filter = ('template_version', 'revoked_at')
    search_fields = ('attempt_id', 'pdf_s3_key')
    readonly_fields = (
        'id',
        'attempt_id',
        'issued_at',
        'template_version',
        'pdf_s3_key',
        'checksum_sha256',
        'revoked_at',
        'meta',
    )
