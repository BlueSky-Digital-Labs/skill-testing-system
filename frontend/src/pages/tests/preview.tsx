import { Link, useParams } from 'react-router-dom'
import { DashboardLayout } from '@components/templates/DashboardLayout'
import { Button } from '@components/atoms/Button'
import { QuestionVersionBadge } from '../questions/components/QuestionVersionBadge'
import { useTestQuery } from '@/hooks/useTests'
import { ApiError } from '@/api/client'
import '../admin/admin.css'
import './tests.css'

export function TestPreviewPage() {
  const { id } = useParams<{ id: string }>()
  const { data: test, isLoading, error } = useTestQuery(id)

  if (isLoading) {
    return (
      <DashboardLayout>
        <p className="tests-page__empty" aria-live="polite">
          Loading preview...
        </p>
      </DashboardLayout>
    )
  }

  if (error || !test) {
    const message =
      error instanceof ApiError ? error.message : 'Unable to load test preview.'
    return (
      <DashboardLayout>
        <p className="test-builder-alert" role="alert">
          {message}
        </p>
      </DashboardLayout>
    )
  }

  const questionLinks = test.sections.flatMap((section) => section.question_links)

  return (
    <DashboardLayout>
      <section className="admin-page tests-page">
        <header className="admin-page__header">
          <div>
            <h1>{test.title}</h1>
            <p>Read-only preview of assembled questions.</p>
          </div>
          <Link to={`/tests/${test.id}`}>
            <Button type="button" variant="secondary">
              Back to editor
            </Button>
          </Link>
        </header>

        {questionLinks.length === 0 ? (
          <p className="tests-page__empty">
            No questions are attached to this test yet.
          </p>
        ) : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Question ID</th>
                  <th>Source</th>
                  <th>Version</th>
                </tr>
              </thead>
              <tbody>
                {questionLinks.map((link) => (
                  <tr key={link.id ?? `${link.question_id}-${link.order}`}>
                    <td>{link.order + 1}</td>
                    <td>{link.question_id}</td>
                    <td>{link.source}</td>
                    <td>
                      <QuestionVersionBadge versionNumber={link.version_number} />
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
