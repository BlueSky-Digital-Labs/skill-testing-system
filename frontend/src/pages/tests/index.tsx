import { Link, useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@components/templates/DashboardLayout'
import { Button } from '@components/atoms/Button'
import { useToast } from '@components/Toast'
import { ApiError } from '@/api/client'
import {
  useCreateTestMutation,
  useTestsQuery,
} from '@/hooks/useTests'
import { lifecycleLabel } from '@/utils/testBuilder'
import { createEmptyFormState, formStateToPayload } from '@/utils/testBuilder'
import '../admin/admin.css'
import './tests.css'
import '../../components/tests/tests.css'

export function TestsListPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { data: tests = [], isLoading, error, refetch } = useTestsQuery()
  const createMutation = useCreateTestMutation()

  const handleCreateTest = async () => {
    try {
      const payload = formStateToPayload({
        ...createEmptyFormState(),
        title: 'Untitled test',
      })
      const created = await createMutation.mutateAsync(payload)
      showToast('Draft test created.', 'success')
      navigate(`/tests/${created.id}`)
    } catch (createError) {
      const message =
        createError instanceof ApiError
          ? createError.message
          : 'Unable to create test.'
      showToast(message, 'error')
    }
  }

  const errorMessage =
    error instanceof ApiError ? error.message : error ? 'Unable to load tests.' : null

  return (
    <DashboardLayout>
      <section className="admin-page tests-page">
        <header className="admin-page__header">
          <div>
            <h1>Tests</h1>
            <p>Create, configure, and publish exam tests.</p>
          </div>
          <Button
            type="button"
            isLoading={createMutation.isPending}
            onClick={() => void handleCreateTest()}
          >
            Create Test
          </Button>
        </header>

        {isLoading ? (
          <p className="tests-page__empty" aria-live="polite">
            Loading tests...
          </p>
        ) : null}

        {errorMessage ? (
          <p className="test-builder-alert" role="alert">
            {errorMessage}{' '}
            <button type="button" onClick={() => void refetch()}>
              Retry
            </button>
          </p>
        ) : null}

        {!isLoading && !errorMessage && tests.length === 0 ? (
          <p className="tests-page__empty">
            No tests yet. Create your first test to get started.
          </p>
        ) : null}

        {!isLoading && tests.length > 0 ? (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tests.map((test) => (
                  <tr key={test.id}>
                    <td>
                      <strong>{test.title}</strong>
                      {test.description ? <div>{test.description}</div> : null}
                    </td>
                    <td>
                      <span
                        className={`test-builder-status-badge test-builder-status-badge--${test.lifecycle}`}
                      >
                        {lifecycleLabel(test.lifecycle)}
                      </span>
                    </td>
                    <td>{new Date(test.updated_at).toLocaleString()}</td>
                    <td className="admin-table__actions">
                      <Link to={`/tests/${test.id}`}>
                        <Button type="button" variant="secondary" size="sm">
                          Edit
                        </Button>
                      </Link>
                      <Link to={`/tests/${test.id}/assign`}>
                        <Button type="button" variant="ghost" size="sm">
                          Assign
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </DashboardLayout>
  )
}
