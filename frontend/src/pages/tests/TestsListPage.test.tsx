import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TestsListPage } from './index'
import * as testsApi from '@/api/tests'

vi.mock('@components/templates/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@components/Toast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}))

const sampleTests = [
  {
    id: 'test-1',
    title: 'Algebra quiz',
    description: 'Midterm',
    lifecycle: 'draft' as const,
    settings: {},
    published_at: null,
    created_by: 1,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
    sections: [],
    shuffle_seeds: [],
  },
]

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <TestsListPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('TestsListPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(testsApi, 'getTests').mockResolvedValue(sampleTests)
  })

  it('renders tests with status badges', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Algebra quiz')).toBeInTheDocument()
    })

    expect(screen.getByText('Draft')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create Test' })).toBeInTheDocument()
  })

  it('creates a draft test when Create Test is clicked', async () => {
    const user = userEvent.setup()
    const createTest = vi.spyOn(testsApi, 'createTest').mockResolvedValue(sampleTests[0])

    renderPage()

    await user.click(screen.getByRole('button', { name: 'Create Test' }))

    await waitFor(() => {
      expect(createTest).toHaveBeenCalled()
    })
  })
})
