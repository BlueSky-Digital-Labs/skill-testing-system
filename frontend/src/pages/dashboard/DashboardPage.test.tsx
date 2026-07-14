import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import DashboardPage from './DashboardPage'

vi.mock('@components/templates/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@hooks/useAuth', () => ({
  useAuth: () => ({ user: { email: 'demo@sunset.dev' } }),
}))

vi.mock('@hooks/useAdminAccess', () => ({
  useAdminAccess: () => ({ isAdmin: true, isChecking: false }),
}))

vi.mock('@hooks/useCoordinatorAccess', () => ({
  useCoordinatorAccess: () => ({ isCoordinator: true, isChecking: false }),
}))

vi.mock('@hooks/useExaminerAccess', () => ({
  useExaminerAccess: () => ({ isExaminer: true, isChecking: false }),
}))

vi.mock('./useDashboardStats', () => ({
  useDashboardStats: () => ({
    stats: {
      questionCount: 12,
      assignmentCount: 3,
      groupCount: 2,
      gradingQueueCount: 1,
      recentAssignments: [
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
      isLoading: false,
      error: null,
    },
    reload: vi.fn(),
  }),
}))

describe('DashboardPage', () => {
  it('renders skill-testing summary cards and recent assignments', () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('Questions in bank')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('Recent assignments')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /11111111/i })).toHaveAttribute(
      'href',
      '/tests/11111111-1111-4111-8111-111111111111',
    )
  })
})
