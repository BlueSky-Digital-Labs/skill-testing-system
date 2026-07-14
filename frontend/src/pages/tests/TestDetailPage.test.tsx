import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { TestDetailPage } from './TestDetailPage'

vi.mock('@components/templates/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

const listAssignments = vi.fn()

vi.mock('./assign/api', () => ({
  listAssignments: (...args: unknown[]) => listAssignments(...args),
}))

describe('TestDetailPage', () => {
  beforeEach(() => {
    listAssignments.mockReset()
  })

  it('loads assignments for the route test id', async () => {
    listAssignments.mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          id: 'assign-1',
          test_id: '11111111-1111-4111-8111-111111111111',
          assignee_user_id: null,
          assignee_group_id: 'group-1',
          created_by_user_id: 'user-1',
          opens_at: '2026-07-01T09:00:00Z',
          due_at: '2026-07-02T09:00:00Z',
          closes_at: null,
          max_attempts: 1,
          shuffle_questions: false,
          shuffle_options: false,
          status: 'active',
          state: 'open',
          created_at: '2026-07-01T08:00:00Z',
          updated_at: '2026-07-01T08:00:00Z',
        },
      ],
    })

    render(
      <MemoryRouter initialEntries={['/tests/11111111-1111-4111-8111-111111111111']}>
        <Routes>
          <Route path="/tests/:testId" element={<TestDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('open')).toBeInTheDocument()
    expect(listAssignments).toHaveBeenCalledWith({
      test_id: '11111111-1111-4111-8111-111111111111',
    })
  })

  it('renders version badges for questions with version numbers', () => {
    render(
      <MemoryRouter>
        <TestDetailPage
          testTitle="Algebra quiz"
          questions={[
            {
              id: 'q-1',
              subject: 'Math',
              topic: 'Algebra',
              text: 'What is 2 + 2?',
              points: 2,
              versionNumber: 3,
            },
            {
              id: 'q-2',
              subject: 'Math',
              topic: 'Geometry',
              text: 'Define a triangle.',
              points: 1,
              versionNumber: null,
            },
          ]}
        />
      </MemoryRouter>,
    )

    expect(screen.getByLabelText('Version 3')).toHaveTextContent('v3')
    expect(screen.getAllByText('—')).toHaveLength(1)
    expect(screen.getByText('Algebra quiz')).toBeInTheDocument()
  })
})
