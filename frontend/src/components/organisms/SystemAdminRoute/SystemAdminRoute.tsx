import { ReactNode, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { checkSystemAdminAccess } from '@/api/admin'

interface SystemAdminRouteProps {
  children: ReactNode
  isAuthenticated: boolean
  loginRedirectTo?: string
  deniedRedirectTo?: string
}

export const SystemAdminRoute = ({
  children,
  isAuthenticated,
  loginRedirectTo = '/login',
  deniedRedirectTo = '/dashboard?access=denied',
}: SystemAdminRouteProps) => {
  const [accessState, setAccessState] = useState<'checking' | 'allowed' | 'denied'>('checking')

  useEffect(() => {
    let isMounted = true

    const verifyAccess = async () => {
      if (!isAuthenticated) {
        return
      }

      try {
        const allowed = await checkSystemAdminAccess()
        if (isMounted) {
          setAccessState(allowed ? 'allowed' : 'denied')
        }
      } catch {
        if (isMounted) {
          setAccessState('denied')
        }
      }
    }

    void verifyAccess()

    return () => {
      isMounted = false
    }
  }, [isAuthenticated])

  if (!isAuthenticated) {
    return <Navigate to={loginRedirectTo} replace />
  }

  if (accessState === 'checking') {
    return <div className="admin-route-loading">Checking access...</div>
  }

  if (accessState === 'denied') {
    return <Navigate to={deniedRedirectTo} replace />
  }

  return <>{children}</>
}
