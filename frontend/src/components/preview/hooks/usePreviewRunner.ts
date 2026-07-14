import { useCallback, useEffect, useMemo, useState } from 'react'
import { ApiError } from '@/api/client'
import { getQuestion } from '@/api/questionBank'
import type { Question } from '@/types/questionBank'
import {
  DEFAULT_PREVIEW_INTEGRITY,
  finishPreview,
  sendPreviewAnswer,
  startPreview,
  type PreviewFinishResult,
  type PreviewIntegritySettings,
  type PreviewSession,
} from '@/api/tests'
import { useAttemptTimer } from '@/components/runner/hooks/useAttemptTimer'
import { toRunnerQuestionViewModel } from '@/components/runner/RunnerQuestion'
import type { PreviewQuestionViewModel } from '../PreviewQuestion'

type PreviewLoadState = 'loading' | 'ready' | 'forbidden' | 'not_found' | 'unavailable' | 'error'

interface UsePreviewRunnerOptions {
  testId: string
  testTitle?: string
  integrity?: PreviewIntegritySettings
  seed?: number
}

function toPreviewQuestionViewModel(question: Question): PreviewQuestionViewModel {
  const viewModel = toRunnerQuestionViewModel(question)
  return {
    id: viewModel.id,
    type: viewModel.type,
    text: viewModel.text,
    points: viewModel.points,
    options: viewModel.options,
  }
}

