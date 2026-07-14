import { describe, expect, it } from 'vitest'
import {
  createEmptyFormState,
  isQuestionFormValid,
  validateImageFile,
  validateQuestionForm,
} from './questionBank'

describe('questionBank utils', () => {
  it('validates required fields', () => {
    const form = createEmptyFormState()
    const errors = validateQuestionForm(form)

    expect(errors.subject).toBeDefined()
    expect(errors.topic).toBeDefined()
    expect(errors.text).toBeDefined()
    expect(isQuestionFormValid(form)).toBe(false)
  })

  it('requires exactly one correct MCQ option', () => {
    const form = {
      ...createEmptyFormState('MCQ'),
      subject: 'Math',
      topic: 'Algebra',
      text: 'Pick one',
      options: [
        { label: 'A', value: '1', is_correct: false, order: 0 },
        { label: 'B', value: '2', is_correct: false, order: 1 },
      ],
    }

    const errors = validateQuestionForm(form)
    expect(errors.options).toContain('exactly one correct option')
  })

  it('accepts a valid MCQ form', () => {
    const form = {
      ...createEmptyFormState('MCQ'),
      subject: 'Math',
      topic: 'Algebra',
      text: 'Pick one',
      options: [
        { label: 'A', value: '1', is_correct: false, order: 0 },
        { label: 'B', value: '2', is_correct: true, order: 1 },
      ],
    }

    expect(isQuestionFormValid(form)).toBe(true)
  })

  it('rejects unsupported image types', () => {
    const file = new File(['data'], 'notes.txt', { type: 'text/plain' })
    expect(validateImageFile(file)).toContain('JPEG')
  })
})
