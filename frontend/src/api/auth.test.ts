import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  forgotPassword,
  refreshToken,
  resetPassword,
  signIn,
} from './auth'
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from './authStorage'

describe('auth API client', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    clearTokens()
  })

  it('signIn posts credentials and returns tokens', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ access: 'access-token', refresh: 'refresh-token' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await signIn('user@example.com', 'password123')

    expect(result).toEqual({ access: 'access-token', refresh: 'refresh-token' })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/token/',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'user@example.com', password: 'password123' }),
      }),
    )
  })

  it('refreshToken posts the refresh token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ access: 'new-access-token' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await refreshToken('refresh-token')

    expect(result).toEqual({ access: 'new-access-token' })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/token/refresh/',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ refresh: 'refresh-token' }),
      }),
    )
  })

  it('forgotPassword handles a successful empty response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(forgotPassword('user@example.com')).resolves.toBeUndefined()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/password/forgot/',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'user@example.com' }),
      }),
    )
  })

  it('resetPassword handles a 204 response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(resetPassword('reset-token', 'NewSecurePass123!')).resolves.toBeUndefined()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/password/reset/',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ token: 'reset-token', new_password: 'NewSecurePass123!' }),
      }),
    )
  })

  it('throws ApiError for non-2xx responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Invalid credentials' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(signIn('user@example.com', 'wrong')).rejects.toMatchObject({
      message: 'Invalid credentials',
      status: 400,
    })
  })
})

describe('authStorage', () => {
  afterEach(() => {
    clearTokens()
  })

  it('stores and reads access and refresh tokens', () => {
    setTokens('access-token', 'refresh-token')

    expect(getAccessToken()).toBe('access-token')
    expect(getRefreshToken()).toBe('refresh-token')
    expect(localStorage.getItem('token')).toBe('access-token')
  })

  it('clears stored tokens', () => {
    setTokens('access-token', 'refresh-token')
    clearTokens()

    expect(getAccessToken()).toBeNull()
    expect(getRefreshToken()).toBeNull()
    expect(localStorage.getItem('token')).toBeNull()
  })
})
