"""
Shared DRF permission classes.
"""

from rest_framework.permissions import BasePermission

from authentication.utils import user_has_role


class IsSystemAdmin(BasePermission):
    """
    Allow access only to users with the active SYSTEM_ADMIN role.
    """

    message = 'System administrator access is required.'

    def has_permission(self, request, view):
        return user_has_role(request.user, 'SYSTEM_ADMIN')


def HasAnyRole(*allowed):
    """
    Factory returning a permission class for any of the allowed roles.
    """

    class _HasAnyRole(BasePermission):
        message = 'You do not have permission to perform this action.'

        def has_permission(self, request, view):
            if not request.user or not request.user.is_authenticated:
                return False
            if not request.user.is_active:
                return False
            return any(
                user_has_role(request.user, role_key)
                for role_key in allowed
            )

    return _HasAnyRole
