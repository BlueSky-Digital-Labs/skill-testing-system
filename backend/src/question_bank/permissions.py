"""
Question bank DRF permissions.
"""

from authentication.models import RoleKey

from core.permissions import HasAnyRole

IsExaminerOrAdmin = HasAnyRole(RoleKey.EXAMINER, RoleKey.SYSTEM_ADMIN)
