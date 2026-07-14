export const AUTOSAVE_DEBOUNCE_MS = 1500
export const TIMER_RESYNC_INTERVAL_MS = 45_000
export const MAX_SAVE_RETRIES = 3

export function draftStorageKey(attemptId: string): string {
  return `attempt-runner:${attemptId}:draft`
}

export function clearDraftStorage(attemptId: string): void {
  localStorage.removeItem(draftStorageKey(attemptId))
}

export function readDraftStorage(
  attemptId: string,
): Record<string, Record<string, unknown>> {
  try {
    const raw = localStorage.getItem(draftStorageKey(attemptId))
    if (!raw) {
      return {}
    }
    const parsed = JSON.parse(raw) as Record<string, Record<string, unknown>>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function writeDraftStorage(
  attemptId: string,
  answers: Record<string, Record<string, unknown>>,
): void {
  localStorage.setItem(draftStorageKey(attemptId), JSON.stringify(answers))
}

export function formatRemainingTime(totalSeconds: number): string {
  const seconds = Math.max(0, totalSeconds)
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainder = seconds % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
  }

  return `${minutes}:${String(remainder).padStart(2, '0')}`
}

export async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}
