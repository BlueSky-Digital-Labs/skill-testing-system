import { ApiError } from '@/api/auth'
import { authorizedFetch, getApiBase } from '@/api/client'

export type AssignmentStatus = 'draft' | 'active' | 'archived'
export type AssignmentState = 'upcoming' | 'open' | 'overdue' | 'closed' | 'archived'

export interface AssignmentRow {
  id: string
  test_id: string
  assignee_user_id: string | null
  assignee_group_id: string | null
  created_by_user_id: string
  opens_at: string
  due_at: string | null
  closes_at: string | null
  max_attempts: number
  shuffle_questions: boolean
  shuffle_options: boolean
  status: AssignmentStatus
  state: AssignmentState
  created_at: string
  updated_at: string
}

export interface AssignmentListResponse {
  count: number
  next: string | null
  previous: string | null
  results: AssignmentRow[]
}

export interface ListAssignmentsParams {
  test_id?: string
  state?: string
  status?: string
  assignee_user_id?: string
  assignee_group_id?: string
  page?: number
}

export interface BulkAssignmentPayload {
  testId: string
  userIds: string[]
  groupIds: string[]
  opensAt: string
  dueAt?: string
  closesAt?: string
  maxAttempts: number
  shuffleQuestions: boolean
  shuffleOptions: boolean
  status?: AssignmentStatus
}

export interface BulkAssignmentFailure {
  assigneeId: string
  assigneeType: 'user' | 'group'
  message: string
}

export interface BulkAssignmentResult {
  created: AssignmentRow[]
  failed: BulkAssignmentFailure[]
}

const DEFAULT_CHUNK_SIZE = 25

function extractErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') {
    return fallback
  }

  const data = payload as Record<string, unknown>

  if (typeof data.detail === 'string') {
    return data.detail
  }

  const nonFieldErrors = data.non_field_errors
  if (Array.isArray(nonFieldErrors) && typeof nonFieldErrors[0] === 'string') {
    return nonFieldErrors[0]
  }

  const firstFieldError = Object.values(data).find(
    (value) => Array.isArray(value) && typeof value[0] === 'string',
  ) as string[] | undefined

  if (firstFieldError?.[0]) {
    return firstFieldError[0]
  }

  return fallback
}

async function parseAssignmentResponse<T>(response: Response, fallback: string): Promise<T> {
  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new ApiError(extractErrorMessage(payload, fallback), response.status)
  }

  return payload as T
}

function buildCreatePayload(
  payload: BulkAssignmentPayload,
  assigneeUserId?: string,
  assigneeGroupId?: string,
) {
  return {
    test_id: payload.testId,
    assignee_user_id: assigneeUserId ?? null,
    assignee_group_id: assigneeGroupId ?? null,
    opens_at: payload.opensAt,
    due_at: payload.dueAt ?? null,
    closes_at: payload.closesAt ?? null,
    max_attempts: payload.maxAttempts,
    shuffle_questions: payload.shuffleQuestions,
    shuffle_options: payload.shuffleOptions,
    status: payload.status ?? 'active',
  }
}

async function createAssignment(
  payload: BulkAssignmentPayload,
  assigneeUserId?: string,
  assigneeGroupId?: string,
): Promise<AssignmentRow> {
  const response = await authorizedFetch(`${getApiBase()}/assignments/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(
      buildCreatePayload(payload, assigneeUserId, assigneeGroupId),
    ),
  })

  return parseAssignmentResponse<AssignmentRow>(
    response,
    'Unable to create assignment.',
  )
}

export async function listAssignments(
  params: ListAssignmentsParams = {},
): Promise<AssignmentListResponse> {
  const searchParams = new URLSearchParams()

  if (params.test_id) {
    searchParams.set('test_id', params.test_id)
  }
  if (params.state) {
    searchParams.set('state', params.state)
  }
  if (params.status) {
    searchParams.set('status', params.status)
  }
  if (params.assignee_user_id) {
    searchParams.set('assignee_user_id', params.assignee_user_id)
  }
  if (params.assignee_group_id) {
    searchParams.set('assignee_group_id', params.assignee_group_id)
  }
  if (params.page) {
    searchParams.set('page', String(params.page))
  }

  const query = searchParams.toString()
  const url = `${getApiBase()}/assignments/${query ? `?${query}` : ''}`
  const response = await authorizedFetch(url)

  return parseAssignmentResponse<AssignmentListResponse>(
    response,
    'Unable to load assignments.',
  )
}

export async function postBulkAssignments(
  payload: BulkAssignmentPayload,
  chunkSize = DEFAULT_CHUNK_SIZE,
): Promise<BulkAssignmentResult> {
  const targets: Array<{ assigneeId: string; assigneeType: 'user' | 'group' }> = [
    ...payload.userIds.map((assigneeId) => ({
      assigneeId,
      assigneeType: 'user' as const,
    })),
    ...payload.groupIds.map((assigneeId) => ({
      assigneeId,
      assigneeType: 'group' as const,
    })),
  ]

  const created: AssignmentRow[] = []
  const failed: BulkAssignmentFailure[] = []

  for (let index = 0; index < targets.length; index += chunkSize) {
    const chunk = targets.slice(index, index + chunkSize)

    const chunkResults = await Promise.all(
      chunk.map(async ({ assigneeId, assigneeType }) => {
        try {
          const assignment = await createAssignment(
            payload,
            assigneeType === 'user' ? assigneeId : undefined,
            assigneeType === 'group' ? assigneeId : undefined,
          )
          return { assignment, failure: null }
        } catch (error) {
          const message =
            error instanceof ApiError
              ? error.message
              : 'Unable to create assignment.'
          return {
            assignment: null,
            failure: { assigneeId, assigneeType, message },
          }
        }
      }),
    )

    for (const result of chunkResults) {
      if (result.assignment) {
        created.push(result.assignment)
      }
      if (result.failure) {
        failed.push(result.failure)
      }
    }
  }

  if (created.length === 0 && failed.length > 0) {
    throw new ApiError(
      `All assignment requests failed. First error: ${failed[0].message}`,
      400,
    )
  }

  return { created, failed }
}
