import type {
  BlankAnswerKey,
  Difficulty,
  QuestionOption,
  QuestionType,
  QuestionWritePayload,
} from '@/types/questionBank'

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const

export interface QuestionFormState {
  subject: string
  topic: string
  difficulty: Difficulty
  type: QuestionType
  text: string
  points: number
  options: QuestionOption[]
  blank_answer_keys: BlankAnswerKey[]
}

export function createDefaultOptions(type: QuestionType): QuestionOption[] {
  if (type === 'TRUE_FALSE') {
    return [
      { label: 'T', value: 'True', is_correct: true, order: 0 },
      { label: 'F', value: 'False', is_correct: false, order: 1 },
    ]
  }

  if (type === 'MCQ' || type === 'MULTI_SELECT') {
    return [
      { label: 'A', value: '', is_correct: false, order: 0 },
      { label: 'B', value: '', is_correct: false, order: 1 },
    ]
  }

  return []
}

export function createEmptyFormState(
  type: QuestionType = 'MCQ',
): QuestionFormState {
  return {
    subject: '',
    topic: '',
    difficulty: 'MEDIUM',
    type,
    text: '',
    points: 1,
    options: createDefaultOptions(type),
    blank_answer_keys: type === 'FILL_IN_BLANK'
      ? [{ answer: '', case_sensitive: false }]
      : [],
  }
}

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    return 'Image must be JPEG, PNG, GIF, or WebP.'
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return 'Image must be 5 MB or smaller.'
  }

  return null
}

export function validateQuestionForm(
  form: QuestionFormState,
): Record<string, string> {
  const errors: Record<string, string> = {}

  if (!form.subject.trim()) {
    errors.subject = 'Subject is required.'
  }
  if (!form.topic.trim()) {
    errors.topic = 'Topic is required.'
  }
  if (!form.text.trim()) {
    errors.text = 'Question text is required.'
  }
  if (!Number.isFinite(form.points) || form.points < 1) {
    errors.points = 'Points must be at least 1.'
  }

  if (form.type === 'MCQ') {
    if (form.options.length < 2) {
      errors.options = 'MCQ questions need at least two options.'
    } else {
      const correctCount = form.options.filter((option) => option.is_correct).length
      if (correctCount !== 1) {
        errors.options = 'MCQ questions must have exactly one correct option.'
      }
      if (form.options.some((option) => !option.value.trim())) {
        errors.options = 'All option values are required.'
      }
    }
  }

  if (form.type === 'MULTI_SELECT') {
    if (form.options.length < 2) {
      errors.options = 'Multi-select questions need at least two options.'
    } else {
      const correctCount = form.options.filter((option) => option.is_correct).length
      if (correctCount < 1) {
        errors.options = 'Select at least one correct option.'
      }
      if (form.options.some((option) => !option.value.trim())) {
        errors.options = 'All option values are required.'
      }
    }
  }

  if (form.type === 'TRUE_FALSE') {
    if (form.options.length !== 2) {
      errors.options = 'True/false questions must have exactly two options.'
    } else {
      const correctCount = form.options.filter((option) => option.is_correct).length
      if (correctCount !== 1) {
        errors.options = 'Mark exactly one true/false answer as correct.'
      }
    }
  }

  if (form.type === 'FILL_IN_BLANK') {
    const answers = form.blank_answer_keys
      .map((key) => key.answer.trim())
      .filter(Boolean)
    if (answers.length === 0) {
      errors.blank_answer_keys = 'Add at least one accepted answer.'
    }
  }

  return errors
}

export function isQuestionFormValid(form: QuestionFormState): boolean {
  return Object.keys(validateQuestionForm(form)).length === 0
}

export function toWritePayload(form: QuestionFormState): QuestionWritePayload {
  return {
    subject: form.subject.trim(),
    topic: form.topic.trim(),
    difficulty: form.difficulty,
    type: form.type,
    text: form.text.trim(),
    points: form.points,
    options:
      form.type === 'FILL_IN_BLANK' || form.type === 'FREE_TEXT'
        ? []
        : form.options.map((option, index) => ({
            ...option,
            value: option.value.trim(),
            order: index,
          })),
    blank_answer_keys:
      form.type === 'FILL_IN_BLANK'
        ? form.blank_answer_keys
            .map((key) => ({
              ...key,
              answer: key.answer.trim(),
            }))
            .filter((key) => key.answer)
        : [],
  }
}
