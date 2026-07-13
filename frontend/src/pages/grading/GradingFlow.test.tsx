import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { GradingList } from './GradingList'
import { GradingDetail } from './GradingDetail'
import * as gradingApi from '@/api/grading'
import { ApiError } from '@/api/auth'

vi.mock('@components/templates/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

const queueItem = {
  id: 'queue-1',
  attempt_id: 'attempt-1',
  test_id: 'test-1',
  question_id: 'question-1',
  question_version: '1',
  candidate_display: 'Jane Candidate',
  blind_marking: false,
  response_text: 'Detailed answer text',
  max_points: '10.00',
  topic: 'essay',
  status: 'queued' as const,
  created_at: '2026-07-13T00:00:00.000Z',
  updated_at: '2026-07-13T00:00:00.000Z',
  manual_grade: null,
}

const combinedResult = {
  id: 'result-1',
  attempt_id: 'attempt-1',
  test_id: 'test-1',
  total_awarded: '8.50',
  total_max: '10.00',
  by_topic: {
    essay: { awarded: '8.50', max: '10.00' },
  },
  passed: true,
  created_at: '2026-07-13T00:00:00.000Z',
  updated_at: '2026-07-13T00:00:00.000Z',
}

describe('grading flow integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('navigates from list to detail and submits a grade', async () => {
    const user = userEvent.setup()

    vi.spyOn(gradingApi, 'listQueue').mockResolvedValue({
      count: 1,
      results: [queueItem],
      next_cursor: null,
    })
    vi.spyOn(gradingApi, 'getCombinedResult').mockRejectedValue(
      new ApiError('Not found', 404),
    )
    vi.spyOn(gradingApi, 'submitManualGrade').mockResolvedValue({
      ...queueItem,
      status: 'graded',
      manual_grade: {
        id: 'grade-1',
        grader_user_id: 1,
        awarded_points: '8.50',
        feedback: 'Well done',
        created_at: '2026-07-13T00:00:00.000Z',
      },
    })
    vi.spyOn(gradingApi, 'aggregateAttempt').mockResolvedValue(combinedResult)

    render(
      <MemoryRouter initialEntries={['/grading']}>
        <Routes>
          <Route path="/grading" element={<GradingList />} />
          <Route path="/grading/:queueItemId" element={<GradingDetail />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Jane Candidate')).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Grade' }))

    expect(await screen.findByText('Detailed answer text')).toBeInTheDocument()

    await user.type(screen.getByLabelText(/Awarded Points/i), '8.5')
    await user.type(screen.getByLabelText('Feedback'), 'Well done')
    await user.click(screen.getByRole('button', { name: 'Submit Grade' }))

    await waitFor(() => {
      expect(gradingApi.submitManualGrade).toHaveBeenCalledWith({
        queue_item_id: 'queue-1',
        awarded_points: '8.5',
        feedback: 'Well done',
      })
    })

    expect(gradingApi.aggregateAttempt).toHaveBeenCalledWith('attempt-1', 'test-1')
    expect(await screen.findByText('Passed')).toBeInTheDocument()
    expect(screen.getByText('Grade submitted and combined result updated.')).toBeInTheDocument()
  })
})
