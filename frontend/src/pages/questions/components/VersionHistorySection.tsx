import { useId, useState } from 'react'
import type { QuestionVersionSummary } from '@/types/questionBank'

interface VersionHistorySectionProps {
  versionHistory?: QuestionVersionSummary[]
}

export function VersionHistorySection({ versionHistory }: VersionHistorySectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const contentId = useId()

  const hasHistory = Boolean(versionHistory?.length)

  return (
    <section className="questions-version-history">
      <button
        type="button"
        className="questions-version-history__toggle"
        aria-expanded={isExpanded}
        aria-controls={contentId}
        onClick={() => setIsExpanded((current) => !current)}
      >
        Version history
        <span aria-hidden="true">{isExpanded ? '−' : '+'}</span>
      </button>

      {isExpanded ? (
        <div id={contentId} className="questions-version-history__content">
          {hasHistory ? (
            <ul className="questions-version-history__list">
              {versionHistory!.map((entry) => (
                <li key={entry.version_number}>
                  <span className="questions-version-history__version">
                    Version v{entry.version_number}
                  </span>
                  <span className="questions-version-history__meta">
                    {new Date(entry.created_at).toLocaleString()}
                    {entry.created_by_email ? ` · ${entry.created_by_email}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="questions-page__hint">
              Version history links will appear here once the backend exposes version
              snapshots for this question.
            </p>
          )}
        </div>
      ) : null}
    </section>
  )
}
