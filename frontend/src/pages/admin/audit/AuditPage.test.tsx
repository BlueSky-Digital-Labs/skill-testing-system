import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuditPage } from './AuditPage'
import * as auditApi from '@/api/audit'

vi.mock('@components/templates/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

const sampleRow = {
  id: 1,
  timestamp: '2026-07-14T00:00:00.000Z',
  actor_id: 'admin-1',
  actor_display: 'Admin User',
  action: 'CREATE',
  entity_type: 'user',
  entity_id: '42',
  metadata: { field: 'email' },
  prev_hash: '',
  hash: 'a'.repeat(64),
}

describe('AuditPage', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    vi.restoreAllMocks()
  })

  it('loads and renders audit logs', async () => {
    vi.spyOn(auditApi, 'getAuditLogs').mockResolvedValue({
      count: 1,
      page: 1,
      page_size: 20,
      results: [sampleRow],
    })

    render(<AuditPage />)

    expect(screen.getByText('Loading audit logs...')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('CREATE')).toBeInTheDocument()
    })

    expect(screen.getByText('Admin User')).toBeInTheDocument()
    expect(auditApi.getAuditLogs).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, page_size: 20 }),
    )
  })

  it('expands a row to show metadata and hash', async () => {
    vi.spyOn(auditApi, 'getAuditLogs').mockResolvedValue({
      count: 1,
      page: 1,
      page_size: 20,
      results: [sampleRow],
    })

    const user = userEvent.setup()
    render(<AuditPage />)

    await waitFor(() => {
      expect(screen.getByText('CREATE')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Expand' }))

    expect(screen.getByText(/"field": "email"/)).toBeInTheDocument()
    expect(screen.getByText(sampleRow.hash)).toBeInTheDocument()
  })

  it('shows verification feedback', async () => {
    vi.spyOn(auditApi, 'getAuditLogs').mockResolvedValue({
      count: 0,
      page: 1,
      page_size: 20,
      results: [],
    })
    vi.spyOn(auditApi, 'verifyAuditChain').mockResolvedValue({
      valid: true,
      total_entries: 2,
      broken_at_id: null,
      message: 'Audit log hash chain is valid.',
    })

    const user = userEvent.setup()
    render(<AuditPage />)

    await waitFor(() => {
      expect(screen.getByText('No audit log entries found.')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Verify Chain' }))

    await waitFor(() => {
      expect(screen.getByText('Audit log hash chain is valid.')).toBeInTheDocument()
    })
  })

  it('persists filters in sessionStorage', async () => {
    vi.spyOn(auditApi, 'getAuditLogs').mockResolvedValue({
      count: 0,
      page: 1,
      page_size: 20,
      results: [],
    })

    render(<AuditPage />)

    await waitFor(() => {
      expect(auditApi.getAuditLogs).toHaveBeenCalled()
    })

    const stored = window.sessionStorage.getItem('audit-log-viewer-state')
    expect(stored).toBeTruthy()
    expect(stored).toContain('"page":1')
  })
})
