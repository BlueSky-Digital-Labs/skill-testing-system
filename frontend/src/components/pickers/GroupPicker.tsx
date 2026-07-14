import { useEffect, useMemo, useRef, useState } from 'react'
import { listGroups } from '@/api/groups'
import type { Group } from '@/types/groups'
import '@/pages/coordinator/groups.css'

const DEBOUNCE_MS = 300

interface GroupPickerProps {
  value: string | null
  onChange: (groupId: string | null, group?: Group) => void
  label?: string
  placeholder?: string
  disabled?: boolean
  error?: string
}

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValue(value), delay)
    return () => window.clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}

export function GroupPicker({
  value,
  onChange,
  label = 'Candidate group',
  placeholder = 'Search groups...',
  disabled = false,
  error,
}: GroupPickerProps) {
  const [groups, setGroups] = useState<Group[]>([])
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debouncedSearch = useDebouncedValue(search, DEBOUNCE_MS)

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === value) ?? null,
    [groups, value],
  )

  useEffect(() => {
    let isMounted = true

    const loadGroups = async () => {
      setIsLoading(true)
      setLoadError(null)

      try {
        const results = await listGroups()
        if (isMounted) {
          setGroups(results)
        }
      } catch {
        if (isMounted) {
          setLoadError('Unable to load groups.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadGroups()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredGroups = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase()
    if (!query) {
      return groups
    }

    return groups.filter(
      (group) =>
        group.name.toLowerCase().includes(query) ||
        group.description.toLowerCase().includes(query),
    )
  }, [debouncedSearch, groups])

  const handleSelect = (group: Group) => {
    onChange(group.id, group)
    setSearch(group.name)
    setIsOpen(false)
  }

  const handleClear = () => {
    onChange(null)
    setSearch('')
    setIsOpen(false)
  }

  return (
    <div className="group-picker" ref={containerRef}>
      <label className="group-picker__label" htmlFor="group-picker-input">
        {label}
      </label>

      {selectedGroup && !isOpen ? (
        <div className="group-picker__selected">
          <span>
            {selectedGroup.name}
            <small>{selectedGroup.member_count} members</small>
          </span>
          <button
            type="button"
            className="group-picker__clear"
            onClick={handleClear}
            disabled={disabled}
            aria-label="Clear selected group"
          >
            ×
          </button>
        </div>
      ) : (
        <input
          id="group-picker-input"
          className="group-picker__input"
          type="search"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'group-picker-error' : undefined}
        />
      )}

      {isOpen ? (
        <div className="group-picker__menu" role="listbox">
          {isLoading ? (
            <p className="group-picker__empty">Loading groups...</p>
          ) : loadError ? (
            <p className="group-picker__error">{loadError}</p>
          ) : filteredGroups.length === 0 ? (
            <p className="group-picker__empty">No groups found.</p>
          ) : (
            filteredGroups.map((group) => (
              <button
                key={group.id}
                type="button"
                className={`group-picker__option${
                  value === group.id ? ' group-picker__option--active' : ''
                }`}
                onClick={() => handleSelect(group)}
              >
                {group.name}
                <small>
                  {group.member_count} members
                  {group.description ? ` · ${group.description}` : ''}
                </small>
              </button>
            ))
          )}
        </div>
      ) : null}

      {error ? (
        <p id="group-picker-error" className="group-picker__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
