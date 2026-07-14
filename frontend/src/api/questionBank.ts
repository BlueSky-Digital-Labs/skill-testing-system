import { ApiError, apiFetch, parseResponse, postJson } from './client'
import type {
  ListQuestionsParams,
  PaginatedQuestions,
  Question,
  QuestionWritePayload,
} from '@/types/questionBank'

const QUESTIONS_PATH = '/question-bank/questions/'

function buildQuery(params: ListQuestionsParams = {}): string {
  const searchParams = new URLSearchParams()

  if (params.page) {
    searchParams.set('page', String(params.page))
  }
  if (params.subject) {
    searchParams.set('subject', params.subject)
  }
  if (params.topic) {
    searchParams.set('topic', params.topic)
  }
  if (params.difficulty) {
    searchParams.set('difficulty', params.difficulty)
  }
  if (params.type) {
    searchParams.set('type', params.type)
  }

  const query = searchParams.toString()
  return query ? `?${query}` : ''
}

export async function listQuestions(
  params: ListQuestionsParams = {},
): Promise<PaginatedQuestions> {
  const response = await apiFetch(`${QUESTIONS_PATH}${buildQuery(params)}`)
  return parseResponse<PaginatedQuestions>(response, 'Unable to load questions.')
}

export async function getQuestion(id: string): Promise<Question> {
  const response = await apiFetch(`${QUESTIONS_PATH}${id}/`)
  return parseResponse<Question>(response, 'Unable to load question.')
}

export async function createQuestion(
  payload: QuestionWritePayload,
): Promise<Question> {
  return postJson<Question>(
    QUESTIONS_PATH,
    serializeQuestionPayload(payload),
    'Unable to create question.',
  )
}

export async function updateQuestion(
  id: string,
  payload: Partial<QuestionWritePayload>,
): Promise<Question> {
  const response = await apiFetch(`${QUESTIONS_PATH}${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(serializeQuestionPayload(payload)),
  })

  return parseResponse<Question>(response, 'Unable to update question.')
}

export async function deleteQuestion(id: string): Promise<void> {
  const response = await apiFetch(`${QUESTIONS_PATH}${id}/`, {
    method: 'DELETE',
  })

  await parseResponse<void>(response, 'Unable to delete question.')
}

export async function uploadQuestionImage(
  id: string,
  file: File,
): Promise<Question> {
  const formData = new FormData()
  formData.append('image', file)

  const response = await apiFetch(`${QUESTIONS_PATH}${id}/upload-image/`, {
    method: 'POST',
    body: formData,
  })

  return parseResponse<Question>(response, 'Unable to upload question image.')
}

export async function checkExaminerAccess(): Promise<boolean> {
  try {
    const response = await apiFetch(QUESTIONS_PATH, {
      method: 'POST',
      body: JSON.stringify({}),
    })

    if (response.status === 403) {
      return false
    }

    // Authorized writers receive validation errors for empty payloads.
    if (response.status === 400) {
      return true
    }

    if (response.ok) {
      return true
    }

    await parseResponse(response, 'Unable to verify examiner access.')
    return false
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) {
      return false
    }
    throw error
  }
}

function serializeQuestionPayload(
  payload: Partial<QuestionWritePayload>,
): Record<string, unknown> {
  const body: Record<string, unknown> = {}

  if (payload.subject !== undefined) body.subject = payload.subject
  if (payload.topic !== undefined) body.topic = payload.topic
  if (payload.difficulty !== undefined) body.difficulty = payload.difficulty
  if (payload.type !== undefined) body.type = payload.type
  if (payload.text !== undefined) body.text = payload.text
  if (payload.points !== undefined) body.points = payload.points
  if (payload.metadata !== undefined) body.metadata = payload.metadata

  if (payload.options !== undefined) {
    body.options = payload.options.map((option, index) => ({
      label: option.label,
      value: option.value,
      is_correct: option.is_correct,
      order: option.order ?? index,
    }))
  }

  if (payload.blank_answer_keys !== undefined) {
    body.blank_answer_keys = payload.blank_answer_keys.map((key) => ({
      answer: key.answer,
      case_sensitive: key.case_sensitive,
    }))
  }

  return body
}

export { ApiError }
