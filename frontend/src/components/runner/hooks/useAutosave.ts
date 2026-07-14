import { useCallback, useEffect, useRef, useState } from 'react'
import { saveAnswer, type AttemptSession } from '@/api/attempts'
import {
  AUTOSAVE_DEBOUNCE_MS,
  MAX_SAVE_RETRIES,
  clearDraftStorage,
  sleep,
  writeDraftStorage,
} from '../utils'

export type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error'

interface UseAutosaveOptions {
  attemptId: string
  onSessionUpdate: (session: AttemptSession) => void
}

export function useAutosave({ attemptId, onSessionUpdate }: UseAutosaveOptions) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  const pendingRef = useRef<{
    questionId: string
    response: Record<string, unknown>
    version: number
  } | null>(null)
  const debounceRef = useRef<number | null>(null)
  const inFlightRef = useRef(false)

  const flushSave = useCallback(async () => {
    const pending = pendingRef.current
    if (!pending || inFlightRef.current) {
      return
    }

    inFlightRef.current = true
    setSaveStatus('saving')
    setSaveError(null)

    let attempt = 0
    while (attempt < MAX_SAVE_RETRIES) {
      try {
        const session = await saveAnswer(
          attemptId,
          pending.questionId,
          pending.response,
          pending.version,
        )
        onSessionUpdate(session)
        pendingRef.current = null
        clearDraftStorage(attemptId)
        setSaveStatus('saved')
        inFlightRef.current = false
        return
      } catch (error) {
        attempt += 1
        if (attempt >= MAX_SAVE_RETRIES) {
          const message =
            error instanceof Error ? error.message : 'Unable to save answer.'
          setSaveError(message)
          setSaveStatus('error')
          inFlightRef.current = false
          return
        }
        await sleep(2 ** attempt * 250)
      }
    }
  }, [attemptId, onSessionUpdate])

  const queueSave = useCallback(
    (
      questionId: string,
      response: Record<string, unknown>,
      version: number,
      drafts: Record<string, Record<string, unknown>>,
    ) => {
      pendingRef.current = { questionId, response, version }
      writeDraftStorage(attemptId, drafts)
      setSaveStatus('pending')
      setSaveError(null)

      if (debounceRef.current != null) {
        window.clearTimeout(debounceRef.current)
      }

      debounceRef.current = window.setTimeout(() => {
        void flushSave()
      }, AUTOSAVE_DEBOUNCE_MS)
    },
    [attemptId, flushSave],
  )

  useEffect(() => {
    return () => {
      if (debounceRef.current != null) {
        window.clearTimeout(debounceRef.current)
      }
    }
  }, [])

  return {
    saveStatus,
    saveError,
    queueSave,
    flushSave,
  }
}
