import type { CombinedResult } from '@/api/grading'

interface ResultSummaryProps {
  result: CombinedResult | null
  isLoading?: boolean
}

export const ResultSummary = ({ result, isLoading = false }: ResultSummaryProps) => {
  if (isLoading) {
    return <div className="grading-panel">Loading combined result...</div>
  }

  if (!result) {
    return (
      <div className="grading-panel">
        <h2 className="grading-panel__title">Combined Result</h2>
        <p>No combined result available yet.</p>
      </div>
    )
  }

  const topics = Object.entries(result.by_topic)

  return (
    <div className="grading-panel grading-result-summary">
      <div className="grading-result-summary__header">
        <h2 className="grading-panel__title">Combined Result</h2>
        <span
          className={`grading-result-summary__status ${
            result.passed
              ? 'grading-result-summary__status--passed'
              : 'grading-result-summary__status--failed'
          }`}
        >
          {result.passed ? 'Passed' : 'Not Passed'}
        </span>
      </div>

      <div className="grading-result-summary__totals">
        <div className="grading-result-summary__metric">
          <strong>{result.total_awarded}</strong>
          <span>Total Awarded</span>
        </div>
        <div className="grading-result-summary__metric">
          <strong>{result.total_max}</strong>
          <span>Total Max</span>
        </div>
        <div className="grading-result-summary__metric">
          <strong>{result.test_id}</strong>
          <span>Test ID</span>
        </div>
      </div>

      {topics.length > 0 && (
        <div className="grading-table-wrapper">
          <table className="grading-table">
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
    </div>
  )
}
