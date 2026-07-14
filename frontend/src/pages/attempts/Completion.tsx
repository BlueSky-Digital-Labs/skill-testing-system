import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { DashboardLayout } from '@components/templates/DashboardLayout'
import { Button } from '@components/atoms/Button'
import { ApiError } from '@/api/client'
import { getAttemptReview, type AttemptReviewResponse } from './api'
import { QuestionReviewList } from './components/QuestionReviewList'
import { ScoreSummary } from './components/ScoreSummary'
import './attempts.css'

// TODO: Wire test runner submission flow to navigate here with the attempt ID
// once the candidate test runner is implemented (e.g. navigate(`/attempts/${attemptId}/complete`)).

function isAttemptUnavailableError(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 400 || error.status === 409)
}

export function AttemptCompletionPage() {
  const { attemptId } = useParams<{ attemptId: string }>()
  const [review, setReview] = useState<AttemptReviewResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isUnavailable, setIsUnavailable] = useState(false)

  const loadReview = useCallback(async () => {
    if (!attemptId) {
      return
    }

    setIsLoading(true)
    setError(null)
    setIsUnavailable(false)

    try {
      const payload = await getAttemptReview(attemptId)
      setReview(payload)
    } catch (loadError) {
      if (isAttemptUnavailableError(loadError)) {
        setIsUnavailable(true)
        setReview(null)
        return
      }

      const message =
        loadError instanceof ApiError
          ? loadError.message
          : 'Unable to load attempt review.'
      setError(message)
      setReview(null)
    } finally {
      setIsLoading(false)
    }
  }, [attemptId])

  useEffect(() => {
    void loadReview()
  }, [loadReview])

  if (!attemptId) {
    return (
      <DashboardLayout>
        <div className="attempt-completion">
          <p className="attempt-completion__error">Attempt ID is required.</p>
        </div>
      </DashboardLayout>
    )
  }

  const disclosure = review?.disclosure ?? 'withhold_until_release'
  const showScores =
    review != null &&
    disclosure !== 'withhold_until_release' &&
    review.summary != null
  const showQuestions =
    review != null &&
    disclosure !== 'withhold_until_release' &&
    (review.items?.length ?? 0) > 0

  return (
    <DashboardLayout>
      <div className="attempt-completion">
        <header className="attempt-completion__header">
          <h1>Test Complete</h1>
          <p>Attempt {attemptId}</p>
        </header>

        <div className="attempt-completion__actions">
          <Button type="button" variant="secondary" onClick={() => void loadReview()}>
            Refresh
          </Button>
        </div>

        {isLoading && <p>Loading attempt review...</p>}

        {!isLoading && isUnavailable && (
          <section className="attempt-completion__panel">
            <h2 className="attempt-completion__panel-title">Not Available Yet</h2>
            <p className="attempt-completion__message">
              This attempt is not ready for review yet. Please return to the test and
              complete your submission.
            </p>
          </section>
        )}

        {!isLoading && error && (
          <p className="attempt-completion__error" role="alert">
            {error}
          </p>
        )}

        {!isLoading && review?.disclosure === 'withhold_until_release' && (
          <section className="attempt-completion__panel">
            <h2 className="attempt-completion__panel-title">Results Pending</h2>
            <p className="attempt-completion__message">
              Results will be available once released.
            </p>
          </section>
        )}

        {!isLoading && showScores && review.summary && (
          <ScoreSummary summary={review.summary} testId={review.test_id} />
        )}

        {!isLoading && showQuestions && review.items && (
          <QuestionReviewList items={review.items} disclosure={disclosure} />
        )}
      </div>
    </DashboardLayout>
  )
}
