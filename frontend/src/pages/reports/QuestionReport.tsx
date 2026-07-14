import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  formatRate,
  getQuestionReport,
  getReportErrorMessage,
} from '@/api/reports'
import type { QuestionPerformanceRow } from '@/api/reports.types'
import { Chart } from './components/Chart'
import { DataTable, type DataTableColumn } from './components/DataTable'
import { ExportButtons } from './components/ExportButtons'
import { FiltersBar, type ReportFilters } from './components/FiltersBar'
import { ReportsLayout } from './Layout'
import { loadReportFilters, persistReportFilters } from './utils'

const STORAGE_KEY = 'question'
const DEFAULT_FILTERS: ReportFilters = { test_id: '' }

export function QuestionReport() {
  const [filters, setFilters] = useState(() =>
    loadReportFilters(STORAGE_KEY, DEFAULT_FILTERS),
  )
  const [rows, setRows] = useState<QuestionPerformanceRow[]>([])
  const [testId, setTestId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    persistReportFilters(STORAGE_KEY, filters)
  }, [filters])

  const loadReport = useCallback(async () => {
    if (!filters.test_id.trim()) {
      setError('Test ID is required.')
      setRows([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await getQuestionReport(filters.test_id.trim())
      setRows(response.questions)
      setTestId(response.test_id)
    } catch (loadError) {
      setRows([])
      setError(
        getReportErrorMessage(loadError, 'Unable to load question performance report.'),
      )
    } finally {
      setIsLoading(false)
    }
  }, [filters.test_id])

  const columns = useMemo<DataTableColumn<QuestionPerformanceRow>[]>(
    () => [
      { key: 'question_id', label: 'Question ID', sortable: true },
      { key: 'question_version', label: 'Version', sortable: true },
      { key: 'attempts', label: 'Attempts', sortable: true },
      { key: 'correct_count', label: 'Correct', sortable: true },
      {
        key: 'correctness_rate',
        label: 'Correctness',
        sortable: true,
        render: (row) => formatRate(row.correctness_rate),
        sortValue: (row) => Number(row.correctness_rate),
      },
      { key: 'average_awarded', label: 'Avg awarded', sortable: true },
    ],
    [],
  )

  const chartData = useMemo(
    () =>
      rows.slice(0, 8).map((row) => ({
        label: `v${row.question_version}`,
        value: Number(row.correctness_rate) * 100,
      })),
    [rows],
  )

  return (
    <ReportsLayout
      title="Question performance report"
      description="Analyze correctness and scoring trends per question version."
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
          setRows([])
          setTestId('')
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

      {testId ? (
        <>
          <ExportButtons
            reportType="question_performance"
            parameters={{ test_id: testId }}
          />

          <Chart
            title="Correctness rate by question version (%)"
            data={chartData}
            valueFormatter={(value) => `${value.toFixed(1)}%`}
          />

          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(row) => `${row.question_id}-${row.question_version}`}
            emptyMessage="No question performance data found for this test."
          />
        </>
      ) : null}
    </ReportsLayout>
  )
}
