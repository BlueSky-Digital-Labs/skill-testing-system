import type { QuestionOption, QuestionType } from '@/types/questionBank'

export interface PreviewQuestionViewModel {
  id: string
  type: QuestionType
  text: string
  points: number
  options: QuestionOption[]
}

interface PreviewQuestionProps {
  question: PreviewQuestionViewModel
  optionOrder: string[]
  value: Record<string, unknown>
  onChange: (response: Record<string, unknown>) => void
  disabled?: boolean
}

function orderOptions(
  options: QuestionOption[],
  optionOrder: string[],
): QuestionOption[] {
  if (optionOrder.length === 0) {
    return options
  }

  const byId = new Map(
    options
      .filter((option) => option.id)
      .map((option) => [option.id as string, option]),
  )

  const ordered = optionOrder
    .map((optionId) => byId.get(optionId))
    .filter((option): option is QuestionOption => Boolean(option))

  if (ordered.length > 0) {
    return ordered
  }

  return [...options].sort((left, right) => left.order - right.order)
}

function sanitizeOptions(options: QuestionOption[]): QuestionOption[] {
  return options.map((option) => ({
    ...option,
    is_correct: false,
  }))
}

export function PreviewQuestion({
  question,
  optionOrder,
  value,
  onChange,
  disabled = false,
}: PreviewQuestionProps) {
  const options = sanitizeOptions(orderOptions(question.options, optionOrder))

  if (question.type === 'MCQ' || question.type === 'TRUE_FALSE') {
    const selected = typeof value.selected_option === 'string' ? value.selected_option : ''

    return (
      <fieldset
        className="attempt-runner__question"
        disabled={disabled}
        aria-labelledby={`preview-question-${question.id}`}
      >
        <legend id={`preview-question-${question.id}`} className="attempt-runner__question-text">
          {question.text}
        </legend>
        <div className="attempt-runner__options" role="radiogroup" aria-label="Answer choices">
          {options.map((option) => (
            <label key={`${option.label}-${option.value}`} className="attempt-runner__option">
              <input
                type="radio"
                name={`preview-question-${question.id}`}
                value={option.label}
                checked={selected === option.label}
                aria-label={option.value}
                onChange={() => onChange({ selected_option: option.label })}
              />
              <span>{option.value}</span>
            </label>
          ))}
        </div>
      </fieldset>
    )
  }

  if (question.type === 'MULTI_SELECT') {
    const selected = Array.isArray(value.selected_options)
      ? (value.selected_options as string[])
      : []

    const toggleOption = (label: string) => {
      const next = selected.includes(label)
        ? selected.filter((item) => item !== label)
        : [...selected, label]
      onChange({ selected_options: next })
    }

    return (
      <fieldset
        className="attempt-runner__question"
        disabled={disabled}
        aria-labelledby={`preview-question-${question.id}`}
      >
        <legend id={`preview-question-${question.id}`} className="attempt-runner__question-text">
          {question.text}
        </legend>
        <div className="attempt-runner__options" role="group" aria-label="Answer choices">
          {options.map((option) => (
            <label key={`${option.label}-${option.value}`} className="attempt-runner__option">
              <input
                type="checkbox"
                checked={selected.includes(option.label)}
                aria-label={option.value}
                onChange={() => toggleOption(option.label)}
              />
              <span>{option.value}</span>
            </label>
          ))}
        </div>
      </fieldset>
    )
  }

  if (question.type === 'FILL_IN_BLANK') {
    const submitted =
      typeof value.submitted_answer === 'string' ? value.submitted_answer : ''

    return (
      <div className="attempt-runner__question">
        <p id={`preview-question-${question.id}`} className="attempt-runner__question-text">
          {question.text}
        </p>
        <label className="attempt-runner__text-label" htmlFor={`preview-blank-${question.id}`}>
          Your answer
        </label>
        <input
          id={`preview-blank-${question.id}`}
          className="attempt-runner__text-input"
          type="text"
          value={submitted}
          disabled={disabled}
          aria-labelledby={`preview-question-${question.id}`}
          onChange={(event) => onChange({ submitted_answer: event.target.value })}
        />
      </div>
    )
  }

  const responseText =
    typeof value.response_text === 'string' ? value.response_text : ''

  return (
    <div className="attempt-runner__question">
      <p id={`preview-question-${question.id}`} className="attempt-runner__question-text">
        {question.text}
      </p>
      <label className="attempt-runner__text-label" htmlFor={`preview-free-text-${question.id}`}>
        Your response
      </label>
      <textarea
        id={`preview-free-text-${question.id}`}
        className="attempt-runner__textarea"
        rows={6}
        value={responseText}
        disabled={disabled}
        aria-labelledby={`preview-question-${question.id}`}
        onChange={(event) => onChange({ response_text: event.target.value })}
      />
    </div>
  )
}
