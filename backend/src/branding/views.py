from rest_framework import serializers, status
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiResponse

from .models import OrganizationSettings
from .serializers import (
    sanitize_html,
    settings_to_dict,
    validate_hex_color,
)


@extend_schema(
    tags=['Branding'],
    summary='Get organization branding settings',
    description='Returns the current organization branding settings. Admin access required.',
    responses={
        200: OpenApiResponse(description='Current organization settings'),
        403: OpenApiResponse(description='Admin access required'),
    },
)
@api_view(['GET'])
@permission_classes([IsAdminUser])
def get_settings(request):
    settings_obj = OrganizationSettings.load()
    return Response(settings_to_dict(settings_obj, request=request))


@extend_schema(
    tags=['Branding'],
    summary='Update organization branding settings',
    description=(
        'Update organization branding settings. Accepts JSON or multipart form data '
        'for logo uploads. Admin access required.'
    ),
    responses={
        200: OpenApiResponse(description='Updated organization settings'),
        400: OpenApiResponse(description='Validation errors'),
        403: OpenApiResponse(description='Admin access required'),
    },
)
@api_view(['POST', 'PUT', 'PATCH'])
@permission_classes([IsAdminUser])
@parser_classes([JSONParser, MultiPartParser, FormParser])
def update_settings(request):
    settings_obj = OrganizationSettings.load()
    data = request.data
    errors = {}

    if 'primary_color' in data:
        try:
            settings_obj.primary_color = validate_hex_color(data['primary_color'])
        except serializers.ValidationError as exc:
            errors['primary_color'] = exc.detail

    if 'secondary_color' in data:
        try:
            settings_obj.secondary_color = validate_hex_color(data['secondary_color'])
        except serializers.ValidationError as exc:
            errors['secondary_color'] = exc.detail

    if 'email_header_html' in data:
        settings_obj.email_header_html = sanitize_html(data['email_header_html'])

    if 'email_footer_html' in data:
        settings_obj.email_footer_html = sanitize_html(data['email_footer_html'])

    if 'logo' in data:
        logo_file = data['logo']
        if logo_file in (None, ''):
            if settings_obj.logo:
                settings_obj.logo.delete(save=False)
            settings_obj.logo = None
        else:
            settings_obj.logo = logo_file

    if errors:
        return Response(errors, status=status.HTTP_400_BAD_REQUEST)

    if any(
        field in data
        for field in (
            'primary_color',
            'secondary_color',
            'email_header_html',
            'email_footer_html',
            'logo',
        )
    ):
        settings_obj.save()
    else:
        return Response(
            {'detail': 'No recognized fields provided for update.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return Response(settings_to_dict(settings_obj, request=request))
