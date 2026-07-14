import type { AuditFilterState } from '@/api/audit.types'

export const defaultAuditFilters: AuditFilterState = {
  actor: '',
  action: '',
  entity_type: '',
  entity_id: '',
  from: '',
  to: '',
}
