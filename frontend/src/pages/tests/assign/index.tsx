import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { DashboardLayout } from '@components/templates/DashboardLayout'
import { ApiError } from '@/api/auth'
import { AssignForm } from './AssignForm'
import { AssignmentsTable, type AssignmentTableFilters } from './AssignmentsTable'
import {
  listAssignments,
  postBulkAssignments,
  type AssignmentRow,
  type BulkAssignmentPayload,
} from './api'
import '@components/grading/grading.css'
import './TestAssignPage.css'

export const TestAssignPage = () => {
  const { testId = '' } = useParams<{ testId: string }>()
  const [rows, setRows] = useState<AssignmentRow[]>([])
  const [filters, setFilters] = useState<AssignmentTableFilters>({
    state: '',
    status: '',
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const loadAssignments = useCallback(async () => {
    if (!testId) {
      setRows([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await listAssignments({
        test_id: testId,
        state: filters.state || undefined,
        status: filters.status || undefined,
      })
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
  }, [filters.state, filters.status, testId])

  useEffect(() => {
    void loadAssignments()
  }, [loadAssignments])

  const handleSubmit = async (payload: BulkAssignmentPayload) => {
    setIsSubmitting(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const result = await postBulkAssignments(payload)
      await loadAssignments()

      if (result.failed.length > 0) {
        setError(
          `Created ${result.created.length} assignment(s), but ${result.failed.length} failed. ` +
            `First error: ${result.failed[0].message}`,
        )
      } else {
        setSuccessMessage(`Created ${result.created.length} assignment(s).`)
      }
    } catch (submitError) {
      const message =
        submitError instanceof ApiError
          ? submitError.message
          : 'Unable to create assignments.'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!testId) {
    return (
      <DashboardLayout>
        <div className="assign-page">
          <div className="assign-alert assign-alert--error" role="alert">
            A test ID is required in the URL.
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="assign-page">
        <div className="assign-page__header">
          <h1>Assign Test</h1>
          <p>Schedule availability windows and assign this test to users or groups.</p>
        </div>

        {error && (
          <div className="assign-alert assign-alert--error" role="alert">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="assign-alert assign-alert--success" role="status">
            {successMessage}
          </div>
        )}

        <AssignForm testId={testId} isSubmitting={isSubmitting} onSubmit={handleSubmit} />

        <AssignmentsTable
          rows={rows}
          filters={filters}
          isLoading={isLoading}
          onFilterChange={setFilters}
        />
      </div>
    </DashboardLayout>
  )
}
