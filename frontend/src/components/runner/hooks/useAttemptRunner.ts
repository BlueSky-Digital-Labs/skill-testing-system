import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError } from '@/api/client'
import { getQuestion } from '@/api/questionBank'
import {
  DEFAULT_INTEGRITY_SETTINGS,
  resumeAttempt,
  submitAttempt,
  type AttemptSession,
  type IntegritySettings,
} from '@/api/attempts'
import { toRunnerQuestionViewModel, type RunnerQuestionViewModel } from '../RunnerQuestion'
import { useAttemptTimer } from './useAttemptTimer'
import { useAutosave } from './useAutosave'
import { TIMER_RESYNC_INTERVAL_MS, readDraftStorage } from '../utils'

interface UseAttemptRunnerOptions {
  attemptId: string
  testTitle?: string
  integrity?: IntegritySettings
}

export function useAttemptRunner({
  attemptId,
  testTitle,
  integrity = DEFAULT_INTEGRITY_SETTINGS,
}: UseAttemptRunnerOptions) {
  const navigate = useNavigate()
  const [session, setSession] = useState<AttemptSession | null>(null)
  const [questions, setQuestions] = useState<RunnerQuestionViewModel[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [draftAnswers, setDraftAnswers] = useState<Record<string, Record<string, unknown>>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [blockingState, setBlockingState] = useState<'expired' | 'submitted' | null>(null)

  const handleSessionUpdate = useCallback((nextSession: AttemptSession) => {
    setSession(nextSession)
  }, [])

  const { saveStatus, saveError, queueSave, flushSave } = useAutosave({
    attemptId,
    onSessionUpdate: handleSessionUpdate,
  })

  const loadQuestions = useCallback(async (nextSession: AttemptSession) => {
    const loaded = await Promise.all(
      nextSession.question_id_order.map(async (questionId) => {
        const question = await getQuestion(questionId)
        return toRunnerQuestionViewModel(question)
      }),
    )
    setQuestions(loaded)
  }, [])

  const hydrateSession = useCallback(
    async (loader: () => Promise<AttemptSession>) => {
      setIsLoading(true)
      setError(null)

      try {
        const nextSession = await loader()
        setSession(nextSession)

        const serverAnswers = Object.fromEntries(
          Object.entries(nextSession.answers).map(([questionId, answer]) => [
            questionId,
            answer.response,
          ]),
        )
        const localDrafts = readDraftStorage(attemptId)
        setDraftAnswers({ ...serverAnswers, ...localDrafts })

        await loadQuestions(nextSession)

        if (
          nextSession.status === 'submitted' ||
          nextSession.status === 'auto_submitted'
        ) {
          setBlockingState('submitted')
        } else if (nextSession.remaining_time_seconds <= 0) {
          setBlockingState('expired')
        } else {
          setBlockingState(null)
        }
      } catch (loadError) {
        if (loadError instanceof ApiError) {
          if (loadError.status === 410) {
            setBlockingState('expired')
            setError('This attempt has expired.')
            return
          }
          if (loadError.status === 409) {
            setBlockingState('submitted')
            setError('This attempt has already been submitted.')
            return
          }
        }

        const message =
          loadError instanceof Error ? loadError.message : 'Unable to load attempt.'
        setError(message)
      } finally {
        setIsLoading(false)
      }
    },
    [attemptId, loadQuestions],
  )

  useEffect(() => {
    void hydrateSession(() => resumeAttempt(attemptId))
  }, [attemptId, hydrateSession])

  const handleExpire = useCallback(async () => {
    setBlockingState('expired')
    setError('Time is up. Submitting your attempt…')
    try {
      const submitted = await submitAttempt(attemptId)
      setSession(submitted)
      navigate(`/attempts/${attemptId}/complete`)
    } catch {
      setError('Time has expired. You can no longer change answers.')
    }
  }, [attemptId, navigate])

  const { displaySeconds } = useAttemptTimer({
    remainingSeconds: session?.remaining_time_seconds ?? null,
    onExpire: () => {
      void handleExpire()
    },
  })

  useEffect(() => {
    if (!session || blockingState != null) {
      return
    }

    const intervalId = window.setInterval(() => {
      void hydrateSession(() => resumeAttempt(attemptId))
    }, TIMER_RESYNC_INTERVAL_MS)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [attemptId, blockingState, hydrateSession, session])

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
      if (!currentQuestion || !currentQuestionId) {
        return
      }

      const nextDrafts = {
        ...draftAnswers,
        [currentQuestionId]: response,
      }
      setDraftAnswers(nextDrafts)

      const version =
        session?.answers[currentQuestionId]?.question_version ?? currentQuestion.version

      queueSave(currentQuestionId, response, version, nextDrafts)
    },
    [
      currentQuestion,
      currentQuestionId,
      draftAnswers,
      queueSave,
      session?.answers,
    ],
  )

  const goToQuestion = useCallback((index: number) => {
    setCurrentIndex(index)
  }, [])

  const goPrevious = useCallback(() => {
    setCurrentIndex((index) => Math.max(0, index - 1))
  }, [])

  const goNext = useCallback(() => {
    setCurrentIndex((index) =>
      Math.min(orderedQuestionIds.length - 1, index + 1),
    )
  }, [orderedQuestionIds.length])

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      await flushSave()
      const submitted = await submitAttempt(attemptId)
      setSession(submitted)
      navigate(`/attempts/${attemptId}/complete`)
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : 'Unable to submit attempt.'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }, [attemptId, flushSave, navigate])

  return {
    session,
    questions,
    currentIndex,
    currentQuestion,
    currentQuestionId,
    draftAnswers,
    answeredQuestionIds,
    integrity,
    isLoading,
    isSubmitting,
    error,
    blockingState,
    saveStatus,
    saveError,
    displaySeconds,
    testTitle: testTitle ?? (session ? `Test ${session.test_id.slice(0, 8)}` : 'Test'),
    handleAnswerChange,
    goToQuestion,
    goPrevious,
    goNext,
    handleSubmit,
  }
}
