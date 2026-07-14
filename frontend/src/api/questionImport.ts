import { ApiError, apiFetch, parseResponse, postJson } from './client'

export type ImportTemplateFormat = 'csv' | 'xlsx'

export interface ImportRowError {
  row_number: number | null
  errors: Record<string, string[]>
  row?: Record<string, string>
}

export interface ImportOptionRow {
  label: string
  value: string
  is_correct: boolean
  order: number
}

export interface ImportBlankAnswerKeyRow {
  answer: string
  case_sensitive: boolean
}

export interface ImportValidRow {
  row_number?: number | null
  id?: string
  subject: string
  topic: string
  difficulty: string
  type: string
  text: string
  points: number
  metadata?: Record<string, unknown>
  options?: ImportOptionRow[]
  blank_answer_keys?: ImportBlankAnswerKeyRow[]
}

export interface ParseImportResponse {
  filename: string
  format: string
  total_rows: number
  valid_count: number
  error_count: number
  valid_rows: ImportValidRow[]
  errors: ImportRowError[]
}

export interface CommitImportResult {
  inserted: number
  updated: number
  errors: ImportRowError[]
  question_ids?: string[]
}

const TEMPLATE_PATH = '/question-import/template'
const PARSE_PATH = '/question-import/parse'
const COMMIT_PATH = '/question-import/commit'

export async function downloadTemplate(
  format: ImportTemplateFormat,
): Promise<Blob> {
  const response = await apiFetch(
    `${TEMPLATE_PATH}?file_format=${format}`,
    {
      headers: {
        Accept: format === 'xlsx'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'text/csv',
      },
    },
  )

  if (!response.ok) {
    await parseResponse(response, `Unable to download ${format.toUpperCase()} template.`)
  }

  return response.blob()
}

export function triggerTemplateDownload(blob: Blob, format: ImportTemplateFormat): void {
  const extension = format === 'xlsx' ? 'xlsx' : 'csv'
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `question_import_template.${extension}`
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function parseFile(file: File): Promise<ParseImportResponse> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await apiFetch(PARSE_PATH, {
    method: 'POST',
    body: formData,
    headers: {},
  })

  return parseResponse<ParseImportResponse>(
    response,
    'Unable to parse import file.',
  )
}

export async function commitRows(rows: ImportValidRow[]): Promise<CommitImportResult> {
  const summary = await postJson<{
    created: number
    updated: number
    question_ids?: string[]
  }>(COMMIT_PATH, { rows }, 'Unable to commit import rows.')

  return {
    inserted: summary.created,
    updated: summary.updated,
    errors: [],
    question_ids: summary.question_ids,
  }
}

export { ApiError }
