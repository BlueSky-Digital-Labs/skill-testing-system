import { FormEvent, useCallback, useEffect, useState } from 'react'
import { DashboardLayout } from '@components/templates/DashboardLayout'
import { Button } from '@components/atoms/Button'
import { Input } from '@components/atoms/Input'
import { ApiError } from '@/api/auth'
import {
  SYSTEM_ADMIN_ROLE_KEY,
  createRole,
  listRoles,
  updateRole,
  type Role,
} from '@/api/admin'
import './admin.css'

type RoleFormState = {
  key: string
  name: string
  description: string
  is_active: boolean
}

const emptyRoleForm: RoleFormState = {
  key: '',
  name: '',
  description: '',
  is_active: true,
}

interface RoleFormModalProps {
  title: string
  formState: RoleFormState
  fieldErrors: Record<string, string>
  submitError: string | null
  isSaving: boolean
  isEdit: boolean
  isSystemAdminRole: boolean
  onClose: () => void
  onChange: (next: RoleFormState) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

function RoleFormModal({
  title,
  formState,
  fieldErrors,
  submitError,
  isSaving,
  isEdit,
  isSystemAdminRole,
  onClose,
  onChange,
  onSubmit,
}: RoleFormModalProps) {
  return (
    <div
      className="admin-modal-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        className="admin-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="role-form-title"
      >
        <div className="admin-modal__header">
          <h2 id="role-form-title">{title}</h2>
          <button
            type="button"
            className="admin-modal__close"
            aria-label="Close dialog"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <form className="admin-modal__form" onSubmit={onSubmit} noValidate>
          <Input
            label="Key"
            value={formState.key}
            onChange={(event) => onChange({ ...formState, key: event.target.value })}
            error={fieldErrors.key}
            required
            disabled={isEdit || isSaving}
            helperText={isEdit ? 'Role keys cannot be changed.' : undefined}
            fullWidth
          />
          <Input
            label="Name"
            value={formState.name}
            onChange={(event) => onChange({ ...formState, name: event.target.value })}
            error={fieldErrors.name}
            required
            disabled={isSaving}
            fullWidth
          />
          <label htmlFor="role-description">
            Description
            <textarea
              id="role-description"
              className="input"
              rows={3}
              value={formState.description}
              onChange={(event) => onChange({ ...formState, description: event.target.value })}
              disabled={isSaving}
            />
          </label>
          {fieldErrors.description && (
            <span className="input__error" role="alert">
              {fieldErrors.description}
            </span>
          )}
          {isEdit && (
            <label className="role-multi-select__option">
              <input
                type="checkbox"
                checked={formState.is_active}
                onChange={(event) =>
                  onChange({ ...formState, is_active: event.target.checked })
                }
                disabled={isSaving || isSystemAdminRole}
                aria-describedby={
                  isSystemAdminRole ? 'system-admin-role-note' : undefined
                }
              />
              <span>Active</span>
            </label>
          )}
          {isSystemAdminRole && (
            <p id="system-admin-role-note" className="role-multi-select__empty">
              The SYSTEM_ADMIN role cannot be deactivated.
            </p>
          )}
          {fieldErrors.is_active && (
            <span className="input__error" role="alert">
              {fieldErrors.is_active}
            </span>
          )}
          {submitError && (
            <div className="admin-page__message admin-page__message--error" role="alert">
              {submitError}
            </div>
          )}
          <div className="admin-modal__actions">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSaving}>
              {isEdit ? 'Save changes' : 'Create role'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export const RolesPage = () => {
  const [roles, setRoles] = useState<Role[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [formState, setFormState] = useState<RoleFormState>(emptyRoleForm)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const loadRoles = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await listRoles()
      setRoles(response.results)
    } catch (loadError) {
      const message =
        loadError instanceof ApiError ? loadError.message : 'Unable to load roles.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadRoles()
  }, [loadRoles])

  const openCreateModal = () => {
    setEditingRole(null)
    setFormState(emptyRoleForm)
    setFieldErrors({})
    setSubmitError(null)
    setModalMode('create')
  }

  const openEditModal = (role: Role) => {
    setEditingRole(role)
    setFormState({
      key: role.key,
      name: role.name,
      description: role.description ?? '',
      is_active: role.is_active,
    })
    setFieldErrors({})
    setSubmitError(null)
    setModalMode('edit')
  }

  const closeModal = () => {
    if (isSaving) {
      return
    }
    setModalMode(null)
    setEditingRole(null)
    setFormState(emptyRoleForm)
    setFieldErrors({})
    setSubmitError(null)
  }

  const handleCreateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    setFieldErrors({})
    setSubmitError(null)

    try {
      await createRole({
        key: formState.key.trim(),
        name: formState.name.trim(),
        description: formState.description.trim() || undefined,
      })
      closeModal()
      setSuccessMessage('Role created successfully.')
      await loadRoles()
    } catch (saveError) {
      if (saveError instanceof ApiError) {
        setSubmitError(saveError.message)
      } else {
        setSubmitError('Unable to create role.')
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editingRole) {
      return
    }

    setIsSaving(true)
    setFieldErrors({})
    setSubmitError(null)

    try {
      await updateRole(editingRole.id, {
        name: formState.name.trim(),
        description: formState.description.trim(),
        is_active: formState.is_active,
      })
      closeModal()
      setSuccessMessage('Role updated successfully.')
      await loadRoles()
    } catch (saveError) {
      if (saveError instanceof ApiError) {
        setSubmitError(saveError.message)
        if (saveError.status === 400) {
          setFieldErrors({ is_active: saveError.message })
        }
      } else {
        setSubmitError('Unable to update role.')
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="admin-page">
        <div className="admin-page__header">
          <div>
            <h1>Role Management</h1>
            <p>Create and maintain platform roles used for access control.</p>
          </div>
          <Button onClick={openCreateModal}>Create role</Button>
        </div>

        {successMessage && (
          <div className="admin-page__message admin-page__message--success" role="status">
            {successMessage}
          </div>
        )}

        {error && (
          <div className="admin-page__message admin-page__message--error" role="alert">
            {error}
          </div>
        )}

        {isLoading ? (
          <p>Loading roles...</p>
        ) : (
          <div className="admin-table-wrapper">
            <table className="admin-table" aria-label="Roles">
              <thead>
                <tr>
                  <th scope="col">Key</th>
                  <th scope="col">Name</th>
                  <th scope="col">Description</th>
                  <th scope="col">Status</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {roles.length === 0 ? (
                  <tr>
                    <td colSpan={5}>No roles found.</td>
                  </tr>
                ) : (
                  roles.map((role) => (
                    <tr key={role.id}>
                      <td>{role.key}</td>
                      <td>{role.name}</td>
                      <td>{role.description || '—'}</td>
                      <td>
                        <span
                          className={`admin-page__status ${
                            role.is_active
                              ? 'admin-page__status--active'
                              : 'admin-page__status--inactive'
                          }`}
                        >
                          {role.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => openEditModal(role)}
                        >
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {modalMode === 'create' && (
          <RoleFormModal
            title="Create role"
            formState={formState}
            fieldErrors={fieldErrors}
            submitError={submitError}
            isSaving={isSaving}
            isEdit={false}
            isSystemAdminRole={false}
            onClose={closeModal}
            onChange={setFormState}
            onSubmit={(event) => void handleCreateSubmit(event)}
          />
        )}

        {modalMode === 'edit' && (
          <RoleFormModal
            title="Edit role"
            formState={formState}
            fieldErrors={fieldErrors}
            submitError={submitError}
            isSaving={isSaving}
            isEdit
            isSystemAdminRole={editingRole?.key === SYSTEM_ADMIN_ROLE_KEY}
            onClose={closeModal}
            onChange={setFormState}
            onSubmit={(event) => void handleEditSubmit(event)}
          />
        )}
      </div>
    </DashboardLayout>
  )
}
