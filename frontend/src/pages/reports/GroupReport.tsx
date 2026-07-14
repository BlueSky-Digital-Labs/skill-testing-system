import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  formatPercent,
  formatRate,
  getGroupReport,
  getReportErrorMessage,
} from '@/api/reports'
import type { GroupComparisonRow } from '@/api/reports.types'
import { Chart } from './components/Chart'
import { DataTable, type DataTableColumn } from './components/DataTable'
import { ExportButtons } from './components/ExportButtons'
import { FiltersBar, type ReportFilters } from './components/FiltersBar'
import { ReportsLayout } from './Layout'
import { loadReportFilters, persistReportFilters } from './utils'

const STORAGE_KEY = 'group'
const DEFAULT_FILTERS: ReportFilters = { test_id: '' }

export function GroupReport() {
  const [filters, setFilters] = useState(() =>
    loadReportFilters(STORAGE_KEY, DEFAULT_FILTERS),
  )
  const [rows, setRows] = useState<GroupComparisonRow[]>([])
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
      const response = await getGroupReport(filters.test_id.trim())
      setRows(response.groups)
      setTestId(response.test_id)
    } catch (loadError) {
      setRows([])
      setError(
        getReportErrorMessage(loadError, 'Unable to load group comparison report.'),
      )
    } finally {
      setIsLoading(false)
    }
  }, [filters.test_id])

  const columns = useMemo<DataTableColumn<GroupComparisonRow>[]>(
    () => [
      { key: 'group_name', label: 'Group', sortable: true },
      { key: 'member_count', label: 'Members', sortable: true },
      { key: 'attempt_count', label: 'Attempts', sortable: true },
      { key: 'completed_count', label: 'Completed', sortable: true },
      {
        key: 'completion_rate',
        label: 'Completion',
        sortable: true,
        render: (row) => formatRate(row.completion_rate),
        sortValue: (row) => Number(row.completion_rate),
      },
      {
        key: 'pass_rate',
        label: 'Pass rate',
        sortable: true,
        render: (row) => formatRate(row.pass_rate),
        sortValue: (row) => Number(row.pass_rate),
      },
      {
        key: 'average_percent',
        label: 'Avg %',
        sortable: true,
        render: (row) => formatPercent(row.average_percent),
        sortValue: (row) => Number(row.average_percent),
      },
    ],
    [],
  )

  const chartData = useMemo(
    () =>
      rows.map((row) => ({
        label: row.group_name,
        value: Number(row.average_percent),
      })),
    [rows],
  )

  return (
    <ReportsLayout
      title="Group comparison report"
      description="Compare completion, pass rates, and average scores across candidate groups."
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
            reportType="group_comparison"
            parameters={{ test_id: testId }}
          />

          <Chart
            title="Average percent by group"
            data={chartData}
            valueFormatter={(value) => `${value.toFixed(1)}%`}
          />

          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(row) => row.group_id}
            emptyMessage="No group comparison data found for this test."
          />
        </>
      ) : null}
    </ReportsLayout>
  )
}
