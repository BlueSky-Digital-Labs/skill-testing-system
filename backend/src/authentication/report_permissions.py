"""
DRF permission classes for reporting endpoints.
"""

from __future__ import annotations

from authentication.models import RoleKey
from authentication.utils import user_has_role
from delivery.models import Attempt
from rest_framework.permissions import BasePermission

from reporting.serializers import REPORT_TYPES

_ANALYTICS_ROLES = (
    RoleKey.COORDINATOR,
    RoleKey.SYSTEM_ADMIN,
    RoleKey.EXAMINER,
)

_INDIVIDUAL_STAFF_ROLES = _ANALYTICS_ROLES


def _has_any_role(user, roles) -> bool:
    return any(user_has_role(user, role_key) for role_key in roles)


def _is_individual_report_allowed(user, attempt_id: str | None) -> bool:
    if not user or not user.is_authenticated or not user.is_active:
        return False
    if user.is_staff or _has_any_role(user, _INDIVIDUAL_STAFF_ROLES):
        return True
    if not attempt_id:
        return False
    attempt = Attempt.objects.filter(pk=attempt_id).only('candidate_id').first()
    return attempt is not None and attempt.candidate_id == user.id


class CanViewIndividualReport(BasePermission):
    message = 'You do not have permission to view this report.'

    def has_permission(self, request, view):
        attempt_id = view.kwargs.get('attempt_id')
        return _is_individual_report_allowed(request.user, attempt_id)


class CanViewAnalyticsReports(BasePermission):
    message = 'Coordinator, examiner, or administrator access is required.'

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated or not user.is_active:
            return False
        return user.is_staff or _has_any_role(user, _ANALYTICS_ROLES)


class CanViewProgressReport(BasePermission):
    message = 'Coordinator or administrator access is required.'

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated or not user.is_active:
            return False
        return user.is_staff or _has_any_role(
            user,
            (RoleKey.COORDINATOR, RoleKey.SYSTEM_ADMIN),
        )


class CanExportReport(BasePermission):
    message = 'You do not have permission to export this report.'

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated or not user.is_active:
            return False

        report_type = request.data.get('report_type')
        if report_type not in REPORT_TYPES:
            return True

        if report_type == 'individual':
            attempt_id = (request.data.get('parameters') or {}).get('attempt_id')
            return _is_individual_report_allowed(user, attempt_id)

        if report_type == 'progress':
            return user.is_staff or _has_any_role(
                user,
                (RoleKey.COORDINATOR, RoleKey.SYSTEM_ADMIN),
            )

        return user.is_staff or _has_any_role(user, _ANALYTICS_ROLES)
