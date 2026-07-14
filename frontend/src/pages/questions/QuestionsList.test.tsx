import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QuestionsList } from './QuestionsList'
import * as questionBankApi from '@/api/questionBank'

vi.mock('@components/templates/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@components/Toast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}))

const sampleQuestion = {
  id: 'q-1',
  subject: 'Mathematics',
  topic: 'Algebra',
  difficulty: 'MEDIUM' as const,
  type: 'MCQ' as const,
  text: 'What is 2 + 2?',
  image: null,
  points: 2,
  author: 1,
  author_email: 'examiner@example.com',
  metadata: {},
  options: [],
  blank_answer_keys: [],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
}

describe('QuestionsList', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('loads and renders questions', async () => {
    vi.spyOn(questionBankApi, 'listQuestions').mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [sampleQuestion],
    })

    render(
      <MemoryRouter>
        <QuestionsList />
      </MemoryRouter>,
    )

    expect(screen.getByText('Loading questions...')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Mathematics')).toBeInTheDocument()
    })

    expect(screen.getByText('Algebra')).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'Multiple Choice' })).toBeInTheDocument()
  })

  it('shows create question action', async () => {
    vi.spyOn(questionBankApi, 'listQuestions').mockResolvedValue({
      count: 0,
      next: null,
      previous: null,
      results: [],
    })
    render(
      <MemoryRouter>
        <QuestionsList />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('No questions yet. Create your first question to get started.')).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: 'New question' })).toBeInTheDocument()
  })
})
