import { useEffect, useRef, useState } from 'react'
import { Button } from '@components/atoms/Button'
import type { AuditFilterState } from '@/api/audit.types'
import { defaultAuditFilters } from '../constants'

const DEBOUNCE_MS = 300

interface FiltersProps {
  values: AuditFilterState
  onChange: (nextValues: AuditFilterState) => void
  onReset: () => void
}

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValue(value), delay)
    return () => window.clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}

export const Filters = ({ values, onChange, onReset }: FiltersProps) => {
  const [draft, setDraft] = useState(values)
  const debouncedDraft = useDebouncedValue(draft, DEBOUNCE_MS)
  const lastEmittedRef = useRef(values)

  useEffect(() => {
    setDraft(values)
    lastEmittedRef.current = values
  }, [values])

  useEffect(() => {
    const hasChanged = (Object.keys(debouncedDraft) as Array<keyof AuditFilterState>).some(
      (key) => debouncedDraft[key] !== lastEmittedRef.current[key],
    )

    if (hasChanged) {
      lastEmittedRef.current = debouncedDraft
      onChange(debouncedDraft)
    }
  }, [debouncedDraft, onChange])

  const updateField = (field: keyof AuditFilterState, nextValue: string) => {
    setDraft((current) => ({ ...current, [field]: nextValue }))
  }

  const handleReset = () => {
    setDraft(defaultAuditFilters)
    lastEmittedRef.current = defaultAuditFilters
    onReset()
  }

  return (
    <div className="audit-filters" role="search" aria-label="Audit log filters">
      <label htmlFor="audit-filter-actor">
        Actor
        <input
          id="audit-filter-actor"
          type="text"
          value={draft.actor}
          onChange={(event) => updateField('actor', event.target.value)}
          placeholder="Actor ID"
          autoComplete="off"
        />
      </label>

      <label htmlFor="audit-filter-action">
        Action
        <input
          id="audit-filter-action"
          type="text"
          value={draft.action}
          onChange={(event) => updateField('action', event.target.value)}
          placeholder="e.g. CREATE"
          autoComplete="off"
        />
      </label>

      <label htmlFor="audit-filter-entity-type">
        Entity Type
        <input
          id="audit-filter-entity-type"
          type="text"
          value={draft.entity_type}
          onChange={(event) => updateField('entity_type', event.target.value)}
          placeholder="e.g. user"
          autoComplete="off"
        />
      </label>

      <label htmlFor="audit-filter-entity-id">
        Entity ID
        <input
          id="audit-filter-entity-id"
          type="text"
          value={draft.entity_id}
          onChange={(event) => updateField('entity_id', event.target.value)}
          placeholder="Entity ID"
          autoComplete="off"
        />
      </label>

      <label htmlFor="audit-filter-from">
        From
        <input
          id="audit-filter-from"
          type="datetime-local"
          value={draft.from}
          onChange={(event) => updateField('from', event.target.value)}
        />
      </label>

      <label htmlFor="audit-filter-to">
        To
        <input
          id="audit-filter-to"
          type="datetime-local"
          value={draft.to}
          onChange={(event) => updateField('to', event.target.value)}
        />
      </label>

      <div className="audit-filters__actions">
        <Button type="button" variant="outline" onClick={handleReset}>
          Reset
        </Button>
      </div>
    </div>
  )
}
