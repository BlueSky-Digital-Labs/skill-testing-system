"""
Delivery-specific DRF permissions.
"""

from authentication.models import RoleKey

from core.permissions import HasAnyRole

IsExaminerOrAuthor = HasAnyRole(RoleKey.EXAMINER, RoleKey.SYSTEM_ADMIN)
