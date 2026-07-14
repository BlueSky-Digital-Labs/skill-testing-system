import { useEffect, useState } from 'react'
import { checkCoordinatorAccess } from '@/api/groups'
import { useAuth } from './useAuth'

export function useCoordinatorAccess() {
  const { isAuthenticated } = useAuth()
  const [isCoordinator, setIsCoordinator] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    let isMounted = true

    const verifyAccess = async () => {
      if (!isAuthenticated) {
        if (isMounted) {
          setIsCoordinator(false)
          setIsChecking(false)
        }
        return
      }

      try {
        const allowed = await checkCoordinatorAccess()
        if (isMounted) {
          setIsCoordinator(allowed)
        }
      } catch {
        if (isMounted) {
          setIsCoordinator(false)
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

  return { isCoordinator, isChecking }
}
