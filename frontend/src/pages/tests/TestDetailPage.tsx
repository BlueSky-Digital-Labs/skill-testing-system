import { Link } from 'react-router-dom'
import { DashboardLayout } from '@components/templates/DashboardLayout'
import { Button } from '@components/atoms/Button'
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

export function TestDetailPage({
  testTitle = 'Sample test',
  questions = [],
}: TestDetailPageProps) {
  return (
    <DashboardLayout>
      <section className="admin-page tests-page">
        <header className="admin-page__header">
          <div>
            <h1>{testTitle}</h1>
            <p>Review questions included in this test.</p>
          </div>
          <Link to="/questions">
            <Button variant="secondary">Back to question bank</Button>
          </Link>
        </header>

        {questions.length === 0 ? (
          <p className="tests-page__empty">
            Test question details will appear here once the backend exposes test composition
            data.
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
    </DashboardLayout>
  )
}
