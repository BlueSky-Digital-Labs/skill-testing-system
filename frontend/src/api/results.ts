import { authorizedFetch } from './http'
import { getApiBase, parseResponse } from './client'

export type DisclosureLevel = 'none' | 'summary' | 'detailed'

export interface ReleaseStatus {
  id: string
  attempt_id: string
  test_id: string
  candidate_user_id: number
  disclosure: DisclosureLevel
  released: boolean
  released_at: string | null
  released_by_user_id: number | null
  created_at: string
  updated_at: string
}

export interface PostReleasePayload {
  attempt_id: string
  released?: boolean
  disclosure?: DisclosureLevel
  test_id?: string
  candidate_user_id?: number
}

export interface CandidateResultSummary {
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

export interface CandidateResultItem {
  id: string
  question_id: string
  question_version: number
  question_type: string
  is_correct: boolean
  awarded_points: string
  max_points: string
}

export type CandidateResultStatus = 'withheld' | 'released' | 'unreleased'

export interface CandidateResult {
  attempt_id: string
  released: boolean
  disclosure: DisclosureLevel
  visibility: 'full' | 'candidate'
  status: CandidateResultStatus
  summary?: CandidateResultSummary
  items?: CandidateResultItem[]
}

export async function getReleaseStatus(attemptId: string): Promise<ReleaseStatus> {
  const response = await authorizedFetch(`${getApiBase()}/results/status/${attemptId}/`)
  return parseResponse<ReleaseStatus>(response, 'Unable to load release status')
}

export async function postRelease(payload: PostReleasePayload): Promise<ReleaseStatus> {
  const response = await authorizedFetch(`${getApiBase()}/results/release/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return parseResponse<ReleaseStatus>(response, 'Unable to update release status')
}

export async function getCandidateResult(attemptId: string): Promise<CandidateResult> {
  const response = await authorizedFetch(`${getApiBase()}/results/candidate/${attemptId}/`)
  return parseResponse<CandidateResult>(response, 'Unable to load candidate result')
}
