import { useId } from 'react'
import type { Role } from '@/api/admin'
import './RoleMultiSelect.css'

interface RoleMultiSelectProps {
  roles: Role[]
  selectedKeys: string[]
  onChange: (keys: string[]) => void
  disabled?: boolean
  error?: string
  label?: string
}

export function RoleMultiSelect({
  roles,
  selectedKeys,
  onChange,
  disabled = false,
  error,
  label = 'Roles',
}: RoleMultiSelectProps) {
  const groupId = useId()
  const errorId = `${groupId}-error`

  const activeRoles = roles.filter((role) => role.is_active)

  const toggleRole = (roleKey: string) => {
    if (disabled) {
      return
    }

    if (selectedKeys.includes(roleKey)) {
      onChange(selectedKeys.filter((key) => key !== roleKey))
      return
    }

    onChange([...selectedKeys, roleKey])
  }

  return (
    <fieldset
      className="role-multi-select"
      aria-describedby={error ? errorId : undefined}
      disabled={disabled}
    >
      <legend className="role-multi-select__legend">{label}</legend>
      <div className="role-multi-select__options" role="group" aria-label={label}>
        {activeRoles.length === 0 ? (
          <p className="role-multi-select__empty">No active roles available.</p>
        ) : (
          activeRoles.map((role) => {
            const inputId = `${groupId}-${role.key}`
            const isChecked = selectedKeys.includes(role.key)

            return (
              <label key={role.key} className="role-multi-select__option" htmlFor={inputId}>
                <input
                  id={inputId}
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleRole(role.key)}
                  disabled={disabled}
                />
                <span>
                  <strong>{role.name}</strong>
                  <span className="role-multi-select__key">{role.key}</span>
                </span>
              </label>
            )
          })
        )}
      </div>
      {error && (
        <span id={errorId} className="role-multi-select__error" role="alert">
          {error}
        </span>
      )}
    </fieldset>
  )
}
