import { ApiError } from './auth'
import { getApiBase } from './auth'
import { clearTokens } from './authStorage'
import { authorizedFetch } from './http'

export const SYSTEM_ADMIN_ROLE_KEY = 'SYSTEM_ADMIN'

export interface Role {
  id: number
  key: string
  name: string
  description: string
  is_active: boolean
}

export interface User {
  id: number
  email: string
  username: string
  first_name: string
  last_name: string
  is_active: boolean
  roles: Role[]
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export type FieldErrors = Record<string, string>

const DEFAULT_PAGE_SIZE = 20

function extractErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') {
    return fallback
  }

  const data = payload as Record<string, unknown>

  if (typeof data.detail === 'string') {
    return data.detail
  }

  if (Array.isArray(data.non_field_errors) && typeof data.non_field_errors[0] === 'string') {
    return data.non_field_errors[0]
  }

  const firstFieldError = Object.values(data).find(
    (value) => Array.isArray(value) && typeof value[0] === 'string',
  ) as string[] | undefined

  if (firstFieldError?.[0]) {
    return firstFieldError[0]
  }

  return fallback
}

export function extractFieldErrors(payload: unknown): FieldErrors {
  if (!payload || typeof payload !== 'object') {
    return {}
  }

  const data = payload as Record<string, unknown>
  const errors: FieldErrors = {}

  for (const [field, value] of Object.entries(data)) {
    if (field === 'detail') {
      continue
    }

    if (Array.isArray(value) && typeof value[0] === 'string') {
      errors[field] = value[0]
    }
  }

  return errors
}

function redirectToLogin(): void {
  if (typeof window !== 'undefined') {
    clearTokens()
    window.location.assign('/login')
  }
}

async function parseAdminResponse<T>(
  response: Response,
  fallbackMessage: string,
): Promise<T> {
  if (response.status === 401) {
    redirectToLogin()
  }

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    await throwAdminError(response, fallbackMessage)
  }

  return payload as T
}

async function throwAdminError(response: Response, fallbackMessage: string): Promise<never> {
  if (response.status === 401) {
    redirectToLogin()
  }

  const payload = await response.json().catch(() => null)
  const error = new ApiError(extractErrorMessage(payload, fallbackMessage), response.status)
  ;(error as ApiError & { fieldErrors?: FieldErrors }).fieldErrors = extractFieldErrors(payload)
  throw error
}

export async function listUsers(
  q?: string,
  page = 1,
): Promise<PaginatedResponse<User>> {
  const params = new URLSearchParams()
  if (q) {
    params.set('email', q)
  }
  params.set('page', String(page))
  params.set('page_size', String(DEFAULT_PAGE_SIZE))

  const query = params.toString()
  const response = await authorizedFetch(
    `${getApiBase()}/admin/users/${query ? `?${query}` : ''}`,
  )

  return parseAdminResponse<PaginatedResponse<User>>(
    response,
    'Unable to load users.',
  )
}

export async function createUser(payload: {
  email: string
  first_name?: string
  last_name?: string
  roles: string[]
  password?: string
}): Promise<User> {
  const { roles, ...userPayload } = payload

  const response = await authorizedFetch(`${getApiBase()}/admin/users/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...userPayload,
      is_active: true,
    }),
  })

  const created = await parseAdminResponse<User>(response, 'Unable to create user.')
  return syncUserRoles(created, [], roles)
}

export type UserUpdatePayload = Omit<Partial<User>, 'roles'> & {
  roles?: string[]
}

export async function updateUser(
  id: string | number,
  patch: UserUpdatePayload,
): Promise<User> {
  const { roles, ...userPatch } = patch
  let user = await getUserById(id)

  if (Object.keys(userPatch).length > 0) {
    const response = await authorizedFetch(`${getApiBase()}/admin/users/${id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userPatch),
    })
    user = await parseAdminResponse<User>(response, 'Unable to update user.')
  }

  if (roles !== undefined) {
    const existingKeys = user.roles.map((role) => role.key)
    return syncUserRoles(user, existingKeys, roles)
  }

  return user
}

async function getUserById(id: string | number): Promise<User> {
  const response = await authorizedFetch(`${getApiBase()}/admin/users/${id}/`)
  return parseAdminResponse<User>(response, 'Unable to load user.')
}

async function assignRole(userId: string | number, roleKey: string): Promise<User> {
  const response = await authorizedFetch(
    `${getApiBase()}/admin/users/${userId}/assign-role/`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role_key: roleKey }),
    },
  )
  return parseAdminResponse<User>(response, 'Unable to assign role.')
}

async function removeRole(userId: string | number, roleKey: string): Promise<User> {
  const response = await authorizedFetch(
    `${getApiBase()}/admin/users/${userId}/remove-role/`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role_key: roleKey }),
    },
  )
  return parseAdminResponse<User>(response, 'Unable to remove role.')
}

async function syncUserRoles(
  user: User,
  existingKeys: string[],
  desiredKeys: string[],
): Promise<User> {
  const existing = new Set(existingKeys)
  const desired = new Set(desiredKeys)

  let current = user

  for (const roleKey of desiredKeys) {
    if (!existing.has(roleKey)) {
      current = await assignRole(current.id, roleKey)
    }
  }

  for (const roleKey of existingKeys) {
    if (!desired.has(roleKey)) {
      current = await removeRole(current.id, roleKey)
    }
  }

  return current
}

export async function listRoles(): Promise<PaginatedResponse<Role>> {
  const response = await authorizedFetch(`${getApiBase()}/admin/roles/`)
  return parseAdminResponse<PaginatedResponse<Role>>(
    response,
    'Unable to load roles.',
  )
}

export async function createRole(payload: {
  key: string
  name: string
  description?: string
}): Promise<Role> {
  const response = await authorizedFetch(`${getApiBase()}/admin/roles/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...payload,
      is_active: true,
    }),
  })

  return parseAdminResponse<Role>(response, 'Unable to create role.')
}

export async function updateRole(id: number, patch: Partial<Role>): Promise<Role> {
  const response = await authorizedFetch(`${getApiBase()}/admin/roles/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })

  return parseAdminResponse<Role>(response, 'Unable to update role.')
}

export async function checkSystemAdminAccess(): Promise<boolean> {
  try {
    await listRoles()
    return true
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) {
      return false
    }
    throw error
  }
}