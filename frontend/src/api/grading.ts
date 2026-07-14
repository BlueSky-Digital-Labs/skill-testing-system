import { ApiError } from './auth'
import { authorizedFetch } from './http'
import { getApiBase } from './client'

export interface ManualGrade {
  id: string
  grader_user_id: number
  awarded_points: string
  feedback: string | null
  created_at: string
}

export interface QueueItem {
  id: string
  attempt_id: string
  test_id: string
  question_id: string
  question_version: string | null
  candidate_display: string | null
  blind_marking: boolean
  response_text: string
  max_points: string
  topic: string
  status: 'queued' | 'graded'
  created_at: string
  updated_at: string
  manual_grade: ManualGrade | null
}

export interface QueueListResponse {
  count: number
  results: QueueItem[]
  next_cursor?: string | null
}

export interface CombinedResult {
  id: string
  attempt_id: string
  test_id: string
  total_awarded: string
  total_max: string
  by_topic: Record<string, { awarded: string; max: string }>
  passed: boolean
  created_at: string
  updated_at: string
}

export interface ListQueueParams {
  status?: 'queued' | 'graded'
  testId?: string
  limit?: number
  cursor?: string
}

export interface SubmitManualGradeParams {
  queue_item_id: string
  awarded_points: string
  feedback?: string
}

const DEFAULT_PAGE_SIZE = 20

function extractErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') {
    return fallback
  }

  const data = payload as Record<string, unknown>

  if (typeof data.detail === 'string') {
    return data.detail
  }

  const firstFieldError = Object.values(data).find(
    (value) => Array.isArray(value) && typeof value[0] === 'string',
  ) as string[] | undefined

  if (firstFieldError?.[0]) {
    return firstFieldError[0]
  }

  return fallback
}

async function parseGradingResponse<T>(
  response: Response,
  fallbackMessage: string,
): Promise<T> {
  if (response.ok) {
    if (response.status === 204) {
      return undefined as T
    }

    return response.json() as Promise<T>
  }

  let message = fallbackMessage

  try {
    const payload = await response.json()
    message = extractErrorMessage(payload, fallbackMessage)
  } catch {
    // Keep fallback when the error body is not JSON.
  }

  throw new ApiError(message, response.status)
}

function decodeCursor(cursor?: string): number {
  if (!cursor) {
    return 0
  }

  const parsed = Number.parseInt(cursor, 10)
  return Number.isNaN(parsed) ? 0 : parsed
}

function encodeCursor(offset: number): string {
  return String(offset)
}

function paginateQueueResults(
  results: QueueItem[],
  limit: number,
  cursor?: string,
  apiNextCursor?: string | null,
): Pick<QueueListResponse, 'results' | 'next_cursor'> {
  if (apiNextCursor !== undefined) {
    return {
      results,
      next_cursor: apiNextCursor,
    }
  }

  const offset = decodeCursor(cursor)
  const page = results.slice(offset, offset + limit)
  const nextOffset = offset + limit
  const next_cursor = nextOffset < results.length ? encodeCursor(nextOffset) : null

  return { results: page, next_cursor }
}

export function displayCandidateName(item: Pick<QueueItem, 'blind_marking' | 'candidate_display'>): string {
  if (item.blind_marking) {
    return 'Anonymous'
  }

  return item.candidate_display ?? 'Unknown'
}

export async function listQueue({
  status,
  testId,
  limit = DEFAULT_PAGE_SIZE,
  cursor,
}: ListQueueParams = {}): Promise<QueueListResponse> {
  const params = new URLSearchParams()

  if (status) {
    params.set('status', status)
  }
  if (testId) {
    params.set('test_id', testId)
  }
  if (limit) {
    params.set('limit', String(limit))
  }
  if (cursor) {
    params.set('cursor', cursor)
  }

  const query = params.toString()
  const url = `${getApiBase()}/grading/queue/list${query ? `?${query}` : ''}`
  const response = await authorizedFetch(url)
  const payload = await parseGradingResponse<QueueListResponse>(
    response,
    'Unable to load grading queue',
  )

  const paginated = paginateQueueResults(
    payload.results,
    limit,
    cursor,
    payload.next_cursor,
  )

  return {
    count: payload.count,
    results: paginated.results,
    next_cursor: paginated.next_cursor,
  }
}

export async function getCombinedResult(attemptId: string): Promise<CombinedResult> {
  const response = await authorizedFetch(`${getApiBase()}/grading/result/${attemptId}/`)
  return parseGradingResponse<CombinedResult>(
    response,
    'Unable to load combined result',
  )
}

export async function submitManualGrade(
  payload: SubmitManualGradeParams,
): Promise<QueueItem> {
  const response = await authorizedFetch(`${getApiBase()}/grading/grade/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  return parseGradingResponse<QueueItem>(response, 'Unable to submit manual grade')
}

export async function aggregateAttempt(
  attemptId: string,
  testId?: string,
): Promise<CombinedResult> {
  const body: Record<string, string> = { attempt_id: attemptId }
  if (testId) {
    body.test_id = testId
  }

  const response = await authorizedFetch(`${getApiBase()}/grading/aggregate/attempt/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  return parseGradingResponse<CombinedResult>(
    response,
    'Unable to aggregate attempt scores',
  )
}

export async function findQueueItem(queueItemId: string): Promise<QueueItem | null> {
  const response = await listQueue({ limit: 1000 })
  return response.results.find((item) => item.id === queueItemId) ?? null
}
