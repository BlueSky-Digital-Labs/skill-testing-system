import { formatRemainingTime } from '@/components/runner/utils'

interface PreviewHeaderProps {
  testTitle: string
  remainingSeconds: number
  validationMessage?: string | null
  validationState?: 'idle' | 'success' | 'error'
}

export function PreviewHeader({
  testTitle,
  remainingSeconds,
  validationMessage,
  validationState = 'idle',
}: PreviewHeaderProps) {
  const isLowTime = remainingSeconds > 0 && remainingSeconds <= 300

  return (
    <header className="attempt-runner__header">
      <div>
        <p className="attempt-runner__eyebrow">
          <span className="attempt-runner__preview-badge">Preview mode</span>
        </p>
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
        {validationMessage && (
          <p
            className={`attempt-runner__validation-status attempt-runner__validation-status--${validationState}`}
            aria-live="polite"
            role="status"
          >
            {validationMessage}
          </p>
        )}
      </div>
    </header>
  )
}
