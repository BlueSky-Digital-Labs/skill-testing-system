import type { ReportFilters } from './components/FiltersBar'

export const REPORT_FILTER_STORAGE_PREFIX = 'reports-filters:'

export function loadReportFilters(
  storageKey: string,
  defaults: ReportFilters,
): ReportFilters {
  if (typeof window === 'undefined') {
    return defaults
  }

  try {
    const raw = window.sessionStorage.getItem(`${REPORT_FILTER_STORAGE_PREFIX}${storageKey}`)
    if (!raw) {
      return defaults
    }

    const parsed = JSON.parse(raw) as ReportFilters
    return { ...defaults, ...parsed }
  } catch {
    return defaults
  }
}

export function persistReportFilters(storageKey: string, filters: ReportFilters) {
  window.sessionStorage.setItem(
    `${REPORT_FILTER_STORAGE_PREFIX}${storageKey}`,
    JSON.stringify(filters),
  )
}

export function toIsoDateTime(localValue: string): string | undefined {
  if (!localValue) {
    return undefined
  }

  const date = new Date(localValue)
  if (Number.isNaN(date.getTime())) {
    return undefined
  }

  return date.toISOString()
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return '—'
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}
