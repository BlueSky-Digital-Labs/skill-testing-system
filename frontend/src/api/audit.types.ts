export interface AuditLogRow {
  id: number
  timestamp: string
  actor_id: string
  actor_display: string
  action: string
  entity_type: string
  entity_id: string
  metadata: Record<string, unknown>
  prev_hash: string
  hash: string
}

export interface AuditLogListResponse {
  count: number
  page: number
  page_size: number
  results: AuditLogRow[]
}

export interface GetAuditLogsParams {
  actor?: string
  action?: string
  entity_type?: string
  entity_id?: string
  from?: string
  to?: string
  page?: number
  page_size?: number
}

export interface VerifyAuditChainResponse {
  valid: boolean
  total_entries: number
  broken_at_id: number | null
  message: string
}

export interface AuditFilterState {
  actor: string
  action: string
  entity_type: string
  entity_id: string
  from: string
  to: string
}

export interface AuditPageState {
  filters: AuditFilterState
  page: number
  page_size: number
}
