import { useMemo, useState, type ReactNode } from 'react'

export interface DataTableColumn<T> {
  key: string
  label: string
  sortable?: boolean
  render?: (row: T) => ReactNode
  sortValue?: (row: T) => string | number
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  rows: T[]
  rowKey: (row: T, index: number) => string
  pageSize?: number
  emptyMessage?: string
}

type SortDirection = 'asc' | 'desc'

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  pageSize = 10,
  emptyMessage = 'No data available.',
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [page, setPage] = useState(1)

  const sortedRows = useMemo(() => {
    if (!sortKey) {
      return rows
    }

    const column = columns.find((entry) => entry.key === sortKey)
    if (!column) {
      return rows
    }

    const getValue = column.sortValue
      ? column.sortValue
      : (row: T) => {
          const value = (row as Record<string, unknown>)[column.key]
          if (typeof value === 'number' || typeof value === 'string') {
            return value
          }
          return ''
        }

    return [...rows].sort((left, right) => {
      const leftValue = getValue(left)
      const rightValue = getValue(right)
      if (leftValue < rightValue) {
        return sortDirection === 'asc' ? -1 : 1
      }
      if (leftValue > rightValue) {
        return sortDirection === 'asc' ? 1 : -1
      }
      return 0
    })
  }, [columns, rows, sortDirection, sortKey])

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pageRows = sortedRows.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  )

  const handleSort = (column: DataTableColumn<T>) => {
    if (!column.sortable) {
      return
    }

    if (sortKey === column.key) {
      setSortDirection((previous) => (previous === 'asc' ? 'desc' : 'asc'))
      return
    }

    setSortKey(column.key)
    setSortDirection('asc')
    setPage(1)
  }

  if (rows.length === 0) {
    return <p className="reports-empty">{emptyMessage}</p>
  }

  return (
    <div className="reports-table-wrap">
      <table className="reports-table">
        <thead>
          <tr>
            {columns.map((column) => {
              const isSorted = sortKey === column.key
              const ariaSort = isSorted
                ? sortDirection === 'asc'
                  ? 'ascending'
                  : 'descending'
                : 'none'

              return (
                <th key={column.key} aria-sort={ariaSort}>
                  {column.sortable ? (
                    <button
                      type="button"
                      className="reports-table__sort"
                      onClick={() => handleSort(column)}
                    >
                      {column.label}
                      {isSorted ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : ''}
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {pageRows.map((row, index) => (
            <tr key={rowKey(row, index)}>
              {columns.map((column) => (
                <td key={column.key}>
                  {column.render
                    ? column.render(row)
                    : String((row as Record<string, unknown>)[column.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {sortedRows.length > pageSize ? (
        <div className="reports-table__pagination">
          <button
            type="button"
            className="reports-btn reports-btn--secondary"
            disabled={currentPage <= 1}
            onClick={() => setPage((previous) => Math.max(1, previous - 1))}
          >
            Previous
          </button>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            className="reports-btn reports-btn--secondary"
            disabled={currentPage >= totalPages}
            onClick={() => setPage((previous) => Math.min(totalPages, previous + 1))}
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  )
}
