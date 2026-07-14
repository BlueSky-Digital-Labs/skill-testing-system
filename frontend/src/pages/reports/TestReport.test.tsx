import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { TestReport } from './TestReport'
import * as reportsApi from '@/api/reports'

vi.mock('@components/templates/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@hooks/useAdminAccess', () => ({
  useAdminAccess: () => ({ isAdmin: true, isChecking: false }),
}))

vi.mock('@hooks/useCoordinatorAccess', () => ({
  useCoordinatorAccess: () => ({ isCoordinator: true, isChecking: false }),
}))

vi.mock('@hooks/useExaminerAccess', () => ({
  useExaminerAccess: () => ({ isExaminer: false, isChecking: false }),
}))

const sampleReport = {
  test_id: 'test-1',
  attempt_count: 3,
  completed_count: 2,
  completion_rate: '0.6667',
  result_count: 2,
  passed_count: 1,
  pass_rate: '0.5000',
  average_awarded: '7.00',
  average_max: '10.00',
  average_percent: '70.00',
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/reports/test']}>
      <TestReport />
    </MemoryRouter>,
  )
}

describe('TestReport', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    vi.restoreAllMocks()
  })

  it('loads and renders a test summary report', async () => {
    vi.spyOn(reportsApi, 'getTestReport').mockResolvedValue(sampleReport)

    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText('Test ID'), 'test-1')
    await user.click(screen.getByRole('button', { name: 'Apply filters' }))

    expect(await screen.findByText('70.0%')).toBeInTheDocument()
    expect(reportsApi.getTestReport).toHaveBeenCalledWith('test-1')
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeInTheDocument()
  })

  it('shows a validation error when test id is missing', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Apply filters' }))

    expect(screen.getByText('Test ID is required.')).toBeInTheDocument()
  })
})
