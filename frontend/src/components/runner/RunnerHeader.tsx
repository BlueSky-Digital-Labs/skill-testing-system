import { formatRemainingTime } from './utils'

interface RunnerHeaderProps {
  testTitle: string
  remainingSeconds: number
  saveStatus: 'idle' | 'pending' | 'saving' | 'saved' | 'error'
  saveError?: string | null
}

function saveStatusLabel(
  status: RunnerHeaderProps['saveStatus'],
  saveError?: string | null,
): string {
  switch (status) {
    case 'pending':
      return 'Unsaved changes'
    case 'saving':
      return 'Saving…'
    case 'saved':
      return 'All changes saved'
    case 'error':
      return saveError ?? 'Save failed'
    default:
      return 'Ready'
  }
}

export function RunnerHeader({
  testTitle,
  remainingSeconds,
  saveStatus,
  saveError,
}: RunnerHeaderProps) {
  const isLowTime = remainingSeconds > 0 && remainingSeconds <= 300

  return (
    <header className="attempt-runner__header">
      <div>
        <p className="attempt-runner__eyebrow">Candidate test</p>
        <h1 className="attempt-runner__title">{testTitle}</h1>
      </div>
      <div className="attempt-runner__header-meta">
        <div
          className={`attempt-runner__timer${isLowTime ? ' attempt-runner__timer--warning' : ''}`}
          aria-live="polite"
          aria-label={`Time remaining ${formatRemainingTime(remainingSeconds)}`}
        >
          <span className="attempt-runner__timer-label">Time left</span>
          <span className="attempt-runner__timer-value">
            {formatRemainingTime(remainingSeconds)}
          </span>
        </div>
        <p
          className={`attempt-runner__save-status attempt-runner__save-status--${saveStatus}`}
          aria-live="polite"
        >
          {saveStatusLabel(saveStatus, saveError)}
        </p>
      </div>
    </header>
  )
}
