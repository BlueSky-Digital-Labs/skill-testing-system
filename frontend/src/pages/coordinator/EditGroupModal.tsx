import { FormEvent, useEffect, useState } from 'react'
import { Input } from '@components/atoms/Input'
import { Button } from '@components/atoms/Button'
import { ApiError } from '@/api/groups'
import type { Group } from '@/types/groups'
import '../admin/admin.css'
import './groups.css'

export type GroupFormState = {
  name: string
  description: string
}

const emptyFormState: GroupFormState = {
  name: '',
  description: '',
}

interface EditGroupModalProps {
  mode: 'create' | 'edit'
  initialGroup?: Group | null
  isOpen: boolean
  isSaving: boolean
  onClose: () => void
  onSubmit: (values: GroupFormState) => Promise<void>
}

export function EditGroupModal({
  mode,
  initialGroup,
  isOpen,
  isSaving,
  onClose,
  onSubmit,
}: EditGroupModalProps) {
  const [formState, setFormState] = useState<GroupFormState>(emptyFormState)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    setFormState({
      name: initialGroup?.name ?? '',
      description: initialGroup?.description ?? '',
    })
    setFieldErrors({})
    setSubmitError(null)
  }, [initialGroup, isOpen, mode])

  if (!isOpen) {
    return null
  }

  const validate = (): boolean => {
    const errors: Record<string, string> = {}
    const name = formState.name.trim()

    if (!name) {
      errors.name = 'Group name is required.'
    } else if (name.length > 255) {
      errors.name = 'Group name must be 255 characters or fewer.'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitError(null)

    if (!validate()) {
      return
    }

    try {
      await onSubmit({
        name: formState.name.trim(),
        description: formState.description.trim(),
      })
    } catch (error) {
      if (error instanceof ApiError) {
        setSubmitError(error.message)
        if (error.fieldErrors) {
          setFieldErrors(error.fieldErrors)
        }
      } else {
        setSubmitError('Unable to save group.')
      }
    }
  }

  return (
    <div
      className="admin-modal-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isSaving) {
          onClose()
        }
      }}
    >
      <div
        className="admin-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="group-form-title"
      >
        <div className="admin-modal__header">
          <h2 id="group-form-title">
            {mode === 'create' ? 'Create group' : 'Edit group'}
          </h2>
          <button
            type="button"
            className="admin-modal__close"
            aria-label="Close dialog"
            onClick={onClose}
            disabled={isSaving}
          >
            ×
          </button>
        </div>

        <form className="admin-modal__form" onSubmit={handleSubmit} noValidate>
          <Input
            label="Name"
            value={formState.name}
            onChange={(event) =>
              setFormState((current) => ({ ...current, name: event.target.value }))
            }
            error={fieldErrors.name}
            required
            disabled={isSaving}
            fullWidth
          />

          <label className="coordinator-groups__textarea-label">
            <span>Description</span>
            <textarea
              className="coordinator-groups__textarea"
              value={formState.description}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              disabled={isSaving}
              rows={4}
            />
          </label>

          {submitError ? (
            <p className="coordinator-groups__status coordinator-groups__status--error" role="alert">
              {submitError}
            </p>
          ) : null}

          <div className="admin-modal__actions">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : mode === 'create' ? 'Create group' : 'Save changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
