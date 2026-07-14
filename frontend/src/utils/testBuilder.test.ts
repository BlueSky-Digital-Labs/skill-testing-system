import { describe, expect, it } from 'vitest'
import {
  createEmptyFormState,
  formStateToPayload,
  validateTestForm,
} from '@/utils/testBuilder'

describe('testBuilder utils', () => {
  it('validates required title and manual question selection', () => {
    const state = createEmptyFormState()

    const errors = validateTestForm(state)

    expect(errors.title).toBeTruthy()
    expect(errors.form).toBeTruthy()
  })

  it('serializes manual assembly payload', () => {
    const state = {
      ...createEmptyFormState(),
      title: 'Algebra quiz',
      topicTags: 'math, algebra',
      selectedQuestionIds: ['q-1', 'q-2'],
      assemblyMode: 'manual' as const,
    }

    const payload = formStateToPayload(state)

    expect(payload.title).toBe('Algebra quiz')
    expect(payload.settings?.topic_tags).toEqual(['math', 'algebra'])
    expect(payload.sections?.[0].question_links).toHaveLength(2)
    expect(payload.sections?.[0].selection_rules).toEqual([])
  })
})
