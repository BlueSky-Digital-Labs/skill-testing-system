import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QuestionEditor } from './QuestionEditor'
import * as questionBankApi from '@/api/questionBank'

vi.mock('@components/templates/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

const showToast = vi.fn()

vi.mock('@components/Toast', () => ({
  useToast: () => ({ showToast }),
}))

const navigateMock = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useBlocker: () => ({ state: 'unblocked', proceed: vi.fn(), reset: vi.fn() }),
  }
})

describe('QuestionEditor', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    showToast.mockReset()
    navigateMock.mockReset()
  })

  it('disables save until required fields are valid', async () => {
    render(
      <MemoryRouter initialEntries={['/questions/new']}>
        <Routes>
          <Route path="/questions/new" element={<QuestionEditor />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('button', { name: 'Create question' })).toBeDisabled()
  })

  it('creates a question when the form is valid', async () => {
    vi.spyOn(questionBankApi, 'createQuestion').mockResolvedValue({
      id: 'q-1',
      subject: 'Math',
      topic: 'Algebra',
      difficulty: 'MEDIUM',
      type: 'MCQ',
      text: 'Pick one',
      image: null,
      points: 1,
      author: 1,
      author_email: 'examiner@example.com',
      metadata: {},
      options: [
        { label: 'A', value: '1', is_correct: false, order: 0 },
        { label: 'B', value: '2', is_correct: true, order: 1 },
      ],
      blank_answer_keys: [],
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    })

    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/questions/new']}>
        <Routes>
          <Route path="/questions/new" element={<QuestionEditor />} />
        </Routes>
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText('Subject'), 'Math')
    await user.type(screen.getByLabelText('Topic'), 'Algebra')
    await user.type(screen.getByLabelText('Question text'), 'Pick one')

    const valueInputs = screen.getAllByLabelText('Value')
    await user.type(valueInputs[0], '1')
    await user.type(valueInputs[1], '2')
    await user.click(screen.getAllByLabelText('Correct')[1])

    const saveButton = screen.getByRole('button', { name: 'Create question' })
    await waitFor(() => {
      expect(saveButton).not.toBeDisabled()
    })

    await user.click(saveButton)

    await waitFor(() => {
      expect(questionBankApi.createQuestion).toHaveBeenCalled()
      expect(showToast).toHaveBeenCalledWith('Question created successfully.', 'success')
      expect(navigateMock).toHaveBeenCalledWith('/questions')
    })
  })
})
