import { ApiError } from './auth'
import { authorizedFetch } from './http'
import { extractErrorMessage, getApiBase, parseResponse } from './client'
import type {
  ExportReportResponse,
  GroupComparisonReport,
  IndividualReport,
  QuestionPerformanceReport,
  ReportExportParameters,
  ReportExportType,
  TestSummaryReport,
} from './reports.types'

async function fetchReport<T>(path: string, fallbackMessage: string): Promise<T> {
  const response = await authorizedFetch(`${getApiBase()}${path}`)
  return parseResponse<T>(response, fallbackMessage)
}

export async function getIndividualReport(attemptId: string): Promise<IndividualReport> {
  if (!attemptId.trim()) {
    throw new ApiError('Attempt ID is required.', 400)
  }

  return fetchReport<IndividualReport>(
    `/reports/individual/${encodeURIComponent(attemptId)}/`,
    'Unable to load individual report.',
  )
}

export async function getTestReport(testId: string): Promise<TestSummaryReport> {
  if (!testId.trim()) {
    throw new ApiError('Test ID is required.', 400)
  }

  return fetchReport<TestSummaryReport>(
    `/reports/test-summary/${encodeURIComponent(testId)}/`,
    'Unable to load test summary report.',
  )
}

export async function getQuestionReport(
  testId: string,
): Promise<QuestionPerformanceReport> {
  if (!testId.trim()) {
    throw new ApiError('Test ID is required.', 400)
  }

  return fetchReport<QuestionPerformanceReport>(
    `/reports/question-performance/${encodeURIComponent(testId)}/`,
    'Unable to load question performance report.',
  )
}

export async function getGroupReport(testId: string): Promise<GroupComparisonReport> {
  if (!testId.trim()) {
    throw new ApiError('Test ID is required.', 400)
  }

  return fetchReport<GroupComparisonReport>(
    `/reports/group-comparison/${encodeURIComponent(testId)}/`,
    'Unable to load group comparison report.',
  )
}

async function exportReport(
  reportType: ReportExportType,
  format: 'csv' | 'pdf',
  parameters: ReportExportParameters,
): Promise<ExportReportResponse> {
  const response = await authorizedFetch(`${getApiBase()}/exports/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      report_type: reportType,
      format,
      parameters,
    }),
  })

  return parseResponse<ExportReportResponse>(
    response,
    `Unable to export ${reportType} report as ${format.toUpperCase()}.`,
  )
}

export async function exportReportCsv(
  reportType: ReportExportType,
  parameters: ReportExportParameters,
): Promise<ExportReportResponse> {
  return exportReport(reportType, 'csv', parameters)
}

export async function exportReportPdf(
  reportType: ReportExportType,
  parameters: ReportExportParameters,
): Promise<ExportReportResponse> {
  return exportReport(reportType, 'pdf', parameters)
}

export function openExportDownload(response: ExportReportResponse): void {
  window.open(response.download_url, '_blank', 'noopener,noreferrer')
}

export function getReportErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return 'You do not have permission to view this report.'
    }
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return fallback
}

export function formatRate(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return '—'
  }

  const numeric = Number(value)
  if (Number.isNaN(numeric)) {
    return String(value)
  }

  return `${(numeric * 100).toFixed(1)}%`
}

export function formatPercent(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return '—'
  }

  const numeric = Number(value)
  if (Number.isNaN(numeric)) {
    return String(value)
  }

  return `${numeric.toFixed(1)}%`
}

export { extractErrorMessage }
