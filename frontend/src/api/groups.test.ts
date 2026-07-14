import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  addMembers,
  checkCoordinatorAccess,
  createGroup,
  deleteGroup,
  getGroup,
  listGroups,
  removeMembers,
  updateGroup,
} from './groups'

describe('groups API client', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('listGroups returns results from paginated response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              id: 'group-1',
              name: 'Spring Cohort',
              description: 'Spring intake',
              is_active: true,
              member_count: 2,
              created_at: '2026-01-01T00:00:00Z',
              updated_at: '2026-01-01T00:00:00Z',
            },
          ],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const groups = await listGroups()

    expect(groups).toHaveLength(1)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/core/groups/?page=1',
      expect.any(Object),
    )
  })

  it('createGroup posts snake_case payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'group-1',
          name: 'New Group',
          description: 'Details',
          is_active: true,
          member_count: 0,
          members: [],
          created_by_id: 1,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        }),
        {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const group = await createGroup({ name: 'New Group', description: 'Details' })

    expect(group.name).toBe('New Group')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/core/groups/',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          name: 'New Group',
          description: 'Details',
          is_active: true,
        }),
      }),
    )
  })

  it('updateGroup patches group fields', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'group-1',
          name: 'Updated',
          description: 'Updated description',
          is_active: true,
          member_count: 0,
          members: [],
          created_by_id: 1,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-02T00:00:00Z',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const group = await updateGroup('group-1', { name: 'Updated' })

    expect(group.name).toBe('Updated')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/core/groups/group-1/',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated' }),
      }),
    )
  })

  it('deleteGroup sends DELETE request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    await deleteGroup('group-1')

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/core/groups/group-1/',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('getGroup fetches group detail', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'group-1',
          name: 'Detail Group',
          description: '',
          is_active: true,
          member_count: 1,
          members: [{ id: 1, email: 'a@example.com', first_name: '', last_name: '' }],
          created_by_id: 1,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const group = await getGroup('group-1')

    expect(group.members).toHaveLength(1)
  })

  it('addMembers maps camelCase ids to snake_case payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          group: {
            id: 'group-1',
            name: 'Group',
            description: '',
            is_active: true,
            member_count: 1,
            members: [],
            created_by_id: 1,
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          },
          added: [],
          already_members: [],
          invalid_users: [],
          not_found: { user_ids: [], emails: [] },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    await addMembers('group-1', {
      userIds: [1, 2],
      emails: ['a@example.com'],
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/core/groups/group-1/add-members/',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          user_ids: [1, 2],
          emails: ['a@example.com'],
        }),
      }),
    )
  })

  it('removeMembers maps camelCase ids to snake_case payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          group: {
            id: 'group-1',
            name: 'Group',
            description: '',
            is_active: true,
            member_count: 0,
            members: [],
            created_by_id: 1,
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          },
          removed: [],
          not_members: [],
          not_found: { user_ids: [], emails: [] },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    await removeMembers('group-1', { userIds: [3] })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/core/groups/group-1/remove-members/',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          user_ids: [3],
          emails: [],
        }),
      }),
    )
  })

  it('checkCoordinatorAccess returns false on 403', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 403 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(checkCoordinatorAccess()).resolves.toBe(false)
  })

  it('checkCoordinatorAccess returns true on success', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ count: 0, next: null, previous: null, results: [] }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(checkCoordinatorAccess()).resolves.toBe(true)
  })
})
