import re

import bleach
from rest_framework import serializers

from .models import OrganizationSettings

HEX_COLOR_PATTERN = re.compile(r'^#[0-9A-Fa-f]{6}$')
SCRIPT_STYLE_PATTERN = re.compile(
    r'<(script|style)[^>]*>.*?</\1>',
    re.IGNORECASE | re.DOTALL,
)

ALLOWED_HTML_TAGS = [
    'a', 'abbr', 'b', 'blockquote', 'br', 'code', 'div', 'em', 'h1', 'h2', 'h3',
    'h4', 'h5', 'h6', 'hr', 'i', 'img', 'li', 'ol', 'p', 'pre', 'span', 'strong',
    'table', 'tbody', 'td', 'th', 'thead', 'tr', 'u', 'ul',
]
ALLOWED_HTML_ATTRIBUTES = {
    '*': ['class'],
    'a': ['href', 'title', 'target', 'rel'],
    'img': ['src', 'alt', 'title', 'width', 'height'],
}


def validate_hex_color(value):
    if not HEX_COLOR_PATTERN.match(value):
        raise serializers.ValidationError(
            'Color must be a valid 6-digit hex value (e.g. #0A5FFF).'
        )
    return value


def sanitize_html(value):
    if value is None:
        return ''
    cleaned_value = SCRIPT_STYLE_PATTERN.sub('', value)
    return bleach.clean(
        cleaned_value,
        tags=ALLOWED_HTML_TAGS,
        attributes=ALLOWED_HTML_ATTRIBUTES,
        strip=True,
    )


def settings_to_dict(settings_obj, request=None):
    data = {
        'id': str(settings_obj.id),
        'primary_color': settings_obj.primary_color,
        'secondary_color': settings_obj.secondary_color,
        'email_header_html': settings_obj.email_header_html,
        'email_footer_html': settings_obj.email_footer_html,
        'updated_at': settings_obj.updated_at.isoformat(),
        'logo': None,
    }
    if settings_obj.logo:
        if request is not None:
            data['logo'] = request.build_absolute_uri(settings_obj.logo.url)
        else:
            data['logo'] = settings_obj.logo.url
    return data
