import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TestEditorPage } from './[id]'
import * as testsApi from '@/api/tests'
import * as questionBankApi from '@/api/questionBank'

vi.mock('@components/templates/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@components/Toast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}))

const sampleTest = {
  id: 'test-1',
  title: 'Algebra quiz',
  description: 'Midterm',
  lifecycle: 'draft' as const,
  settings: {
    time_limit_minutes: 60,
    passing_score: 70,
    pass_type: 'percent' as const,
    max_attempts: 1,
    shuffle_questions: false,
    shuffle_options: false,
    topic_tags: ['math'],
    result_visibility: 'after_release' as const,
  },
  published_at: null,
  created_by: 1,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
  sections: [
    {
      id: 'section-1',
      title: 'Main section',
      description: '',
      order: 0,
      settings: { assembly_mode: 'manual' },
      question_links: [],
      selection_rules: [],
    },
  ],
  shuffle_seeds: [],
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/tests/test-1']}>
        <Routes>
          <Route path="/tests/:id" element={<TestEditorPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('TestEditorPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(testsApi, 'getTest').mockResolvedValue(sampleTest)
    vi.spyOn(testsApi, 'updateTest').mockResolvedValue(sampleTest)
    vi.spyOn(questionBankApi, 'listQuestions').mockResolvedValue({
      count: 0,
      next: null,
      previous: null,
      results: [],
    })
  })

  it('loads the test editor form', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByDisplayValue('Algebra quiz')).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: 'Save draft' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Publish test' })).toBeInTheDocument()
  })
})
