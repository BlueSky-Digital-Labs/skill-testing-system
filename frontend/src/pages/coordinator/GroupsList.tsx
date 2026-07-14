import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@components/templates/DashboardLayout'
import { Button } from '@components/atoms/Button'
import { useToast } from '@components/Toast'
import {
  ApiError,
  createGroup,
  deleteGroup,
  listGroupsPaginated,
  updateGroup,
} from '@/api/groups'
import type { Group } from '@/types/groups'
import { EditGroupModal } from './EditGroupModal'
import '../admin/admin.css'
import './groups.css'

const PAGE_SIZE = 20

function matchesSearch(group: Group, query: string): boolean {
  if (!query) {
    return true
  }

  const normalized = query.toLowerCase()
  return (
    group.name.toLowerCase().includes(normalized) ||
    group.description.toLowerCase().includes(normalized)
  )
}

export function GroupsList() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [groups, setGroups] = useState<Group[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [appliedQuery, setAppliedQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null)
  const [editingGroup, setEditingGroup] = useState<Group | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const loadGroups = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await listGroupsPaginated(page)
      setGroups(response.results)
      setTotalCount(response.count)
    } catch (loadError) {
      const message =
        loadError instanceof ApiError
          ? loadError.message
          : 'Unable to load groups.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [page])

  useEffect(() => {
    void loadGroups()
  }, [loadGroups])

  const filteredGroups = useMemo(
    () => groups.filter((group) => matchesSearch(group, appliedQuery)),
    [appliedQuery, groups],
  )

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAppliedQuery(searchQuery.trim())
  }

  const openCreateModal = () => {
    setEditingGroup(null)
    setModalMode('create')
  }

  const openEditModal = (group: Group) => {
    setEditingGroup(group)
    setModalMode('edit')
  }

  const closeModal = () => {
    if (isSaving) {
      return
    }
    setModalMode(null)
    setEditingGroup(null)
  }

  const handleSaveGroup = async (values: { name: string; description: string }) => {
    setIsSaving(true)

    try {
      if (modalMode === 'create') {
        const created = await createGroup(values)
        showToast('Group created successfully.', 'success')
        closeModal()
        navigate(`/coordinator/groups/${created.id}`)
        return
      }

      if (editingGroup) {
        await updateGroup(editingGroup.id, values)
        showToast('Group updated successfully.', 'success')
        closeModal()
        await loadGroups()
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteGroup = async (group: Group) => {
    const confirmed = window.confirm(
      `Delete "${group.name}"? This cannot be undone.`,
    )
    if (!confirmed) {
      return
    }

    try {
      await deleteGroup(group.id)
      showToast('Group deleted successfully.', 'success')
      await loadGroups()
    } catch (deleteError) {
      const message =
        deleteError instanceof ApiError
          ? deleteError.message
          : 'Unable to delete group.'
      showToast(message, 'error')
    }
  }

  return (
    <DashboardLayout>
      <section className="admin-page coordinator-groups">
        <header className="admin-page__header">
          <div>
            <h1>Candidate groups</h1>
            <p>Organize candidates into cohorts for assignments and reporting.</p>
          </div>
          <Button onClick={openCreateModal}>Create group</Button>
        </header>

        <form className="admin-page__toolbar" onSubmit={handleSearchSubmit}>
          <label>
            Search
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by name or description"
            />
          </label>
          <Button type="submit" variant="secondary">
            Apply
          </Button>
        </form>

        {error ? (
          <p className="coordinator-groups__status coordinator-groups__status--error" role="alert">
            {error}
          </p>
        ) : null}

        {isLoading ? (
          <p className="coordinator-groups__status coordinator-groups__status--info">
            Loading groups...
          </p>
        ) : filteredGroups.length === 0 ? (
          <p className="coordinator-groups__empty">
            {appliedQuery
              ? 'No groups match your search on this page.'
              : 'No groups yet. Create your first candidate group to get started.'}
          </p>
        ) : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Members</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredGroups.map((group) => (
                  <tr key={group.id}>
                    <td>
                      <Link to={`/coordinator/groups/${group.id}`}>{group.name}</Link>
                      {group.description ? (
                        <p className="coordinator-groups__empty">{group.description}</p>
                      ) : null}
                    </td>
                    <td>{group.member_count}</td>
                    <td>{group.is_active ? 'Active' : 'Inactive'}</td>
                    <td>{new Date(group.updated_at).toLocaleString()}</td>
                    <td>
                      <div className="admin-table__actions">
                        <Button
                          variant="secondary"
                          onClick={() => navigate(`/coordinator/groups/${group.id}`)}
                        >
                          View
                        </Button>
                        <Button variant="secondary" onClick={() => openEditModal(group)}>
                          Edit
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => void handleDeleteGroup(group)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="admin-page__pagination">
          <span>
            Page {page} of {totalPages} ({totalCount} total)
          </span>
          <div className="admin-table__actions">
            <Button
              variant="secondary"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              disabled={page >= totalPages || isLoading}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </section>

      <EditGroupModal
        mode={modalMode === 'edit' ? 'edit' : 'create'}
        initialGroup={editingGroup}
        isOpen={modalMode !== null}
        isSaving={isSaving}
        onClose={closeModal}
        onSubmit={handleSaveGroup}
      />
    </DashboardLayout>
  )
}
