import uuid

from django.db import models


class OrganizationSettings(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    logo = models.ImageField(upload_to='branding/', null=True, blank=True)
    primary_color = models.CharField(max_length=7, default='#0A5FFF')
    secondary_color = models.CharField(max_length=7, default='#111827')
    email_header_html = models.TextField(blank=True, default='')
    email_footer_html = models.TextField(blank=True, default='')
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'organization settings'
        verbose_name_plural = 'organization settings'

    def __str__(self):
        return f'Organization settings ({self.id})'

    @classmethod
    def load(cls):
        settings_obj = cls.objects.first()
        if settings_obj is None:
            settings_obj = cls.objects.create()
        return settings_obj
