import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  checkExaminerAccess,
  createQuestion,
  deleteQuestion,
  getQuestion,
  listQuestions,
  updateQuestion,
  uploadQuestionImage,
} from './questionBank'

describe('questionBank API client', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('listQuestions builds query params', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          count: 0,
          next: null,
          previous: null,
          results: [],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    await listQuestions({
      page: 2,
      subject: 'Math',
      topic: 'Algebra',
      difficulty: 'MEDIUM',
      type: 'MCQ',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/question-bank/questions/?page=2&subject=Math&topic=Algebra&difficulty=MEDIUM&type=MCQ',
      expect.any(Object),
    )
  })

  it('createQuestion posts snake_case nested payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'q-1',
          subject: 'Math',
          topic: 'Algebra',
          difficulty: 'MEDIUM',
          type: 'MCQ',
          text: '2 + 2 = ?',
          image: null,
          points: 1,
          author: 1,
          author_email: 'examiner@example.com',
          metadata: {},
          options: [],
          blank_answer_keys: [],
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        }),
        {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    await createQuestion({
      subject: 'Math',
      topic: 'Algebra',
      difficulty: 'MEDIUM',
      type: 'MCQ',
      text: '2 + 2 = ?',
      points: 1,
      options: [
        { label: 'A', value: '3', is_correct: false, order: 0 },
        { label: 'B', value: '4', is_correct: true, order: 1 },
      ],
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/question-bank/questions/',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          subject: 'Math',
          topic: 'Algebra',
          difficulty: 'MEDIUM',
          type: 'MCQ',
          text: '2 + 2 = ?',
          points: 1,
          options: [
            { label: 'A', value: '3', is_correct: false, order: 0 },
            { label: 'B', value: '4', is_correct: true, order: 1 },
          ],
        }),
      }),
    )
  })

  it('updateQuestion patches question fields', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'q-1',
          subject: 'Updated',
          topic: 'Algebra',
          difficulty: 'MEDIUM',
          type: 'MCQ',
          text: 'Updated text',
          image: null,
          points: 2,
          author: 1,
          author_email: 'examiner@example.com',
          metadata: {},
          options: [],
          blank_answer_keys: [],
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-02T00:00:00Z',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const question = await updateQuestion('q-1', { subject: 'Updated' })

    expect(question.subject).toBe('Updated')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/question-bank/questions/q-1/',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ subject: 'Updated' }),
      }),
    )
  })

  it('deleteQuestion sends DELETE request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    await deleteQuestion('q-1')

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/question-bank/questions/q-1/',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('getQuestion fetches question detail', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'q-1',
          subject: 'Math',
          topic: 'Algebra',
          difficulty: 'MEDIUM',
          type: 'MCQ',
          text: 'Question',
          image: null,
          points: 1,
          author: 1,
          author_email: 'examiner@example.com',
          metadata: {},
          options: [],
          blank_answer_keys: [],
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const question = await getQuestion('q-1')

    expect(question.id).toBe('q-1')
  })

  it('uploadQuestionImage posts multipart form data', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'q-1',
          subject: 'Math',
          topic: 'Algebra',
          difficulty: 'MEDIUM',
          type: 'MCQ',
          text: 'Question',
          image: '/media/questions/test.png',
          points: 1,
          author: 1,
          author_email: 'examiner@example.com',
          metadata: {},
          options: [],
          blank_answer_keys: [],
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const file = new File(['image'], 'test.png', { type: 'image/png' })
    const question = await uploadQuestionImage('q-1', file)

    expect(question.image).toContain('test.png')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/question-bank/questions/q-1/upload-image/',
      expect.objectContaining({
        method: 'POST',
        body: expect.any(FormData),
      }),
    )
  })

  it('checkExaminerAccess returns false on 403', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 403 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(checkExaminerAccess()).resolves.toBe(false)
  })

  it('checkExaminerAccess returns true on validation error', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 400 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(checkExaminerAccess()).resolves.toBe(true)
  })
})
