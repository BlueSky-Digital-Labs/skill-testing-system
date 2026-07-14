import { authorizedFetch } from '@/api/http'
import { getApiBase, parseResponse } from '@/api/client'

export const DEFAULT_PREVIEW_REMAINING_SECONDS = 3600

export interface PreviewSession {
  preview: true
  test_id: string
  status: 'in_progress'
  seed: number
  started_at: string
  question_id_order: string[]
  option_id_orders: Record<string, string[]>
  answers: Record<string, unknown>
  remaining_seconds?: number
  time_limit_seconds?: number
}

export interface PreviewAnswerPayload {
  question_id: string
  answer: Record<string, unknown> | string | boolean | string[]
}

export interface PreviewValidationResult {
  valid: boolean
  question_id: string
  question_type: string
  errors: string[]
}

export interface PreviewPartialScore {
  awarded_points: string
  max_points: string
  is_correct: boolean | null
  requires_manual_grading?: boolean
  detail?: Record<string, unknown>
}

export interface PreviewAnswerResult {
  accepted: boolean
  server_ts: string
  validation: PreviewValidationResult
  partial_score: PreviewPartialScore
}

export interface PreviewQuestionScore {
  awarded_points: string
  max_points: string
  is_correct: boolean | null
  answered: boolean
  requires_manual_grading?: boolean
  detail?: Record<string, unknown>
}

export interface PreviewFinishResult {
  preview: true
  total_auto_score: string
  per_question: Record<string, PreviewQuestionScore>
}

export interface PreviewIntegritySettings {
  question_per_page: boolean
  disable_review: boolean
}

export const DEFAULT_PREVIEW_INTEGRITY: PreviewIntegritySettings = {
  question_per_page: true,
  disable_review: false,
}

interface StartPreviewBody {
  seed?: number
}

export async function startPreview(
  testId: string,
  seed?: number,
): Promise<PreviewSession> {
  const body: StartPreviewBody = {}
  if (seed != null) {
    body.seed = seed
  }

  const response = await authorizedFetch(
    `${getApiBase()}/preview/tests/${testId}/start/`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  )

  const session = await parseResponse<PreviewSession>(
    response,
    'Unable to start preview session.',
  )

  return {
    ...session,
    remaining_seconds:
      session.remaining_seconds ??
      session.time_limit_seconds ??
      DEFAULT_PREVIEW_REMAINING_SECONDS,
  }
}

export async function sendPreviewAnswer(
  testId: string,
  payload: PreviewAnswerPayload,
): Promise<PreviewAnswerResult> {
  const response = await authorizedFetch(
    `${getApiBase()}/preview/tests/${testId}/answer/`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  )

  return parseResponse<PreviewAnswerResult>(
    response,
    'Unable to validate preview answer.',
  )
}

export async function finishPreview(testId: string): Promise<PreviewFinishResult> {
  const response = await authorizedFetch(
    `${getApiBase()}/preview/tests/${testId}/finish/`,
    { method: 'POST' },
  )

  return parseResponse<PreviewFinishResult>(
    response,
    'Unable to finish preview session.',
  )
}
