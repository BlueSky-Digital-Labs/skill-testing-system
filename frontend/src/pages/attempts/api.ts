import { authorizedFetch } from '@/api/http'
import { getApiBase, parseResponse } from '@/api/client'

export type DisclosureMode =
  | 'withhold_until_release'
  | 'score_only'
  | 'score_and_feedback'

export type AttemptReviewStatus = 'withheld' | 'released' | 'completed'

export interface AttemptReviewSummary {
  total_awarded: string
  total_max: string
  by_topic: Record<string, { awarded: string; max: string }>
  passed: boolean
}

export interface AttemptReviewItem {
  question_id: string
  question_type: string
  awarded_points: string | null
  max_points: string
  is_correct: boolean | null
  feedback?: string | null
  response_text?: string | null
}

export interface AttemptReviewResponse {
  id: string
  test_id: string
  candidate_user_id: number
  status: AttemptReviewStatus
  submitted_at: string | null
  disclosure: DisclosureMode
  summary?: AttemptReviewSummary
  items?: AttemptReviewItem[]
}

interface RawAttemptReviewResponse {
  id: string
  test_id: string
  candidate_user_id: number
  status: AttemptReviewStatus
  submitted_at: string | null
  disclosure_mode?: DisclosureMode
  disclosure?: DisclosureMode
  summary?: AttemptReviewSummary
  items?: AttemptReviewItem[]
}

function normalizeDisclosure(payload: RawAttemptReviewResponse): DisclosureMode {
  return payload.disclosure ?? payload.disclosure_mode ?? 'withhold_until_release'
}

function normalizeAttemptReview(payload: RawAttemptReviewResponse): AttemptReviewResponse {
  return {
    ...payload,
    disclosure: normalizeDisclosure(payload),
  }
}

export async function getAttemptReview(attemptId: string): Promise<AttemptReviewResponse> {
  const response = await authorizedFetch(
    `${getApiBase()}/attempts/${attemptId}/review/`,
  )
  const payload = await parseResponse<RawAttemptReviewResponse>(
    response,
    'Unable to load attempt review',
  )
  return normalizeAttemptReview(payload)
}
