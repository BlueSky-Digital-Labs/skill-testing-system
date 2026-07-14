import { Button } from '@components/atoms/Button'
import type { PreviewIntegritySettings } from '@/api/tests'

interface PreviewNavigatorProps {
  questionIds: string[]
  currentIndex: number
  answeredQuestionIds: Set<string>
  integrity: PreviewIntegritySettings
  onSelect: (index: number) => void
  onPrevious: () => void
  onNext: () => void
}

export function PreviewNavigator({
  questionIds,
  currentIndex,
  answeredQuestionIds,
  integrity,
  onSelect,
  onPrevious,
  onNext,
}: PreviewNavigatorProps) {
  const isFirst = currentIndex <= 0
  const isLast = currentIndex >= questionIds.length - 1

  return (
    <nav className="attempt-runner__navigator" aria-label="Question navigation">
      {!integrity.disable_review && (
        <ol className="attempt-runner__question-list">
          {questionIds.map((questionId, index) => {
            const isCurrent = index === currentIndex
            const isAnswered = answeredQuestionIds.has(questionId)

            return (
              <li key={questionId}>
                <button
                  type="button"
                  className={`attempt-runner__question-chip${
                    isCurrent ? ' attempt-runner__question-chip--active' : ''
                  }${isAnswered ? ' attempt-runner__question-chip--answered' : ''}`}
                  aria-current={isCurrent ? 'step' : undefined}
                  aria-label={`Go to question ${index + 1}${isAnswered ? ', answered' : ''}`}
                  onClick={() => onSelect(index)}
                >
                  {index + 1}
                </button>
              </li>
            )
          })}
        </ol>
      )}

      {integrity.question_per_page && (
        <div className="attempt-runner__nav-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={onPrevious}
            disabled={isFirst}
            aria-label="Previous question"
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onNext}
            disabled={isLast}
            aria-label="Next question"
          >
            Next
          </Button>
        </div>
      )}
    </nav>
  )
}
