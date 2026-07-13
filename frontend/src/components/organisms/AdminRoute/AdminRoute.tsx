import { ReactNode, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { getBranding } from '@/api/branding'

interface AdminRouteProps {
  children: ReactNode
  isAuthenticated: boolean
  loginRedirectTo?: string
  deniedRedirectTo?: string
}

export const AdminRoute = ({
  children,
  isAuthenticated,
  loginRedirectTo = '/login',
  deniedRedirectTo = '/dashboard?access=denied',
}: AdminRouteProps) => {
  const [accessState, setAccessState] = useState<'checking' | 'allowed' | 'denied'>('checking')

  useEffect(() => {
    let isMounted = true

    const verifyAccess = async () => {
      if (!isAuthenticated) {
        return
      }

      try {
        await getBranding({ redirectOnForbidden: false })
        if (isMounted) {
          setAccessState('allowed')
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
