import type { AttemptReviewSummary } from '../api'

interface ScoreSummaryProps {
  summary: AttemptReviewSummary
  testId?: string
}

export function ScoreSummary({ summary, testId }: ScoreSummaryProps) {
  const topics = Object.entries(summary.by_topic)

  return (
    <section className="attempt-completion__panel" aria-label="Score summary">
      <div className="attempt-completion__panel-header">
        <h2 className="attempt-completion__panel-title">Your Score</h2>
        <span
          className={`attempt-completion__badge ${
            summary.passed
              ? 'attempt-completion__badge--passed'
              : 'attempt-completion__badge--not-passed'
          }`}
        >
          {summary.passed ? 'Passed' : 'Not Passed'}
        </span>
      </div>

      <div className="attempt-completion__metrics">
        <div className="attempt-completion__metric">
          <strong>{summary.total_awarded}</strong>
          <span>Total Awarded</span>
        </div>
        <div className="attempt-completion__metric">
          <strong>{summary.total_max}</strong>
          <span>Total Max</span>
        </div>
        {testId && (
          <div className="attempt-completion__metric">
            <strong>{testId}</strong>
            <span>Test ID</span>
          </div>
        )}
      </div>

      {topics.length > 0 && (
        <div className="attempt-completion__table-wrapper">
          <table className="attempt-completion__table">
            <thead>
              <tr>
                <th>Topic</th>
                <th>Awarded</th>
                <th>Max</th>
              </tr>
            </thead>
            <tbody>
              {topics.map(([topic, values]) => (
                <tr key={topic}>
                  <td>{topic}</td>
                  <td>{values.awarded}</td>
                  <td>{values.max}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
