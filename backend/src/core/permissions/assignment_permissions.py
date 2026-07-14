"""
Assignment-specific DRF permissions.
"""

from authentication.models import RoleKey
from core.permissions import HasAnyRole

IsCoordinatorOrAdmin = HasAnyRole(RoleKey.COORDINATOR, RoleKey.SYSTEM_ADMIN)
