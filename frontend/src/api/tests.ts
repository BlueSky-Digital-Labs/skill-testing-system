import { apiFetch, parseResponse, postJson } from './client'
import { listQuestions as listQuestionBank } from './questionBank'
import type {
  ListTestsParams,
  Question,
  Test,
  TestWritePayload,
} from '@/types/tests'
import type { ListQuestionsParams } from '@/types/questionBank'

export type TestQuestionsParams = ListQuestionsParams & {
  search?: string
}

const TESTS_PATH = '/tests/'

function buildQuery(params: ListTestsParams = {}): string {
  const searchParams = new URLSearchParams()

  if (params.lifecycle) {
    searchParams.set('lifecycle', params.lifecycle)
  }
  if (params.search) {
    searchParams.set('search', params.search)
  }

  const query = searchParams.toString()
  return query ? `?${query}` : ''
}

export async function getTests(params: ListTestsParams = {}): Promise<Test[]> {
  const response = await apiFetch(`${TESTS_PATH}${buildQuery(params)}`)
  return parseResponse<Test[]>(response, 'Unable to load tests.')
}

export async function getTest(id: string): Promise<Test> {
  const response = await apiFetch(`${TESTS_PATH}${id}/`)
  return parseResponse<Test>(response, 'Unable to load test.')
}

export async function createTest(payload: TestWritePayload): Promise<Test> {
  return postJson<Test>(TESTS_PATH, payload, 'Unable to create test.')
}

export async function updateTest(
  id: string,
  payload: Partial<TestWritePayload>,
): Promise<Test> {
  const response = await apiFetch(`${TESTS_PATH}${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })

  return parseResponse<Test>(response, 'Unable to update test.')
}

export async function publishTest(id: string): Promise<Test> {
  return postJson<Test>(`${TESTS_PATH}${id}/publish/`, {}, 'Unable to publish test.')
}

export async function archiveTest(id: string): Promise<Test> {
  return postJson<Test>(`${TESTS_PATH}${id}/archive/`, {}, 'Unable to archive test.')
}

export async function getQuestions(
  params: TestQuestionsParams = {},
): Promise<Question[]> {
  const response = await listQuestionBank({
    page: params.page,
    subject: params.subject,
    topic: params.topic,
    difficulty: params.difficulty,
    type: params.type,
  })

  if (!params.search) {
    return response.results
  }

  const normalized = params.search.toLowerCase()
  return response.results.filter(
    (question) =>
      question.text.toLowerCase().includes(normalized) ||
      question.subject.toLowerCase().includes(normalized) ||
      question.topic.toLowerCase().includes(normalized),
  )
}
