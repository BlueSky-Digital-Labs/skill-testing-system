import { Link, useParams } from 'react-router-dom'
import { Button } from '@components/atoms/Button'
import {
  PreviewFooter,
  PreviewHeader,
  PreviewNavigator,
  PreviewQuestion,
  PreviewSummary,
  usePreviewRunner,
} from '@/components/preview'
import '@/components/runner/runner.css'
import '@/components/preview/preview.css'

export function PreviewRunnerPage() {
  const { id: testId = '' } = useParams<{ id: string }>()
  const {
    session,
    currentQuestion,
    currentQuestionId,
    draftAnswers,
    answeredQuestionIds,
    integrity,
    loadState,
    isFinished,
    finishResult,
    isValidating,
    isFinishing,
    error,
    validationMessage,
    validationState,
    displaySeconds,
    testTitle,
    handleAnswerChange,
    handleValidateAnswer,
    handleFinish,
    goToQuestion,
    goPrevious,
    goNext,
    currentIndex,
  } = usePreviewRunner({ testId })

  if (!testId) {
    return (
      <div className="attempt-runner attempt-runner--preview">
        <div className="attempt-runner__shell">
          <p className="attempt-runner__error" role="alert">
            Test ID is required.
          </p>
        </div>
      </div>
    )
  }

  if (loadState === 'forbidden' || loadState === 'not_found' || loadState === 'unavailable') {
    return (
      <div className="attempt-runner attempt-runner--preview">
        <div className="attempt-runner__shell">
          <div className="attempt-runner__placeholder" role="alert">
            <h1 className="attempt-runner__title">{testTitle}</h1>
            <p>{error}</p>
            {loadState === 'unavailable' && (
              <p>Preview requires the backend preview API (feature 17).</p>
            )}
            <div className="attempt-runner__back-link">
              <Link to={`/tests/${testId}`}>
                <Button type="button" variant="secondary">
                  Back to test
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="attempt-runner attempt-runner--preview">
      <div className="attempt-runner__shell">
        <PreviewHeader
          testTitle={testTitle}
          remainingSeconds={displaySeconds}
          validationMessage={validationMessage}
          validationState={validationState}
        />

        {loadState === 'loading' && (
          <p className="attempt-runner__message">Starting preview session…</p>
        )}

        {loadState === 'ready' && error && !isFinished && (
          <p className="attempt-runner__error" role="alert">
            {error}
          </p>
        )}

        {isFinished && finishResult && (
          <PreviewSummary testId={testId} result={finishResult} />
        )}

        {loadState === 'ready' && session && currentQuestion && currentQuestionId && !isFinished && (
          <>
            <section className="attempt-runner__panel" aria-live="polite">
              <PreviewQuestion
                question={currentQuestion}
                optionOrder={session.option_id_orders[currentQuestionId] ?? []}
                value={draftAnswers[currentQuestionId] ?? {}}
                onChange={handleAnswerChange}
                disabled={isFinishing}
              />
            </section>

            <PreviewNavigator
              questionIds={session.question_id_order}
              currentIndex={currentIndex}
              answeredQuestionIds={answeredQuestionIds}
              integrity={integrity}
              onSelect={goToQuestion}
              onPrevious={goPrevious}
              onNext={goNext}
            />

            <PreviewFooter
              canFinish
              isFinishing={isFinishing}
              isValidating={isValidating}
              onFinish={() => void handleFinish()}
              onValidate={() => void handleValidateAnswer()}
            />
          </>
        )}
      </div>
    </div>
  )
}

export default PreviewRunnerPage
