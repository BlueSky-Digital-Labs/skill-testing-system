import { describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useAttemptTimer } from '../hooks/useAttemptTimer'

describe('useAttemptTimer', () => {
  it('counts down remaining seconds', () => {
    vi.useFakeTimers()

    const { result } = renderHook(() =>
      useAttemptTimer({ remainingSeconds: 3 }),
    )

    expect(result.current.displaySeconds).toBe(3)

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current.displaySeconds).toBe(2)

    vi.useRealTimers()
  })

  it('invokes onExpire when timer reaches zero', () => {
    vi.useFakeTimers()
    const onExpire = vi.fn()

    const { rerender } = renderHook(
      ({ remainingSeconds }) =>
        useAttemptTimer({ remainingSeconds, onExpire }),
      { initialProps: { remainingSeconds: 1 as number | null } },
    )

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    rerender({ remainingSeconds: 0 })
    act(() => {
      vi.advanceTimersByTime(0)
    })

    expect(onExpire).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })
})
