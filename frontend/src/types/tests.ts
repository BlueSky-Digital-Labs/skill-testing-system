import type { Difficulty, Question, QuestionType } from './questionBank'

export type TestLifecycle = 'draft' | 'published' | 'archived'
export type AssemblyMode = 'manual' | 'rules'
export type PassType = 'percent' | 'absolute'
export type ResultVisibility = 'immediate' | 'after_release' | 'never'

export interface TestSettings {
  time_limit_minutes?: number | null
  passing_score?: number | null
  pass_type?: PassType
  max_attempts?: number
  shuffle_questions?: boolean
  shuffle_options?: boolean
  topic_tags?: string[]
  opens_at?: string
  closes_at?: string
  result_visibility?: ResultVisibility
  show_correct_answers?: boolean
  show_explanations?: boolean
}

export interface SelectionRule {
  id?: string
  subject?: string
  topic?: string
  difficulty?: Difficulty | ''
  question_type?: QuestionType | ''
  count: number
  order: number
}

export interface TestQuestionLink {
  id?: string
  question_id: string
  order: number
  source: 'manual' | 'rule'
  version_number?: number | null
}

export interface TestSection {
  id?: string
  title: string
  description?: string
  order: number
  settings?: Record<string, unknown>
  question_links: TestQuestionLink[]
  selection_rules: SelectionRule[]
}

export interface TestShuffleSeed {
  id: string
  seed_type: 'questions' | 'options'
  seed_value: number
  created_at: string
}

export interface Test {
  id: string
  title: string
  description: string
  lifecycle: TestLifecycle
  settings: TestSettings
  published_at: string | null
  created_by: number | null
  created_at: string
  updated_at: string
  sections: TestSection[]
  shuffle_seeds: TestShuffleSeed[]
}

export interface TestWritePayload {
  title: string
  description?: string
  settings?: TestSettings
  sections?: Array<{
    id?: string
    title: string
    description?: string
    order: number
    settings?: Record<string, unknown>
    question_links?: Array<{ question_id: string; order: number }>
    selection_rules?: SelectionRule[]
  }>
}

export interface ListTestsParams {
  lifecycle?: TestLifecycle
  search?: string
}

export interface TestFormState {
  title: string
  description: string
  topicTags: string
  assemblyMode: AssemblyMode
  selectedQuestionIds: string[]
  selectionRules: SelectionRule[]
  settings: TestSettings
}

export type TestFormErrors = Partial<Record<keyof TestFormState | 'form' | 'sectionTitle', string>>

export type { Question }
