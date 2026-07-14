import { useEffect, useState } from 'react'
import { checkExaminerAccess } from '@/api/questionBank'
import { checkSystemAdminAccess } from '@/api/admin'
import { useAuth } from './useAuth'

export function useExaminerAccess() {
  const { isAuthenticated } = useAuth()
  const [isExaminer, setIsExaminer] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    let isMounted = true

    const verifyAccess = async () => {
      if (!isAuthenticated) {
        if (isMounted) {
          setIsExaminer(false)
          setIsChecking(false)
        }
        return
      }

      try {
        const [examinerAllowed, systemAdminAllowed] = await Promise.all([
          checkExaminerAccess(),
          checkSystemAdminAccess(),
        ])
        if (isMounted) {
          setIsExaminer(examinerAllowed || systemAdminAllowed)
        }
      } catch {
        if (isMounted) {
          setIsExaminer(false)
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

  return { isExaminer, isChecking }
}
