import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  commitRows,
  downloadTemplate,
  parseFile,
} from './questionImport'

describe('questionImport API client', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('downloadTemplate requests csv template with file_format query param', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('id,subject\n', {
        status: 200,
        headers: { 'Content-Type': 'text/csv' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const blob = await downloadTemplate('csv')

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/question-import/template?file_format=csv',
      expect.objectContaining({
        headers: expect.any(Headers),
      }),
    )
    expect(blob.size).toBeGreaterThan(0)
  })

  it('parseFile posts multipart form data', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          filename: 'questions.csv',
          format: 'csv',
          total_rows: 1,
          valid_count: 1,
          error_count: 0,
          valid_rows: [
            {
              row_number: 2,
              subject: 'Math',
              topic: 'Algebra',
              difficulty: 'MEDIUM',
              type: 'MCQ',
              text: '2 + 2?',
              points: 1,
              metadata: {},
              options: [],
              blank_answer_keys: [],
            },
          ],
          errors: [],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const file = new File(['id,subject\n'], 'questions.csv', { type: 'text/csv' })
    const result = await parseFile(file)

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/question-import/parse',
      expect.objectContaining({
        method: 'POST',
        body: expect.any(FormData),
      }),
    )
    expect(result.valid_count).toBe(1)
    expect(result.errors).toEqual([])
  })

  it('commitRows maps backend created count to inserted', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          created: 2,
          updated: 1,
          total: 3,
          question_ids: ['a', 'b', 'c'],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await commitRows([
      {
        subject: 'Math',
        topic: 'Algebra',
        difficulty: 'MEDIUM',
        type: 'MCQ',
        text: '2 + 2?',
        points: 1,
      },
    ])

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/question-import/commit',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          rows: [
            {
              subject: 'Math',
              topic: 'Algebra',
              difficulty: 'MEDIUM',
              type: 'MCQ',
              text: '2 + 2?',
              points: 1,
            },
          ],
        }),
      }),
    )
    expect(result.inserted).toBe(2)
    expect(result.updated).toBe(1)
    expect(result.errors).toEqual([])
  })
})
