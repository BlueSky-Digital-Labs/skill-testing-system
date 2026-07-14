import type {
  AssemblyMode,
  SelectionRule,
  Test,
  TestFormErrors,
  TestFormState,
  TestSettings,
  TestWritePayload,
} from '@/types/tests'

export const DEFAULT_TEST_SETTINGS: TestSettings = {
  time_limit_minutes: 60,
  passing_score: 70,
  pass_type: 'percent',
  max_attempts: 1,
  shuffle_questions: false,
  shuffle_options: false,
  topic_tags: [],
  opens_at: '',
  closes_at: '',
  result_visibility: 'after_release',
  show_correct_answers: false,
  show_explanations: false,
}

export function createEmptyFormState(): TestFormState {
  return {
    title: '',
    description: '',
    topicTags: '',
    assemblyMode: 'manual',
    selectedQuestionIds: [],
    selectionRules: [
      {
        subject: '',
        topic: '',
        difficulty: '',
        question_type: '',
        count: 1,
        order: 0,
      },
    ],
    settings: { ...DEFAULT_TEST_SETTINGS },
  }
}

export function testToFormState(test: Test): TestFormState {
  const section = test.sections[0]
  const sectionSettings = (section?.settings ?? {}) as { assembly_mode?: AssemblyMode }
  const assemblyMode = sectionSettings.assembly_mode ?? 'manual'

  return {
    title: test.title,
    description: test.description,
    topicTags: (test.settings.topic_tags ?? []).join(', '),
    assemblyMode,
    selectedQuestionIds: (section?.question_links ?? [])
      .filter((link) => link.source === 'manual')
      .sort((left, right) => left.order - right.order)
      .map((link) => link.question_id),
    selectionRules:
      section?.selection_rules?.length
        ? section.selection_rules.map((rule, index) => ({
            ...rule,
            order: rule.order ?? index,
          }))
        : createEmptyFormState().selectionRules,
    settings: {
      ...DEFAULT_TEST_SETTINGS,
      ...test.settings,
    },
  }
}

export function formStateToPayload(state: TestFormState): TestWritePayload {
  const topicTags = state.topicTags
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)

  const settings: TestSettings = {
    ...state.settings,
    topic_tags: topicTags,
    shuffle_questions: state.settings.shuffle_questions ?? false,
    shuffle_options: state.settings.shuffle_options ?? false,
  }

  const sectionPayload = {
    title: 'Main section',
    description: '',
    order: 0,
    settings: {
      assembly_mode: state.assemblyMode,
    },
    question_links:
      state.assemblyMode === 'manual'
        ? state.selectedQuestionIds.map((questionId, index) => ({
            question_id: questionId,
            order: index,
          }))
        : [],
    selection_rules:
      state.assemblyMode === 'rules'
        ? state.selectionRules.map((rule, index) => ({
            subject: rule.subject ?? '',
            topic: rule.topic ?? '',
            difficulty: rule.difficulty ?? '',
            question_type: rule.question_type ?? '',
            count: rule.count,
            order: index,
          }))
        : [],
  }

  return {
    title: state.title.trim(),
    description: state.description.trim(),
    settings,
    sections: [sectionPayload],
  }
}

export function validateTestForm(state: TestFormState): TestFormErrors {
  const errors: TestFormErrors = {}

  if (!state.title.trim()) {
    errors.title = 'Test name is required.'
  }

  if (state.settings.time_limit_minutes != null && state.settings.time_limit_minutes < 1) {
    errors.settings = 'Time limit must be at least 1 minute.'
  }

  if (state.settings.passing_score != null) {
    if (state.settings.pass_type === 'percent') {
      if (state.settings.passing_score < 0 || state.settings.passing_score > 100) {
        errors.settings = 'Passing score must be between 0 and 100 for percent mode.'
      }
    } else if (state.settings.passing_score < 0) {
      errors.settings = 'Passing score must be zero or greater.'
    }
  }

  if ((state.settings.max_attempts ?? 1) < 1) {
    errors.settings = 'Attempts must be at least 1.'
  }

  if (state.assemblyMode === 'manual' && state.selectedQuestionIds.length === 0) {
    errors.form = 'Select at least one question for manual assembly.'
  }

  if (state.assemblyMode === 'rules') {
    const hasValidRule = state.selectionRules.some((rule) => rule.count >= 1)
    if (!hasValidRule) {
      errors.form = 'Add at least one selection rule with a count of 1 or more.'
    }
  }

  if (state.settings.opens_at && state.settings.closes_at) {
    if (new Date(state.settings.opens_at) > new Date(state.settings.closes_at)) {
      errors.settings = 'Availability close time must be after open time.'
    }
  }

  return errors
}

export function lifecycleLabel(lifecycle: Test['lifecycle']): string {
  switch (lifecycle) {
    case 'draft':
      return 'Draft'
    case 'published':
      return 'Published'
    case 'archived':
      return 'Archived'
    default:
      return lifecycle
  }
}

export function createDefaultRule(order: number): SelectionRule {
  return {
    subject: '',
    topic: '',
    difficulty: '',
    question_type: '',
    count: 1,
    order,
  }
}
