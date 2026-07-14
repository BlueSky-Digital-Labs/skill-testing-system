import { ApiError } from './auth'
import { authorizedFetch } from './http'
import { extractErrorMessage, getApiBase, parseResponse } from './client'
import type {
  ResendInviteResult,
  SendRemindersBody,
  SendRemindersResult,
  StatusDto,
} from './monitoring.types'

interface BackendReminderResponse {
  test_id: string
  sent_count: number
  failed_count: number
  details: Array<{ email: string; status: string }>
}

interface BackendResendInviteResponse {
  assignment_id: string
  sent_count: number
  throttled_count: number
  failed_count: number
  details: Array<{ email: string; status: string }>
}

function buildReminderPayload(body: SendRemindersBody): Record<string, unknown> {
  const payload: Record<string, unknown> = {}

  if (body.group_id) {
    payload.group_id = body.group_id
  }

  if (body.only_non_starters) {
    payload.include_not_started = true
    payload.include_in_progress = false
    payload.include_overdue = false
  } else if (body.only_non_completers) {
    payload.include_not_started = true
    payload.include_in_progress = true
    payload.include_overdue = true
  } else {
    payload.include_not_started = true
    payload.include_in_progress = true
    payload.include_overdue = true
  }

  return payload
}

export async function getTestStatus(
  testId: string,
  params?: { groupId?: string; includeGroups?: boolean },
): Promise<StatusDto> {
  if (!testId.trim()) {
    throw new ApiError('Test ID is required.', 400)
  }

  const response = await authorizedFetch(
    `${getApiBase()}/monitoring/tests/${encodeURIComponent(testId)}/status/`,
  )
  const status = await parseResponse<StatusDto>(
    response,
    'Unable to load monitoring status.',
  )

  if (params?.groupId) {
    status.group_breakdown = status.group_breakdown.filter(
      (group) => group.group_id === params.groupId,
    )
  }

  if (params?.includeGroups === false) {
    status.group_breakdown = []
  }

  return status
}

export async function sendReminders(
  testId: string,
  body: SendRemindersBody,
): Promise<SendRemindersResult> {
  if (!testId.trim()) {
    throw new ApiError('Test ID is required.', 400)
  }

  const response = await authorizedFetch(
    `${getApiBase()}/tests/${encodeURIComponent(testId)}/reminders/`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildReminderPayload(body)),
    },
  )

  const payload = await parseResponse<BackendReminderResponse>(
    response,
    'Unable to send reminders.',
  )

  return {
    recipients: payload.sent_count + payload.failed_count,
    sent: payload.sent_count,
  }
}

export async function resendInvite(assignmentId: string): Promise<ResendInviteResult> {
  if (!assignmentId.trim()) {
    throw new ApiError('Assignment ID is required.', 400)
  }

  const response = await authorizedFetch(
    `${getApiBase()}/assignments/${encodeURIComponent(assignmentId)}/resend-invite/`,
    { method: 'POST' },
  )

  const payload = await parseResponse<BackendResendInviteResponse>(
    response,
    'Unable to resend invite.',
  )

  const firstDetail = payload.details[0]
  let status = 'failed'
  if (payload.sent_count > 0) {
    status = 'sent'
  } else if (payload.throttled_count > 0) {
    status = 'throttled'
  } else if (firstDetail?.status) {
    status = firstDetail.status
  }

  return {
    message_log_id: payload.assignment_id,
    status,
  }
}

export function getMonitoringErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return 'You do not have permission to access monitoring.'
    }
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return fallback
}

export { extractErrorMessage }
