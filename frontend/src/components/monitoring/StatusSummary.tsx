import type { StatusDto } from '@/api/monitoring.types'
import './monitoring.css'

interface StatusSummaryProps {
  status: StatusDto
}

function sumCounts(counts: Record<string, number>): number {
  return Object.values(counts).reduce((total, value) => total + value, 0)
}

export function StatusSummary({ status }: StatusSummaryProps) {
  const submitted =
    (status.attempt_status_counts.submitted ?? 0) +
    (status.attempt_status_counts.auto_submitted ?? 0)
  const inProgress = status.attempt_status_counts.in_progress ?? 0
  const notStarted = status.group_breakdown.reduce(
    (total, group) => total + group.not_started_count,
    0,
  )

  return (
    <section className="monitoring-summary" aria-label="Status summary">
      <div className="monitoring-summary__card">
        <span className="monitoring-summary__label">Assignments</span>
        <strong className="monitoring-summary__value">{status.assignment_count}</strong>
      </div>
      <div className="monitoring-summary__card">
        <span className="monitoring-summary__label">Active assignments</span>
        <strong className="monitoring-summary__value">
          {status.assignment_status_counts.active ?? 0}
        </strong>
      </div>
      <div className="monitoring-summary__card">
        <span className="monitoring-summary__label">Not started</span>
        <strong className="monitoring-summary__value">{notStarted}</strong>
      </div>
      <div className="monitoring-summary__card">
        <span className="monitoring-summary__label">In progress</span>
        <strong className="monitoring-summary__value">{inProgress}</strong>
      </div>
      <div className="monitoring-summary__card">
        <span className="monitoring-summary__label">Submitted</span>
        <strong className="monitoring-summary__value">{submitted}</strong>
      </div>
      <div className="monitoring-summary__card">
        <span className="monitoring-summary__label">Total attempts</span>
        <strong className="monitoring-summary__value">
          {sumCounts(status.attempt_status_counts)}
        </strong>
      </div>
    </section>
  )
}
