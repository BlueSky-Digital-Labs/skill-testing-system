import type { CandidateResult } from '@/api/results'

export function ResultSummaryPanel({
  result,
}: {
  result: NonNullable<CandidateResult['summary']>
}) {
  const topics = Object.entries(result.by_topic)

  return (
    <section className="results-panel" aria-label="Result summary">
      <div className="results-page__header">
        <h2 className="results-panel__title">Your Results</h2>
        <span
          className={`results-status-badge ${
            result.passed
              ? 'results-status-badge--released'
              : 'results-status-badge--withheld'
          }`}
        >
          {result.passed ? 'Passed' : 'Not Passed'}
        </span>
      </div>

      <div className="results-summary__totals">
        <div className="results-summary__metric">
          <strong>{result.total_awarded}</strong>
          <span>Total Awarded</span>
        </div>
        <div className="results-summary__metric">
          <strong>{result.total_max}</strong>
          <span>Total Max</span>
        </div>
        <div className="results-summary__metric">
          <strong>{result.test_id}</strong>
          <span>Test ID</span>
        </div>
      </div>

      {topics.length > 0 && (
        <div className="results-table-wrapper">
          <table className="results-table">
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

export function ResultItemsPanel({
  items,
}: {
  items: NonNullable<CandidateResult['items']>
}) {
  return (
    <section className="results-panel" aria-label="Question correctness">
      <h2 className="results-panel__title">Question Breakdown</h2>
      <div className="results-table-wrapper">
        <table className="results-table">
          <thead>
            <tr>
              <th>Question</th>
              <th>Type</th>
              <th>Awarded</th>
              <th>Max</th>
              <th>Correct</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.question_id}</td>
                <td>{item.question_type}</td>
                <td>{item.awarded_points}</td>
                <td>{item.max_points}</td>
                <td>
                  <span
                    className={`results-correctness ${
                      item.is_correct
                        ? 'results-correctness--correct'
                        : 'results-correctness--incorrect'
                    }`}
                  >
                    {item.is_correct ? 'Correct' : 'Incorrect'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
