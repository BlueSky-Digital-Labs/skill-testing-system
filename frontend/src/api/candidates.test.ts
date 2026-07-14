import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  acceptInvite,
  selfRegister,
  validateInviteToken,
} from './candidates'

describe('candidates API client', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('selfRegister posts registration payload and returns session', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          user: {
            id: 1,
            email: 'candidate@example.com',
            date_joined: '2026-01-01T00:00:00Z',
            is_active: true,
          },
          access: 'access-token',
          refresh: 'refresh-token',
        }),
        {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await selfRegister({
      email: 'candidate@example.com',
      password: 'SecurePass123!',
      password_confirm: 'SecurePass123!',
      first_name: 'Test',
      last_name: 'Candidate',
    })

    expect(result.access).toBe('access-token')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/self-register/',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          email: 'candidate@example.com',
          password: 'SecurePass123!',
          password_confirm: 'SecurePass123!',
          first_name: 'Test',
          last_name: 'Candidate',
        }),
      }),
    )
  })

  it('validateInviteToken treats password errors as a valid token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ password: ['This password is too short.'] }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await validateInviteToken('invite-token')

    expect(result).toEqual({ valid: true })
  })

  it('validateInviteToken reports token errors as invalid', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ token: ['Invalid or expired token'] }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await validateInviteToken('bad-token')

    expect(result).toEqual({
      valid: false,
      message: 'Invalid or expired token',
    })
  })

  it('validateInviteToken reports missing token as invalid', async () => {
    const result = await validateInviteToken('')

    expect(result).toEqual({
      valid: false,
      message: 'Invitation token is missing.',
    })
  })

  it('acceptInvite posts token and password', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          user: {
            id: 2,
            email: 'invited@example.com',
            date_joined: '2026-01-01T00:00:00Z',
            is_active: true,
          },
          access: 'access-token',
          refresh: 'refresh-token',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await acceptInvite({
      token: 'invite-token',
      password: 'SecurePass123!',
      first_name: 'Invited',
    })

    expect(result.refresh).toBe('refresh-token')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/invitations/accept/',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          token: 'invite-token',
          password: 'SecurePass123!',
          first_name: 'Invited',
        }),
      }),
    )
  })
})
