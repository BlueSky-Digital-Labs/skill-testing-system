import { useEffect, useRef } from 'react'
import { Button } from '@components/atoms/Button'
import '../../admin/admin.css'

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

interface SaveVersionConfirmModalProps {
  isOpen: boolean
  isSaving: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function SaveVersionConfirmModal({
  isOpen,
  isSaving,
  onConfirm,
  onCancel,
}: SaveVersionConfirmModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const focusableElements = dialogRef.current?.querySelectorAll<HTMLElement>(
      FOCUSABLE_SELECTOR,
    )
    focusableElements?.[0]?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSaving) {
        event.preventDefault()
        onCancel()
        return
      }

      if (event.key !== 'Tab' || !dialogRef.current) {
        return
      }

      const focusableElements = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((element) => element.offsetParent !== null)

      if (focusableElements.length === 0) {
        return
      }

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isSaving, onCancel])

  if (!isOpen) {
    return null
  }

  return (
    <div
      className="admin-modal-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isSaving) {
          onCancel()
        }
      }}
    >
      <div
        ref={dialogRef}
        className="admin-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-version-confirm-title"
        aria-describedby="save-version-confirm-description"
      >
        <div className="admin-modal__header">
          <h2 id="save-version-confirm-title">Create new version?</h2>
          <button
            type="button"
            className="admin-modal__close"
            aria-label="Close dialog"
            onClick={onCancel}
            disabled={isSaving}
          >
            ×
          </button>
        </div>

        <p id="save-version-confirm-description" className="questions-page__hint">
          Saving your changes will create a new version of this question. Published tests
          continue using the versions they were built with.
        </p>

        <div className="admin-modal__actions">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button type="button" onClick={onConfirm} isLoading={isSaving} disabled={isSaving}>
            Save and create version
          </Button>
        </div>
      </div>
    </div>
  )
}
