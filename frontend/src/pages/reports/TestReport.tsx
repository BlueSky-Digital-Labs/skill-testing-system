import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  formatPercent,
  formatRate,
  getReportErrorMessage,
  getTestReport,
} from '@/api/reports'
import type { TestSummaryReport } from '@/api/reports.types'
import { Chart } from './components/Chart'
import { ExportButtons } from './components/ExportButtons'
import { FiltersBar, type ReportFilters } from './components/FiltersBar'
import { ReportsLayout } from './Layout'
import { loadReportFilters, persistReportFilters } from './utils'

const STORAGE_KEY = 'test'
const DEFAULT_FILTERS: ReportFilters = { test_id: '' }

export function TestReport() {
  const [filters, setFilters] = useState(() =>
    loadReportFilters(STORAGE_KEY, DEFAULT_FILTERS),
  )
  const [report, setReport] = useState<TestSummaryReport | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    persistReportFilters(STORAGE_KEY, filters)
  }, [filters])

  const loadReport = useCallback(async () => {
    if (!filters.test_id.trim()) {
      setError('Test ID is required.')
      setReport(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await getTestReport(filters.test_id.trim())
      setReport(response)
    } catch (loadError) {
      setReport(null)
      setError(getReportErrorMessage(loadError, 'Unable to load test summary report.'))
    } finally {
      setIsLoading(false)
    }
  }, [filters.test_id])

  const chartData = useMemo(() => {
    if (!report) {
      return []
    }

    return [
      { label: 'Attempts', value: report.attempt_count },
      { label: 'Completed', value: report.completed_count },
      { label: 'Passed', value: report.passed_count },
    ]
  }, [report])

  return (
    <ReportsLayout
      title="Test summary report"
      description="Aggregate attempt volume, completion, and pass rates for a test."
    >
      <FiltersBar
        fields={[
          {
            key: 'test_id',
            label: 'Test ID',
            placeholder: 'Enter test UUID',
          },
        ]}
        values={filters}
        onChange={(key, value) => setFilters((previous) => ({ ...previous, [key]: value }))}
        onApply={() => void loadReport()}
        onReset={() => {
          setFilters(DEFAULT_FILTERS)
          setReport(null)
          setError(null)
        }}
        isLoading={isLoading}
      />

      {error ? (
        <div className="reports-alert reports-alert--error" role="alert">
          {error}
        </div>
      ) : null}

      {isLoading ? <p className="reports-loading">Loading report...</p> : null}

      {report ? (
        <>
          <ExportButtons
            reportType="test_summary"
            parameters={{ test_id: report.test_id }}
          />

          <div className="reports-summary">
            <div className="reports-summary__card">
              <span className="reports-summary__label">Attempts</span>
              <strong className="reports-summary__value">{report.attempt_count}</strong>
            </div>
            <div className="reports-summary__card">
              <span className="reports-summary__label">Completion rate</span>
              <strong className="reports-summary__value">
                {formatRate(report.completion_rate)}
              </strong>
            </div>
            <div className="reports-summary__card">
              <span className="reports-summary__label">Pass rate</span>
              <strong className="reports-summary__value">
                {formatRate(report.pass_rate)}
              </strong>
            </div>
            <div className="reports-summary__card">
              <span className="reports-summary__label">Average score</span>
              <strong className="reports-summary__value">
                {report.average_awarded} / {report.average_max}
              </strong>
            </div>
            <div className="reports-summary__card">
              <span className="reports-summary__label">Average percent</span>
              <strong className="reports-summary__value">
                {formatPercent(report.average_percent)}
              </strong>
            </div>
          </div>

          <Chart title="Attempt outcomes" data={chartData} />
        </>
      ) : null}
    </ReportsLayout>
  )
}
