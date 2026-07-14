import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { DashboardLayout } from '@components/templates/DashboardLayout'
import { Button } from '@components/atoms/Button'
import { useToast } from '@components/Toast'
import {
  ApiError,
  addMembers,
  getGroup,
  removeMembers,
  updateGroup,
} from '@/api/groups'
import type { GroupDetail as GroupDetailType, GroupMember } from '@/types/groups'
import { filterValidEmails, parseAndDedupeEmails } from '@/utils/groupEmails'
import { EditGroupModal } from './EditGroupModal'
import '../admin/admin.css'
import './groups.css'

const MEMBER_PAGE_SIZE = 10

function formatMemberName(member: GroupMember): string {
  const parts = [member.first_name, member.last_name].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : member.email
}

export function GroupDetail() {
  const { id } = useParams<{ id: string }>()
  const { showToast } = useToast()
  const [group, setGroup] = useState<GroupDetailType | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [emailInput, setEmailInput] = useState('')
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([])
  const [memberPage, setMemberPage] = useState(1)
  const [isSubmittingMembers, setIsSubmittingMembers] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isSavingGroup, setIsSavingGroup] = useState(false)

  const loadGroup = useCallback(async () => {
    if (!id) {
      setError('Group id is missing.')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const detail = await getGroup(id)
      setGroup(detail)
      setSelectedMemberIds([])
      setMemberPage(1)
    } catch (loadError) {
      const message =
        loadError instanceof ApiError ? loadError.message : 'Unable to load group.'
      setError(message)
      setGroup(null)
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    void loadGroup()
  }, [loadGroup])

  const paginatedMembers = useMemo(() => {
    const allMembers = group?.members ?? []
    const start = (memberPage - 1) * MEMBER_PAGE_SIZE
    return allMembers.slice(start, start + MEMBER_PAGE_SIZE)
  }, [group?.members, memberPage])

  const members = group?.members ?? []
  const totalMemberPages = Math.max(1, Math.ceil(members.length / MEMBER_PAGE_SIZE))

  const allVisibleSelected =
    paginatedMembers.length > 0 &&
    paginatedMembers.every((member) => selectedMemberIds.includes(member.id))

  const toggleMemberSelection = (memberId: number) => {
    setSelectedMemberIds((current) =>
      current.includes(memberId)
        ? current.filter((value) => value !== memberId)
        : [...current, memberId],
    )
  }

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      const visibleIds = new Set(paginatedMembers.map((member) => member.id))
      setSelectedMemberIds((current) =>
        current.filter((memberId) => !visibleIds.has(memberId)),
      )
      return
    }

    const merged = new Set([
      ...selectedMemberIds,
      ...paginatedMembers.map((member) => member.id),
    ])
    setSelectedMemberIds([...merged])
  }

  const handleAddMembers = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!id) {
      return
    }

    const parsed = parseAndDedupeEmails(emailInput)
    const { valid, invalid } = filterValidEmails(parsed)

    if (invalid.length > 0) {
      showToast(`Invalid email address(es): ${invalid.join(', ')}`, 'error')
    }

    if (valid.length === 0) {
      showToast('Enter at least one valid email address.', 'error')
      return
    }

    setIsSubmittingMembers(true)

    try {
      const result = await addMembers(id, { emails: valid })
      setGroup(result.group)
      setEmailInput('')

      const addedCount = result.added?.length ?? 0
      const alreadyCount = result.already_members?.length ?? 0
      const invalidCount = result.invalid_users?.length ?? 0
      const notFoundCount =
        (result.not_found.user_ids?.length ?? 0) +
        (result.not_found.emails?.length ?? 0)

      showToast(
        `Added ${addedCount} member(s). ${alreadyCount} already in group. ${invalidCount} invalid. ${notFoundCount} not found.`,
        addedCount > 0 ? 'success' : 'info',
      )
    } catch (submitError) {
      const message =
        submitError instanceof ApiError
          ? submitError.message
          : 'Unable to add members.'
      showToast(message, 'error')
    } finally {
      setIsSubmittingMembers(false)
    }
  }

  const handleRemoveSelected = async () => {
    if (!id || selectedMemberIds.length === 0) {
      return
    }

    const confirmed = window.confirm(
      `Remove ${selectedMemberIds.length} selected member(s) from this group?`,
    )
    if (!confirmed) {
      return
    }

    setIsSubmittingMembers(true)

    try {
      const result = await removeMembers(id, { userIds: selectedMemberIds })
      setGroup(result.group)
      setSelectedMemberIds([])

      const removedCount = result.removed?.length ?? 0
      showToast(`Removed ${removedCount} member(s).`, 'success')
    } catch (submitError) {
      const message =
        submitError instanceof ApiError
          ? submitError.message
          : 'Unable to remove members.'
      showToast(message, 'error')
    } finally {
      setIsSubmittingMembers(false)
    }
  }

  const handleSaveGroup = async (values: { name: string; description: string }) => {
    if (!group) {
      return
    }

    setIsSavingGroup(true)

    try {
      const updated = await updateGroup(group.id, values)
      setGroup((current) =>
        current
          ? {
              ...current,
              ...updated,
              members: current.members,
            }
          : current,
      )
      showToast('Group updated successfully.', 'success')
      setIsEditOpen(false)
    } finally {
      setIsSavingGroup(false)
    }
  }

  return (
    <DashboardLayout>
      <section className="admin-page coordinator-groups">
        <Link to="/coordinator/groups" className="coordinator-groups__back">
          ← Back to groups
        </Link>

        {isLoading ? (
          <p className="coordinator-groups__status coordinator-groups__status--info">
            Loading group...
          </p>
        ) : null}

        {error ? (
          <p className="coordinator-groups__status coordinator-groups__status--error" role="alert">
            {error}
          </p>
        ) : null}

        {group ? (
          <>
            <header className="admin-page__header">
              <div>
                <h1>{group.name}</h1>
                <p>{group.description || 'No description provided.'}</p>
              </div>
              <Button variant="secondary" onClick={() => setIsEditOpen(true)}>
                Edit group
              </Button>
            </header>

            <dl className="coordinator-groups__meta">
              <div>
                <dt>Members</dt>
                <dd>{group.member_count}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{group.is_active ? 'Active' : 'Inactive'}</dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{new Date(group.created_at).toLocaleString()}</dd>
              </div>
              <div>
                <dt>Updated</dt>
                <dd>{new Date(group.updated_at).toLocaleString()}</dd>
              </div>
            </dl>

            <section className="coordinator-groups__panel">
              <h2>Add members by email</h2>
              <p className="coordinator-groups__empty">
                Enter one or more email addresses separated by commas, semicolons, or new lines.
              </p>
              <form onSubmit={handleAddMembers}>
                <textarea
                  className="coordinator-groups__textarea"
                  value={emailInput}
                  onChange={(event) => setEmailInput(event.target.value)}
                  placeholder="candidate1@example.com, candidate2@example.com"
                  disabled={isSubmittingMembers}
                />
                <div className="coordinator-groups__member-actions">
                  <Button type="submit" disabled={isSubmittingMembers}>
                    {isSubmittingMembers ? 'Adding...' : 'Add members'}
                  </Button>
                </div>
              </form>
            </section>

            <section className="coordinator-groups__panel">
              <div className="admin-page__header">
                <h2>Members</h2>
                <Button
                  variant="secondary"
                  disabled={selectedMemberIds.length === 0 || isSubmittingMembers}
                  onClick={() => void handleRemoveSelected()}
                >
                  Remove selected
                </Button>
              </div>

              {members.length === 0 ? (
                <p className="coordinator-groups__empty">This group has no members yet.</p>
              ) : (
                <>
                  <div className="admin-table-wrapper">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>
                            <input
                              type="checkbox"
                              aria-label="Select all members on this page"
                              checked={allVisibleSelected}
                              onChange={toggleSelectAllVisible}
                            />
                          </th>
                          <th>Name</th>
                          <th>Email</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedMembers.map((member) => (
                          <tr key={member.id}>
                            <td>
                              <input
                                type="checkbox"
                                aria-label={`Select ${member.email}`}
                                checked={selectedMemberIds.includes(member.id)}
                                onChange={() => toggleMemberSelection(member.id)}
                              />
                            </td>
                            <td>{formatMemberName(member)}</td>
                            <td>{member.email}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="admin-page__pagination">
                    <span>
                      Page {memberPage} of {totalMemberPages}
                    </span>
                    <div className="admin-table__actions">
                      <Button
                        variant="secondary"
                        disabled={memberPage <= 1}
                        onClick={() => setMemberPage((current) => Math.max(1, current - 1))}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="secondary"
                        disabled={memberPage >= totalMemberPages}
                        onClick={() => setMemberPage((current) => current + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </section>
          </>
        ) : null}
      </section>

      <EditGroupModal
        mode="edit"
        initialGroup={group}
        isOpen={isEditOpen}
        isSaving={isSavingGroup}
        onClose={() => {
          if (!isSavingGroup) {
            setIsEditOpen(false)
          }
        }}
        onSubmit={handleSaveGroup}
      />
    </DashboardLayout>
  )
}
