import { ResultSummaryPanel, ResultItemsPanel } from './ResultPanels'
import type { CandidateResult } from '@/api/results'

export { ResultSummaryPanel, ResultItemsPanel }

export function ResultContent({ result }: { result: CandidateResult }) {
  if (result.status === 'withheld') {
    return (
      <section className="results-panel">
        <h2 className="results-panel__title">Results Not Yet Available</h2>
        <p className="results-empty-state">
          Your results have not been released yet. Please check back later.
        </p>
      </section>
    )
  }

  return (
    <>
      {result.summary && <ResultSummaryPanel result={result.summary} />}
      {result.items && result.items.length > 0 && (
        <ResultItemsPanel items={result.items} />
      )}
      {!result.summary && !result.items?.length && (
        <section className="results-panel">
          <p className="results-empty-state">No result data is available yet.</p>
        </section>
      )}
    </>
  )
}
