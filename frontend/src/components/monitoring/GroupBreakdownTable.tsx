import { Button } from '@components/atoms/Button'
import type { GroupStatusSummary } from '@/api/monitoring.types'
import './monitoring.css'

interface GroupBreakdownTableProps {
  groups: GroupStatusSummary[]
  isSendingGroupId: string | null
  onSendGroupReminders: (groupId: string) => void
}

export function GroupBreakdownTable({
  groups,
  isSendingGroupId,
  onSendGroupReminders,
}: GroupBreakdownTableProps) {
  if (groups.length === 0) {
    return <p className="monitoring-meta">No group breakdown available for this test.</p>
  }

  return (
    <div className="admin-table-wrapper">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Group</th>
            <th>Members</th>
            <th>Not started</th>
            <th>In progress</th>
            <th>Submitted</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <tr key={group.group_id}>
              <td>
                <strong>{group.group_name || 'Unnamed group'}</strong>
                <div className="monitoring-meta">{group.group_id}</div>
              </td>
              <td>{group.member_count}</td>
              <td>{group.not_started_count}</td>
              <td>{group.in_progress_count}</td>
              <td>{group.submitted_count}</td>
              <td>
                <div className="monitoring-table__actions">
                  <Button
                    size="sm"
                    variant="outline"
                    isLoading={isSendingGroupId === group.group_id}
                    onClick={() => onSendGroupReminders(group.group_id)}
                  >
                    Send reminders
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
