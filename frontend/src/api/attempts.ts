import { authorizedFetch } from '@/api/http'
import { getApiBase, parseResponse } from '@/api/client'

export type AttemptStatus =
  | 'in_progress'
  | 'submitted'
  | 'auto_submitted'
  | 'abandoned'

export interface AttemptAnswerState {
  question_version: number
  response: Record<string, unknown>
  saved_at?: string
}

export interface AttemptSession {
  id: string
  assignment_id: string
  candidate_id: number
  test_id: string
  status: AttemptStatus
  started_at: string
  expires_at: string
  submitted_at: string | null
  last_saved_at: string | null
  time_limit_seconds: number
  remaining_time_seconds: number
  question_id_order: string[]
  option_id_orders: Record<string, string[]>
  answers: Record<string, AttemptAnswerState>
}

export interface IntegritySettings {
  question_per_page: boolean
  disable_review: boolean
}

export const DEFAULT_INTEGRITY_SETTINGS: IntegritySettings = {
  question_per_page: true,
  disable_review: false,
}

interface StartAttemptBody {
  assignment_id: string
}

interface SaveAttemptBody {
  answers: Array<{
    question_id: string
    question_version: number
    response: Record<string, unknown>
  }>
}

/**
 * Start an attempt for the given assignment.
 *
 * The start handoff page resolves a test route to an assignment id before calling
 * this function because the delivery API keys attempts by assignment.
 */
export async function startAttempt(assignmentId: string): Promise<AttemptSession> {
  const response = await authorizedFetch(`${getApiBase()}/attempts/start/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assignment_id: assignmentId } satisfies StartAttemptBody),
  })

  return parseResponse<AttemptSession>(response, 'Unable to start attempt.')
}

export async function saveAnswer(
  attemptId: string,
  questionId: string,
  answer: Record<string, unknown>,
  version: number,
): Promise<AttemptSession> {
  const response = await authorizedFetch(`${getApiBase()}/attempts/${attemptId}/save`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      answers: [
        {
          question_id: questionId,
          question_version: version,
          response: answer,
        },
      ],
    } satisfies SaveAttemptBody),
  })

  return parseResponse<AttemptSession>(response, 'Unable to save answer.')
}

export async function resumeAttempt(attemptId: string): Promise<AttemptSession> {
  const response = await authorizedFetch(
    `${getApiBase()}/attempts/${attemptId}/resume`,
  )

  return parseResponse<AttemptSession>(response, 'Unable to resume attempt.')
}

export async function submitAttempt(attemptId: string): Promise<AttemptSession> {
  const response = await authorizedFetch(
    `${getApiBase()}/attempts/${attemptId}/submit`,
    { method: 'POST' },
  )

  return parseResponse<AttemptSession>(response, 'Unable to submit attempt.')
}
