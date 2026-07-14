import { Link } from 'react-router-dom'
import { Button } from '@components/atoms/Button'
import type { PreviewFinishResult } from '@/api/tests'

interface PreviewSummaryProps {
  testId: string
  result: PreviewFinishResult
}

export function PreviewSummary({ testId, result }: PreviewSummaryProps) {
  return (
    <section className="attempt-runner__summary" aria-live="polite">
      <h2>Preview complete</h2>
      <p className="attempt-runner__summary-score">
        Total auto score: <strong>{result.total_auto_score}</strong>
      </p>
      <ul className="attempt-runner__summary-list">
        {Object.entries(result.per_question).map(([questionId, score]) => (
          <li key={questionId} className="attempt-runner__summary-item">
            <span>Question {questionId.slice(0, 8)}</span>
            <span>
              {score.answered ? score.awarded_points : '0.00'} / {score.max_points}
              {score.requires_manual_grading ? ' (manual)' : ''}
            </span>
          </li>
        ))}
      </ul>
      <div className="attempt-runner__back-link">
        <Link to={`/tests/${testId}`}>
          <Button type="button" variant="secondary">
            Back to test
          </Button>
        </Link>
      </div>
    </section>
  )
}
