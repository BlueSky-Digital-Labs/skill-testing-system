import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  resumeAttempt,
  saveAnswer,
  startAttempt,
  submitAttempt,
} from './attempts'

describe('attempts api', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('startAttempt posts assignment id to start endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'attempt-1',
          assignment_id: 'assignment-1',
          candidate_id: 7,
          test_id: 'test-1',
          status: 'in_progress',
          remaining_time_seconds: 3600,
          question_id_order: [],
          option_id_orders: {},
          answers: {},
        }),
        { status: 201 },
      ),
    )

    const result = await startAttempt('assignment-1')

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/attempts/start/',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ assignment_id: 'assignment-1' }),
      }),
    )
    expect(result.id).toBe('attempt-1')
  })

  it('saveAnswer puts a single answer payload', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'attempt-1',
          answers: {
            'q-1': {
              question_version: 2,
              response: { selected_option: 'A' },
            },
          },
        }),
        { status: 200 },
      ),
    )

    await saveAnswer('attempt-1', 'q-1', { selected_option: 'A' }, 2)

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/attempts/attempt-1/save',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({
          answers: [
            {
              question_id: 'q-1',
              question_version: 2,
              response: { selected_option: 'A' },
            },
          ],
        }),
      }),
    )
  })

  it('resumeAttempt loads attempt state', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 'attempt-1', remaining_time_seconds: 120 }), {
        status: 200,
      }),
    )

    const result = await resumeAttempt('attempt-1')
    expect(result.remaining_time_seconds).toBe(120)
  })

  it('submitAttempt posts to submit endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 'attempt-1', status: 'submitted' }), {
        status: 200,
      }),
    )

    const result = await submitAttempt('attempt-1')

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/attempts/attempt-1/submit',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(result.status).toBe('submitted')
  })
})
