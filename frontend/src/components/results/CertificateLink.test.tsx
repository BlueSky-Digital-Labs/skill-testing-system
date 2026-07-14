import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CertificateLink } from './CertificateLink'

describe('CertificateLink', () => {
  it('renders download button when certificate is available', () => {
    render(
      <CertificateLink
        state="available"
        certificate={{
          id: 'cert-1',
          attempt_id: 'attempt-1',
          issued_at: '2026-07-14T00:00:00.000Z',
          template_version: 'v1',
          url: 'https://signed.example/cert.pdf',
          checksum_sha256: 'abc123',
          meta: {},
        }}
        onDownload={vi.fn()}
        onRefresh={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Download certificate' })).toBeInTheDocument()
    expect(screen.getByText('v1')).toBeInTheDocument()
  })

  it('renders expired message and refresh action', async () => {
    const user = userEvent.setup()
    const onRefresh = vi.fn()

    render(
      <CertificateLink
        state="expired"
        onRefresh={onRefresh}
      />,
    )

    expect(screen.getByText(/download link has expired/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Refresh download link' }))
    expect(onRefresh).toHaveBeenCalled()
  })
})
