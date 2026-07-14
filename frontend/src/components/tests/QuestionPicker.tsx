import { Button } from '@components/atoms/Button'
import type { Question } from '@/types/questionBank'
import {
  DIFFICULTY_LABELS,
  QUESTION_TYPE_LABELS,
} from '@/types/questionBank'
import '../tests/tests.css'

interface QuestionPickerProps {
  questions: Question[]
  selectedIds: string[]
  isLoading?: boolean
  error?: string | null
  page: number
  totalCount: number
  pageSize: number
  disabled?: boolean
  onPageChange: (page: number) => void
  onSelectionChange: (selectedIds: string[]) => void
}

export function QuestionPicker({
  questions,
  selectedIds,
  isLoading = false,
  error = null,
  page,
  totalCount,
  pageSize,
  disabled = false,
  onPageChange,
  onSelectionChange,
}: QuestionPickerProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  const toggleQuestion = (questionId: string) => {
    if (disabled) {
      return
    }

    if (selectedIds.includes(questionId)) {
      onSelectionChange(selectedIds.filter((id) => id !== questionId))
      return
    }

    onSelectionChange([...selectedIds, questionId])
  }

  return (
    <section className="test-builder-panel" aria-labelledby="question-picker-heading">
      <h2 id="question-picker-heading" className="test-builder-panel__title">
        Question picker
      </h2>
      <p className="test-builder-panel__description">
        Select one or more questions from the bank. {selectedIds.length} selected.
      </p>

      {error ? (
        <p className="test-builder-alert" role="alert">
          {error}
        </p>
      ) : null}

      {isLoading ? (
        <p className="test-builder-panel__description" aria-live="polite">
          Loading questions...
        </p>
      ) : (
        <div className="test-builder-question-list" role="list">
          {questions.length === 0 ? (
            <p className="test-builder-panel__description">No questions match the current filters.</p>
          ) : (
            questions.map((question) => {
              const checked = selectedIds.includes(question.id)
              const inputId = `question-${question.id}`

              return (
                <label
                  key={question.id}
                  className="test-builder-question-item"
                  htmlFor={inputId}
                  role="listitem"
                >
                  <input
                    id={inputId}
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => toggleQuestion(question.id)}
                  />
                  <div className="test-builder-question-item__meta">
                    <strong>{question.text}</strong>
                    <span>
                      {question.subject} / {question.topic} ·{' '}
                      {DIFFICULTY_LABELS[question.difficulty]} ·{' '}
                      {QUESTION_TYPE_LABELS[question.type]}
                    </span>
                  </div>
                  <span>{question.points} pts</span>
                </label>
              )
            })
          )}
        </div>
      )}

      <div className="test-builder-pagination">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled || page <= 1 || isLoading}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <span aria-live="polite">
          Page {page} of {totalPages}
        </span>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled || page >= totalPages || isLoading}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </section>
  )
}
