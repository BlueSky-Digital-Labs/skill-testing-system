import { useParams } from 'react-router-dom'
import {
  RunnerFooter,
  RunnerHeader,
  RunnerNavigator,
  RunnerQuestion,
} from '@/components/runner'
import { useAttemptRunner } from '@/components/runner/hooks/useAttemptRunner'
import '@/components/runner/runner.css'

export function AttemptRunnerPage() {
  const { attemptId = '' } = useParams<{ attemptId: string }>()
  const {
    session,
    currentQuestion,
    currentQuestionId,
    draftAnswers,
    answeredQuestionIds,
    integrity,
    isLoading,
    isSubmitting,
    error,
    blockingState,
    saveStatus,
    saveError,
    displaySeconds,
    testTitle,
    handleAnswerChange,
    goToQuestion,
    goPrevious,
    goNext,
    handleSubmit,
    currentIndex,
  } = useAttemptRunner({ attemptId })

  if (!attemptId) {
    return (
      <div className="attempt-runner">
        <div className="attempt-runner__shell">
          <p className="attempt-runner__error" role="alert">
            Attempt ID is required.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="attempt-runner">
      <div className="attempt-runner__shell">
        <RunnerHeader
          testTitle={testTitle}
          remainingSeconds={displaySeconds}
          saveStatus={session ? saveStatus : 'idle'}
          saveError={saveError}
        />

        {isLoading && <p className="attempt-runner__message">Loading attempt…</p>}

        {!isLoading && error && (
          <p className="attempt-runner__error" role="alert">
            {error}
          </p>
        )}

        {!isLoading && blockingState === 'expired' && (
          <p className="attempt-runner__message" role="status">
            This attempt has expired and can no longer be edited.
          </p>
        )}

        {!isLoading && session && currentQuestion && currentQuestionId && (
          <>
            <section className="attempt-runner__panel" aria-live="polite">
              <RunnerQuestion
                question={currentQuestion}
                optionOrder={session.option_id_orders[currentQuestionId] ?? []}
                value={draftAnswers[currentQuestionId] ?? {}}
                onChange={handleAnswerChange}
                disabled={blockingState != null || isSubmitting}
              />
            </section>

            <RunnerNavigator
              questionIds={session.question_id_order}
              currentIndex={currentIndex}
              answeredQuestionIds={answeredQuestionIds}
              integrity={integrity}
              onSelect={goToQuestion}
              onPrevious={goPrevious}
              onNext={goNext}
            />

            <RunnerFooter
              canSubmit={blockingState == null}
              isSubmitting={isSubmitting}
              onSubmit={() => void handleSubmit()}
            />
          </>
        )}
      </div>
    </div>
  )
}

export default AttemptRunnerPage
