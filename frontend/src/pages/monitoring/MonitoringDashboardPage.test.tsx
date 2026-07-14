import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { MonitoringDashboardPage } from './MonitoringDashboardPage'

const showToast = vi.fn()
const getTestStatus = vi.fn()
const sendReminders = vi.fn()

vi.mock('@components/Toast', () => ({
  useToast: () => ({ showToast }),
}))

vi.mock('@hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: true }),
}))

vi.mock('@hooks/useCoordinatorAccess', () => ({
  useCoordinatorAccess: () => ({ isCoordinator: true, isChecking: false }),
}))

vi.mock('@hooks/useSystemAdminAccess', () => ({
  useSystemAdminAccess: () => ({ isSystemAdmin: false, isChecking: false }),
}))

vi.mock('@/api/monitoring', () => ({
  getMonitoringErrorMessage: (_error: unknown, fallback: string) => fallback,
  getTestStatus: (...args: unknown[]) => getTestStatus(...args),
  sendReminders: (...args: unknown[]) => sendReminders(...args),
}))

vi.mock('@components/templates/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

const statusPayload = {
  test_id: 'test-1',
  assignment_count: 1,
  assignment_status_counts: { active: 1 },
  assignment_state_counts: { open: 1 },
  attempt_status_counts: { in_progress: 1 },
  group_breakdown: [
    {
      group_id: 'group-1',
      group_name: 'Group A',
      member_count: 2,
      assignment_count: 1,
      not_started_count: 1,
      in_progress_count: 1,
      submitted_count: 0,
      attempt_status_counts: { in_progress: 1 },
    },
  ],
}

function renderPage(initialEntry = '/monitoring/test-1') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/monitoring" element={<MonitoringDashboardPage />} />
        <Route path="/monitoring/:testId" element={<MonitoringDashboardPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('MonitoringDashboardPage', () => {
  beforeEach(() => {
    showToast.mockReset()
    getTestStatus.mockReset()
    sendReminders.mockReset()
    sessionStorage.clear()
    getTestStatus.mockResolvedValue(statusPayload)
    sendReminders.mockResolvedValue({ recipients: 1, sent: 1 })
  })

  it('loads status for the route test id', async () => {
    renderPage()

    await waitFor(() => {
      expect(getTestStatus).toHaveBeenCalledWith('test-1', {
        groupId: undefined,
        includeGroups: true,
      })
    })

    expect(await screen.findByRole('cell', { name: /Group A/ })).toBeInTheDocument()
  })

  it('sends global reminders with mapped payload', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByRole('cell', { name: /Group A/ })
    const sendButtons = screen.getAllByRole('button', { name: 'Send reminders' })
    await user.click(sendButtons[0])

    await waitFor(() => {
      expect(sendReminders).toHaveBeenCalledWith('test-1', {
        group_id: undefined,
        only_non_starters: false,
        only_non_completers: true,
      })
    })
    expect(showToast).toHaveBeenCalledWith('Sent 1 of 1 reminder(s).', 'success')
  })

  it('shows test picker when test id is missing from the route', () => {
    renderPage('/monitoring')

    expect(screen.getByLabelText('Test ID')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open monitoring' })).toBeInTheDocument()
  })
})
