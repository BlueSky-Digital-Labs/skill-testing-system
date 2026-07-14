import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AttemptCompletionPage } from '../Completion'
import * as attemptsApi from '../api'
import { ApiError } from '@/api/client'

vi.mock('@components/templates/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

const summary = {
  total_awarded: '8.00',
  total_max: '10.00',
  by_topic: {
    math: { awarded: '8.00', max: '10.00' },
  },
  passed: true,
}

const items = [
  {
    question_id: 'q-1',
    question_type: 'mcq',
    awarded_points: '5.00',
    max_points: '5.00',
    is_correct: true,
    feedback: null,
  },
  {
    question_id: 'q-2',
    question_type: 'free_text',
    awarded_points: '3.00',
    max_points: '5.00',
    is_correct: null,
    feedback: 'Needs more detail.',
  },
]

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/attempts/attempt-1/complete']}>
      <Routes>
        <Route path="/attempts/:attemptId/complete" element={<AttemptCompletionPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AttemptCompletionPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders withheld disclosure without scores or questions', async () => {
    vi.spyOn(attemptsApi, 'getAttemptReview').mockResolvedValue({
      id: 'attempt-1',
      test_id: 'test-1',
      candidate_user_id: 42,
      status: 'withheld',
      submitted_at: null,
      disclosure: 'withhold_until_release',
    })

    renderPage()

    expect(
      await screen.findByText('Results will be available once released.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Your Score')).not.toBeInTheDocument()
    expect(screen.queryByText('Question Review')).not.toBeInTheDocument()
  })

  it('renders score-only disclosure with scores but without correctness or feedback', async () => {
    vi.spyOn(attemptsApi, 'getAttemptReview').mockResolvedValue({
      id: 'attempt-1',
      test_id: 'test-1',
      candidate_user_id: 42,
      status: 'released',
      submitted_at: '2026-07-14T00:00:00.000Z',
      disclosure: 'score_only',
      summary,
      items,
    })

    renderPage()

    expect(await screen.findByText('Your Score')).toBeInTheDocument()
    expect(screen.getByText('Passed')).toBeInTheDocument()
    expect(screen.getByText('Question Review')).toBeInTheDocument()
    expect(screen.queryByText('Correct')).not.toBeInTheDocument()
    expect(screen.queryByText('Feedback')).not.toBeInTheDocument()
    expect(screen.queryByText('Needs more detail.')).not.toBeInTheDocument()
  })

  it('renders score-and-feedback disclosure with correctness and feedback', async () => {
    vi.spyOn(attemptsApi, 'getAttemptReview').mockResolvedValue({
      id: 'attempt-1',
      test_id: 'test-1',
      candidate_user_id: 42,
      status: 'released',
      submitted_at: '2026-07-14T00:00:00.000Z',
      disclosure: 'score_and_feedback',
      summary,
      items,
    })

    renderPage()

    expect(await screen.findByText('Your Score')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Correct' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Feedback' })).toBeInTheDocument()
    expect(screen.getByText('Needs more detail.')).toBeInTheDocument()
    expect(
      document.querySelector('.attempt-completion__correctness--correct'),
    ).toBeTruthy()
  })

  it('normalizes disclosure_mode from the API response', async () => {
    vi.spyOn(attemptsApi, 'getAttemptReview').mockResolvedValue({
      id: 'attempt-1',
      test_id: 'test-1',
      candidate_user_id: 42,
      status: 'released',
      submitted_at: '2026-07-14T00:00:00.000Z',
      disclosure: 'score_and_feedback',
      summary,
      items,
    })

    renderPage()

    expect(await screen.findByText('Feedback')).toBeInTheDocument()
  })

  it('shows not available yet message for incomplete attempts', async () => {
    vi.spyOn(attemptsApi, 'getAttemptReview').mockRejectedValue(
      new ApiError('Attempt is not complete.', 409),
    )

    renderPage()

    expect(await screen.findByText('Not Available Yet')).toBeInTheDocument()
    expect(
      screen.getByText(/not ready for review yet/i),
    ).toBeInTheDocument()
  })

  it('refreshes review data when refresh is clicked', async () => {
    const user = userEvent.setup()
    const getAttemptReview = vi.spyOn(attemptsApi, 'getAttemptReview').mockResolvedValue({
      id: 'attempt-1',
      test_id: 'test-1',
      candidate_user_id: 42,
      status: 'withheld',
      submitted_at: null,
      disclosure: 'withhold_until_release',
    })

    renderPage()

    await screen.findByText('Results will be available once released.')
    await user.click(screen.getByRole('button', { name: 'Refresh' }))

    expect(getAttemptReview).toHaveBeenCalledTimes(2)
  })
})
