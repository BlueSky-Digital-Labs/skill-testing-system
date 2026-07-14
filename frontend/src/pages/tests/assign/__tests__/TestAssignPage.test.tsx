import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { TestAssignPage } from '../index'
import * as assignApi from '../api'

vi.mock('@components/templates/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

const testId = '11111111-1111-4111-8111-111111111111'
const userId = '22222222-2222-4222-8222-222222222222'

const sampleAssignment = {
  id: '33333333-3333-4333-8333-333333333333',
  test_id: testId,
  assignee_user_id: userId,
  assignee_group_id: null,
  created_by_user_id: '44444444-4444-4444-8444-444444444444',
  opens_at: '2026-07-15T10:00:00.000Z',
  due_at: '2026-07-16T10:00:00.000Z',
  closes_at: '2026-07-17T10:00:00.000Z',
  max_attempts: 2,
  shuffle_questions: true,
  shuffle_options: false,
  status: 'active' as const,
  state: 'upcoming' as const,
  created_at: '2026-07-14T10:00:00.000Z',
  updated_at: '2026-07-14T10:00:00.000Z',
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={[`/tests/${testId}/assign`]}>
      <Routes>
        <Route path="/tests/:testId/assign" element={<TestAssignPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('TestAssignPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(assignApi, 'listAssignments').mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [sampleAssignment],
    })
  })

  it('loads and renders assignments for the route test id', async () => {
    renderPage()

    expect(screen.getByText('Loading assignments...')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('upcoming')).toBeInTheDocument()
    })

    expect(assignApi.listAssignments).toHaveBeenCalledWith({
      test_id: testId,
      state: undefined,
      status: undefined,
    })
    expect(screen.getByText(`User ${userId}`)).toBeInTheDocument()
  })

  it('submits valid form data through postBulkAssignments', async () => {
    const postBulkAssignments = vi.spyOn(assignApi, 'postBulkAssignments').mockResolvedValue({
      created: [sampleAssignment],
      failed: [],
    })

    const user = userEvent.setup()
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('upcoming')).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText(/^User IDs/i), userId)
    await user.type(screen.getByLabelText(/^Opens at/i), '2026-07-15T10:00')
    await user.click(screen.getByRole('button', { name: /create 1 assignments/i }))

    await waitFor(() => {
      expect(postBulkAssignments).toHaveBeenCalled()
    })

    expect(postBulkAssignments).toHaveBeenCalledWith(
      expect.objectContaining({
        testId,
        userIds: [userId],
        groupIds: [],
        maxAttempts: 1,
        shuffleQuestions: false,
        shuffleOptions: false,
      }),
    )

    await waitFor(() => {
      expect(screen.getByText('Created 1 assignment(s).')).toBeInTheDocument()
    })
  })

  it('blocks submission when no assignees are provided', async () => {
    const postBulkAssignments = vi.spyOn(assignApi, 'postBulkAssignments')
    const user = userEvent.setup()

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('upcoming')).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText(/^Opens at/i), '2026-07-15T10:00')
    await user.click(screen.getByRole('button', { name: /create assignments/i }))

    expect(
      await screen.findByText('Enter at least one user ID or group ID.'),
    ).toBeInTheDocument()
    expect(postBulkAssignments).not.toHaveBeenCalled()
  })

  it('enforces client-side date order validation', async () => {
    const postBulkAssignments = vi.spyOn(assignApi, 'postBulkAssignments')
    const user = userEvent.setup()

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('upcoming')).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText(/^User IDs/i), userId)
    await user.type(screen.getByLabelText(/^Opens at/i), '2026-07-20T10:00')
    await user.clear(screen.getByLabelText(/^Due at/i))
    await user.type(screen.getByLabelText(/^Due at/i), '2026-07-19T10:00')
    await user.click(screen.getByRole('button', { name: /create 1 assignments/i }))

    expect(
      await screen.findByText('Due at must be on or after opens at.'),
    ).toBeInTheDocument()
    expect(postBulkAssignments).not.toHaveBeenCalled()
  })

  it('reloads assignments when table filters change', async () => {
    const user = userEvent.setup()
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('upcoming')).toBeInTheDocument()
    })

    await user.selectOptions(screen.getByLabelText(/^State/i), 'open')

    await waitFor(() => {
      expect(assignApi.listAssignments).toHaveBeenLastCalledWith({
        test_id: testId,
        state: 'open',
        status: undefined,
      })
    })
  })

  it('shows partial failure feedback from bulk creation', async () => {
    vi.spyOn(assignApi, 'postBulkAssignments').mockResolvedValue({
      created: [sampleAssignment],
      failed: [
        {
          assigneeId: '55555555-5555-4555-8555-555555555555',
          assigneeType: 'group',
          message: 'Duplicate assignment.',
        },
      ],
    })

    const user = userEvent.setup()
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('upcoming')).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText(/^User IDs/i), userId)
    await user.type(screen.getByLabelText(/^Opens at/i), '2026-07-15T10:00')
    await user.click(screen.getByRole('button', { name: /create 1 assignments/i }))

    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent(/but 1 failed/i)
  })
})
