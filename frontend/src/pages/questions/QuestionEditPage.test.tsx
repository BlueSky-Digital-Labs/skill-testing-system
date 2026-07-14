import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QuestionEditPage } from './QuestionEditPage'
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

const baseQuestion = {
  id: 'q-1',
  subject: 'Math',
  topic: 'Algebra',
  difficulty: 'MEDIUM' as const,
  type: 'MCQ' as const,
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
}

describe('QuestionEditPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    showToast.mockReset()
    navigateMock.mockReset()
  })

  it('disables save until required fields are valid on create', async () => {
    render(
      <MemoryRouter initialEntries={['/questions/new']}>
        <Routes>
          <Route path="/questions/new" element={<QuestionEditPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('button', { name: 'Create question' })).toBeDisabled()
  })

  it('creates a question when the form is valid', async () => {
    vi.spyOn(questionBankApi, 'createQuestion').mockResolvedValue(baseQuestion)

    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/questions/new']}>
        <Routes>
          <Route path="/questions/new" element={<QuestionEditPage />} />
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

  it('displays version number and warning banner when editing a versioned question', async () => {
    vi.spyOn(questionBankApi, 'getQuestion').mockResolvedValue({
      ...baseQuestion,
      latest_version_number: 2,
      version_history: [
        {
          version_number: 2,
          created_at: '2026-02-01T00:00:00Z',
          created_by_email: 'author@example.com',
        },
        {
          version_number: 1,
          created_at: '2026-01-01T00:00:00Z',
        },
      ],
    })

    render(
      <MemoryRouter initialEntries={['/questions/q-1/edit']}>
        <Routes>
          <Route path="/questions/:id/edit" element={<QuestionEditPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Version: v2')).toBeInTheDocument()
    expect(
      screen.getByText('Edits create a new version and do not change published tests.'),
    ).toBeInTheDocument()
  })

  it('shows save confirmation modal before updating a versioned question', async () => {
    vi.spyOn(questionBankApi, 'getQuestion').mockResolvedValue({
      ...baseQuestion,
      latest_version_number: 1,
    })
    vi.spyOn(questionBankApi, 'updateQuestion').mockResolvedValue({
      ...baseQuestion,
      latest_version_number: 2,
    })

    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/questions/q-1/edit']}>
        <Routes>
          <Route path="/questions/:id/edit" element={<QuestionEditPage />} />
        </Routes>
      </MemoryRouter>,
    )

    await screen.findByText('Version: v1')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Create new version?')).toBeInTheDocument()
    expect(questionBankApi.updateQuestion).not.toHaveBeenCalled()

    await user.click(within(dialog).getByRole('button', { name: 'Save and create version' }))

    await waitFor(() => {
      expect(questionBankApi.updateQuestion).toHaveBeenCalled()
    })
  })

  it('hides version UI when question detail is missing version data', async () => {
    vi.spyOn(questionBankApi, 'getQuestion').mockResolvedValue(baseQuestion)

    render(
      <MemoryRouter initialEntries={['/questions/q-1/edit']}>
        <Routes>
          <Route path="/questions/:id/edit" element={<QuestionEditPage />} />
        </Routes>
      </MemoryRouter>,
    )

    await screen.findByRole('button', { name: 'Save changes' })
    expect(screen.queryByText(/Version: v/)).not.toBeInTheDocument()
    expect(
      screen.queryByText('Edits create a new version and do not change published tests.'),
    ).not.toBeInTheDocument()
  })

  it('shows version history placeholder when expanded without history data', async () => {
    vi.spyOn(questionBankApi, 'getQuestion').mockResolvedValue({
      ...baseQuestion,
      latest_version_number: 1,
    })

    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/questions/q-1/edit']}>
        <Routes>
          <Route path="/questions/:id/edit" element={<QuestionEditPage />} />
        </Routes>
      </MemoryRouter>,
    )

    await screen.findByText('Version: v1')
    await user.click(screen.getByRole('button', { name: /Version history/i }))

    expect(
      screen.getByText(/Version history links will appear here once the backend exposes/i),
    ).toBeInTheDocument()
  })

  it('shows load error without version UI', async () => {
    vi.spyOn(questionBankApi, 'getQuestion').mockRejectedValue(
      new questionBankApi.ApiError('Question not found.', 404),
    )

    render(
      <MemoryRouter initialEntries={['/questions/q-1/edit']}>
        <Routes>
          <Route path="/questions/:id/edit" element={<QuestionEditPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('alert')).toHaveTextContent('Question not found.')
    expect(screen.queryByText(/Version: v/)).not.toBeInTheDocument()
  })
})
