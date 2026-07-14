import { ChangeEvent, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@components/templates/DashboardLayout'
import { Button } from '@components/atoms/Button'
import { useToast } from '@components/Toast'
import {
  ApiError,
  commitRows,
  downloadTemplate,
  parseFile,
  triggerTemplateDownload,
  type ImportValidRow,
  type ParseImportResponse,
} from '@/api/questionImport'
import { DIFFICULTY_LABELS, QUESTION_TYPE_LABELS } from '@/types/questionBank'
import '../questions.css'
import './import.css'

type ImportUiState =
  | 'idle'
  | 'parsing'
  | 'parsed_with_errors'
  | 'parsed_ready'
  | 'committing'
  | 'committed'

const PREVIEW_PAGE_SIZE = 25
const PREVIEW_ROW_CAP = 200

type PreviewRow =
  | {
      key: string
      rowNumber: number | null
      status: 'valid'
      data: ImportValidRow
    }
  | {
      key: string
      rowNumber: number | null
      status: 'error'
      data: Record<string, string>
      errors: Record<string, string[]>
    }

function formatFieldErrors(errors: Record<string, string[]>): string {
  return Object.entries(errors)
    .flatMap(([field, messages]) => messages.map((message) => `${field}: ${message}`))
    .join('; ')
}

function buildPreviewRows(parseResult: ParseImportResponse): PreviewRow[] {
  const errorRows: PreviewRow[] = parseResult.errors.map((error, index) => ({
    key: `error-${error.row_number ?? index}`,
    rowNumber: error.row_number,
    status: 'error',
    data: error.row ?? {},
    errors: error.errors,
  }))

  const validRows: PreviewRow[] = parseResult.valid_rows.map((row, index) => ({
    key: `valid-${row.row_number ?? index}`,
    rowNumber: row.row_number ?? null,
    status: 'valid',
    data: row,
  }))

  return [...errorRows, ...validRows].slice(0, PREVIEW_ROW_CAP)
}

export function ImportPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [uiState, setUiState] = useState<ImportUiState>('idle')
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null)
  const [parseResult, setParseResult] = useState<ParseImportResponse | null>(null)
  const [commitSummary, setCommitSummary] = useState<{
    inserted: number
    updated: number
  } | null>(null)
  const [networkError, setNetworkError] = useState<string | null>(null)
  const [showErrorsOnly, setShowErrorsOnly] = useState(false)
  const [previewPage, setPreviewPage] = useState(1)
  const [isDownloading, setIsDownloading] = useState<'csv' | 'xlsx' | null>(null)

  const previewRows = useMemo(
    () => (parseResult ? buildPreviewRows(parseResult) : []),
    [parseResult],
  )

  const filteredPreviewRows = useMemo(
    () => (
      showErrorsOnly
        ? previewRows.filter((row) => row.status === 'error')
        : previewRows
    ),
    [previewRows, showErrorsOnly],
  )

  const totalPreviewPages = Math.max(
    1,
    Math.ceil(filteredPreviewRows.length / PREVIEW_PAGE_SIZE),
  )
  const currentPreviewPage = Math.min(previewPage, totalPreviewPages)
  const paginatedPreviewRows = filteredPreviewRows.slice(
    (currentPreviewPage - 1) * PREVIEW_PAGE_SIZE,
    currentPreviewPage * PREVIEW_PAGE_SIZE,
  )

  const canCommit =
    parseResult !== null
    && parseResult.error_count === 0
    && parseResult.valid_count > 0

  const resetImportState = () => {
    setParseResult(null)
    setCommitSummary(null)
    setSelectedFileName(null)
    setShowErrorsOnly(false)
    setPreviewPage(1)
    setUiState('idle')
  }

  const handleTemplateDownload = async (format: 'csv' | 'xlsx') => {
    setNetworkError(null)
    setIsDownloading(format)

    try {
      const blob = await downloadTemplate(format)
      triggerTemplateDownload(blob, format)
      showToast(`${format.toUpperCase()} template downloaded.`, 'success')
    } catch (downloadError) {
      const message =
        downloadError instanceof ApiError
          ? downloadError.message
          : `Unable to download ${format.toUpperCase()} template.`
      setNetworkError(message)
      showToast(message, 'error')
    } finally {
      setIsDownloading(null)
    }
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) {
      return
    }

    setNetworkError(null)
    setCommitSummary(null)
    setSelectedFileName(file.name)
    setShowErrorsOnly(false)
    setPreviewPage(1)
    setUiState('parsing')

    try {
      const result = await parseFile(file)
      setParseResult(result)
      setUiState(result.error_count > 0 ? 'parsed_with_errors' : 'parsed_ready')
    } catch (parseError) {
      const message =
        parseError instanceof ApiError
          ? parseError.message
          : 'Unable to parse import file.'
      setNetworkError(message)
      setParseResult(null)
      setUiState('idle')
      showToast(message, 'error')
    }
  }

  const handleCommit = async () => {
    if (!parseResult || parseResult.valid_rows.length === 0) {
      return
    }

    setNetworkError(null)
    setUiState('committing')

    try {
      const summary = await commitRows(parseResult.valid_rows)
      setCommitSummary({
        inserted: summary.inserted,
        updated: summary.updated,
      })
      setUiState('committed')
      showToast(
        `Import complete: ${summary.inserted} created, ${summary.updated} updated.`,
        'success',
      )
    } catch (commitError) {
      const message =
        commitError instanceof ApiError
          ? commitError.message
          : 'Unable to commit import rows.'
      setNetworkError(message)
      setUiState(parseResult.error_count > 0 ? 'parsed_with_errors' : 'parsed_ready')
      showToast(message, 'error')
    }
  }

  return (
    <DashboardLayout>
      <section className="admin-page questions-import-page" aria-labelledby="import-page-title">
        <header className="admin-page__header">
          <div>
            <h1 id="import-page-title">Import questions</h1>
            <p>
              Download a template, upload a CSV or XLSX file, review validation results,
              and commit valid rows to the question bank.
            </p>
          </div>
          <div className="questions-import-page__header-actions">
            <Button variant="secondary" onClick={() => navigate('/questions')}>
              Back to questions
            </Button>
          </div>
        </header>

        {networkError ? (
          <div className="questions-import-page__alert" role="alert">
            <p>{networkError}</p>
            <button
              type="button"
              className="questions-import-page__alert-dismiss"
              onClick={() => setNetworkError(null)}
            >
              Dismiss
            </button>
          </div>
        ) : null}

        <section
          className="questions-import-page__section"
          aria-labelledby="import-template-heading"
        >
          <h2 id="import-template-heading">1. Download template</h2>
          <p className="questions-import-page__section-description">
            Start with the sample template to ensure columns and JSON fields are formatted correctly.
          </p>
          <div className="questions-import-page__actions">
            <Button
              variant="secondary"
              isLoading={isDownloading === 'csv'}
              onClick={() => void handleTemplateDownload('csv')}
            >
              Download CSV template
            </Button>
            <Button
              variant="secondary"
              isLoading={isDownloading === 'xlsx'}
              onClick={() => void handleTemplateDownload('xlsx')}
            >
              Download XLSX template
            </Button>
          </div>
        </section>

        <section
          className="questions-import-page__section"
          aria-labelledby="import-upload-heading"
        >
          <h2 id="import-upload-heading">2. Upload spreadsheet</h2>
          <p className="questions-import-page__section-description">
            Select a `.csv` or `.xlsx` file. The file is parsed and validated before import.
          </p>
          <label className="questions-import-page__file-label" htmlFor="question-import-file">
            Import file
            <input
              id="question-import-file"
              className="questions-import-page__file-input"
              type="file"
              accept=".csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              onChange={(event) => void handleFileChange(event)}
              disabled={uiState === 'parsing' || uiState === 'committing'}
            />
          </label>
          {selectedFileName ? (
            <p className="questions-import-page__file-name" aria-live="polite">
              Selected file: {selectedFileName}
            </p>
          ) : null}
          {uiState === 'parsing' ? (
            <p className="questions-import-page__status" role="status">
              Parsing and validating spreadsheet...
            </p>
          ) : null}
        </section>

        {parseResult ? (
          <section
            className="questions-import-page__section"
            aria-labelledby="import-preview-heading"
          >
            <h2 id="import-preview-heading">3. Preview and validation</h2>
            <div
              className="questions-import-page__summary"
              role="status"
              aria-live="polite"
            >
              <p>
                <strong>{parseResult.total_rows}</strong> total rows parsed from{' '}
                <strong>{parseResult.filename}</strong>.
              </p>
              <p>
                <strong>{parseResult.valid_count}</strong> valid,{' '}
                <strong>{parseResult.error_count}</strong> with errors.
              </p>
              {parseResult.total_rows > PREVIEW_ROW_CAP ? (
                <p className="questions-import-page__hint">
                  Showing the first {PREVIEW_ROW_CAP} preview rows.
                </p>
              ) : null}
            </div>

            <div className="questions-import-page__preview-controls">
              <label className="questions-import-page__checkbox">
                <input
                  type="checkbox"
                  checked={showErrorsOnly}
                  onChange={(event) => {
                    setShowErrorsOnly(event.target.checked)
                    setPreviewPage(1)
                  }}
                />
                Show rows with errors only
              </label>
            </div>

            {filteredPreviewRows.length === 0 ? (
              <p className="questions-import-page__status">
                {showErrorsOnly
                  ? 'No error rows to display.'
                  : 'No preview rows available.'}
              </p>
            ) : (
              <div className="admin-table-wrapper">
                <table className="admin-table questions-import-page__table">
                  <thead>
                    <tr>
                      <th scope="col">Row</th>
                      <th scope="col">Status</th>
                      <th scope="col">Subject</th>
                      <th scope="col">Topic</th>
                      <th scope="col">Type</th>
                      <th scope="col">Text</th>
                      <th scope="col">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPreviewRows.map((row) => (
                      <tr
                        key={row.key}
                        className={
                          row.status === 'error'
                            ? 'questions-import-page__row--error'
                            : undefined
                        }
                      >
                        <td>{row.rowNumber ?? '—'}</td>
                        <td>
                          <span
                            className={
                              row.status === 'error'
                                ? 'questions-import-page__badge questions-import-page__badge--error'
                                : 'questions-import-page__badge questions-import-page__badge--valid'
                            }
                          >
                            {row.status === 'error' ? 'Error' : 'Valid'}
                          </span>
                        </td>
                        <td>{row.status === 'valid' ? row.data.subject : row.data.subject ?? '—'}</td>
                        <td>{row.status === 'valid' ? row.data.topic : row.data.topic ?? '—'}</td>
                        <td>
                          {row.status === 'valid'
                            ? QUESTION_TYPE_LABELS[row.data.type as keyof typeof QUESTION_TYPE_LABELS]
                              ?? row.data.type
                            : row.data.type ?? '—'}
                        </td>
                        <td>
                          {row.status === 'valid'
                            ? row.data.text
                            : row.data.text ?? '—'}
                        </td>
                        <td>
                          {row.status === 'error' ? (
                            <span className="questions-import-page__error-text">
                              {formatFieldErrors(row.errors)}
                            </span>
                          ) : (
                            <span>
                              {DIFFICULTY_LABELS[row.data.difficulty as keyof typeof DIFFICULTY_LABELS]
                                ?? row.data.difficulty}
                              {' · '}
                              {row.data.points} pts
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {filteredPreviewRows.length > PREVIEW_PAGE_SIZE ? (
              <div className="admin-page__pagination">
                <span>
                  Preview page {currentPreviewPage} of {totalPreviewPages}
                </span>
                <div className="admin-table__actions">
                  <Button
                    variant="secondary"
                    disabled={currentPreviewPage <= 1}
                    onClick={() => setPreviewPage((page) => Math.max(1, page - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={currentPreviewPage >= totalPreviewPages}
                    onClick={() => setPreviewPage((page) => page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        <section
          className="questions-import-page__section"
          aria-labelledby="import-commit-heading"
        >
          <h2 id="import-commit-heading">4. Commit import</h2>
          <p className="questions-import-page__section-description">
            Commit is enabled only when every row passes validation.
          </p>

          {uiState === 'committed' && commitSummary ? (
            <div className="questions-import-page__success" role="status">
              <p>
                Import finished successfully: <strong>{commitSummary.inserted}</strong>{' '}
                created and <strong>{commitSummary.updated}</strong> updated.
              </p>
              <div className="questions-import-page__actions">
                <Button onClick={() => navigate('/questions')}>
                  View question bank
                </Button>
                <Button variant="secondary" onClick={resetImportState}>
                  Import another file
                </Button>
              </div>
            </div>
          ) : (
            <div className="questions-import-page__actions">
              <Button
                onClick={() => void handleCommit()}
                isLoading={uiState === 'committing'}
                disabled={!canCommit || uiState === 'committing'}
              >
                Commit valid rows
              </Button>
              {parseResult && parseResult.error_count > 0 ? (
                <p className="questions-import-page__hint" role="status">
                  Fix validation errors in your spreadsheet before committing.
                </p>
              ) : null}
            </div>
          )}
        </section>
      </section>
    </DashboardLayout>
  )
}
