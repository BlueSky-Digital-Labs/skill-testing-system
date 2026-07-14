import { FormEvent, useMemo, useState } from 'react'
import { Button } from '@components/atoms/Button'
import type { BulkAssignmentPayload } from './api'
import {
  parseAssigneeIds,
  validateAssignForm,
  type AssignFormErrors,
  type AssignFormValues,
} from './validation'

export type { AssignFormValues } from './validation'

export interface AssignFormProps {
  testId: string
  isSubmitting?: boolean
  onSubmit: (payload: BulkAssignmentPayload) => Promise<void>
}

function toLocalDateTimeValue(date: Date): string {
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60_000)
  return local.toISOString().slice(0, 16)
}

function toIsoDateTime(localValue: string): string | undefined {
  if (!localValue) {
    return undefined
  }

  const date = new Date(localValue)
  if (Number.isNaN(date.getTime())) {
    return undefined
  }

  return date.toISOString()
}

function addDays(base: Date, days: number): Date {
  const next = new Date(base)
  next.setDate(next.getDate() + days)
  return next
}

export const AssignForm = ({ testId, isSubmitting = false, onSubmit }: AssignFormProps) => {
  const [values, setValues] = useState<AssignFormValues>({
    userIds: '',
    groupIds: '',
    opensAt: '',
    dueAt: '',
    closesAt: '',
    maxAttempts: 1,
    shuffleQuestions: false,
    shuffleOptions: false,
  })
  const [errors, setErrors] = useState<AssignFormErrors>({})

  const dateFieldsLocked = !values.opensAt
  const assigneeCount = useMemo(
    () => parseAssigneeIds(values.userIds).length + parseAssigneeIds(values.groupIds).length,
    [values.groupIds, values.userIds],
  )

  const updateField = <K extends keyof AssignFormValues>(
    field: K,
    value: AssignFormValues[K],
  ) => {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined, form: undefined }))
  }

  const handleOpensAtChange = (nextOpensAt: string) => {
    setValues((current) => {
      const nextValues = { ...current, opensAt: nextOpensAt }

      if (nextOpensAt) {
        const opensDate = new Date(nextOpensAt)
        if (!Number.isNaN(opensDate.getTime())) {
          if (!current.dueAt) {
            nextValues.dueAt = toLocalDateTimeValue(addDays(opensDate, 1))
          }
          if (!current.closesAt) {
            nextValues.closesAt = toLocalDateTimeValue(addDays(opensDate, 2))
          }
        }
      }

      return nextValues
    })
    setErrors((current) => ({
      ...current,
      opensAt: undefined,
      dueAt: undefined,
      closesAt: undefined,
      form: undefined,
    }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextErrors = validateAssignForm(values)
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    const opensAt = toIsoDateTime(values.opensAt)
    if (!opensAt) {
      setErrors({ opensAt: 'Opens at must be a valid date.' })
      return
    }

    const payload: BulkAssignmentPayload = {
      testId,
      userIds: parseAssigneeIds(values.userIds),
      groupIds: parseAssigneeIds(values.groupIds),
      opensAt,
      dueAt: toIsoDateTime(values.dueAt),
      closesAt: toIsoDateTime(values.closesAt),
      maxAttempts: values.maxAttempts,
      shuffleQuestions: values.shuffleQuestions,
      shuffleOptions: values.shuffleOptions,
      status: 'active',
    }

    await onSubmit(payload)
    setValues((current) => ({
      ...current,
      userIds: '',
      groupIds: '',
    }))
  }

  return (
    <form className="assign-form" onSubmit={handleSubmit} noValidate>
      <div className="assign-form__header">
        <h2>Create assignments</h2>
        <p>
          Assign test <code>{testId}</code> to comma-separated user and/or group UUIDs.
        </p>
      </div>

      {errors.form && (
        <div className="assign-alert assign-alert--error" role="alert">
          {errors.form}
        </div>
      )}

      <label htmlFor="assign-user-ids">
        User IDs
        <textarea
          id="assign-user-ids"
          value={values.userIds}
          onChange={(event) => updateField('userIds', event.target.value)}
          placeholder="uuid-1, uuid-2"
          rows={3}
        />
        {errors.userIds && <span className="assign-field-error">{errors.userIds}</span>}
        <span className="assign-field-help">Comma-separated user UUIDs.</span>
      </label>

      <label htmlFor="assign-group-ids">
        Group IDs
        <textarea
          id="assign-group-ids"
          value={values.groupIds}
          onChange={(event) => updateField('groupIds', event.target.value)}
          placeholder="group-uuid-1, group-uuid-2"
          rows={3}
        />
        {errors.groupIds && <span className="assign-field-error">{errors.groupIds}</span>}
        <span className="assign-field-help">Comma-separated group UUIDs.</span>
      </label>

      <div className="assign-form__grid">
        <label htmlFor="assign-opens-at">
          Opens at
          <input
            id="assign-opens-at"
            type="datetime-local"
            value={values.opensAt}
            onChange={(event) => handleOpensAtChange(event.target.value)}
            required
          />
          {errors.opensAt && <span className="assign-field-error">{errors.opensAt}</span>}
        </label>

        <label htmlFor="assign-due-at">
          Due at
          <input
            id="assign-due-at"
            type="datetime-local"
            value={values.dueAt}
            onChange={(event) => updateField('dueAt', event.target.value)}
            disabled={dateFieldsLocked}
            min={values.opensAt || undefined}
          />
          {errors.dueAt && <span className="assign-field-error">{errors.dueAt}</span>}
          <span className="assign-field-help">
            {dateFieldsLocked
              ? 'Select opens at first.'
              : 'Suggested automatically when opens at changes.'}
          </span>
        </label>

        <label htmlFor="assign-closes-at">
          Closes at
          <input
            id="assign-closes-at"
            type="datetime-local"
            value={values.closesAt}
            onChange={(event) => updateField('closesAt', event.target.value)}
            disabled={dateFieldsLocked}
            min={values.dueAt || values.opensAt || undefined}
          />
          {errors.closesAt && (
            <span className="assign-field-error">{errors.closesAt}</span>
          )}
          <span className="assign-field-help">
            Must be on or after due at when both are set.
          </span>
        </label>
      </div>

      <label htmlFor="assign-max-attempts">
        Max attempts
        <input
          id="assign-max-attempts"
          type="number"
          min={1}
          value={values.maxAttempts}
          onChange={(event) => updateField('maxAttempts', Number(event.target.value))}
        />
        {errors.maxAttempts && (
          <span className="assign-field-error">{errors.maxAttempts}</span>
        )}
      </label>

      <div className="assign-form__toggles">
        <label htmlFor="assign-shuffle-questions">
          <input
            id="assign-shuffle-questions"
            type="checkbox"
            checked={values.shuffleQuestions}
            onChange={(event) => updateField('shuffleQuestions', event.target.checked)}
          />
          Shuffle questions
        </label>

        <label htmlFor="assign-shuffle-options">
          <input
            id="assign-shuffle-options"
            type="checkbox"
            checked={values.shuffleOptions}
            onChange={(event) => updateField('shuffleOptions', event.target.checked)}
          />
          Shuffle options
        </label>
      </div>

      <div className="assign-form__actions">
        <Button type="submit" isLoading={isSubmitting}>
          Create {assigneeCount > 0 ? `${assigneeCount} ` : ''}assignments
        </Button>
      </div>
    </form>
  )
}
