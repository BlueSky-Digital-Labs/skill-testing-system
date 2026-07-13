import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  aggregateAttempt,
  displayCandidateName,
  getCombinedResult,
  listQueue,
  submitManualGrade,
} from './grading'
import { clearTokens, setTokens } from './authStorage'

const sampleQueueItem = {
  id: 'queue-1',
  attempt_id: 'attempt-1',
  test_id: 'test-1',
  question_id: 'question-1',
  question_version: '1',
  candidate_display: 'Jane Candidate',
  blind_marking: false,
  response_text: 'Answer text',
  max_points: '10.00',
  topic: 'essay',
  status: 'queued' as const,
  created_at: '2026-07-13T00:00:00.000Z',
  updated_at: '2026-07-13T00:00:00.000Z',
  manual_grade: null,
}

const sampleCombinedResult = {
  id: 'result-1',
  attempt_id: 'attempt-1',
  test_id: 'test-1',
  total_awarded: '12.00',
  total_max: '15.00',
  by_topic: {
    essay: { awarded: '8.00', max: '10.00' },
    objective: { awarded: '4.00', max: '5.00' },
  },
  passed: true,
  created_at: '2026-07-13T00:00:00.000Z',
  updated_at: '2026-07-13T00:00:00.000Z',
}

describe('grading API client', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    clearTokens()
  })

  it('listQueue fetches queue items with auth header', async () => {
    setTokens('access-token', 'refresh-token')
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          count: 1,
          results: [sampleQueueItem],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await listQueue({ status: 'queued', limit: 10 })

    expect(result.count).toBe(1)
    expect(result.results).toHaveLength(1)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/grading/queue/list?status=queued&limit=10',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token',
        }),
      }),
    )
  })

  it('paginates queue results when next_cursor is absent', async () => {
    setTokens('access-token', 'refresh-token')
    const items = Array.from({ length: 3 }, (_, index) => ({
      ...sampleQueueItem,
      id: `queue-${index + 1}`,
    }))
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            count: 3,
            results: items,
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const firstPage = await listQueue({ status: 'queued', limit: 2 })
    expect(firstPage.results).toHaveLength(2)
    expect(firstPage.next_cursor).toBe('2')

    const secondPage = await listQueue({
      status: 'queued',
      limit: 2,
      cursor: firstPage.next_cursor ?? undefined,
    })
    expect(secondPage.results).toHaveLength(1)
    expect(secondPage.next_cursor).toBeNull()
  })

  it('submitManualGrade posts grade payload', async () => {
    setTokens('access-token', 'refresh-token')
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ...sampleQueueItem,
          status: 'graded',
          manual_grade: {
            id: 'grade-1',
            grader_user_id: 1,
            awarded_points: '8.50',
            feedback: 'Good work',
            created_at: '2026-07-13T00:00:00.000Z',
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await submitManualGrade({
      queue_item_id: 'queue-1',
      awarded_points: '8.50',
      feedback: 'Good work',
    })

    expect(result.status).toBe('graded')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/grading/grade/',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          queue_item_id: 'queue-1',
          awarded_points: '8.50',
          feedback: 'Good work',
        }),
      }),
    )
  })

  it('getCombinedResult fetches attempt result', async () => {
    setTokens('access-token', 'refresh-token')
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(sampleCombinedResult), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await getCombinedResult('attempt-1')

    expect(result.passed).toBe(true)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/grading/result/attempt-1/',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token',
        }),
      }),
    )
  })

  it('aggregateAttempt posts attempt aggregation request', async () => {
    setTokens('access-token', 'refresh-token')
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(sampleCombinedResult), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await aggregateAttempt('attempt-1', 'test-1')

    expect(result.total_awarded).toBe('12.00')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/grading/aggregate/attempt/',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          attempt_id: 'attempt-1',
          test_id: 'test-1',
        }),
      }),
    )
  })
})

describe('displayCandidateName', () => {
  it('masks candidate when blind marking is enabled', () => {
    expect(
      displayCandidateName({
        blind_marking: true,
        candidate_display: 'Jane Candidate',
      }),
    ).toBe('Anonymous')
  })

  it('shows candidate display when blind marking is disabled', () => {
    expect(
      displayCandidateName({
        blind_marking: false,
        candidate_display: 'Jane Candidate',
      }),
    ).toBe('Jane Candidate')
  })
})
