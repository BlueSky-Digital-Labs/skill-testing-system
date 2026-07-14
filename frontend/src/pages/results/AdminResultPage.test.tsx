import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AdminResultPage } from './AdminResultPage'
import * as resultsApi from '@/api/results'

const showToast = vi.fn()

vi.mock('@components/templates/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@components/Toast', () => ({
  useToast: () => ({ showToast }),
}))

vi.mock('@/hooks/useAdminAccess', () => ({
  useAdminAccess: () => ({ isAdmin: true, isChecking: false }),
}))

const summary = {
  id: 'result-1',
  attempt_id: 'attempt-1',
  test_id: 'test-1',
  total_awarded: '8.00',
  total_max: '10.00',
  by_topic: {},
  passed: true,
  created_at: '2026-07-14T00:00:00.000Z',
  updated_at: '2026-07-14T00:00:00.000Z',
}

describe('AdminResultPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    showToast.mockReset()
    vi.spyOn(resultsApi, 'getCandidateResult').mockResolvedValue({
      attempt_id: 'attempt-1',
      released: true,
      disclosure: 'detailed',
      visibility: 'full',
      status: 'released',
      summary,
    })
    vi.spyOn(resultsApi, 'getCertificate').mockResolvedValue(null)
  })

  it('shows generate button when certificate is missing and attempt passed', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/results/attempt-1']}>
        <Routes>
          <Route path="/admin/results/:attemptId" element={<AdminResultPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('button', { name: 'Generate certificate' })).toBeInTheDocument()
  })

  it('issues certificate when generate is clicked', async () => {
    const user = userEvent.setup()
    const issueCertificate = vi.spyOn(resultsApi, 'issueCertificate').mockResolvedValue({
      id: 'cert-1',
      attempt_id: 'attempt-1',
      issued_at: '2026-07-14T00:00:00.000Z',
      template_version: 'v1',
      url: 'https://signed.example/cert.pdf',
      checksum_sha256: 'abc123',
      meta: {},
    })

    render(
      <MemoryRouter initialEntries={['/admin/results/attempt-1']}>
        <Routes>
          <Route path="/admin/results/:attemptId" element={<AdminResultPage />} />
        </Routes>
      </MemoryRouter>,
    )

    await user.click(await screen.findByRole('button', { name: 'Generate certificate' }))

    expect(issueCertificate).toHaveBeenCalledWith('attempt-1')
    expect(showToast).toHaveBeenCalledWith('Certificate generated successfully.', 'success')
  })
})
