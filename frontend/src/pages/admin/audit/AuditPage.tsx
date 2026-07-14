import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { DashboardLayout } from '@components/templates/DashboardLayout'
import { Button } from '@components/atoms/Button'
import { ApiError } from '@/api/auth'
import {
  getAuditLogs,
  verifyAuditChain,
  type AuditLogRow,
  type AuditPageState,
} from '@/api/audit'
import { Filters } from './components/Filters'
import { defaultAuditFilters } from './constants'
import { JsonPreview } from './components/JsonPreview'
import { CopyToClipboard } from './components/CopyToClipboard'
import '@components/grading/grading.css'
import './AuditPage.css'

const SESSION_STORAGE_KEY = 'audit-log-viewer-state'
const DEFAULT_PAGE_SIZE = 20

function loadPersistedState(): AuditPageState {
  if (typeof window === 'undefined') {
    return {
      filters: defaultAuditFilters,
      page: 1,
      page_size: DEFAULT_PAGE_SIZE,
    }
  }

  try {
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (!raw) {
      return {
        filters: defaultAuditFilters,
        page: 1,
        page_size: DEFAULT_PAGE_SIZE,
      }
    }

    const parsed = JSON.parse(raw) as Partial<AuditPageState>
    return {
      filters: { ...defaultAuditFilters, ...parsed.filters },
      page: parsed.page && parsed.page > 0 ? parsed.page : 1,
      page_size: parsed.page_size && parsed.page_size > 0 ? parsed.page_size : DEFAULT_PAGE_SIZE,
    }
  } catch {
    return {
      filters: defaultAuditFilters,
      page: 1,
      page_size: DEFAULT_PAGE_SIZE,
    }
  }
}

function persistState(state: AuditPageState) {
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(state))
}

function toIsoDateTime(localValue: string): string | undefined {
  if (!localValue) {
    return undefined
  }

  const date = new Date(localValue)
  if (Number.isNaN(date.getTime())) {
    return undefined
  }

  return date.toISOString()
}

