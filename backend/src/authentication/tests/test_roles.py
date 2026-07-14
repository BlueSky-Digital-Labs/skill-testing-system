"""
Tests for role and admin user management.
"""

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from authentication.models import Role, RoleKey, UserRole
from authentication.utils import user_has_role

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def roles(db):
    defaults = {
        RoleKey.SYSTEM_ADMIN: ('System Administrator', 'Full platform administration'),
        RoleKey.EXAMINER: ('Examiner', 'Grades and reviews candidate submissions'),
        RoleKey.COORDINATOR: ('Coordinator', 'Coordinates exam sessions'),
        RoleKey.CANDIDATE: ('Candidate', 'Takes exams'),
    }
    created = {}
    for key, (name, description) in defaults.items():
        created[key], _ = Role.objects.get_or_create(
            key=key,
            defaults={
                'name': name,
                'description': description,
                'is_active': True,
            },
        )
    return created


@pytest.fixture
def system_admin(roles):
    user = User.objects.create_user(
        email='admin@example.com',
        password='AdminPass123!',
        first_name='System',
        last_name='Admin',
    )
    UserRole.objects.create(user=user, role=roles[RoleKey.SYSTEM_ADMIN])
    return user


@pytest.fixture
def regular_user(roles):
    user = User.objects.create_user(
        email='user@example.com',
        password='UserPass123!',
    )
    UserRole.objects.create(user=user, role=roles[RoleKey.CANDIDATE])
    return user


def auth_client(client, user):
    token = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token.access_token}')
    return client


@pytest.mark.django_db
class TestRoleUtilities:
    def test_user_has_role_true_for_assigned_active_role(self, roles, system_admin):
        assert user_has_role(system_admin, RoleKey.SYSTEM_ADMIN) is True

    def test_user_has_role_false_for_missing_role(self, roles, regular_user):
        assert user_has_role(regular_user, RoleKey.SYSTEM_ADMIN) is False

    def test_user_has_role_false_for_inactive_role(self, roles, system_admin):
        roles[RoleKey.SYSTEM_ADMIN].is_active = False
        roles[RoleKey.SYSTEM_ADMIN].save(update_fields=['is_active'])
        assert user_has_role(system_admin, RoleKey.SYSTEM_ADMIN) is False

    def test_user_has_role_false_for_inactive_user(self, roles, system_admin):
        system_admin.is_active = False
        system_admin.save(update_fields=['is_active'])
        assert user_has_role(system_admin, RoleKey.SYSTEM_ADMIN) is False


