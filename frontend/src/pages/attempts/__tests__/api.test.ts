import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getAttemptReview } from '../api'

describe('getAttemptReview', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('maps disclosure_mode from the API payload to disclosure', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'attempt-1',
          test_id: 'test-1',
          candidate_user_id: 42,
          status: 'released',
          submitted_at: null,
          disclosure_mode: 'score_and_feedback',
          summary: {
            total_awarded: '8.00',
            total_max: '10.00',
            by_topic: {},
            passed: true,
          },
        }),
        { status: 200 },
      ),
    )

    const result = await getAttemptReview('attempt-1')

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/attempts/attempt-1/review/',
      expect.any(Object),
    )
    expect(result.disclosure).toBe('score_and_feedback')
  })
})
