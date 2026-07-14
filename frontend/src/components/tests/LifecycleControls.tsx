import { Button } from '@components/atoms/Button'
import type { TestLifecycle } from '@/types/tests'
import { lifecycleLabel } from '@/utils/testBuilder'
import '../tests/tests.css'

interface LifecycleControlsProps {
  lifecycle: TestLifecycle
  isSaving?: boolean
  isPublishing?: boolean
  isArchiving?: boolean
  error?: string | null
  validationError?: string | null
  onSave: () => void
  onPublish: () => void
  onArchive: () => void
}

export function LifecycleControls({
  lifecycle,
  isSaving = false,
  isPublishing = false,
  isArchiving = false,
  error = null,
  validationError = null,
  onSave,
  onPublish,
  onArchive,
}: LifecycleControlsProps) {
  const isDraft = lifecycle === 'draft'
  const isPublished = lifecycle === 'published'

  return (
    <section className="test-builder-panel" aria-labelledby="lifecycle-controls-heading">
      <div className="test-builder-lifecycle">
        <h2 id="lifecycle-controls-heading" className="test-builder-panel__title">
          Lifecycle
        </h2>
        <span
          className={`test-builder-status-badge test-builder-status-badge--${lifecycle}`}
        >
          {lifecycleLabel(lifecycle)}
        </span>
      </div>

      {validationError ? (
        <p className="test-builder-alert" role="alert">
          {validationError}
        </p>
      ) : null}

      {error ? (
        <p className="test-builder-alert" role="alert">
          {error}
        </p>
      ) : null}

      <div className="test-builder-lifecycle">
        {isDraft ? (
          <>
            <Button
              type="button"
              variant="secondary"
              isLoading={isSaving}
              onClick={onSave}
            >
              Save draft
            </Button>
            <Button
              type="button"
              isLoading={isPublishing}
              onClick={onPublish}
            >
              Publish test
            </Button>
          </>
        ) : null}

        {isPublished ? (
          <Button
            type="button"
            variant="secondary"
            isLoading={isArchiving}
            onClick={onArchive}
          >
            Archive test
          </Button>
        ) : null}
      </div>

      {!isDraft ? (
        <p className="test-builder-preview-note">
          Published and archived tests are read-only in the builder.
        </p>
      ) : null}
    </section>
  )
}
