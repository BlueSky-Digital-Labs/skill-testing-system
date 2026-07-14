import type { AssignmentRow, AssignmentState, AssignmentStatus } from './api'

export interface AssignmentTableFilters {
  state: string
  status: string
}

interface AssignmentsTableProps {
  rows: AssignmentRow[]
  filters: AssignmentTableFilters
  isLoading?: boolean
  onFilterChange: (filters: AssignmentTableFilters) => void
}

const STATE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All states' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'open', label: 'Open' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'closed', label: 'Closed' },
  { value: 'archived', label: 'Archived' },
]

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
]

function formatDateTime(value: string | null): string {
  if (!value) {
    return '—'
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

function formatAssignee(row: AssignmentRow): string {
  if (row.assignee_user_id) {
    return `User ${row.assignee_user_id}`
  }
  if (row.assignee_group_id) {
    return `Group ${row.assignee_group_id}`
  }
  return '—'
}

export const AssignmentsTable = ({
  rows,
  filters,
  isLoading = false,
  onFilterChange,
}: AssignmentsTableProps) => {
  const updateFilter = (field: keyof AssignmentTableFilters, value: string) => {
    onFilterChange({ ...filters, [field]: value })
  }

  return (
    <section className="assign-table-section">
      <div className="assign-table-section__header">
        <h2>Existing assignments</h2>
        <div className="assign-table-filters">
          <label htmlFor="assign-filter-state">
            State
            <select
              id="assign-filter-state"
              value={filters.state}
              onChange={(event) => updateFilter('state', event.target.value)}
            >
              {STATE_OPTIONS.map((option) => (
                <option key={option.value || 'all-states'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label htmlFor="assign-filter-status">
            Status
            <select
              id="assign-filter-status"
              value={filters.status}
              onChange={(event) => updateFilter('status', event.target.value)}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value || 'all-statuses'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {isLoading ? (
        <p>Loading assignments...</p>
      ) : rows.length === 0 ? (
        <p>No assignments match the current filters.</p>
      ) : (
        <div className="assign-table-wrapper">
          <table className="grading-table assign-table">
            <thead>
              <tr>
                <th>Assignee</th>
                <th>Opens</th>
                <th>Due</th>
                <th>Closes</th>
                <th>Attempts</th>
                <th>State</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{formatAssignee(row)}</td>
                  <td>{formatDateTime(row.opens_at)}</td>
                  <td>{formatDateTime(row.due_at)}</td>
                  <td>{formatDateTime(row.closes_at)}</td>
                  <td>{row.max_attempts}</td>
                  <td>
                    <span className={`assign-badge assign-badge--${row.state as AssignmentState}`}>
                      {row.state}
                    </span>
                  </td>
                  <td>
                    <span className={`assign-badge assign-badge--status-${row.status as AssignmentStatus}`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
