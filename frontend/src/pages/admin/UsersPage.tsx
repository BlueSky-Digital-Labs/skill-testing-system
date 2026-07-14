import { FormEvent, useCallback, useEffect, useState } from 'react'
import { DashboardLayout } from '@components/templates/DashboardLayout'
import { Button } from '@components/atoms/Button'
import { Input } from '@components/atoms/Input'
import { RoleMultiSelect } from '@components/RoleMultiSelect'
import { ApiError } from '@/api/auth'
import {
  createUser,
  listRoles,
  listUsers,
  updateUser,
  type Role,
  type User,
} from '@/api/admin'
import './admin.css'

const PAGE_SIZE = 20

type UserFormState = {
  email: string
  first_name: string
  last_name: string
  password: string
  roles: string[]
}

const emptyFormState: UserFormState = {
  email: '',
  first_name: '',
  last_name: '',
  password: '',
  roles: [],
}

function formatName(user: User): string {
  const parts = [user.first_name, user.last_name].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : '—'
}

interface UserFormModalProps {
  title: string
  formState: UserFormState
  availableRoles: Role[]
  fieldErrors: Record<string, string>
  submitError: string | null
  isSaving: boolean
  isEdit: boolean
  onClose: () => void
  onChange: (next: UserFormState) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

function UserFormModal({
  title,
  formState,
  availableRoles,
  fieldErrors,
  submitError,
  isSaving,
  isEdit,
  onClose,
  onChange,
  onSubmit,
}: UserFormModalProps) {
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
        aria-labelledby="user-form-title"
      >
        <div className="admin-modal__header">
          <h2 id="user-form-title">{title}</h2>
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
            label="Email"
            type="email"
            value={formState.email}
            onChange={(event) => onChange({ ...formState, email: event.target.value })}
            error={fieldErrors.email}
            required
            disabled={isEdit || isSaving}
            fullWidth
          />
          <Input
            label="First name"
            value={formState.first_name}
            onChange={(event) => onChange({ ...formState, first_name: event.target.value })}
            error={fieldErrors.first_name}
            disabled={isSaving}
            fullWidth
          />
          <Input
            label="Last name"
            value={formState.last_name}
            onChange={(event) => onChange({ ...formState, last_name: event.target.value })}
            error={fieldErrors.last_name}
            disabled={isSaving}
            fullWidth
          />
          {!isEdit && (
            <Input
              label="Password"
              type="password"
              value={formState.password}
              onChange={(event) => onChange({ ...formState, password: event.target.value })}
              error={fieldErrors.password}
              helperText="Optional. Leave blank to create without a password."
              disabled={isSaving}
              fullWidth
            />
          )}
          <RoleMultiSelect
            roles={availableRoles}
            selectedKeys={formState.roles}
            onChange={(roles) => onChange({ ...formState, roles })}
            error={fieldErrors.roles}
            disabled={isSaving}
          />
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
              {isEdit ? 'Save changes' : 'Create user'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export const UsersPage = () => {
  const [users, setUsers] = useState<User[]>([])
  const [availableRoles, setAvailableRoles] = useState<Role[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [appliedQuery, setAppliedQuery] = useState('')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formState, setFormState] = useState<UserFormState>(emptyFormState)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [togglingUserId, setTogglingUserId] = useState<number | null>(null)

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  const loadUsers = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await listUsers(appliedQuery || undefined, page)
      setUsers(response.results)
      setTotalCount(response.count)
    } catch (loadError) {
      const message =
        loadError instanceof ApiError ? loadError.message : 'Unable to load users.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [appliedQuery, page])

  const loadRoles = useCallback(async () => {
    try {
      const response = await listRoles()
      setAvailableRoles(response.results)
    } catch {
      setAvailableRoles([])
    }
  }, [])

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  useEffect(() => {
    void loadRoles()
  }, [loadRoles])

  const openCreateModal = () => {
    setEditingUser(null)
    setFormState(emptyFormState)
    setFieldErrors({})
    setSubmitError(null)
    setModalMode('create')
  }

  const openEditModal = (user: User) => {
    setEditingUser(user)
    setFormState({
      email: user.email,
      first_name: user.first_name ?? '',
      last_name: user.last_name ?? '',
      password: '',
      roles: user.roles.map((role) => role.key),
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
    setEditingUser(null)
    setFormState(emptyFormState)
    setFieldErrors({})
    setSubmitError(null)
  }

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPage(1)
    setAppliedQuery(searchQuery.trim())
  }

  const handleCreateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    setFieldErrors({})
    setSubmitError(null)

    try {
      await createUser({
        email: formState.email.trim(),
        first_name: formState.first_name.trim() || undefined,
        last_name: formState.last_name.trim() || undefined,
        password: formState.password.trim() || undefined,
        roles: formState.roles,
      })
      closeModal()
      setSuccessMessage('User created successfully.')
      await loadUsers()
    } catch (saveError) {
      if (saveError instanceof ApiError) {
        setSubmitError(saveError.message)
        const payload = (saveError as ApiError & { fieldErrors?: Record<string, string> })
          .fieldErrors
        if (payload) {
          setFieldErrors(payload)
        }
      } else {
        setSubmitError('Unable to create user.')
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editingUser) {
      return
    }

    setIsSaving(true)
    setFieldErrors({})
    setSubmitError(null)

    try {
      await updateUser(editingUser.id, {
        first_name: formState.first_name.trim(),
        last_name: formState.last_name.trim(),
        roles: formState.roles,
      })
      closeModal()
      setSuccessMessage('User updated successfully.')
      await loadUsers()
    } catch (saveError) {
      if (saveError instanceof ApiError) {
        setSubmitError(saveError.message)
      } else {
        setSubmitError('Unable to update user.')
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleActive = async (user: User) => {
    setTogglingUserId(user.id)
    setError(null)
    setSuccessMessage(null)

    try {
      await updateUser(user.id, { is_active: !user.is_active })
      setSuccessMessage(
        user.is_active ? 'User deactivated successfully.' : 'User activated successfully.',
      )
      await loadUsers()
    } catch (toggleError) {
      const message =
        toggleError instanceof ApiError ? toggleError.message : 'Unable to update user status.'
      setError(message)
    } finally {
      setTogglingUserId(null)
    }
  }

  return (
    <DashboardLayout>
      <div className="admin-page">
        <div className="admin-page__header">
          <div>
            <h1>User Management</h1>
            <p>Search, create, and manage platform users and their roles.</p>
          </div>
          <Button onClick={openCreateModal}>Create user</Button>
        </div>

        <form className="admin-page__toolbar" onSubmit={handleSearchSubmit}>
          <label htmlFor="user-search">
            Search by email
            <input
              id="user-search"
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="user@example.com"
            />
          </label>
          <Button type="submit" variant="outline">
            Search
          </Button>
        </form>

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
          <p>Loading users...</p>
        ) : (
          <div className="admin-table-wrapper">
            <table className="admin-table" aria-label="Users">
              <thead>
                <tr>
                  <th scope="col">Email</th>
                  <th scope="col">Name</th>
                  <th scope="col">Roles</th>
                  <th scope="col">Status</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={5}>No users found.</td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.email}</td>
                      <td>{formatName(user)}</td>
                      <td>
                        <div className="admin-role-tags">
                          {user.roles.length === 0 ? (
                            <span>—</span>
                          ) : (
                            user.roles.map((role) => (
                              <span key={role.key} className="admin-role-tag">
                                {role.name}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`admin-page__status ${
                            user.is_active
                              ? 'admin-page__status--active'
                              : 'admin-page__status--inactive'
                          }`}
                        >
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div className="admin-table__actions">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => openEditModal(user)}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            isLoading={togglingUserId === user.id}
                            onClick={() => void handleToggleActive(user)}
                          >
                            {user.is_active ? 'Deactivate' : 'Activate'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="admin-page__pagination">
          <span>
            Page {page} of {totalPages} ({totalCount} users)
          </span>
          <div className="admin-table__actions">
            <Button
              type="button"
              variant="outline"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={page >= totalPages || isLoading}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </Button>
          </div>
        </div>

        {modalMode === 'create' && (
          <UserFormModal
            title="Create user"
            formState={formState}
            availableRoles={availableRoles}
            fieldErrors={fieldErrors}
            submitError={submitError}
            isSaving={isSaving}
            isEdit={false}
            onClose={closeModal}
            onChange={setFormState}
            onSubmit={(event) => void handleCreateSubmit(event)}
          />
        )}

        {modalMode === 'edit' && (
          <UserFormModal
            title="Edit user"
            formState={formState}
            availableRoles={availableRoles}
            fieldErrors={fieldErrors}
            submitError={submitError}
            isSaving={isSaving}
            isEdit
            onClose={closeModal}
            onChange={setFormState}
            onSubmit={(event) => void handleEditSubmit(event)}
          />
        )}
      </div>
    </DashboardLayout>
  )
}
