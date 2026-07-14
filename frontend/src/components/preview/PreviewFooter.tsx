import { Button } from '@components/atoms/Button'

interface PreviewFooterProps {
  canFinish: boolean
  isFinishing: boolean
  isValidating: boolean
  onFinish: () => void
  onValidate: () => void
}

export function PreviewFooter({
  canFinish,
  isFinishing,
  isValidating,
  onFinish,
  onValidate,
}: PreviewFooterProps) {
  return (
    <footer className="attempt-runner__footer">
      <p className="attempt-runner__footer-note">
        Validate answers to check scoring, then finish preview to see the full breakdown.
        No results are saved.
      </p>
      <div className="attempt-runner__nav-actions">
        <Button
          type="button"
          variant="secondary"
          onClick={onValidate}
          disabled={!canFinish}
          isLoading={isValidating}
          aria-label="Validate current answer"
        >
          Validate answer
        </Button>
        <Button
          type="button"
          variant="primary"
          onClick={onFinish}
          disabled={!canFinish}
          isLoading={isFinishing}
          aria-label="Finish preview session"
        >
          Finish preview
        </Button>
      </div>
    </footer>
  )
}
