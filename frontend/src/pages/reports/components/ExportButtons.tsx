import { useState } from 'react'
import {
  exportReportCsv,
  exportReportPdf,
  getReportErrorMessage,
  openExportDownload,
} from '@/api/reports'
import type {
  ReportExportParameters,
  ReportExportType,
} from '@/api/reports.types'

interface ExportButtonsProps {
  reportType: ReportExportType
  parameters: ReportExportParameters
  disabled?: boolean
}

export function ExportButtons({
  reportType,
  parameters,
  disabled = false,
}: ExportButtonsProps) {
  const [isExporting, setIsExporting] = useState<'csv' | 'pdf' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleExport = async (format: 'csv' | 'pdf') => {
    setIsExporting(format)
    setError(null)

    try {
      const response =
        format === 'csv'
          ? await exportReportCsv(reportType, parameters)
          : await exportReportPdf(reportType, parameters)
      openExportDownload(response)
    } catch (exportError) {
      setError(
        getReportErrorMessage(
          exportError,
          `Unable to export ${format.toUpperCase()} report.`,
        ),
      )
    } finally {
      setIsExporting(null)
    }
  }

  return (
    <div className="reports-export">
      <div className="reports-export__actions">
        <button
          type="button"
          className="reports-btn reports-btn--secondary"
          disabled={disabled || isExporting !== null}
          onClick={() => void handleExport('csv')}
        >
          {isExporting === 'csv' ? 'Exporting CSV...' : 'Export CSV'}
        </button>
        <button
          type="button"
          className="reports-btn reports-btn--secondary"
          disabled={disabled || isExporting !== null}
          onClick={() => void handleExport('pdf')}
        >
          {isExporting === 'pdf' ? 'Exporting PDF...' : 'Export PDF'}
        </button>
      </div>
      {error ? (
        <div className="reports-alert reports-alert--error" role="alert">
          {error}
        </div>
      ) : null}
    </div>
  )
}
