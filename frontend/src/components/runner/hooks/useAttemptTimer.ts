import { useEffect, useRef, useState } from 'react'

interface UseAttemptTimerOptions {
  remainingSeconds: number | null
  onExpire?: () => void
}

export function useAttemptTimer({
  remainingSeconds,
  onExpire,
}: UseAttemptTimerOptions) {
  const [displaySeconds, setDisplaySeconds] = useState(0)
  const expiredRef = useRef(false)

  useEffect(() => {
    if (remainingSeconds == null) {
      return
    }

    setDisplaySeconds(remainingSeconds)
    expiredRef.current = false
  }, [remainingSeconds])

  useEffect(() => {
    if (remainingSeconds == null) {
      return
    }

    if (displaySeconds <= 0) {
      if (remainingSeconds > 0) {
        return
      }

      if (!expiredRef.current) {
        expiredRef.current = true
        onExpire?.()
      }
      return
    }

    const timerId = window.setInterval(() => {
      setDisplaySeconds((current) => Math.max(0, current - 1))
    }, 1000)

    return () => {
      window.clearInterval(timerId)
    }
  }, [displaySeconds, onExpire, remainingSeconds])

  return {
    displaySeconds: remainingSeconds == null ? 0 : displaySeconds,
    isExpired:
      remainingSeconds != null && remainingSeconds <= 0 && displaySeconds <= 0,
  }
}
