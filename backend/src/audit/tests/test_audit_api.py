"""
Tests for audit logging APIs and hash chain utilities.
"""

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from audit.models import AuditLog
from audit.utils import (
    build_canonical_payload,
    compute_hash,
    log_action,
    verify_hash_chain,
)

User = get_user_model()


class AuditHashChainTest(TestCase):
    def test_log_action_creates_hash_chain(self):
        first = log_action(
            action='CREATE',
            entity_type='user',
            entity_id='1',
            actor_id='admin-1',
            actor_display='Admin User',
            metadata={'field': 'value'},
        )
        second = log_action(
            action='UPDATE',
            entity_type='user',
            entity_id='1',
            actor_id='admin-1',
            actor_display='Admin User',
        )

        self.assertEqual(first.prev_hash, '')
        self.assertTrue(first.hash)
        self.assertEqual(second.prev_hash, first.hash)
        self.assertNotEqual(second.hash, first.hash)

    def test_verify_hash_chain_valid(self):
        log_action(action='A', entity_type='test', entity_id='1')
        log_action(action='B', entity_type='test', entity_id='2')

        result = verify_hash_chain()
        self.assertTrue(result['valid'])
        self.assertEqual(result['total_entries'], 2)
        self.assertIsNone(result['broken_at_id'])

    def test_verify_hash_chain_detects_tampering(self):
        entry = log_action(action='TAMPER', entity_type='test', entity_id='1')
        AuditLog.objects.filter(pk=entry.pk).update(action='MODIFIED')

        result = verify_hash_chain()
        self.assertFalse(result['valid'])
        self.assertEqual(result['broken_at_id'], entry.id)

    def test_canonical_payload_is_stable(self):
        payload_a = build_canonical_payload(
            timestamp='2026-07-14T00:00:00+00:00',
            actor_id='1',
            actor_display='User',
            action='TEST',
            entity_type='item',
            entity_id='42',
            metadata={'b': 2, 'a': 1},
            prev_hash='abc',
        )
        payload_b = build_canonical_payload(
            timestamp='2026-07-14T00:00:00+00:00',
            actor_id='1',
            actor_display='User',
            action='TEST',
            entity_type='item',
            entity_id='42',
            metadata={'a': 1, 'b': 2},
            prev_hash='abc',
        )
        self.assertEqual(payload_a, payload_b)
        self.assertEqual(len(compute_hash(payload_a)), 64)


@override_settings(DEBUG=True)
class AuditAPITest(TestCase):
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
        AuditLog.objects.all().delete()

    def _authenticate(self, user):
        refresh = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

    def test_list_logs_requires_authentication(self):
        response = self.client.get(reverse('audit_list_logs'))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_logs_requires_staff(self):
        self._authenticate(self.regular_user)
        response = self.client.get(reverse('audit_list_logs'))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_logs_returns_entries(self):
        log_action(
            action='CREATE',
            entity_type='document',
            entity_id='doc-1',
            actor_id=str(self.staff_user.pk),
            actor_display=self.staff_user.email,
        )
        log_action(
            action='DELETE',
            entity_type='document',
            entity_id='doc-2',
            actor_id=str(self.staff_user.pk),
            actor_display=self.staff_user.email,
        )

        self._authenticate(self.staff_user)
        response = self.client.get(reverse('audit_list_logs'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 2)
        self.assertEqual(len(response.data['results']), 2)
        self.assertIn('hash', response.data['results'][0])

    def test_list_logs_filters(self):
        log_action(
            action='CREATE',
            entity_type='document',
            entity_id='doc-1',
            actor_id='actor-a',
        )
        log_action(
            action='DELETE',
            entity_type='document',
            entity_id='doc-2',
            actor_id='actor-b',
        )

        self._authenticate(self.staff_user)
        response = self.client.get(
            reverse('audit_list_logs'),
            {'action': 'CREATE', 'actor': 'actor-a', 'entity_id': 'doc-1'},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['action'], 'CREATE')

    def test_list_logs_pagination(self):
        for index in range(3):
            log_action(action='CREATE', entity_type='item', entity_id=str(index))

        self._authenticate(self.staff_user)
        response = self.client.get(
            reverse('audit_list_logs'),
            {'page': 1, 'page_size': 2},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 3)
        self.assertEqual(response.data['page'], 1)
        self.assertEqual(response.data['page_size'], 2)
        self.assertEqual(len(response.data['results']), 2)

    def test_verify_requires_staff(self):
        self._authenticate(self.regular_user)
        response = self.client.get(reverse('audit_verify'))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_verify_returns_chain_status(self):
        log_action(action='CREATE', entity_type='item', entity_id='1')
        log_action(action='UPDATE', entity_type='item', entity_id='1')

        self._authenticate(self.staff_user)
        response = self.client.get(reverse('audit_verify'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['valid'])
        self.assertEqual(response.data['total_entries'], 2)

    def test_test_log_endpoint_creates_dev_test_entry(self):
        self._authenticate(self.staff_user)
        response = self.client.post(reverse('audit_test_log'))

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['action'], 'DEV_TEST')
        self.assertTrue(AuditLog.objects.filter(action='DEV_TEST').exists())

    def test_test_log_endpoint_hidden_when_debug_false(self):
        with override_settings(DEBUG=False):
            self._authenticate(self.staff_user)
            response = self.client.post(reverse('audit_test_log'))
            self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
