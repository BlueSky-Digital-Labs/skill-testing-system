import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { CandidateResult } from './CandidateResult'
import * as resultsApi from '@/api/results'

vi.mock('@components/templates/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

const summary = {
  id: 'result-1',
  attempt_id: 'attempt-1',
  test_id: 'test-1',
  total_awarded: '8.00',
  total_max: '10.00',
  by_topic: {
    math: { awarded: '8.00', max: '10.00' },
  },
  passed: true,
  created_at: '2026-07-14T00:00:00.000Z',
  updated_at: '2026-07-14T00:00:00.000Z',
}

describe('CandidateResult', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders withheld state snapshot', async () => {
    vi.spyOn(resultsApi, 'getCandidateResult').mockResolvedValue({
      attempt_id: 'attempt-1',
      released: false,
      disclosure: 'none',
      visibility: 'candidate',
      status: 'withheld',
    })

    const { container } = render(
      <MemoryRouter initialEntries={['/results/attempt-1']}>
        <Routes>
          <Route path="/results/:attemptId" element={<CandidateResult />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Results Not Yet Available')).toBeInTheDocument()
    expect(container).toMatchSnapshot()
  })

  it('renders summary-only snapshot', async () => {
    vi.spyOn(resultsApi, 'getCandidateResult').mockResolvedValue({
      attempt_id: 'attempt-1',
      released: true,
      disclosure: 'summary',
      visibility: 'candidate',
      status: 'released',
      summary,
    })

    const { container } = render(
      <MemoryRouter initialEntries={['/results/attempt-1']}>
        <Routes>
          <Route path="/results/:attemptId" element={<CandidateResult />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Your Results')).toBeInTheDocument()
    expect(screen.getByText('Total Awarded')).toBeInTheDocument()
    expect(container).toMatchSnapshot()
  })

  it('renders detailed snapshot with correctness flags', async () => {
    vi.spyOn(resultsApi, 'getCandidateResult').mockResolvedValue({
      attempt_id: 'attempt-1',
      released: true,
      disclosure: 'detailed',
      visibility: 'candidate',
      status: 'released',
      summary,
      items: [
        {
          id: 'item-1',
          question_id: 'q-1',
          question_version: 1,
          question_type: 'mcq',
          is_correct: true,
          awarded_points: '5.00',
          max_points: '5.00',
        },
        {
          id: 'item-2',
          question_id: 'q-2',
          question_version: 1,
          question_type: 'mcq',
          is_correct: false,
          awarded_points: '3.00',
          max_points: '5.00',
        },
      ],
    })

    const { container } = render(
      <MemoryRouter initialEntries={['/results/attempt-1']}>
        <Routes>
          <Route path="/results/:attemptId" element={<CandidateResult />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Question Breakdown')).toBeInTheDocument()
    expect(screen.getByText('Incorrect')).toBeInTheDocument()
    expect(container).toMatchSnapshot()
  })

  it('refreshes result data when refresh is clicked', async () => {
    const user = userEvent.setup()
    const getCandidateResult = vi
      .spyOn(resultsApi, 'getCandidateResult')
      .mockResolvedValue({
        attempt_id: 'attempt-1',
        released: false,
        disclosure: 'none',
        visibility: 'candidate',
        status: 'withheld',
      })

    render(
      <MemoryRouter initialEntries={['/results/attempt-1']}>
        <Routes>
          <Route path="/results/:attemptId" element={<CandidateResult />} />
        </Routes>
      </MemoryRouter>,
    )

    await screen.findByText('Results Not Yet Available')
    await user.click(screen.getByRole('button', { name: 'Refresh' }))

    expect(getCandidateResult).toHaveBeenCalledTimes(2)
  })
})
