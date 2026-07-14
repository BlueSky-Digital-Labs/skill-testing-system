import type { Question, QuestionOption, QuestionType } from '@/types/questionBank'

export interface RunnerQuestionViewModel {
  id: string
  type: QuestionType
  text: string
  points: number
  options: QuestionOption[]
  version: number
}

interface RunnerQuestionProps {
  question: RunnerQuestionViewModel
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

export function RunnerQuestion({
  question,
  optionOrder,
  value,
  onChange,
  disabled = false,
}: RunnerQuestionProps) {
  const options = sanitizeOptions(orderOptions(question.options, optionOrder))

  if (question.type === 'MCQ' || question.type === 'TRUE_FALSE') {
    const selected = typeof value.selected_option === 'string' ? value.selected_option : ''

    return (
      <fieldset className="attempt-runner__question" disabled={disabled}>
        <legend className="attempt-runner__question-text">{question.text}</legend>
        <div className="attempt-runner__options">
          {options.map((option) => (
            <label key={`${option.label}-${option.value}`} className="attempt-runner__option">
              <input
                type="radio"
                name={`question-${question.id}`}
                value={option.label}
                checked={selected === option.label}
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
      <fieldset className="attempt-runner__question" disabled={disabled}>
        <legend className="attempt-runner__question-text">{question.text}</legend>
        <div className="attempt-runner__options">
          {options.map((option) => (
            <label key={`${option.label}-${option.value}`} className="attempt-runner__option">
              <input
                type="checkbox"
                checked={selected.includes(option.label)}
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
        <p className="attempt-runner__question-text">{question.text}</p>
        <label className="attempt-runner__text-label" htmlFor={`blank-${question.id}`}>
          Your answer
        </label>
        <input
          id={`blank-${question.id}`}
          className="attempt-runner__text-input"
          type="text"
          value={submitted}
          disabled={disabled}
          onChange={(event) => onChange({ submitted_answer: event.target.value })}
        />
      </div>
    )
  }

  const responseText =
    typeof value.response_text === 'string' ? value.response_text : ''

  return (
    <div className="attempt-runner__question">
      <p className="attempt-runner__question-text">{question.text}</p>
      <label className="attempt-runner__text-label" htmlFor={`free-text-${question.id}`}>
        Your response
      </label>
      <textarea
        id={`free-text-${question.id}`}
        className="attempt-runner__textarea"
        rows={6}
        value={responseText}
        disabled={disabled}
        onChange={(event) => onChange({ response_text: event.target.value })}
      />
    </div>
  )
}

export function toRunnerQuestionViewModel(question: Question): RunnerQuestionViewModel {
  return {
    id: question.id,
    type: question.type,
    text: question.text,
    points: question.points,
    options: question.options,
    version: question.latest_version_number ?? 1,
  }
}
