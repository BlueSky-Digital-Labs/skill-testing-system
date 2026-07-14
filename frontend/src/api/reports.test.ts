import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  exportReportCsv,
  exportReportPdf,
  getGroupReport,
  getIndividualReport,
  getQuestionReport,
  getTestReport,
} from './reports'
import { clearTokens, setTokens } from './authStorage'

const individualReport = {
  attempt_id: 'attempt-1',
  test_id: 'test-1',
  candidate_id: 1,
  status: 'submitted',
  started_at: '2026-07-14T00:00:00.000Z',
  submitted_at: '2026-07-14T01:00:00.000Z',
  total_awarded: '8.00',
  total_max: '10.00',
  passed: true,
  by_topic: { science: { awarded: '8.00', max: '10.00' } },
  questions: [],
}

describe('reports API client', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    clearTokens()
  })

  it('getIndividualReport fetches an attempt report', async () => {
    setTokens('access-token', 'refresh-token')
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(individualReport), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await getIndividualReport('attempt-1')

    expect(result.attempt_id).toBe('attempt-1')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/reports/individual/attempt-1/',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token',
        }),
      }),
    )
  })

  it('getTestReport fetches a test summary', async () => {
    setTokens('access-token', 'refresh-token')
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          test_id: 'test-1',
          attempt_count: 2,
          completed_count: 2,
          completion_rate: '1.0000',
          result_count: 2,
          passed_count: 1,
          pass_rate: '0.5000',
          average_awarded: '7.50',
          average_max: '10.00',
          average_percent: '75.00',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await getTestReport('test-1')

    expect(result.test_id).toBe('test-1')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/reports/test-summary/test-1/',
      expect.any(Object),
    )
  })

  it('getQuestionReport and getGroupReport call the expected endpoints', async () => {
    setTokens('access-token', 'refresh-token')
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ test_id: 'test-1', questions: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ test_id: 'test-1', groups: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
    vi.stubGlobal('fetch', fetchMock)

    await getQuestionReport('test-1')
    await getGroupReport('test-1')

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/reports/question-performance/test-1/',
      expect.any(Object),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/reports/group-comparison/test-1/',
      expect.any(Object),
    )
  })

  it('exportReportCsv posts to the exports endpoint', async () => {
    setTokens('access-token', 'refresh-token')
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          download_url: 'https://example.test/report.csv',
          s3_key: 'reports/test_summary/1/file.csv',
          expires_in: 3600,
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await exportReportCsv('test_summary', { test_id: 'test-1' })

    expect(result.download_url).toContain('report.csv')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/exports/',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          report_type: 'test_summary',
          format: 'csv',
          parameters: { test_id: 'test-1' },
        }),
      }),
    )
  })

  it('exportReportPdf posts with pdf format', async () => {
    setTokens('access-token', 'refresh-token')
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          download_url: 'https://example.test/report.pdf',
          s3_key: 'reports/individual/1/file.pdf',
          expires_in: 3600,
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    await exportReportPdf('individual', { attempt_id: 'attempt-1' })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/exports/',
      expect.objectContaining({
        body: JSON.stringify({
          report_type: 'individual',
          format: 'pdf',
          parameters: { attempt_id: 'attempt-1' },
        }),
      }),
    )
  })
})
