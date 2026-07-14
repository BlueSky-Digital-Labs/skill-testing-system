import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getCandidateResult,
  getCertificate,
  getReleaseStatus,
  issueCertificate,
  postRelease,
} from './results'
import { clearTokens, setTokens } from './authStorage'

const sampleReleaseStatus = {
  id: 'release-1',
  attempt_id: 'attempt-1',
  test_id: 'test-1',
  candidate_user_id: 42,
  disclosure: 'summary' as const,
  released: true,
  released_at: '2026-07-14T00:00:00.000Z',
  released_by_user_id: 1,
  created_at: '2026-07-14T00:00:00.000Z',
  updated_at: '2026-07-14T00:00:00.000Z',
}

const sampleCandidateResult = {
  attempt_id: 'attempt-1',
  released: true,
  disclosure: 'detailed' as const,
  visibility: 'candidate' as const,
  status: 'released' as const,
  summary: {
    id: 'result-1',
    attempt_id: 'attempt-1',
    test_id: 'test-1',
    total_awarded: '8.00',
    total_max: '10.00',
    by_topic: {
      math: { awarded: '8.00', max: '10.00' },
    },
    passed: true,
    created_at: '2026-07-14T00:00:00.000Z',
    updated_at: '2026-07-14T00:00:00.000Z',
  },
  items: [
    {
      id: 'item-1',
      question_id: 'q-1',
      question_version: 1,
      question_type: 'mcq',
      is_correct: true,
      awarded_points: '5.00',
      max_points: '5.00',
    },
  ],
}

const sampleCertificateApi = {
  id: 'cert-1',
  attempt_id: 'attempt-1',
  issued_at: '2026-07-14T00:00:00.000Z',
  template_version: 'v1',
  checksum_sha256: 'abc123',
  revoked_at: null,
  meta: { candidate_name: 'Jane Candidate' },
  download_url: 'https://signed.example/cert.pdf',
}

describe('results API client', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    clearTokens()
  })

  it('getReleaseStatus fetches release status with auth header', async () => {
    setTokens('access-token', 'refresh-token')
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(sampleReleaseStatus), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await getReleaseStatus('attempt-1')

    expect(result.released).toBe(true)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/results/status/attempt-1/',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token',
        }),
      }),
    )
  })

  it('postRelease posts release payload', async () => {
    setTokens('access-token', 'refresh-token')
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(sampleReleaseStatus), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await postRelease({
      attempt_id: 'attempt-1',
      released: true,
      disclosure: 'summary',
      candidate_user_id: 42,
      test_id: 'test-1',
    })

    expect(result.disclosure).toBe('summary')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/results/release/',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          attempt_id: 'attempt-1',
          released: true,
          disclosure: 'summary',
          candidate_user_id: 42,
          test_id: 'test-1',
        }),
      }),
    )
  })

  it('getCandidateResult fetches candidate-visible result', async () => {
    setTokens('access-token', 'refresh-token')
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(sampleCandidateResult), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await getCandidateResult('attempt-1')

    expect(result.status).toBe('released')
    expect(result.items).toHaveLength(1)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/results/candidate/attempt-1/',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token',
        }),
      }),
    )
  })

  it('getCertificate returns null on 404', async () => {
    setTokens('access-token', 'refresh-token')
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 404 }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await getCertificate('attempt-1')

    expect(result).toBeNull()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/results/attempt-1/certificate/',
      expect.any(Object),
    )
  })

  it('getCertificate maps download_url to url', async () => {
    setTokens('access-token', 'refresh-token')
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(sampleCertificateApi), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await getCertificate('attempt-1')

    expect(result?.url).toBe('https://signed.example/cert.pdf')
    expect(result?.template_version).toBe('v1')
  })

  it('issueCertificate posts template version', async () => {
    setTokens('access-token', 'refresh-token')
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(sampleCertificateApi), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await issueCertificate('attempt-1')

    expect(result.id).toBe('cert-1')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/results/attempt-1/certificate/',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ template_version: 'v1' }),
      }),
    )
  })
})
