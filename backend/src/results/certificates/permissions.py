from authentication.models import RoleKey
from authentication.utils import user_has_role
from rest_framework.permissions import BasePermission


def _candidate_user_id(obj):
    if isinstance(obj, dict):
        return obj.get('candidate_user_id') or obj.get('candidate_id')
    if hasattr(obj, 'meta') and isinstance(obj.meta, dict):
        return obj.meta.get('candidate_user_id')
    return getattr(obj, 'candidate_user_id', None) or getattr(obj, 'candidate_id', None)


class IsCertificateViewer(BasePermission):
    """
    Allow staff/coordinators/admins or the owning candidate to access certificates.
    """

    message = 'You do not have permission to access this certificate.'

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if request.user.is_staff:
            return True
        if user_has_role(request.user, RoleKey.COORDINATOR):
            return True
        if user_has_role(request.user, RoleKey.SYSTEM_ADMIN):
            return True
        return _candidate_user_id(obj) == request.user.id
