import { FormEvent, useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { DashboardLayout } from '@components/templates/DashboardLayout'
import { Button } from '@components/atoms/Button'
import { useToast } from '@components/Toast'
import { ApiError } from '@/api/auth'
import {
  getReleaseStatus,
  postRelease,
  type DisclosureLevel,
  type ReleaseStatus,
} from '@/api/results'
import './results.css'

const DISCLOSURE_OPTIONS: { value: DisclosureLevel; label: string; description: string }[] = [
  {
    value: 'none',
    label: 'None',
    description: 'Withhold all score details from the candidate.',
  },
  {
    value: 'summary',
    label: 'Summary',
    description: 'Show pass/fail and aggregate scores only.',
  },
  {
    value: 'detailed',
    label: 'Detailed',
    description: 'Include per-question correctness flags.',
  },
]

export function ReleaseControl() {
  const { attemptId } = useParams<{ attemptId: string }>()
  const { showToast } = useToast()

  const [releaseStatus, setReleaseStatus] = useState<ReleaseStatus | null>(null)
  const [disclosure, setDisclosure] = useState<DisclosureLevel>('summary')
  const [released, setReleased] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadReleaseStatus = useCallback(async () => {
    if (!attemptId) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const status = await getReleaseStatus(attemptId)
      setReleaseStatus(status)
      setDisclosure(status.disclosure)
      setReleased(status.released)
    } catch (loadError) {
      const message =
        loadError instanceof ApiError
          ? loadError.message
          : 'Unable to load release status.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [attemptId])

  useEffect(() => {
    void loadReleaseStatus()
  }, [loadReleaseStatus])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!attemptId) {
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const updated = await postRelease({
        attempt_id: attemptId,
        released,
        disclosure,
        test_id: releaseStatus?.test_id,
        candidate_user_id: releaseStatus?.candidate_user_id,
      })
      setReleaseStatus(updated)
      setDisclosure(updated.disclosure)
      setReleased(updated.released)
      showToast('Release settings saved.', 'success')
    } catch (submitError) {
      const message =
        submitError instanceof ApiError
          ? submitError.message
          : 'Unable to save release settings.'
      setError(message)
      showToast(message, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!attemptId) {
    return (
      <DashboardLayout>
        <div className="results-page">
          <p className="results-error">Attempt ID is required.</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="results-page">
        <header className="results-page__header">
          <h1>Release Results</h1>
          <p>Configure disclosure and release status for attempt {attemptId}.</p>
        </header>

        {isLoading && <p>Loading release status...</p>}

        {!isLoading && error && !releaseStatus && (
          <p className="results-error" role="alert">
            {error}
          </p>
        )}

        {!isLoading && (
          <form className="results-panel results-form" onSubmit={handleSubmit}>
            <h2 className="results-panel__title">Disclosure Settings</h2>

            <input
              type="hidden"
              name="test_id"
              value={releaseStatus?.test_id ?? ''}
              readOnly
            />
            <input
              type="hidden"
              name="candidate_user_id"
              value={releaseStatus?.candidate_user_id ?? ''}
              readOnly
            />

            <fieldset className="results-form__field">
              <legend className="results-form__label">Disclosure level</legend>
              <div className="results-form__options">
                {DISCLOSURE_OPTIONS.map((option) => (
                  <label key={option.value} className="results-form__option">
                    <input
                      type="radio"
                      name="disclosure"
                      value={option.value}
                      checked={disclosure === option.value}
                      onChange={() => setDisclosure(option.value)}
                    />
                    <span>
                      <strong>{option.label}</strong> — {option.description}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="results-form__field">
              <span className="results-form__label">Release to candidate</span>
              <label className="results-toggle">
                <input
                  type="checkbox"
                  checked={released}
                  onChange={(event) => setReleased(event.target.checked)}
                />
                <span>{released ? 'Released' : 'Not released'}</span>
              </label>
            </div>

            {releaseStatus && (
              <p>
                Current status:{' '}
                <span
                  className={`results-status-badge ${
                    releaseStatus.released
                      ? 'results-status-badge--released'
                      : 'results-status-badge--unreleased'
                  }`}
                >
                  {releaseStatus.released ? 'Released' : 'Unreleased'}
                </span>
              </p>
            )}

            {error && releaseStatus && (
              <p className="results-error" role="alert">
                {error}
              </p>
            )}

            <div className="results-form__actions">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save release settings'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => void loadReleaseStatus()}>
                Refresh
              </Button>
            </div>
          </form>
        )}
      </div>
    </DashboardLayout>
  )
}
