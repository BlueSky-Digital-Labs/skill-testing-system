"""
Authentication utility helpers.
"""

from django.contrib.auth import get_user_model

User = get_user_model()


def user_has_role(user, role_key: str) -> bool:
    """
    Return True when an active user has an active role with the given key.
    """
    if user is None or not getattr(user, 'is_authenticated', False):
        return False
    if not user.is_active:
        return False
    return user.user_roles.filter(
        role__key=role_key,
        role__is_active=True,
    ).exists()


def get_active_system_admin_count(exclude_user_id=None) -> int:
    """
    Count users with an active SYSTEM_ADMIN role assignment.
    """
    queryset = User.objects.filter(
        is_active=True,
        user_roles__role__key='SYSTEM_ADMIN',
        user_roles__role__is_active=True,
    ).distinct()
    if exclude_user_id is not None:
        queryset = queryset.exclude(pk=exclude_user_id)
    return queryset.count()
