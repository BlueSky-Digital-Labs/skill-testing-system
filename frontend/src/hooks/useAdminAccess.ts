import { useEffect, useState } from 'react'
import { getBranding } from '@/api/branding'
import { useAuth } from './useAuth'

export function useAdminAccess() {
  const { isAuthenticated } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    let isMounted = true

    const verifyAdminAccess = async () => {
      if (!isAuthenticated) {
        if (isMounted) {
          setIsAdmin(false)
          setIsChecking(false)
        }
        return
      }

      try {
        await getBranding({ redirectOnForbidden: false })
        if (isMounted) {
          setIsAdmin(true)
        }
      } catch {
        if (isMounted) {
          setIsAdmin(false)
        }
      } finally {
        if (isMounted) {
          setIsChecking(false)
        }
      }
    }

    void verifyAdminAccess()

    return () => {
      isMounted = false
    }
  }, [isAuthenticated])

  return { isAdmin, isChecking }
}
