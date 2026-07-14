export type QuestionType =
  | 'MCQ'
  | 'MULTI_SELECT'
  | 'TRUE_FALSE'
  | 'FILL_IN_BLANK'
  | 'FREE_TEXT'

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD'

export interface QuestionOption {
  id?: string
  label: string
  value: string
  is_correct: boolean
  order: number
}

export interface BlankAnswerKey {
  id?: string
  answer: string
  case_sensitive: boolean
}

export interface QuestionVersionSummary {
  version_number: number
  created_at: string
  created_by_email?: string | null
}

export interface Question {
  id: string
  subject: string
  topic: string
  difficulty: Difficulty
  type: QuestionType
  text: string
  image: string | null
  points: number
  author: number | null
  author_email: string | null
  metadata: Record<string, unknown>
  options: QuestionOption[]
  blank_answer_keys: BlankAnswerKey[]
  created_at: string
  updated_at: string
  latest_version_number?: number | null
  version_history?: QuestionVersionSummary[]
}

export interface PaginatedQuestions {
  count: number
  next: string | null
  previous: string | null
  results: Question[]
}

export interface QuestionWritePayload {
  subject: string
  topic: string
  difficulty: Difficulty
  type: QuestionType
  text: string
  points: number
  metadata?: Record<string, unknown>
  options?: QuestionOption[]
  blank_answer_keys?: BlankAnswerKey[]
}

export interface ListQuestionsParams {
  subject?: string
  topic?: string
  difficulty?: Difficulty | ''
  type?: QuestionType | ''
  page?: number
}

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  MCQ: 'Multiple Choice',
  MULTI_SELECT: 'Multi Select',
  TRUE_FALSE: 'True/False',
  FILL_IN_BLANK: 'Fill in the Blank',
  FREE_TEXT: 'Free Text',
}

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  EASY: 'Easy',
  MEDIUM: 'Medium',
  HARD: 'Hard',
}
