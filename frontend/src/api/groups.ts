import { ApiError, apiFetch, parseResponse, postJson } from './client'
import type {
  Group,
  GroupDetail,
  MembershipResult,
  PaginatedGroups,
} from '@/types/groups'

const GROUPS_PATH = '/core/groups/'

export async function listGroupsPaginated(page = 1): Promise<PaginatedGroups> {
  const response = await apiFetch(`${GROUPS_PATH}?page=${page}`)
  return parseResponse<PaginatedGroups>(response, 'Unable to load groups.')
}

export async function listGroups(): Promise<Group[]> {
  const page = await listGroupsPaginated(1)
  return page.results
}

export async function createGroup(payload: {
  name: string
  description?: string
}): Promise<Group> {
  return postJson<GroupDetail>(
    GROUPS_PATH,
    {
      name: payload.name,
      description: payload.description ?? '',
      is_active: true,
    },
    'Unable to create group.',
  )
}

export async function updateGroup(
  id: string,
  payload: { name?: string; description?: string; is_active?: boolean },
): Promise<Group> {
  const response = await apiFetch(`${GROUPS_PATH}${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })

  return parseResponse<GroupDetail>(response, 'Unable to update group.')
}

export async function deleteGroup(id: string): Promise<void> {
  const response = await apiFetch(`${GROUPS_PATH}${id}/`, {
    method: 'DELETE',
  })

  await parseResponse<void>(response, 'Unable to delete group.')
}

export async function getGroup(id: string): Promise<GroupDetail> {
  const response = await apiFetch(`${GROUPS_PATH}${id}/`)
  return parseResponse<GroupDetail>(response, 'Unable to load group.')
}

export async function addMembers(
  id: string,
  payload: { userIds?: number[]; emails?: string[] },
): Promise<MembershipResult> {
  return postJson<MembershipResult>(
    `${GROUPS_PATH}${id}/add-members/`,
    {
      user_ids: payload.userIds ?? [],
      emails: payload.emails ?? [],
    },
    'Unable to add members.',
  )
}

export async function removeMembers(
  id: string,
  payload: { userIds?: number[]; emails?: string[] },
): Promise<MembershipResult> {
  return postJson<MembershipResult>(
    `${GROUPS_PATH}${id}/remove-members/`,
    {
      user_ids: payload.userIds ?? [],
      emails: payload.emails ?? [],
    },
    'Unable to remove members.',
  )
}

export async function checkCoordinatorAccess(): Promise<boolean> {
  try {
    const response = await apiFetch(GROUPS_PATH)
    if (response.status === 403) {
      return false
    }

    if (!response.ok) {
      await parseResponse(response, 'Unable to verify coordinator access.')
      return false
    }

    return true
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) {
      return false
    }
    throw error
  }
}

export { ApiError }
