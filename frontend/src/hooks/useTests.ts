import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  archiveTest,
  createTest,
  getQuestions,
  getTest,
  getTests,
  publishTest,
  updateTest,
} from '@/api/tests'
import type { ListTestsParams, TestWritePayload } from '@/types/tests'
import type { TestQuestionsParams } from '@/api/tests'

export const testQueryKeys = {
  all: ['tests'] as const,
  list: (params: ListTestsParams) => ['tests', 'list', params] as const,
  detail: (id: string) => ['tests', 'detail', id] as const,
  questions: (params: TestQuestionsParams) => ['tests', 'questions', params] as const,
}

export function useTestsQuery(params: ListTestsParams = {}) {
  return useQuery({
    queryKey: testQueryKeys.list(params),
    queryFn: () => getTests(params),
  })
}

export function useTestQuery(id: string | undefined) {
  return useQuery({
    queryKey: testQueryKeys.detail(id ?? ''),
    queryFn: () => getTest(id!),
    enabled: Boolean(id),
  })
}

export function useQuestionsQuery(params: TestQuestionsParams, enabled = true) {
  return useQuery({
    queryKey: testQueryKeys.questions(params),
    queryFn: () => getQuestions(params),
    enabled,
  })
}

export function useCreateTestMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: TestWritePayload) => createTest(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: testQueryKeys.all })
    },
  })
}

export function useUpdateTestMutation(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: Partial<TestWritePayload>) => updateTest(id, payload),
    onSuccess: (test) => {
      queryClient.setQueryData(testQueryKeys.detail(id), test)
      void queryClient.invalidateQueries({ queryKey: testQueryKeys.all })
    },
  })
}

export function usePublishTestMutation(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => publishTest(id),
    onSuccess: (test) => {
      queryClient.setQueryData(testQueryKeys.detail(id), test)
      void queryClient.invalidateQueries({ queryKey: testQueryKeys.all })
    },
  })
}

export function useArchiveTestMutation(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => archiveTest(id),
    onSuccess: (test) => {
      queryClient.setQueryData(testQueryKeys.detail(id), test)
      void queryClient.invalidateQueries({ queryKey: testQueryKeys.all })
    },
  })
}
