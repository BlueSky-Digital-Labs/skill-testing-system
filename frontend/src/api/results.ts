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

export interface CertificateDto {
  id: string
  attempt_id: string
  issued_at: string
  template_version: string
  url: string
  checksum_sha256: string
  meta: Record<string, unknown>
}

interface CertificateApiResponse {
  id: string
  attempt_id: string
  issued_at: string
  template_version: string
  checksum_sha256: string
  revoked_at: string | null
  meta: Record<string, unknown>
  download_url?: string | null
}

function mapCertificateResponse(payload: CertificateApiResponse): CertificateDto {
  return {
    id: payload.id,
    attempt_id: payload.attempt_id,
    issued_at: payload.issued_at,
    template_version: payload.template_version,
    url: payload.download_url ?? '',
    checksum_sha256: payload.checksum_sha256,
    meta: payload.meta ?? {},
  }
}

export async function getCertificate(attemptId: string): Promise<CertificateDto | null> {
  const response = await authorizedFetch(`${getApiBase()}/results/${attemptId}/certificate/`)

  if (response.status === 404) {
    return null
  }

  const payload = await parseResponse<CertificateApiResponse>(
    response,
    'Unable to load certificate',
  )
  return mapCertificateResponse(payload)
}

export async function issueCertificate(attemptId: string): Promise<CertificateDto> {
  const response = await authorizedFetch(`${getApiBase()}/results/${attemptId}/certificate/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ template_version: 'v1' }),
  })

  const payload = await parseResponse<CertificateApiResponse>(
    response,
    'Unable to issue certificate',
  )
  return mapCertificateResponse(payload)
}
