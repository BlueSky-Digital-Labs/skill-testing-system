import { Button } from '@components/atoms/Button'
import '../tests/tests.css'

interface PreviewLauncherProps {
  testId?: string
  disabled?: boolean
  onPreview?: () => void
}

export function PreviewLauncher({
  testId,
  disabled = false,
  onPreview,
}: PreviewLauncherProps) {
  return (
    <section className="test-builder-panel" aria-labelledby="preview-launcher-heading">
      <h2 id="preview-launcher-heading" className="test-builder-panel__title">
        Preview
      </h2>
      <p className="test-builder-preview-note">
        Open a read-only preview of the assembled test before publishing.
      </p>
      <Button
        type="button"
        variant="outline"
        disabled={disabled || !testId}
        onClick={onPreview}
      >
        Launch preview
      </Button>
    </section>
  )
}
