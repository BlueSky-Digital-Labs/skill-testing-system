import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  getIndividualReport,
  getReportErrorMessage,
} from '@/api/reports'
import type { IndividualReport } from '@/api/reports.types'
import { Chart } from './components/Chart'
import { DataTable, type DataTableColumn } from './components/DataTable'
import { ExportButtons } from './components/ExportButtons'
import { FiltersBar, type ReportFilters } from './components/FiltersBar'
import { ReportsLayout } from './Layout'
import {
  formatDateTime,
  loadReportFilters,
  persistReportFilters,
} from './utils'

const STORAGE_KEY = 'individual'
const DEFAULT_FILTERS: ReportFilters = { attempt_id: '' }

export function IndividualReport() {
  const [filters, setFilters] = useState(() =>
    loadReportFilters(STORAGE_KEY, DEFAULT_FILTERS),
  )
  const [report, setReport] = useState<IndividualReport | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasLoaded, setHasLoaded] = useState(false)

  useEffect(() => {
    persistReportFilters(STORAGE_KEY, filters)
  }, [filters])

  const loadReport = useCallback(async () => {
    if (!filters.attempt_id.trim()) {
      setError('Attempt ID is required.')
      setReport(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await getIndividualReport(filters.attempt_id.trim())
      setReport(response)
      setHasLoaded(true)
    } catch (loadError) {
      setReport(null)
      setError(
        getReportErrorMessage(loadError, 'Unable to load individual report.'),
      )
    } finally {
      setIsLoading(false)
    }
  }, [filters.attempt_id])

  const questionColumns = useMemo<DataTableColumn<IndividualReport['questions'][number]>[]>(
    () => [
      { key: 'question_id', label: 'Question ID', sortable: true },
      { key: 'question_version', label: 'Version', sortable: true },
      { key: 'topic', label: 'Topic', sortable: true },
      { key: 'question_type', label: 'Type', sortable: true },
      { key: 'awarded_points', label: 'Awarded', sortable: true },
      { key: 'max_points', label: 'Max', sortable: true },
      {
        key: 'is_correct',
        label: 'Correct',
        render: (row) => (row.is_correct ? 'Yes' : 'No'),
      },
    ],
    [],
  )

  const topicChartData = useMemo(() => {
    if (!report) {
      return []
    }

    return Object.entries(report.by_topic).map(([topic, values]) => ({
      label: topic,
      value: Number(values.awarded ?? 0),
    }))
  }, [report])

  return (
    <ReportsLayout
      title="Individual report"
      description="Review a single attempt, topic breakdown, and per-question scoring."
    >
      <FiltersBar
        fields={[
          {
            key: 'attempt_id',
            label: 'Attempt ID',
            placeholder: 'Enter attempt UUID',
          },
        ]}
        values={filters}
        onChange={(key, value) => setFilters((previous) => ({ ...previous, [key]: value }))}
        onApply={() => void loadReport()}
        onReset={() => {
          setFilters(DEFAULT_FILTERS)
          setReport(null)
          setError(null)
          setHasLoaded(false)
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
            reportType="individual"
            parameters={{ attempt_id: report.attempt_id }}
          />

          <div className="reports-summary">
            <div className="reports-summary__card">
              <span className="reports-summary__label">Test ID</span>
              <strong className="reports-summary__value">{report.test_id}</strong>
            </div>
            <div className="reports-summary__card">
              <span className="reports-summary__label">Score</span>
              <strong className="reports-summary__value">
                {report.total_awarded ?? '—'} / {report.total_max ?? '—'}
              </strong>
            </div>
            <div className="reports-summary__card">
              <span className="reports-summary__label">Status</span>
              <strong className="reports-summary__value">{report.status}</strong>
            </div>
            <div className="reports-summary__card">
              <span className="reports-summary__label">Result</span>
              <strong className="reports-summary__value">
                {report.passed === null ? (
                  '—'
                ) : (
                  <span
                    className={`reports-status-pill ${
                      report.passed
                        ? 'reports-status-pill--pass'
                        : 'reports-status-pill--fail'
                    }`}
                  >
                    {report.passed ? 'Passed' : 'Not passed'}
                  </span>
                )}
              </strong>
            </div>
            <div className="reports-summary__card">
              <span className="reports-summary__label">Submitted</span>
              <strong className="reports-summary__value">
                {formatDateTime(report.submitted_at)}
              </strong>
            </div>
          </div>

          <Chart title="Points awarded by topic" data={topicChartData} />

          <DataTable
            columns={questionColumns}
            rows={report.questions}
            rowKey={(row) => `${row.question_id}-${row.question_version}`}
            emptyMessage="No question scores recorded for this attempt."
          />
        </>
      ) : null}

      {!isLoading && !report && !error && hasLoaded ? (
        <p className="reports-empty">No report data found for the provided attempt ID.</p>
      ) : null}
    </ReportsLayout>
  )
}
