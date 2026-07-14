import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  checkSystemAdminAccess,
  createRole,
  createUser,
  listRoles,
  listUsers,
  updateRole,
  updateUser,
} from './admin'
import { clearTokens, setTokens } from './authStorage'

const sampleRole = {
  id: 1,
  key: 'SYSTEM_ADMIN',
  name: 'System Administrator',
  description: 'Full platform administration',
  is_active: true,
}

const sampleUser = {
  id: 10,
  email: 'user@example.com',
  username: 'user@example.com',
  first_name: 'Test',
  last_name: 'User',
  is_active: true,
  roles: [sampleRole],
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('admin API client', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    clearTokens()
  })

  it('listUsers fetches users with search and pagination', async () => {
    setTokens('access-token', 'refresh-token')
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        count: 1,
        next: null,
        previous: null,
        results: [sampleUser],
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await listUsers('user@', 2)

    expect(result.results).toHaveLength(1)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/users/?email=user%40&page=2&page_size=20',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token',
        }),
      }),
    )
  })

  it('createUser creates a user and assigns roles', async () => {
    setTokens('access-token', 'refresh-token')
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(
          {
            ...sampleUser,
            roles: [],
          },
          201,
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          ...sampleUser,
          roles: [sampleRole],
        }),
      )
    vi.stubGlobal('fetch', fetchMock)

    const result = await createUser({
      email: 'user@example.com',
      first_name: 'Test',
      last_name: 'User',
      roles: ['SYSTEM_ADMIN'],
    })

    expect(result.roles).toHaveLength(1)
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/admin/users/',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/admin/users/10/assign-role/',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('updateUser patches user fields and syncs roles', async () => {
    setTokens('access-token', 'refresh-token')
    const candidateRole = {
      id: 2,
      key: 'CANDIDATE',
      name: 'Candidate',
      description: '',
      is_active: true,
    }
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(sampleUser))
      .mockResolvedValueOnce(jsonResponse({ ...sampleUser, first_name: 'Updated' }))
      .mockResolvedValueOnce(jsonResponse({ ...sampleUser, first_name: 'Updated', roles: [candidateRole, sampleRole] }))
      .mockResolvedValueOnce(jsonResponse({ ...sampleUser, first_name: 'Updated', roles: [candidateRole] }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await updateUser(10, {
      first_name: 'Updated',
      roles: ['CANDIDATE'],
    })

    expect(result.roles.map((role) => role.key)).toEqual(['CANDIDATE'])
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/users/10/remove-role/',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('listRoles fetches roles', async () => {
    setTokens('access-token', 'refresh-token')
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        count: 1,
        next: null,
        previous: null,
        results: [sampleRole],
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await listRoles()

    expect(result.results[0].key).toBe('SYSTEM_ADMIN')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/roles/',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token',
        }),
      }),
    )
  })

  it('createRole posts a new role', async () => {
    setTokens('access-token', 'refresh-token')
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(sampleRole, 201))
    vi.stubGlobal('fetch', fetchMock)

    const result = await createRole({
      key: 'CUSTOM',
      name: 'Custom Role',
      description: 'A custom role',
    })

    expect(result.key).toBe('SYSTEM_ADMIN')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/roles/',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('updateRole patches role details', async () => {
    setTokens('access-token', 'refresh-token')
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ ...sampleRole, name: 'Updated Admin' }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await updateRole(1, { name: 'Updated Admin' })

    expect(result.name).toBe('Updated Admin')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/roles/1/',
      expect.objectContaining({ method: 'PATCH' }),
    )
  })

  it('checkSystemAdminAccess returns false on forbidden', async () => {
    setTokens('access-token', 'refresh-token')
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ detail: 'Forbidden' }, 403),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(checkSystemAdminAccess()).resolves.toBe(false)
  })
})
