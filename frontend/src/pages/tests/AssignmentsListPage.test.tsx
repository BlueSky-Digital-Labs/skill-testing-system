import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AssignmentsListPage } from './AssignmentsListPage'

vi.mock('@components/templates/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

const listAssignments = vi.fn()

vi.mock('./assign/api', () => ({
  listAssignments: (...args: unknown[]) => listAssignments(...args),
}))

describe('AssignmentsListPage', () => {
  beforeEach(() => {
    listAssignments.mockReset()
  })

  it('renders assignments from the API', async () => {
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
      <MemoryRouter>
        <AssignmentsListPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Test assignments')).toBeInTheDocument()
    expect(screen.getByText('open')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /manage/i })[0]).toHaveAttribute(
      'href',
      '/tests/11111111-1111-4111-8111-111111111111/assign',
    )
  })

  it('shows an empty state when no assignments exist', async () => {
    listAssignments.mockResolvedValue({
      count: 0,
      next: null,
      previous: null,
      results: [],
    })

    render(
      <MemoryRouter>
        <AssignmentsListPage />
      </MemoryRouter>,
    )

    expect(
      await screen.findByText(/No assignments yet/i),
    ).toBeInTheDocument()
  })
})
