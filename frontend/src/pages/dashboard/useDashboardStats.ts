import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '@/api/auth'
import { listQueue } from '@/api/grading'
import { listGroupsPaginated } from '@/api/groups'
import { listQuestions } from '@/api/questionBank'
import { listAssignments, type AssignmentRow } from '@/pages/tests/assign/api'

export interface DashboardStats {
  questionCount: number | null
  assignmentCount: number | null
  groupCount: number | null
  gradingQueueCount: number | null
  recentAssignments: AssignmentRow[]
  isLoading: boolean
  error: string | null
}

const EMPTY_STATS: DashboardStats = {
  questionCount: null,
  assignmentCount: null,
  groupCount: null,
  gradingQueueCount: null,
  recentAssignments: [],
  isLoading: true,
  error: null,
}

interface DashboardAccess {
  isExaminer: boolean
  isCoordinator: boolean
  isAdmin: boolean
}

async function safeCount<T extends { count: number }>(
  loader: () => Promise<T>,
): Promise<number | null> {
  try {
    const response = await loader()
    return response.count
  } catch (error) {
    if (error instanceof ApiError && (error.status === 403 || error.status === 401)) {
      return null
    }
    throw error
  }
}

export function useDashboardStats(access: DashboardAccess) {
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS)

  const loadStats = useCallback(async () => {
    setStats((current) => ({ ...current, isLoading: true, error: null }))

    try {
      const [questionCount, assignmentCount, groupCount, gradingQueueCount, assignments] =
        await Promise.all([
          access.isExaminer ? safeCount(() => listQuestions({ page: 1 })) : Promise.resolve(null),
          access.isCoordinator
            ? safeCount(() => listAssignments({ page: 1 }))
            : Promise.resolve(null),
          access.isCoordinator
            ? safeCount(() => listGroupsPaginated(1))
            : Promise.resolve(null),
          access.isAdmin
            ? safeCount(() => listQueue({ status: 'queued', limit: 1 }))
            : Promise.resolve(null),
          access.isCoordinator
            ? listAssignments({ page: 1 }).catch((error) => {
                if (error instanceof ApiError && (error.status === 403 || error.status === 401)) {
                  return { count: 0, next: null, previous: null, results: [] }
                }
                throw error
              })
            : Promise.resolve({ count: 0, next: null, previous: null, results: [] }),
        ])

      setStats({
        questionCount,
        assignmentCount,
        groupCount,
        gradingQueueCount,
        recentAssignments: assignments.results.slice(0, 5),
        isLoading: false,
        error: null,
      })
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : 'Unable to load dashboard summary.'
      setStats({
        ...EMPTY_STATS,
        isLoading: false,
        error: message,
      })
    }
  }, [access.isAdmin, access.isCoordinator, access.isExaminer])

  useEffect(() => {
    void loadStats()
  }, [loadStats])

  return { stats, reload: loadStats }
}
