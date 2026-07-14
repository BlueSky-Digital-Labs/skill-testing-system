import { FormEvent, useState } from 'react'
import { Button } from '@components/atoms/Button'
import { FormField } from '@components/molecules/FormField'

interface GradeFormProps {
  maxPoints: string
  isSubmitting?: boolean
  error?: string | null
  onSubmit: (values: { awardedPoints: string; feedback: string }) => void
}

export const GradeForm = ({
  maxPoints,
  isSubmitting = false,
  error,
  onSubmit,
}: GradeFormProps) => {
  const [awardedPoints, setAwardedPoints] = useState('')
  const [feedback, setFeedback] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setValidationError(null)

    const points = Number.parseFloat(awardedPoints)
    const max = Number.parseFloat(maxPoints)

    if (Number.isNaN(points) || points < 0) {
      setValidationError('Enter a valid awarded points value.')
      return
    }

    if (points > max) {
      setValidationError(`Awarded points cannot exceed ${maxPoints}.`)
      return
    }

    onSubmit({ awardedPoints, feedback })
  }

  return (
    <form className="grading-panel grading-form" onSubmit={handleSubmit}>
      <h2 className="grading-panel__title">Submit Grade</h2>

      {(error || validationError) && (
        <div className="grading-alert grading-alert--error" role="alert">
          {error || validationError}
        </div>
      )}

      <FormField
        label={`Awarded Points (max ${maxPoints})`}
        name="awarded_points"
        type="number"
        value={awardedPoints}
        onChange={(event) => setAwardedPoints(event.target.value)}
        required
        disabled={isSubmitting}
      />

      <label htmlFor="feedback">
        Feedback
        <textarea
          id="feedback"
          name="feedback"
          value={feedback}
          onChange={(event) => setFeedback(event.target.value)}
          disabled={isSubmitting}
          placeholder="Optional feedback for the candidate"
        />
      </label>

      <Button type="submit" isLoading={isSubmitting}>
        Submit Grade
      </Button>
    </form>
  )
}
