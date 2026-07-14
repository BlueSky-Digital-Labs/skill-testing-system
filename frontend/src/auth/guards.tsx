import { ComponentType } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@hooks/useAuth'
import { useCoordinatorAccess } from '@hooks/useCoordinatorAccess'

export function withCoordinatorGuard<P extends object>(
  Component: ComponentType<P>,
) {
  function CoordinatorGuarded(props: P) {
    const { isAuthenticated } = useAuth()
    const { isCoordinator, isChecking } = useCoordinatorAccess()

    if (!isAuthenticated) {
      return <Navigate to="/login" replace />
    }

    if (isChecking) {
      return <div className="admin-route-loading">Checking access...</div>
    }

    if (!isCoordinator) {
      return <Navigate to="/dashboard?access=denied" replace />
    }

    return <Component {...props} />
  }

  CoordinatorGuarded.displayName = `withCoordinatorGuard(${
    Component.displayName ?? Component.name ?? 'Component'
  })`

  return CoordinatorGuarded
}