function formatTimestamp(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

export const AuditPage = () => {
  const initialState = useMemo(() => loadPersistedState(), [])
  const [filters, setFilters] = useState(initialState.filters)
  const [page, setPage] = useState(initialState.page)
  const [pageSize] = useState(initialState.page_size)
  const [rows, setRows] = useState<AuditLogRow[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [expandedRowIds, setExpandedRowIds] = useState<Set<number>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null)
  const [verifySuccess, setVerifySuccess] = useState<boolean | null>(null)

  const pageState = useMemo(
    () => ({ filters, page, page_size: pageSize }),
    [filters, page, pageSize],
  )

  useEffect(() => {
    persistState(pageState)
  }, [pageState])

  const loadLogs = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await getAuditLogs({
        actor: filters.actor || undefined,
        action: filters.action || undefined,
        entity_type: filters.entity_type || undefined,
        entity_id: filters.entity_id || undefined,
        from: toIsoDateTime(filters.from),
        to: toIsoDateTime(filters.to),
        page,
        page_size: pageSize,
      })

      setRows(response.results)
      setTotalCount(response.count)
    } catch (loadError) {
      const message =
        loadError instanceof ApiError
          ? loadError.message
          : 'Unable to load audit logs.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [filters, page, pageSize])

  useEffect(() => {
    void loadLogs()
  }, [loadLogs])

  const handleFiltersChange = useCallback((nextFilters: typeof filters) => {
    setFilters(nextFilters)
    setPage(1)
    setExpandedRowIds(new Set())
  }, [])

  const handleResetFilters = () => {
    setFilters(defaultAuditFilters)
    setPage(1)
    setExpandedRowIds(new Set())
    setVerifyMessage(null)
    setVerifySuccess(null)
  }

  const toggleRowExpanded = (rowId: number) => {
    setExpandedRowIds((current) => {
      const next = new Set(current)
      if (next.has(rowId)) {
        next.delete(rowId)
      } else {
        next.add(rowId)
      }
      return next
    })
  }

  const handleVerifyChain = async () => {
    setIsVerifying(true)
    setVerifyMessage(null)
    setVerifySuccess(null)

    try {
      const result = await verifyAuditChain()
      setVerifySuccess(result.valid)
      setVerifyMessage(result.message)
    } catch (verifyError) {
      const message =
        verifyError instanceof ApiError
          ? verifyError.message
          : 'Unable to verify audit chain.'
      setVerifySuccess(false)
      setVerifyMessage(message)
    } finally {
      setIsVerifying(false)
    }
  }

  const hasPreviousPage = page > 1
  const hasNextPage = page * pageSize < totalCount
  const showingFrom = totalCount === 0 ? 0 : (page - 1) * pageSize + 1
  const showingTo = Math.min(page * pageSize, totalCount)

  return (
    <DashboardLayout>
      <div className="audit-page grading-page">
        <div className="audit-page__header grading-page__header">
          <div>
            <h1>Audit Log</h1>
            <p>Review hash-chained audit events and verify log integrity.</p>
          </div>
          <div className="audit-page__actions">
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleVerifyChain()}
              disabled={isVerifying || isLoading}
            >
              {isVerifying ? 'Verifying...' : 'Verify Chain'}
            </Button>
          </div>
        </div>

        {error && (
          <div className="audit-alert audit-alert--error grading-alert grading-alert--error" role="alert">
            {error}
          </div>
        )}

        {verifyMessage && (
          <div
            className={`audit-alert grading-alert ${
              verifySuccess ? 'audit-alert--success grading-alert--success' : 'audit-alert--error grading-alert--error'
            }`}
            role="status"
            aria-live="polite"
          >
            {verifyMessage}
          </div>
        )}

        <Filters values={filters} onChange={handleFiltersChange} onReset={handleResetFilters} />

        {isLoading ? (
          <div className="grading-panel audit-loading" aria-live="polite">
            Loading audit logs...
          </div>
        ) : rows.length === 0 ? (
          <div className="grading-panel audit-empty">No audit log entries found.</div>
        ) : (
          <div className="grading-panel audit-table-wrapper">
            <table className="audit-table grading-table">
              <thead>
                <tr>
                  <th scope="col">Timestamp</th>
                  <th scope="col">Actor</th>
                  <th scope="col">Action</th>
                  <th scope="col">Entity Type</th>
                  <th scope="col">Entity ID</th>
                  <th scope="col">Metadata</th>
                  <th scope="col">Hash</th>
                  <th scope="col">
                    <span className="sr-only">Expand row details</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const isExpanded = expandedRowIds.has(row.id)
                  const metadataPreview =
                    Object.keys(row.metadata ?? {}).length === 0
                      ? '—'
                      : `${Object.keys(row.metadata).length} field(s)`

                  return (
                    <Fragment key={row.id}>
                      <tr>
                        <td>{formatTimestamp(row.timestamp)}</td>
                        <td>{row.actor_display || row.actor_id || '—'}</td>
                        <td>{row.action}</td>
                        <td>{row.entity_type || '—'}</td>
                        <td>{row.entity_id || '—'}</td>
                        <td>{metadataPreview}</td>
                        <td className="audit-table__hash">{row.hash.slice(0, 12)}…</td>
                        <td>
                          <button
                            type="button"
                            className="audit-table__expand-btn"
                            aria-expanded={isExpanded}
                            aria-controls={`audit-row-details-${row.id}`}
                            onClick={() => toggleRowExpanded(row.id)}
                          >
                            {isExpanded ? 'Collapse' : 'Expand'}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="audit-row-details" id={`audit-row-details-${row.id}`}>
                          <td colSpan={8}>
                            <div className="audit-row-details__content">
                              <div className="audit-row-details__section">
                                <h3>Metadata</h3>
                                <JsonPreview value={row.metadata ?? {}} />
                              </div>
                              <div className="audit-row-details__section">
                                <h3>Hash</h3>
                                <code className="audit-table__hash">{row.hash}</code>
                                <CopyToClipboard value={row.hash} label="Copy hash" />
                              </div>
                              <div className="audit-row-details__section">
                                <h3>Previous Hash</h3>
                                <code className="audit-table__hash">{row.prev_hash || '—'}</code>
                                {row.prev_hash ? (
                                  <CopyToClipboard value={row.prev_hash} label="Copy previous hash" />
                                ) : null}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="audit-pagination grading-pagination">
          <span className="audit-pagination__meta grading-pagination__meta">
            Showing {showingFrom}–{showingTo} of {totalCount} entries
          </span>
          <div className="audit-pagination__buttons grading-pagination__buttons">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPage((current) => Math.max(current - 1, 1))}
              disabled={!hasPreviousPage || isLoading}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPage((current) => current + 1)}
              disabled={!hasNextPage || isLoading}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
