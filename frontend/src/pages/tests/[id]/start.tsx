import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ApiError } from '@/api/client'
import { startAttempt } from '@/api/attempts'
import '@/components/runner/runner.css'

export function TestStartPage() {
  const { id: testId = '' } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const assignmentId = searchParams.get('assignmentId') ?? ''
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!testId) {
      setError('Test ID is required.')
      return
    }

    if (!assignmentId) {
      setError(
        'An assignmentId query parameter is required to start this test.',
      )
      return
    }

    let isMounted = true

    const begin = async () => {
      setError(null)

      try {
        const session = await startAttempt(assignmentId)
        if (!isMounted) {
          return
        }

        if (session.test_id !== testId) {
          setError('The selected assignment does not belong to this test.')
          return
        }

        navigate(`/attempts/${session.id}`, { replace: true })
      } catch (startError) {
        if (!isMounted) {
          return
        }

        const message =
          startError instanceof ApiError
            ? startError.message
            : 'Unable to start the test.'
        setError(message)
      }
    }

    void begin()

    return () => {
      isMounted = false
    }
  }, [assignmentId, navigate, testId])

  return (
    <div className="attempt-runner__start">
      <section className="attempt-runner__start-card" aria-live="polite">
        <h1>Starting test</h1>
        {error ? (
          <p className="attempt-runner__error" role="alert">
            {error}
          </p>
        ) : (
          <p className="attempt-runner__message">
            Preparing your attempt. You will be redirected shortly.
          </p>
        )}
      </section>
    </div>
  )
}

export default TestStartPage
