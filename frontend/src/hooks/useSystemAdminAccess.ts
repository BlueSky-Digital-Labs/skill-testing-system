import { useEffect, useState } from 'react'
import { checkSystemAdminAccess } from '@/api/admin'
import { useAuth } from './useAuth'

export function useSystemAdminAccess() {
  const { isAuthenticated } = useAuth()
  const [isSystemAdmin, setIsSystemAdmin] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    let isMounted = true

    const verifyAccess = async () => {
      if (!isAuthenticated) {
        if (isMounted) {
          setIsSystemAdmin(false)
          setIsChecking(false)
        }
        return
      }

      try {
        const allowed = await checkSystemAdminAccess()
        if (isMounted) {
          setIsSystemAdmin(allowed)
        }
      } catch {
        if (isMounted) {
          setIsSystemAdmin(false)
        }
      } finally {
        if (isMounted) {
          setIsChecking(false)
        }
      }
    }

    void verifyAccess()

    return () => {
      isMounted = false
    }
  }, [isAuthenticated])

  return { isSystemAdmin, isChecking }
}
