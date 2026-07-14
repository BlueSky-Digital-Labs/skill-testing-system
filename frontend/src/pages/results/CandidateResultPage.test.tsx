import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { CandidateResultPage } from './CandidateResultPage'
import * as resultsApi from '@/api/results'

const showToast = vi.fn()

vi.mock('@components/templates/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@components/Toast', () => ({
  useToast: () => ({ showToast }),
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

const certificate = {
  id: 'cert-1',
  attempt_id: 'attempt-1',
  issued_at: '2026-07-14T00:00:00.000Z',
  template_version: 'v1',
  url: 'https://signed.example/cert.pdf',
  checksum_sha256: 'abc123',
  meta: {},
}

describe('CandidateResultPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    showToast.mockReset()
    vi.spyOn(resultsApi, 'getCertificate').mockResolvedValue(null)
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
          <Route path="/results/:attemptId" element={<CandidateResultPage />} />
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
          <Route path="/results/:attemptId" element={<CandidateResultPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Your Results')).toBeInTheDocument()
    expect(screen.getByText('Total Awarded')).toBeInTheDocument()
    expect(container).toMatchSnapshot()
  })

  it('shows certificate download when available', async () => {
    vi.spyOn(resultsApi, 'getCandidateResult').mockResolvedValue({
      attempt_id: 'attempt-1',
      released: true,
      disclosure: 'summary',
      visibility: 'candidate',
      status: 'released',
      summary,
    })
    vi.spyOn(resultsApi, 'getCertificate').mockResolvedValue(certificate)

    render(
      <MemoryRouter initialEntries={['/results/attempt-1']}>
        <Routes>
          <Route path="/results/:attemptId" element={<CandidateResultPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('button', { name: 'Download certificate' })).toBeInTheDocument()
  })

  it('shows unavailable certificate message on 404', async () => {
    vi.spyOn(resultsApi, 'getCandidateResult').mockResolvedValue({
      attempt_id: 'attempt-1',
      released: true,
      disclosure: 'summary',
      visibility: 'candidate',
      status: 'released',
      summary,
    })
    vi.spyOn(resultsApi, 'getCertificate').mockResolvedValue(null)

    render(
      <MemoryRouter initialEntries={['/results/attempt-1']}>
        <Routes>
          <Route path="/results/:attemptId" element={<CandidateResultPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(
      await screen.findByText('No certificate is available for this attempt yet.'),
    ).toBeInTheDocument()
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
          <Route path="/results/:attemptId" element={<CandidateResultPage />} />
        </Routes>
      </MemoryRouter>,
    )

    await screen.findByText('Results Not Yet Available')
    await user.click(screen.getByRole('button', { name: 'Refresh' }))

    expect(getCandidateResult).toHaveBeenCalledTimes(2)
  })
})
