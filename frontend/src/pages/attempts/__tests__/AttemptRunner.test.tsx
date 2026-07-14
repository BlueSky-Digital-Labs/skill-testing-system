import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import AttemptRunnerPage from '../[attemptId]'
import * as attemptsApi from '@/api/attempts'
import * as questionBankApi from '@/api/questionBank'

vi.mock('@/api/attempts')
vi.mock('@/api/questionBank')

const session = {
  id: 'attempt-1',
  assignment_id: 'assignment-1',
  candidate_id: 1,
  test_id: 'test-1',
  status: 'in_progress' as const,
  started_at: '2026-07-14T09:00:00Z',
  expires_at: '2026-07-14T10:00:00Z',
  submitted_at: null,
  last_saved_at: null,
  time_limit_seconds: 3600,
  remaining_time_seconds: 1800,
  question_id_order: ['q-1'],
  option_id_orders: { 'q-1': ['opt-1', 'opt-2'] },
  answers: {},
}

function renderRunner() {
  return render(
    <MemoryRouter initialEntries={['/attempts/attempt-1']}>
      <Routes>
        <Route path="/attempts/:attemptId" element={<AttemptRunnerPage />} />
        <Route path="/attempts/:attemptId/complete" element={<div>Complete</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AttemptRunnerPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()

    vi.mocked(attemptsApi.resumeAttempt).mockResolvedValue(session)
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
    vi.mocked(attemptsApi.saveAnswer).mockResolvedValue({
      ...session,
      answers: {
        'q-1': {
          question_version: 1,
          response: { selected_option: 'A' },
          saved_at: '2026-07-14T09:01:00Z',
        },
      },
    })
    vi.mocked(attemptsApi.submitAttempt).mockResolvedValue({
      ...session,
      status: 'submitted',
      submitted_at: '2026-07-14T09:02:00Z',
    })
  })

  it('loads attempt state and renders the current question', async () => {
    renderRunner()

    expect(await screen.findByText('2 + 2 = ?')).toBeInTheDocument()
    expect(await screen.findByText(/30:00|29:59/)).toBeInTheDocument()
  })

  it('autosaves answer changes and allows submit', async () => {
    const user = userEvent.setup()

    renderRunner()
    expect(await screen.findByText('2 + 2 = ?')).toBeInTheDocument()

    await user.click(screen.getByLabelText('4'))

    await waitFor(
      () => {
        expect(attemptsApi.saveAnswer).toHaveBeenCalled()
      },
      { timeout: 2500 },
    )

    await user.click(screen.getByRole('button', { name: 'Submit attempt' }))

    await waitFor(() => {
      expect(attemptsApi.submitAttempt).toHaveBeenCalledWith('attempt-1')
    })

    expect(await screen.findByText('Complete')).toBeInTheDocument()
  })
})
