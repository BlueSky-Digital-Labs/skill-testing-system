from django.conf import settings
from rest_framework import serializers

from .models import Certificate
from .services import CertificateStorageError, create_presigned_url


class CertificateSerializer(serializers.ModelSerializer):
    download_url = serializers.SerializerMethodField()

    class Meta:
        model = Certificate
        fields = [
            'id',
            'attempt_id',
            'issued_at',
            'template_version',
            'checksum_sha256',
            'revoked_at',
            'meta',
            'download_url',
        ]
        read_only_fields = fields

    def get_download_url(self, obj: Certificate) -> str | None:
        if obj.is_revoked:
            return None

        expires = self.context.get(
            'presigned_expires',
            settings.CERTIFICATE_PRESIGNED_URL_EXPIRES,
        )
        try:
            return create_presigned_url(obj.pdf_s3_key, expires)
        except CertificateStorageError:
            return None
