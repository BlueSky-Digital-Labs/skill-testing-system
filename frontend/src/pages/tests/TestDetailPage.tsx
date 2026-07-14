import { Link, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { DashboardLayout } from '@components/templates/DashboardLayout'
import { Button } from '@components/atoms/Button'
import { ApiError } from '@/api/auth'
import { listAssignments, type AssignmentRow } from './assign/api'
import { QuestionVersionBadge } from '../questions/components/QuestionVersionBadge'
import '../admin/admin.css'
import './tests.css'

export interface TestDetailQuestion {
  id: string
  subject: string
  topic: string
  text: string
  points: number
  versionNumber?: number | null
}

interface TestDetailPageProps {
  testTitle?: string
  questions?: TestDetailQuestion[]
}

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

export function TestDetailPage({
  testTitle,
  questions: questionsProp,
}: TestDetailPageProps) {
  const { testId = '' } = useParams<{ testId: string }>()
  const [assignments, setAssignments] = useState<AssignmentRow[]>([])
  const [isLoading, setIsLoading] = useState(Boolean(testId))
  const [error, setError] = useState<string | null>(null)
  const questions = questionsProp ?? []
  const resolvedTitle = testTitle ?? (testId ? `Test ${testId.slice(0, 8)}` : 'Test details')

  useEffect(() => {
    if (!testId || questionsProp != null) {
      setIsLoading(false)
      return
    }

    let isMounted = true

    const loadAssignments = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await listAssignments({ test_id: testId })
        if (isMounted) {
          setAssignments(response.results)
        }
      } catch (loadError) {
        if (isMounted) {
          const message =
            loadError instanceof ApiError
              ? loadError.message
              : 'Unable to load test assignments.'
          setError(message)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadAssignments()

    return () => {
      isMounted = false
    }
  }, [questionsProp, testId])

  return (
    <DashboardLayout>
      <section className="admin-page tests-page">
        <header className="admin-page__header">
          <div>
            <h1>{resolvedTitle}</h1>
            <p>Review assignments and questions included in this test.</p>
            {testId && <p className="tests-page__test-id">Test ID: {testId}</p>}
          </div>
          <div className="tests-page__header-actions">
            {testId && (
              <Link to={`/tests/${testId}/assign`}>
                <Button variant="primary">Manage assignments</Button>
              </Link>
            )}
            <Link to="/questions">
              <Button variant="secondary">Question bank</Button>
            </Link>
          </div>
        </header>

        {error && (
          <div className="dashboard-access-denied" role="alert">
            {error}
          </div>
        )}

        {testId && (
          <section className="tests-page__assignments">
            <h2>Assignments</h2>
            {isLoading ? (
              <p>Loading assignments...</p>
            ) : assignments.length === 0 ? (
              <p className="tests-page__empty">
                No assignments scheduled for this test yet. Use manage assignments to schedule
                availability windows.
              </p>
            ) : (
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Assignee</th>
                      <th>Opens</th>
                      <th>Due</th>
                      <th>Closes</th>
                      <th>State</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map((assignment) => (
                      <tr key={assignment.id}>
                        <td>{formatAssignee(assignment)}</td>
                        <td>{formatDateTime(assignment.opens_at)}</td>
                        <td>{formatDateTime(assignment.due_at)}</td>
                        <td>{formatDateTime(assignment.closes_at)}</td>
                        <td>{assignment.state}</td>
                        <td>{assignment.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        <section className="tests-page__questions">
          <h2>Questions</h2>
          {questions.length === 0 ? (
            <p className="tests-page__empty">
              Test composition is not exposed by the API yet. Questions are managed in the
              question bank and linked to tests when assignment delivery is configured.
            </p>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Topic</th>
                    <th>Question</th>
                    <th>Points</th>
                    <th>Version</th>
                  </tr>
                </thead>
                <tbody>
                  {questions.map((question) => (
                    <tr key={question.id}>
                      <td>{question.subject}</td>
                      <td>{question.topic}</td>
                      <td>{question.text}</td>
                      <td>{question.points}</td>
                      <td>
                        <QuestionVersionBadge versionNumber={question.versionNumber} />
                        {question.versionNumber == null || question.versionNumber < 1 ? (
                          <span className="tests-page__version-placeholder">—</span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>
    </DashboardLayout>
  )
}
