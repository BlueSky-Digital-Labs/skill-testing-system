import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StatusSummary } from './StatusSummary'
import type { StatusDto } from '@/api/monitoring.types'

const status: StatusDto = {
  test_id: 'test-1',
  assignment_count: 2,
  assignment_status_counts: { active: 2 },
  assignment_state_counts: { open: 2 },
  attempt_status_counts: { in_progress: 1, submitted: 1 },
  group_breakdown: [
    {
      group_id: 'group-1',
      group_name: 'Group A',
      member_count: 3,
      assignment_count: 1,
      not_started_count: 2,
      in_progress_count: 1,
      submitted_count: 0,
      attempt_status_counts: { in_progress: 1 },
    },
  ],
}

describe('StatusSummary', () => {
  it('renders aggregate counts', () => {
    render(<StatusSummary status={status} />)

    expect(screen.getByLabelText('Status summary')).toBeInTheDocument()
    expect(screen.getByText('Assignments')).toBeInTheDocument()
    expect(screen.getByText('Not started')).toBeInTheDocument()
    expect(screen.getByText('In progress')).toBeInTheDocument()
    expect(screen.getByText('Submitted')).toBeInTheDocument()
  })
})

describe('GroupBreakdownTable', () => {
  it('renders groups and triggers reminder action', async () => {
    const user = userEvent.setup()
    const onSendGroupReminders = vi.fn()

    const { GroupBreakdownTable } = await import('./GroupBreakdownTable')
    render(
      <GroupBreakdownTable
        groups={status.group_breakdown}
        isSendingGroupId={null}
        onSendGroupReminders={onSendGroupReminders}
      />,
    )

    expect(screen.getByText('Group A')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Send reminders' }))
    expect(onSendGroupReminders).toHaveBeenCalledWith('group-1')
  })
})

describe('ActionsBar', () => {
  it('calls send reminders with selected filters', async () => {
    const user = userEvent.setup()
    const onSendReminders = vi.fn()
    const onOnlyNonStartersChange = vi.fn()
    const onOnlyNonCompletersChange = vi.fn()

    const { ActionsBar } = await import('./ActionsBar')
    render(
      <ActionsBar
        onlyNonStarters={false}
        onlyNonCompleters={true}
        autoRefreshInterval={0}
        isRefreshing={false}
        isSendingReminders={false}
        onOnlyNonStartersChange={onOnlyNonStartersChange}
        onOnlyNonCompletersChange={onOnlyNonCompletersChange}
        onAutoRefreshIntervalChange={vi.fn()}
        onRefresh={vi.fn()}
        onSendReminders={onSendReminders}
      />,
    )

    await user.click(screen.getByLabelText('Only non-starters'))
    expect(onOnlyNonStartersChange).toHaveBeenCalledWith(true)

    await user.click(screen.getByRole('button', { name: 'Send reminders' }))
    expect(onSendReminders).toHaveBeenCalledTimes(1)
  })
})
