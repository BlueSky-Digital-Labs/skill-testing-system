import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { DashboardLayout } from '@components/templates/DashboardLayout'
import { Button } from '@components/atoms/Button'
import { ApiError } from '@/api/auth'
import { listAssignments, type AssignmentRow } from './assign/api'
import '../admin/admin.css'
import './tests.css'

function formatDateTime(value: string | null): string {
  if (!value) {
    return '—'
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

function formatAssignee(row: AssignmentRow): string {
  if (row.assignee_user_id) {
    return `User ${row.assignee_user_id}`
  }
  if (row.assignee_group_id) {
    return `Group ${row.assignee_group_id}`
  }
  return '—'
}

function shortTestId(testId: string): string {
  return testId.length > 8 ? `${testId.slice(0, 8)}…` : testId
}

export function AssignmentsListPage() {
  const [rows, setRows] = useState<AssignmentRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadAssignments = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await listAssignments({ page: 1 })
      setRows(response.results)
    } catch (loadError) {
      const message =
        loadError instanceof ApiError
          ? loadError.message
          : 'Unable to load assignments.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadAssignments()
  }, [loadAssignments])

  const uniqueTestIds = useMemo(() => {
    const ids = new Set(rows.map((row) => row.test_id))
    return Array.from(ids)
  }, [rows])

  return (
    <DashboardLayout>
      <section className="admin-page tests-page">
        <header className="admin-page__header">
          <div>
            <h1>Test assignments</h1>
            <p>Review scheduled availability windows and assign tests to users or groups.</p>
          </div>
        </header>

        {error && (
          <div className="dashboard-access-denied" role="alert">
            {error}
          </div>
        )}

        {uniqueTestIds.length > 0 && (
          <div className="tests-page__actions">
            <h2>Tests with assignments</h2>
            <div className="tests-page__test-links">
              {uniqueTestIds.map((testId) => (
                <div key={testId} className="tests-page__test-link-row">
                  <span className="tests-page__test-id" title={testId}>
                    {shortTestId(testId)}
                  </span>
                  <div className="tests-page__test-link-actions">
                    <Link to={`/tests/${testId}`}>
                      <Button variant="secondary">View test</Button>
                    </Link>
                    <Link to={`/tests/${testId}/assign`}>
                      <Button variant="primary">Manage assignments</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {isLoading ? (
          <p>Loading assignments...</p>
        ) : rows.length === 0 ? (
          <p className="tests-page__empty">
            No assignments yet. Open a test to schedule availability and assign candidates.
          </p>
        ) : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Test</th>
                  <th>Assignee</th>
                  <th>Opens</th>
                  <th>Due</th>
                  <th>State</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link to={`/tests/${row.test_id}`} title={row.test_id}>
                        {shortTestId(row.test_id)}
                      </Link>
                    </td>
                    <td>{formatAssignee(row)}</td>
                    <td>{formatDateTime(row.opens_at)}</td>
                    <td>{formatDateTime(row.due_at)}</td>
                    <td>{row.state}</td>
                    <td>{row.status}</td>
                    <td>
                      <Link to={`/tests/${row.test_id}/assign`}>Manage</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </DashboardLayout>
  )
}
