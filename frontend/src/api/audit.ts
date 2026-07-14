import { ApiError } from './auth'
import { authorizedFetch, getApiBase } from './client'
import type {
  AuditLogListResponse,
  GetAuditLogsParams,
  VerifyAuditChainResponse,
} from './audit.types'

export type {
  AuditFilterState,
  AuditLogListResponse,
  AuditLogRow,
  AuditPageState,
  GetAuditLogsParams,
  VerifyAuditChainResponse,
} from './audit.types'

const DEFAULT_PAGE_SIZE = 20

function extractErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') {
    return fallback
  }

  const data = payload as Record<string, unknown>

  if (typeof data.detail === 'string') {
    return data.detail
  }

  const firstFieldError = Object.values(data).find(
    (value) => Array.isArray(value) && typeof value[0] === 'string',
  ) as string[] | undefined

  if (firstFieldError?.[0]) {
    return firstFieldError[0]
  }

  return fallback
}

async function parseAuditResponse<T>(response: Response, fallback: string): Promise<T> {
  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new ApiError(extractErrorMessage(payload, fallback), response.status)
  }

  return payload as T
}

export async function getAuditLogs({
  actor,
  action,
  entity_type,
  entity_id,
  from,
  to,
  page = 1,
  page_size = DEFAULT_PAGE_SIZE,
}: GetAuditLogsParams = {}): Promise<AuditLogListResponse> {
  const params = new URLSearchParams()

  if (actor) {
    params.set('actor', actor)
  }
  if (action) {
    params.set('action', action)
  }
  if (entity_type) {
    params.set('entity_type', entity_type)
  }
  if (entity_id) {
    params.set('entity_id', entity_id)
  }
  if (from) {
    params.set('from', from)
  }
  if (to) {
    params.set('to', to)
  }
  params.set('page', String(page))
  params.set('page_size', String(page_size))

  const query = params.toString()
  const url = `${getApiBase()}/audit/logs/${query ? `?${query}` : ''}`
  const response = await authorizedFetch(url)

  return parseAuditResponse<AuditLogListResponse>(
    response,
    'Unable to load audit logs.',
  )
}

export async function verifyAuditChain(): Promise<VerifyAuditChainResponse> {
  const response = await authorizedFetch(`${getApiBase()}/audit/verify/`)
  return parseAuditResponse<VerifyAuditChainResponse>(
    response,
    'Unable to verify audit chain.',
  )
}
