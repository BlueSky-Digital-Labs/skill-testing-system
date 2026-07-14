import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ReleaseControl } from './ReleaseControl'
import * as resultsApi from '@/api/results'

vi.mock('@components/templates/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@components/Toast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}))

const sampleReleaseStatus = {
  id: 'release-1',
  attempt_id: 'attempt-1',
  test_id: 'test-1',
  candidate_user_id: 42,
  disclosure: 'summary' as const,
  released: false,
  released_at: null,
  released_by_user_id: null,
  created_at: '2026-07-14T00:00:00.000Z',
  updated_at: '2026-07-14T00:00:00.000Z',
}

describe('ReleaseControl', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('loads release status and submits updates', async () => {
    const user = userEvent.setup()

    vi.spyOn(resultsApi, 'getReleaseStatus').mockResolvedValue(sampleReleaseStatus)
    vi.spyOn(resultsApi, 'postRelease').mockResolvedValue({
      ...sampleReleaseStatus,
      released: true,
      disclosure: 'detailed',
    })

    render(
      <MemoryRouter initialEntries={['/admin/results/release/attempt-1']}>
        <Routes>
          <Route path="/admin/results/release/:attemptId" element={<ReleaseControl />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Release Results')).toBeInTheDocument()
    expect(screen.getByDisplayValue('summary')).toBeChecked()

    await user.click(screen.getByLabelText(/Detailed/i))
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: 'Save release settings' }))

    await waitFor(() => {
      expect(resultsApi.postRelease).toHaveBeenCalledWith({
        attempt_id: 'attempt-1',
        released: true,
        disclosure: 'detailed',
        test_id: 'test-1',
        candidate_user_id: 42,
      })
    })
  })

  it('matches snapshot for loaded release form', async () => {
    vi.spyOn(resultsApi, 'getReleaseStatus').mockResolvedValue(sampleReleaseStatus)

    const { container } = render(
      <MemoryRouter initialEntries={['/admin/results/release/attempt-1']}>
        <Routes>
          <Route path="/admin/results/release/:attemptId" element={<ReleaseControl />} />
        </Routes>
      </MemoryRouter>,
    )

    await screen.findByText('Release Results')
    expect(container).toMatchSnapshot()
  })
})
