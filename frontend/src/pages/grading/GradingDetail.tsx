import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { DashboardLayout } from '@components/templates/DashboardLayout'
import { GradeForm } from '@components/grading/GradeForm'
import { ResultSummary } from '@components/grading/ResultSummary'
import { ApiError } from '@/api/auth'
import {
  aggregateAttempt,
  displayCandidateName,
  findQueueItem,
  getCombinedResult,
  submitManualGrade,
  type CombinedResult,
  type QueueItem,
} from '@/api/grading'
import './GradingPages.css'

interface GradingLocationState {
  queueItem?: QueueItem
}

export const GradingDetail = () => {
  const { queueItemId } = useParams<{ queueItemId: string }>()
  const location = useLocation()
  const locationState = location.state as GradingLocationState | null

  const [queueItem, setQueueItem] = useState<QueueItem | null>(
    locationState?.queueItem ?? null,
  )
  const [combinedResult, setCombinedResult] = useState<CombinedResult | null>(null)
  const [isLoading, setIsLoading] = useState(!locationState?.queueItem)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResultLoading, setIsResultLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!queueItemId) {
      return
    }

    let isMounted = true

    const loadQueueItem = async () => {
      if (locationState?.queueItem) {
        setQueueItem(locationState.queueItem)
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const item = await findQueueItem(queueItemId)
        if (!isMounted) {
          return
        }

        if (!item) {
          setError('Queue item not found.')
          setQueueItem(null)
          return
        }

        setQueueItem(item)
      } catch (loadError) {
        if (!isMounted) {
          return
        }

        const message =
          loadError instanceof ApiError
            ? loadError.message
            : 'Unable to load queue item.'
        setError(message)
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadQueueItem()

    return () => {
      isMounted = false
    }
  }, [queueItemId, locationState?.queueItem])

  useEffect(() => {
    if (!queueItem?.attempt_id) {
      return
    }

    let isMounted = true

    const loadCombinedResult = async () => {
      setIsResultLoading(true)

      try {
        const result = await getCombinedResult(queueItem.attempt_id)
        if (isMounted) {
          setCombinedResult(result)
        }
      } catch (loadError) {
        if (loadError instanceof ApiError && loadError.status === 404) {
          if (isMounted) {
            setCombinedResult(null)
          }
          return
        }

        if (isMounted) {
          const message =
            loadError instanceof ApiError
              ? loadError.message
              : 'Unable to load combined result.'
          setError(message)
        }
      } finally {
        if (isMounted) {
          setIsResultLoading(false)
        }
      }
    }

    void loadCombinedResult()

    return () => {
      isMounted = false
    }
  }, [queueItem?.attempt_id])

  const handleSubmitGrade = async ({
    awardedPoints,
    feedback,
  }: {
    awardedPoints: string
    feedback: string
  }) => {
    if (!queueItem) {
      return
    }

    setIsSubmitting(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const gradedItem = await submitManualGrade({
        queue_item_id: queueItem.id,
        awarded_points: awardedPoints,
        feedback: feedback || undefined,
      })

      setQueueItem(gradedItem)

      const aggregated = await aggregateAttempt(
        gradedItem.attempt_id,
        gradedItem.test_id,
      )
      setCombinedResult(aggregated)
      setSuccessMessage('Grade submitted and combined result updated.')
    } catch (submitError) {
      const message =
        submitError instanceof ApiError
          ? submitError.status === 400 || submitError.status === 409
            ? submitError.message || 'This response has already been graded.'
            : submitError.message
          : 'Unable to submit grade.'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="grading-page">Loading grading workspace...</div>
      </DashboardLayout>
    )
  }

  if (!queueItem) {
    return (
      <DashboardLayout>
        <div className="grading-page">
          <div className="grading-alert grading-alert--error" role="alert">
            {error ?? 'Queue item not found.'}
          </div>
          <Link to="/grading" className="grading-table__link">
            Back to grading queue
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="grading-page">
        <div className="grading-page__header">
          <div>
            <Link to="/grading" className="grading-table__link">
              Back to queue
            </Link>
            <h1>Grading Workspace</h1>
            <p>Review the response and submit a manual grade.</p>
          </div>
        </div>

        {successMessage && (
          <div className="grading-alert grading-alert--success" role="status">
            {successMessage}
          </div>
        )}

        {error && (
          <div className="grading-alert grading-alert--error" role="alert">
            {error}
          </div>
        )}

        <div className="grading-detail-layout">
          <section className="grading-panel">
            <h2 className="grading-panel__title">Response</h2>
            <div className="grading-meta">
              <div>
                <strong>Candidate:</strong> {displayCandidateName(queueItem)}
              </div>
              <div>
                <strong>Topic:</strong> {queueItem.topic}
              </div>
              <div>
                <strong>Question:</strong> {queueItem.question_id}
              </div>
              <div>
                <strong>Max Points:</strong> {queueItem.max_points}
              </div>
              <div>
                <strong>Status:</strong> {queueItem.status}
              </div>
            </div>
            <div className="grading-response">{queueItem.response_text}</div>
          </section>

          <div className="grading-detail-layout__aside">
            {queueItem.status === 'queued' ? (
              <GradeForm
                maxPoints={queueItem.max_points}
                isSubmitting={isSubmitting}
                error={error}
                onSubmit={handleSubmitGrade}
              />
            ) : (
              <div className="grading-panel">
                <h2 className="grading-panel__title">Submitted Grade</h2>
                <div className="grading-meta">
                  <div>
                    <strong>Awarded Points:</strong>{' '}
                    {queueItem.manual_grade?.awarded_points ?? '—'}
                  </div>
                  <div>
                    <strong>Feedback:</strong>{' '}
                    {queueItem.manual_grade?.feedback || 'No feedback provided.'}
                  </div>
                </div>
              </div>
            )}

            <ResultSummary result={combinedResult} isLoading={isResultLoading} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
