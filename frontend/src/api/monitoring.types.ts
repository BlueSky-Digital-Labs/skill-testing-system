export interface GroupStatusSummary {
  group_id: string
  group_name: string
  member_count: number
  assignment_count: number
  not_started_count: number
  in_progress_count: number
  submitted_count: number
  attempt_status_counts: Record<string, number>
}

export interface StatusDto {
  test_id: string
  assignment_count: number
  assignment_status_counts: Record<string, number>
  assignment_state_counts: Record<string, number>
  attempt_status_counts: Record<string, number>
  group_breakdown: GroupStatusSummary[]
}

export interface SendRemindersBody {
  group_id?: string
  only_non_starters?: boolean
  only_non_completers?: boolean
}

export interface SendRemindersResult {
  recipients: number
  sent: number
}

export interface ResendInviteResult {
  message_log_id: string
  status: string
}
