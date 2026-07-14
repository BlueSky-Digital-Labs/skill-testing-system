import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import PreviewRunnerPage from '../[id]/preview'
import * as testsApi from '@/api/tests'
import * as questionBankApi from '@/api/questionBank'

vi.mock('@/api/tests')
vi.mock('@/api/questionBank')

const previewSession = {
  preview: true as const,
  test_id: 'test-1',
  status: 'in_progress' as const,
  seed: 7,
  started_at: '2026-07-14T09:00:00Z',
  question_id_order: ['q-1'],
  option_id_orders: { 'q-1': ['opt-1', 'opt-2'] },
  answers: {},
  remaining_seconds: 1800,
}

function renderPreview() {
  return render(
    <MemoryRouter initialEntries={['/tests/test-1/preview']}>
      <Routes>
        <Route path="/tests/:id/preview" element={<PreviewRunnerPage />} />
        <Route path="/tests/:id" element={<div>Test detail</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('PreviewRunnerPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()

    vi.mocked(testsApi.startPreview).mockResolvedValue(previewSession)
    vi.mocked(questionBankApi.getQuestion).mockResolvedValue({
      id: 'q-1',
      subject: 'Math',
      topic: 'Algebra',
      difficulty: 'EASY',
      type: 'MCQ',
      text: '2 + 2 = ?',
      image: null,
      points: 1,
      author: null,
      author_email: null,
      metadata: {},
      options: [
        { id: 'opt-1', label: 'A', value: '4', is_correct: true, order: 0 },
        { id: 'opt-2', label: 'B', value: '5', is_correct: false, order: 1 },
      ],
      blank_answer_keys: [],
      created_at: '2026-07-14T09:00:00Z',
      updated_at: '2026-07-14T09:00:00Z',
      latest_version_number: 1,
    })
    vi.mocked(testsApi.sendPreviewAnswer).mockResolvedValue({
      accepted: true,
      server_ts: '2026-07-14T09:01:00Z',
      validation: {
        valid: true,
        question_id: 'q-1',
        question_type: 'MCQ',
        errors: [],
      },
      partial_score: {
        awarded_points: '1.00',
        max_points: '1.00',
        is_correct: true,
      },
    })
    vi.mocked(testsApi.finishPreview).mockResolvedValue({
      preview: true,
      total_auto_score: '1.00',
      per_question: {
        'q-1': {
          awarded_points: '1.00',
          max_points: '1.00',
          is_correct: true,
          answered: true,
        },
      },
    })
  })

  it('starts preview and renders question UI', async () => {
    renderPreview()

    expect(await screen.findByText('Preview mode')).toBeInTheDocument()
    expect(await screen.findByText('2 + 2 = ?')).toBeInTheDocument()
    expect(testsApi.startPreview).toHaveBeenCalledWith('test-1', undefined)
  })

  it('validates and finishes preview session', async () => {
    const user = userEvent.setup()
    renderPreview()

    expect(await screen.findByText('2 + 2 = ?')).toBeInTheDocument()
    await user.click(screen.getByLabelText('4'))
    await user.click(screen.getByRole('button', { name: 'Validate current answer' }))

    await waitFor(() => {
      expect(testsApi.sendPreviewAnswer).toHaveBeenCalled()
    })

    await user.click(screen.getByRole('button', { name: 'Finish preview session' }))

    await waitFor(() => {
      expect(testsApi.finishPreview).toHaveBeenCalledWith('test-1')
    })

    expect(await screen.findByText('Preview complete')).toBeInTheDocument()
  })

  it('shows friendly error for forbidden preview', async () => {
    const { ApiError } = await import('@/api/client')
    vi.mocked(testsApi.startPreview).mockRejectedValue(
      new ApiError('Forbidden', 403),
    )

    renderPreview()

    expect(
      await screen.findByText('You do not have permission to preview this test.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to test' })).toHaveAttribute(
      'href',
      '/tests/test-1',
    )
  })
})
