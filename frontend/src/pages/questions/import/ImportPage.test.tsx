import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ImportPage } from './ImportPage'
import * as questionImportApi from '@/api/questionImport'

vi.mock('@components/templates/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@components/Toast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}))

const parseSuccess = {
  filename: 'questions.csv',
  format: 'csv',
  total_rows: 2,
  valid_count: 1,
  error_count: 1,
  valid_rows: [
    {
      row_number: 2,
      subject: 'Mathematics',
      topic: 'Algebra',
      difficulty: 'MEDIUM',
      type: 'MCQ',
      text: 'What is 2 + 2?',
      points: 2,
      metadata: {},
      options: [],
      blank_answer_keys: [],
    },
  ],
  errors: [
    {
      row_number: 3,
      errors: { subject: ['subject is required.'] },
      row: { subject: '', topic: 'Geometry', type: 'MCQ', text: 'Missing subject' },
    },
  ],
}

describe('ImportPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders template download actions', () => {
    render(
      <MemoryRouter>
        <ImportPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Import questions' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Download CSV template' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Download XLSX template' })).toBeInTheDocument()
  })

  it('downloads csv template via blob helper', async () => {
    const user = userEvent.setup()
    const blob = new Blob(['id,subject\n'], { type: 'text/csv' })
    vi.spyOn(questionImportApi, 'downloadTemplate').mockResolvedValue(blob)
    const triggerSpy = vi.spyOn(questionImportApi, 'triggerTemplateDownload').mockImplementation(() => {})

    render(
      <MemoryRouter>
        <ImportPage />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Download CSV template' }))

    await waitFor(() => {
      expect(questionImportApi.downloadTemplate).toHaveBeenCalledWith('csv')
      expect(triggerSpy).toHaveBeenCalledWith(blob, 'csv')
    })
  })

  it('parses uploaded file and shows validation summary', async () => {
    const user = userEvent.setup()
    vi.spyOn(questionImportApi, 'parseFile').mockResolvedValue(parseSuccess)

    render(
      <MemoryRouter>
        <ImportPage />
      </MemoryRouter>,
    )

    const input = screen.getByLabelText('Import file')
    const file = new File(['id,subject\n'], 'questions.csv', { type: 'text/csv' })
    await user.upload(input, file)

    await waitFor(() => {
      expect(questionImportApi.parseFile).toHaveBeenCalled()
      expect(screen.getByText('Mathematics')).toBeInTheDocument()
      expect(screen.getByText('subject: subject is required.')).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: 'Commit valid rows' })).toBeDisabled()
  })

  it('filters preview to error rows only', async () => {
    const user = userEvent.setup()
    vi.spyOn(questionImportApi, 'parseFile').mockResolvedValue(parseSuccess)

    render(
      <MemoryRouter>
        <ImportPage />
      </MemoryRouter>,
    )

    await user.upload(
      screen.getByLabelText('Import file'),
      new File(['id,subject\n'], 'questions.csv', { type: 'text/csv' }),
    )

    await waitFor(() => {
      expect(screen.getByText('Mathematics')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('checkbox', { name: 'Show rows with errors only' }))

    expect(screen.queryByText('Mathematics')).not.toBeInTheDocument()
    expect(screen.getByText('subject: subject is required.')).toBeInTheDocument()
  })

  it('commits valid rows when there are no validation errors', async () => {
    const user = userEvent.setup()
    vi.spyOn(questionImportApi, 'parseFile').mockResolvedValue({
      ...parseSuccess,
      error_count: 0,
      errors: [],
      total_rows: 1,
    })
    vi.spyOn(questionImportApi, 'commitRows').mockResolvedValue({
      inserted: 1,
      updated: 0,
      errors: [],
    })

    render(
      <MemoryRouter>
        <ImportPage />
      </MemoryRouter>,
    )

    await user.upload(
      screen.getByLabelText('Import file'),
      new File(['id,subject\n'], 'questions.csv', { type: 'text/csv' }),
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Commit valid rows' })).toBeEnabled()
    })

    await user.click(screen.getByRole('button', { name: 'Commit valid rows' }))

    await waitFor(() => {
      expect(questionImportApi.commitRows).toHaveBeenCalledWith(parseSuccess.valid_rows)
      expect(screen.getByText(/Import finished successfully/i)).toBeInTheDocument()
    })
  })
})
