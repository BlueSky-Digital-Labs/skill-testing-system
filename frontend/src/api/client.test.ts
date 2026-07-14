import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, postJson } from './client'

describe('api client', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('postJson throws ApiError with field errors for validation failures', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ email: ['This field is required.'] }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(postJson('/auth/self-register/', {}, 'Request failed')).rejects.toMatchObject({
      message: 'This field is required.',
      status: 400,
      fieldErrors: { email: 'This field is required.' },
    })
  })

  it('ApiError preserves status and message', () => {
    const error = new ApiError('Forbidden', 403)

    expect(error).toBeInstanceOf(Error)
    expect(error.message).toBe('Forbidden')
    expect(error.status).toBe(403)
  })
})