export function usePreviewRunner({
  testId,
  testTitle,
  integrity = DEFAULT_PREVIEW_INTEGRITY,
  seed,
}: UsePreviewRunnerOptions) {
  const [session, setSession] = useState<PreviewSession | null>(null)
  const [questions, setQuestions] = useState<PreviewQuestionViewModel[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [draftAnswers, setDraftAnswers] = useState<Record<string, Record<string, unknown>>>({})
  const [validatedQuestionIds, setValidatedQuestionIds] = useState<Set<string>>(new Set())
  const [loadState, setLoadState] = useState<PreviewLoadState>('loading')
  const [error, setError] = useState<string | null>(null)
  const [validationMessage, setValidationMessage] = useState<string | null>(null)
  const [validationState, setValidationState] = useState<'idle' | 'success' | 'error'>('idle')
  const [isValidating, setIsValidating] = useState(false)
  const [isFinishing, setIsFinishing] = useState(false)
  const [finishResult, setFinishResult] = useState<PreviewFinishResult | null>(null)
  const [isFinished, setIsFinished] = useState(false)

  const loadQuestions = useCallback(async (nextSession: PreviewSession) => {
    const loaded = await Promise.all(
      nextSession.question_id_order.map(async (questionId) => {
        const question = await getQuestion(questionId)
        return toPreviewQuestionViewModel(question)
      }),
    )
    setQuestions(loaded)
  }, [])

  const initializePreview = useCallback(async () => {
    setLoadState('loading')
    setError(null)
    setFinishResult(null)
    setIsFinished(false)

    try {
      const nextSession = await startPreview(testId, seed)
      setSession(nextSession)
      setDraftAnswers({})
      setValidatedQuestionIds(new Set())
      await loadQuestions(nextSession)
      setLoadState('ready')
    } catch (loadError) {
      if (loadError instanceof ApiError) {
        if (loadError.status === 403) {
          setLoadState('forbidden')
          setError('You do not have permission to preview this test.')
          return
        }
        if (loadError.status === 404) {
          setLoadState('not_found')
          setError('This test could not be found or has no previewable questions.')
          return
        }
      }

      setLoadState('unavailable')
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Preview is not available. The preview API may not be enabled yet.',
      )
    }
  }, [loadQuestions, seed, testId])

  useEffect(() => {
    void initializePreview()
  }, [initializePreview])

  const handleFinish = useCallback(async () => {
    setIsFinishing(true)
    setError(null)

    try {
      const result = await finishPreview(testId)
      setFinishResult(result)
      setIsFinished(true)
    } catch (finishError) {
      const message =
        finishError instanceof Error
          ? finishError.message
          : 'Unable to finish preview session.'
      setError(message)
    } finally {
      setIsFinishing(false)
    }
  }, [testId])

  const { displaySeconds } = useAttemptTimer({
    remainingSeconds: isFinished ? 0 : (session?.remaining_seconds ?? null),
    onExpire: () => {
      if (!isFinished) {
        void handleFinish()
      }
    },
  })

  const orderedQuestionIds = session?.question_id_order ?? []
  const currentQuestion = questions[currentIndex] ?? null
  const currentQuestionId = orderedQuestionIds[currentIndex] ?? null

  const answeredQuestionIds = useMemo(() => {
    const answered = new Set<string>()
    for (const [questionId, response] of Object.entries(draftAnswers)) {
      if (Object.keys(response).length > 0) {
        answered.add(questionId)
      }
    }
    return answered
  }, [draftAnswers])

  const handleAnswerChange = useCallback(
    (response: Record<string, unknown>) => {
      if (!currentQuestionId || isFinished) {
        return
      }

      setDraftAnswers((current) => ({
        ...current,
        [currentQuestionId]: response,
      }))
      setValidationState('idle')
      setValidationMessage(null)
    },
    [currentQuestionId, isFinished],
  )

  const handleValidateAnswer = useCallback(async () => {
    if (!currentQuestionId || !currentQuestion || isFinished) {
      return
    }

    const answer = draftAnswers[currentQuestionId]
    if (!answer || Object.keys(answer).length === 0) {
      setValidationState('error')
      setValidationMessage('Enter an answer before validating.')
      return
    }

    setIsValidating(true)
    setValidationMessage(null)

    try {
      const result = await sendPreviewAnswer(testId, {
        question_id: currentQuestionId,
        answer,
      })

      if (result.validation.valid) {
        setValidationState('success')
        setValidationMessage(
          `Validated: ${result.partial_score.awarded_points} / ${result.partial_score.max_points} points`,
        )
        setValidatedQuestionIds((current) => new Set(current).add(currentQuestionId))
      } else {
        setValidationState('error')
        setValidationMessage(result.validation.errors.join(' '))
      }
    } catch (validateError) {
      setValidationState('error')
      setValidationMessage(
        validateError instanceof Error
          ? validateError.message
          : 'Unable to validate answer.',
      )
    } finally {
      setIsValidating(false)
    }
  }, [currentQuestion, currentQuestionId, draftAnswers, isFinished, testId])

  const goToQuestion = useCallback(
    (index: number) => {
      if (isFinished) {
        return
      }
      setCurrentIndex(index)
      setValidationState('idle')
      setValidationMessage(null)
    },
    [isFinished],
  )

  const goPrevious = useCallback(() => {
    if (isFinished) {
      return
    }
    setCurrentIndex((index) => Math.max(0, index - 1))
    setValidationState('idle')
    setValidationMessage(null)
  }, [isFinished])

  const goNext = useCallback(() => {
    if (isFinished) {
      return
    }
    setCurrentIndex((index) => Math.min(orderedQuestionIds.length - 1, index + 1))
    setValidationState('idle')
    setValidationMessage(null)
  }, [isFinished, orderedQuestionIds.length])

  const handleKeyboardNavigation = useCallback(
    (event: KeyboardEvent) => {
      if (!integrity.question_per_page || isFinished) {
        return
      }

      const target = event.target
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        return
      }

      if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'n') {
        event.preventDefault()
        goNext()
      }

      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'p') {
        event.preventDefault()
        goPrevious()
      }
    },
    [goNext, goPrevious, integrity.question_per_page, isFinished],
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyboardNavigation)
    return () => {
      window.removeEventListener('keydown', handleKeyboardNavigation)
    }
  }, [handleKeyboardNavigation])

  return {
    session,
    questions,
    currentIndex,
    currentQuestion,
    currentQuestionId,
    draftAnswers,
    answeredQuestionIds,
    validatedQuestionIds,
    integrity,
    loadState,
    isFinished,
    finishResult,
    isValidating,
    isFinishing,
    error,
    validationMessage,
    validationState,
    displaySeconds,
    testTitle: testTitle ?? (testId ? `Test ${testId.slice(0, 8)}` : 'Test preview'),
    handleAnswerChange,
    handleValidateAnswer,
    handleFinish,
    goToQuestion,
    goPrevious,
    goNext,
  }
}
