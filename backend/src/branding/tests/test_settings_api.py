"""
Tests for organization branding settings API endpoints.
"""

import tempfile
from io import BytesIO

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.urls import reverse
from PIL import Image
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from branding.models import OrganizationSettings

User = get_user_model()


def _make_test_image(name='logo.png'):
    image = Image.new('RGB', (32, 32), color='blue')
    buffer = BytesIO()
    image.save(buffer, format='PNG')
    buffer.seek(0)
    return SimpleUploadedFile(name, buffer.read(), content_type='image/png')


@override_settings(MEDIA_ROOT=tempfile.mkdtemp())
class OrganizationSettingsAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.staff_user = User.objects.create_user(
            email='admin@example.com',
            password='SecurePass123!',
            is_staff=True,
        )
        self.regular_user = User.objects.create_user(
            email='user@example.com',
            password='SecurePass123!',
        )
        OrganizationSettings.objects.all().delete()

    def _authenticate(self, user):
        refresh = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

    def test_get_settings_requires_authentication(self):
        response = self.client.get(reverse('branding_get_settings'))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_settings_requires_staff(self):
        self._authenticate(self.regular_user)
        response = self.client.get(reverse('branding_get_settings'))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_settings_returns_defaults_for_staff(self):
        self._authenticate(self.staff_user)
        response = self.client.get(reverse('branding_get_settings'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['primary_color'], '#0A5FFF')
        self.assertEqual(response.data['secondary_color'], '#111827')
        self.assertEqual(response.data['email_header_html'], '')
        self.assertEqual(response.data['email_footer_html'], '')
        self.assertIsNone(response.data['logo'])
        self.assertIn('id', response.data)
        self.assertIn('updated_at', response.data)

    def test_update_settings_json_fields(self):
        self._authenticate(self.staff_user)
        response = self.client.post(
            reverse('branding_update_settings'),
            {
                'primary_color': '#FF0000',
                'secondary_color': '#00FF00',
                'email_header_html': '<p>Header</p><script>alert(1)</script>',
                'email_footer_html': '<div>Footer</div>',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['primary_color'], '#FF0000')
        self.assertEqual(response.data['secondary_color'], '#00FF00')
        self.assertEqual(response.data['email_header_html'], '<p>Header</p>')
        self.assertEqual(response.data['email_footer_html'], '<div>Footer</div>')

    def test_update_settings_rejects_invalid_color(self):
        self._authenticate(self.staff_user)
        response = self.client.post(
            reverse('branding_update_settings'),
            {'primary_color': 'red'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('primary_color', response.data)

    def test_update_settings_logo_upload(self):
        self._authenticate(self.staff_user)
        response = self.client.post(
            reverse('branding_update_settings'),
            {'logo': _make_test_image()},
            format='multipart',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(response.data['logo'])
        self.assertTrue(response.data['logo'].startswith('http://testserver/media/'))

        settings_obj = OrganizationSettings.load()
        self.assertTrue(settings_obj.logo.name.startswith('branding/'))

    def test_update_settings_requires_staff(self):
        self._authenticate(self.regular_user)
        response = self.client.post(
            reverse('branding_update_settings'),
            {'primary_color': '#ABCDEF'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_settings_requires_authentication(self):
        response = self.client.post(
            reverse('branding_update_settings'),
            {'primary_color': '#ABCDEF'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_update_settings_rejects_empty_payload(self):
        self._authenticate(self.staff_user)
        response = self.client.post(
            reverse('branding_update_settings'),
            {},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
