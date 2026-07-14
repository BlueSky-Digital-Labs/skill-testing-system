import { beforeEach, describe, expect, it, vi } from 'vitest'
import { finishPreview, sendPreviewAnswer, startPreview } from './tests'

describe('tests preview api', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('startPreview posts optional seed to preview start endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          preview: true,
          test_id: 'test-1',
          status: 'in_progress',
          seed: 42,
          started_at: '2026-07-14T09:00:00Z',
          question_id_order: ['q-1'],
          option_id_orders: { 'q-1': ['opt-1'] },
          answers: {},
        }),
        { status: 201 },
      ),
    )

    const result = await startPreview('test-1', 42)

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/preview/tests/test-1/start/',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ seed: 42 }),
      }),
    )
    expect(result.preview).toBe(true)
    expect(result.remaining_seconds).toBe(3600)
  })

  it('sendPreviewAnswer posts question payload', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          accepted: true,
          server_ts: '2026-07-14T09:01:00Z',
          validation: { valid: true, question_id: 'q-1', question_type: 'MCQ', errors: [] },
          partial_score: {
            awarded_points: '1.00',
            max_points: '1.00',
            is_correct: true,
          },
        }),
        { status: 200 },
      ),
    )

    await sendPreviewAnswer('test-1', {
      question_id: 'q-1',
      answer: { selected_option: 'A' },
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/preview/tests/test-1/answer/',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          question_id: 'q-1',
          answer: { selected_option: 'A' },
        }),
      }),
    )
  })

  it('finishPreview posts to finish endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          preview: true,
          total_auto_score: '2.00',
          per_question: {},
        }),
        { status: 200 },
      ),
    )

    const result = await finishPreview('test-1')

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/preview/tests/test-1/finish/',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(result.total_auto_score).toBe('2.00')
  })
})
