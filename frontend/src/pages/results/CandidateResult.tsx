import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { DashboardLayout } from '@components/templates/DashboardLayout'
import { Button } from '@components/atoms/Button'
import { ApiError } from '@/api/auth'
import { getCandidateResult, type CandidateResult } from '@/api/results'
import './results.css'

function ResultSummaryPanel({ result }: { result: NonNullable<CandidateResult['summary']> }) {
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

function ResultItemsPanel({ items }: { items: NonNullable<CandidateResult['items']> }) {
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

export function CandidateResult() {
  const { attemptId } = useParams<{ attemptId: string }>()
  const [result, setResult] = useState<CandidateResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadResult = useCallback(async () => {
    if (!attemptId) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const payload = await getCandidateResult(attemptId)
      setResult(payload)
    } catch (loadError) {
      const message =
        loadError instanceof ApiError
          ? loadError.message
          : 'Unable to load your results.'
      setError(message)
      setResult(null)
    } finally {
      setIsLoading(false)
    }
  }, [attemptId])

  useEffect(() => {
    void loadResult()
  }, [loadResult])

  if (!attemptId) {
    return (
      <DashboardLayout>
        <div className="results-page">
          <p className="results-error">Attempt ID is required.</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="results-page">
        <header className="results-page__header">
          <h1>Test Results</h1>
          <p>Attempt {attemptId}</p>
        </header>

        <div className="results-form__actions">
          <Button type="button" variant="secondary" onClick={() => void loadResult()}>
            Refresh
          </Button>
        </div>

        {isLoading && <p>Loading results...</p>}

        {!isLoading && error && (
          <p className="results-error" role="alert">
            {error}
          </p>
        )}

        {!isLoading && result?.status === 'withheld' && (
          <section className="results-panel">
            <h2 className="results-panel__title">Results Not Yet Available</h2>
            <p className="results-empty-state">
              Your results have not been released yet. Please check back later.
            </p>
          </section>
        )}

        {!isLoading && result && result.status !== 'withheld' && result.summary && (
          <ResultSummaryPanel result={result.summary} />
        )}

        {!isLoading && result?.items && result.items.length > 0 && (
          <ResultItemsPanel items={result.items} />
        )}

        {!isLoading &&
          result &&
          result.status !== 'withheld' &&
          !result.summary &&
          !result.items?.length && (
            <section className="results-panel">
              <p className="results-empty-state">No result data is available yet.</p>
            </section>
          )}
      </div>
    </DashboardLayout>
  )
}