@pytest.mark.django_db
class TestRoleAPI:
    def test_list_roles_requires_system_admin(self, api_client, roles, regular_user):
        auth_client(api_client, regular_user)
        response = api_client.get('/api/admin/roles/')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_list_roles_as_system_admin(self, api_client, roles, system_admin):
        auth_client(api_client, system_admin)
        response = api_client.get('/api/admin/roles/')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 4

    def test_create_role_as_system_admin(self, api_client, roles, system_admin):
        auth_client(api_client, system_admin)
        response = api_client.post(
            '/api/admin/roles/',
            {
                'key': RoleKey.EXAMINER,
                'name': 'Duplicate Examiner',
                'description': 'Should fail due to unique key',
                'is_active': True,
            },
            format='json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_cannot_deactivate_system_admin_role(self, api_client, roles, system_admin):
        auth_client(api_client, system_admin)
        role = roles[RoleKey.SYSTEM_ADMIN]
        response = api_client.patch(
            f'/api/admin/roles/{role.pk}/',
            {'is_active': False},
            format='json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        role.refresh_from_db()
        assert role.is_active is True


@pytest.mark.django_db
class TestAdminUserAPI:
    def test_list_users_requires_system_admin(self, api_client, roles, regular_user):
        auth_client(api_client, regular_user)
        response = api_client.get('/api/admin/users/')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_list_users_as_system_admin(
        self, api_client, roles, system_admin, regular_user,
    ):
        auth_client(api_client, system_admin)
        response = api_client.get('/api/admin/users/')
        assert response.status_code == status.HTTP_200_OK
        emails = {row['email'] for row in response.data['results']}
        assert 'admin@example.com' in emails
        assert 'user@example.com' in emails

    def test_create_user_as_system_admin(self, api_client, roles, system_admin):
        auth_client(api_client, system_admin)
        response = api_client.post(
            '/api/admin/users/',
            {
                'email': 'newuser@example.com',
                'first_name': 'New',
                'last_name': 'User',
                'is_active': True,
                'password': 'NewUserPass123!',
            },
            format='json',
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['email'] == 'newuser@example.com'
        assert response.data['roles'] == []

    def test_assign_role_to_user(self, api_client, roles, system_admin, regular_user):
        auth_client(api_client, system_admin)
        response = api_client.post(
            f'/api/admin/users/{regular_user.pk}/assign-role/',
            {'role_key': RoleKey.EXAMINER},
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK
        role_keys = {role['key'] for role in response.data['roles']}
        assert RoleKey.EXAMINER in role_keys
        assert user_has_role(regular_user, RoleKey.EXAMINER) is True

    def test_assign_inactive_role_rejected(
        self, api_client, roles, system_admin, regular_user,
    ):
        roles[RoleKey.EXAMINER].is_active = False
        roles[RoleKey.EXAMINER].save(update_fields=['is_active'])
        auth_client(api_client, system_admin)
        response = api_client.post(
            f'/api/admin/users/{regular_user.pk}/assign-role/',
            {'role_key': RoleKey.EXAMINER},
            format='json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_remove_role_from_user(self, api_client, roles, system_admin, regular_user):
        auth_client(api_client, system_admin)
        response = api_client.post(
            f'/api/admin/users/{regular_user.pk}/remove-role/',
            {'role_key': RoleKey.CANDIDATE},
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK
        assert user_has_role(regular_user, RoleKey.CANDIDATE) is False

    def test_cannot_deactivate_last_system_admin(self, api_client, roles, system_admin):
        auth_client(api_client, system_admin)
        response = api_client.patch(
            f'/api/admin/users/{system_admin.pk}/',
            {'is_active': False},
            format='json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        system_admin.refresh_from_db()
        assert system_admin.is_active is True

    def test_cannot_remove_last_system_admin_role(
        self, api_client, roles, system_admin,
    ):
        auth_client(api_client, system_admin)
        response = api_client.post(
            f'/api/admin/users/{system_admin.pk}/remove-role/',
            {'role_key': RoleKey.SYSTEM_ADMIN},
            format='json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert user_has_role(system_admin, RoleKey.SYSTEM_ADMIN) is True

    def test_deactivate_user(self, api_client, roles, system_admin, regular_user):
        auth_client(api_client, system_admin)
        response = api_client.patch(
            f'/api/admin/users/{regular_user.pk}/',
            {'is_active': False},
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK
        regular_user.refresh_from_db()
        assert regular_user.is_active is False
        assert user_has_role(regular_user, RoleKey.CANDIDATE) is False


@pytest.mark.django_db
class TestPermissions:
    def test_is_system_admin_permission(self, roles, system_admin, regular_user):
        from core.permissions import IsSystemAdmin

        permission = IsSystemAdmin()
        request = type('Request', (), {'user': system_admin})()
        assert permission.has_permission(request, None) is True
        request.user = regular_user
        assert permission.has_permission(request, None) is False

    def test_has_any_role_permission(self, roles, system_admin, regular_user):
        from core.permissions import HasAnyRole

        permission = HasAnyRole(RoleKey.SYSTEM_ADMIN, RoleKey.COORDINATOR)()
        request = type('Request', (), {'user': system_admin})()
        assert permission.has_permission(request, None) is True
        request.user = regular_user
        assert permission.has_permission(request, None) is False
