"""
Tests for authentication API views.
"""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core import mail
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from authentication.models import PasswordResetToken
from authentication.password_reset import create_password_reset_token

User = get_user_model()


@override_settings(
    EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
    FRONTEND_URL='http://localhost:3000',
)
class AuthenticationViewsTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='user@example.com',
            password='SecurePass123!',
        )

    def test_token_obtain_success(self):
        response = self.client.post(
            reverse('token_obtain_pair'),
            {'email': 'user@example.com', 'password': 'SecurePass123!'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_token_obtain_invalid_credentials(self):
        response = self.client.post(
            reverse('token_obtain_pair'),
            {'email': 'user@example.com', 'password': 'wrong-password'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_token_refresh_success(self):
        refresh = RefreshToken.for_user(self.user)
        response = self.client.post(
            reverse('token_refresh'),
            {'refresh': str(refresh)},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)

    def test_password_reset_request_sends_email_for_existing_user(self):
        response = self.client.post(
            reverse('password_reset_request'),
            {'email': 'user@example.com'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('user@example.com', mail.outbox[0].to)
        self.assertTrue(
            PasswordResetToken.objects.filter(user=self.user, used_at__isnull=True).exists()
        )

    def test_password_reset_request_does_not_reveal_missing_user(self):
        response = self.client.post(
            reverse('password_reset_request'),
            {'email': 'missing@example.com'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 0)

    def test_password_reset_confirm_success(self):
        reset_token = create_password_reset_token(self.user)
        response = self.client.post(
            reverse('password_reset_confirm'),
            {
                'token': reset_token.token,
                'new_password': 'NewSecurePass456!',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('NewSecurePass456!'))
        reset_token.refresh_from_db()
        self.assertIsNotNone(reset_token.used_at)

    def test_password_reset_confirm_rejects_invalid_token(self):
        response = self.client.post(
            reverse('password_reset_confirm'),
            {
                'token': 'invalid-token',
                'new_password': 'NewSecurePass456!',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('token', response.data)

    def test_password_reset_confirm_rejects_expired_token(self):
        reset_token = create_password_reset_token(self.user)
        reset_token.expires_at = timezone.now() - timedelta(minutes=1)
        reset_token.save(update_fields=['expires_at'])

        response = self.client.post(
            reverse('password_reset_confirm'),
            {
                'token': reset_token.token,
                'new_password': 'NewSecurePass456!',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('token', response.data)

    def test_password_reset_confirm_rejects_weak_password(self):
        reset_token = create_password_reset_token(self.user)
        response = self.client.post(
            reverse('password_reset_confirm'),
            {
                'token': reset_token.token,
                'new_password': '123',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('new_password', response.data)
