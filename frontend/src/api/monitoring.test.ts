import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getTestStatus,
  resendInvite,
  sendReminders,
} from './monitoring'
import { clearTokens, setTokens } from './authStorage'

const statusPayload = {
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
      not_started_count: 1,
      in_progress_count: 1,
      submitted_count: 1,
      attempt_status_counts: { in_progress: 1, submitted: 1 },
    },
  ],
}

describe('monitoring API client', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    clearTokens()
  })

  it('getTestStatus fetches monitoring status', async () => {
    setTokens('access-token', 'refresh-token')
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(statusPayload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await getTestStatus('test-1')

    expect(result.test_id).toBe('test-1')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/monitoring/tests/test-1/status/',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token',
        }),
      }),
    )
  })

  it('getTestStatus filters groups client-side', async () => {
    setTokens('access-token', 'refresh-token')
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(statusPayload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await getTestStatus('test-1', { groupId: 'group-1' })

    expect(result.group_breakdown).toHaveLength(1)
    expect(result.group_breakdown[0].group_id).toBe('group-1')
  })

  it('sendReminders posts mapped payload for non-starters', async () => {
    setTokens('access-token', 'refresh-token')
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          test_id: 'test-1',
          sent_count: 2,
          failed_count: 0,
          details: [],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await sendReminders('test-1', {
      group_id: 'group-1',
      only_non_starters: true,
    })

    expect(result).toEqual({ recipients: 2, sent: 2 })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/tests/test-1/reminders/',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          group_id: 'group-1',
          include_not_started: true,
          include_in_progress: false,
          include_overdue: false,
        }),
      }),
    )
  })

  it('sendReminders posts mapped payload for non-completers', async () => {
    setTokens('access-token', 'refresh-token')
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          test_id: 'test-1',
          sent_count: 1,
          failed_count: 1,
          details: [],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await sendReminders('test-1', {
      only_non_completers: true,
    })

    expect(result).toEqual({ recipients: 2, sent: 1 })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/tests/test-1/reminders/',
      expect.objectContaining({
        body: JSON.stringify({
          include_not_started: true,
          include_in_progress: true,
          include_overdue: true,
        }),
      }),
    )
  })

  it('resendInvite posts to the resend endpoint', async () => {
    setTokens('access-token', 'refresh-token')
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          assignment_id: 'assignment-1',
          sent_count: 1,
          throttled_count: 0,
          failed_count: 0,
          details: [{ email: 'candidate@example.com', status: 'sent' }],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await resendInvite('assignment-1')

    expect(result).toEqual({
      message_log_id: 'assignment-1',
      status: 'sent',
    })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/assignments/assignment-1/resend-invite/',
      expect.objectContaining({ method: 'POST' }),
    )
  })
})
