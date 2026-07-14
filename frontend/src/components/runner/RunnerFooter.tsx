import { Button } from '@components/atoms/Button'

interface RunnerFooterProps {
  canSubmit: boolean
  isSubmitting: boolean
  onSubmit: () => void
}

export function RunnerFooter({
  canSubmit,
  isSubmitting,
  onSubmit,
}: RunnerFooterProps) {
  return (
    <footer className="attempt-runner__footer">
      <p className="attempt-runner__footer-note">
        Submit when you are finished. Unsaved answers are autosaved while you work.
      </p>
      <Button
        type="button"
        variant="primary"
        onClick={onSubmit}
        disabled={!canSubmit}
        isLoading={isSubmitting}
        aria-label="Submit attempt"
      >
        Submit test
      </Button>
    </footer>
  )
}
