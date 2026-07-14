"""
Tests for candidate onboarding via self-registration and invitations.
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

from authentication.invitations import create_invitation
from authentication.models import Invitation, Role, RoleKey, UserRole

User = get_user_model()


def create_roles():
    defaults = {
        RoleKey.SYSTEM_ADMIN: ('System Administrator', 'Full platform administration'),
        RoleKey.EXAMINER: ('Examiner', 'Grades and reviews candidate submissions'),
        RoleKey.COORDINATOR: ('Coordinator', 'Coordinates exam sessions'),
        RoleKey.CANDIDATE: ('Candidate', 'Takes exams'),
    }
    roles = {}
    for key, (name, description) in defaults.items():
        roles[key], _ = Role.objects.get_or_create(
            key=key,
            defaults={
                'name': name,
                'description': description,
                'is_active': True,
            },
        )
    return roles


def auth_client(client, user):
    token = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token.access_token}')
    return client


@override_settings(
    EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
    FRONTEND_URL='http://localhost:3000',
    ALLOW_SELF_REGISTRATION=True,
)
class SelfRegistrationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        create_roles()

    def test_self_registration_success(self):
        response = self.client.post(
            reverse('self_registration'),
            {
                'email': 'candidate@example.com',
                'password': 'SecurePass123!',
                'password_confirm': 'SecurePass123!',
                'first_name': 'Test',
                'last_name': 'Candidate',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        user = User.objects.get(email='candidate@example.com')
        self.assertEqual(user.first_name, 'Test')
        self.assertTrue(
            UserRole.objects.filter(
                user=user,
                role__key=RoleKey.CANDIDATE,
            ).exists()
        )

    def test_self_registration_rejects_duplicate_email(self):
        User.objects.create_user(
            email='existing@example.com',
            password='SecurePass123!',
        )
        response = self.client.post(
            reverse('self_registration'),
            {
                'email': 'existing@example.com',
                'password': 'SecurePass123!',
                'password_confirm': 'SecurePass123!',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)

    def test_self_registration_rejects_password_mismatch(self):
        response = self.client.post(
            reverse('self_registration'),
            {
                'email': 'candidate@example.com',
                'password': 'SecurePass123!',
                'password_confirm': 'DifferentPass123!',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @override_settings(ALLOW_SELF_REGISTRATION=False)
    def test_self_registration_disabled(self):
        response = self.client.post(
            reverse('self_registration'),
            {
                'email': 'candidate@example.com',
                'password': 'SecurePass123!',
                'password_confirm': 'SecurePass123!',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(User.objects.filter(email='candidate@example.com').exists())


@override_settings(
    EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
    FRONTEND_URL='http://localhost:3000',
)
class InvitationIssueTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.roles = create_roles()
        self.admin = User.objects.create_user(
            email='admin@example.com',
            password='AdminPass123!',
        )
        UserRole.objects.create(user=self.admin, role=self.roles[RoleKey.SYSTEM_ADMIN])
        self.coordinator = User.objects.create_user(
            email='coordinator@example.com',
            password='CoordPass123!',
        )
        UserRole.objects.create(
            user=self.coordinator,
            role=self.roles[RoleKey.COORDINATOR],
        )
        self.candidate = User.objects.create_user(
            email='candidate@example.com',
            password='UserPass123!',
        )
        UserRole.objects.create(user=self.candidate, role=self.roles[RoleKey.CANDIDATE])

    def test_system_admin_can_issue_candidate_invitation(self):
        auth_client(self.client, self.admin)
        response = self.client.post(
            reverse('invitation_issue'),
            {'email': 'newcandidate@example.com', 'role_key': RoleKey.CANDIDATE},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('newcandidate@example.com', mail.outbox[0].to)
        self.assertIn('accept-invitation?token=', mail.outbox[0].body)
        invitation = Invitation.objects.get(email='newcandidate@example.com')
        self.assertIsNone(invitation.accepted_at)
        self.assertEqual(invitation.created_by, self.admin)

    def test_coordinator_can_issue_candidate_invitation(self):
        auth_client(self.client, self.coordinator)
        response = self.client.post(
            reverse('invitation_issue'),
            {'email': 'invited@example.com'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        invitation = Invitation.objects.get(email='invited@example.com')
        self.assertEqual(invitation.role_key, RoleKey.CANDIDATE)

    def test_coordinator_cannot_issue_non_candidate_invitation(self):
        auth_client(self.client, self.coordinator)
        response = self.client.post(
            reverse('invitation_issue'),
            {'email': 'invited@example.com', 'role_key': RoleKey.EXAMINER},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('role_key', response.data)

    def test_candidate_cannot_issue_invitation(self):
        auth_client(self.client, self.candidate)
        response = self.client.post(
            reverse('invitation_issue'),
            {'email': 'invited@example.com'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(len(mail.outbox), 0)

    def test_unauthenticated_cannot_issue_invitation(self):
        response = self.client.post(
            reverse('invitation_issue'),
            {'email': 'invited@example.com'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_reissue_invalidates_previous_pending_invitation(self):
        auth_client(self.client, self.admin)
        first = create_invitation(
            email='pending@example.com',
            role_key=RoleKey.CANDIDATE,
            created_by=self.admin,
        )
        response = self.client.post(
            reverse('invitation_issue'),
            {'email': 'pending@example.com', 'role_key': RoleKey.CANDIDATE},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        first.refresh_from_db()
        self.assertIsNotNone(first.accepted_at)
        pending = Invitation.objects.filter(
            email='pending@example.com',
            accepted_at__isnull=True,
        )
        self.assertEqual(pending.count(), 1)


@override_settings(
    EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
    FRONTEND_URL='http://localhost:3000',
)
class InvitationAcceptTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.roles = create_roles()
        self.admin = User.objects.create_user(
            email='admin@example.com',
            password='AdminPass123!',
        )
        UserRole.objects.create(user=self.admin, role=self.roles[RoleKey.SYSTEM_ADMIN])

    def test_accept_invitation_creates_user_and_returns_tokens(self):
        invitation = create_invitation(
            email='newuser@example.com',
            role_key=RoleKey.CANDIDATE,
            created_by=self.admin,
        )
        response = self.client.post(
            reverse('invitation_accept'),
            {
                'token': invitation.token,
                'password': 'SecurePass123!',
                'first_name': 'New',
                'last_name': 'User',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        user = User.objects.get(email='newuser@example.com')
        self.assertTrue(user.check_password('SecurePass123!'))
        self.assertTrue(
            UserRole.objects.filter(
                user=user,
                role__key=RoleKey.CANDIDATE,
            ).exists()
        )
        invitation.refresh_from_db()
        self.assertIsNotNone(invitation.accepted_at)
        self.assertEqual(invitation.consumed_by, user)

    def test_accept_invitation_updates_existing_user(self):
        existing = User.objects.create_user(
            email='existing@example.com',
            password='OldPass123!',
            first_name='Old',
            last_name='Name',
        )
        invitation = create_invitation(
            email='existing@example.com',
            role_key=RoleKey.CANDIDATE,
            created_by=self.admin,
        )
        response = self.client.post(
            reverse('invitation_accept'),
            {
                'token': invitation.token,
                'password': 'NewSecurePass456!',
                'first_name': 'Updated',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        existing.refresh_from_db()
        self.assertTrue(existing.check_password('NewSecurePass456!'))
        self.assertEqual(existing.first_name, 'Updated')
        self.assertTrue(
            UserRole.objects.filter(
                user=existing,
                role__key=RoleKey.CANDIDATE,
            ).exists()
        )

    def test_accept_invitation_rejects_invalid_token(self):
        response = self.client.post(
            reverse('invitation_accept'),
            {
                'token': 'invalid-token',
                'password': 'SecurePass123!',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('token', response.data)

    def test_accept_invitation_rejects_expired_token(self):
        invitation = create_invitation(
            email='expired@example.com',
            role_key=RoleKey.CANDIDATE,
            created_by=self.admin,
        )
        invitation.expires_at = timezone.now() - timedelta(minutes=1)
        invitation.save(update_fields=['expires_at'])

        response = self.client.post(
            reverse('invitation_accept'),
            {
                'token': invitation.token,
                'password': 'SecurePass123!',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('token', response.data)

    def test_accept_invitation_rejects_reused_token(self):
        invitation = create_invitation(
            email='reuse@example.com',
            role_key=RoleKey.CANDIDATE,
            created_by=self.admin,
        )
        first = self.client.post(
            reverse('invitation_accept'),
            {
                'token': invitation.token,
                'password': 'SecurePass123!',
            },
            format='json',
        )
        self.assertEqual(first.status_code, status.HTTP_200_OK)

        second = self.client.post(
            reverse('invitation_accept'),
            {
                'token': invitation.token,
                'password': 'AnotherPass123!',
            },
            format='json',
        )
        self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)

    def test_accepted_invitation_tokens_authenticate(self):
        invitation = create_invitation(
            email='auth@example.com',
            role_key=RoleKey.CANDIDATE,
            created_by=self.admin,
        )
        accept_response = self.client.post(
            reverse('invitation_accept'),
            {
                'token': invitation.token,
                'password': 'SecurePass123!',
            },
            format='json',
        )
        self.assertEqual(accept_response.status_code, status.HTTP_200_OK)

        token_response = self.client.post(
            reverse('token_obtain_pair'),
            {'email': 'auth@example.com', 'password': 'SecurePass123!'},
            format='json',
        )
        self.assertEqual(token_response.status_code, status.HTTP_200_OK)
        self.assertIn('access', token_response.data)
