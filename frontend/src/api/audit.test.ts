import { afterEach, describe, expect, it, vi } from 'vitest'
import { getAuditLogs, verifyAuditChain } from './audit'
import { clearTokens, setTokens } from './authStorage'

const sampleLog = {
  id: 1,
  timestamp: '2026-07-14T00:00:00.000Z',
  actor_id: 'admin-1',
  actor_display: 'Admin User',
  action: 'CREATE',
  entity_type: 'user',
  entity_id: '42',
  metadata: { field: 'email' },
  prev_hash: '',
  hash: 'abc123',
}

describe('audit API client', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    clearTokens()
  })

  it('getAuditLogs fetches logs with query params and auth header', async () => {
    setTokens('access-token', 'refresh-token')
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          count: 1,
          page: 1,
          page_size: 20,
          results: [sampleLog],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await getAuditLogs({
      actor: 'admin-1',
      action: 'CREATE',
      entity_type: 'user',
      entity_id: '42',
      from: '2026-07-01T00:00:00.000Z',
      to: '2026-07-14T00:00:00.000Z',
      page: 2,
      page_size: 10,
    })

    expect(result.results).toHaveLength(1)
    expect(result.results[0]).toEqual(sampleLog)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/audit/logs/?actor=admin-1&action=CREATE&entity_type=user&entity_id=42&from=2026-07-01T00%3A00%3A00.000Z&to=2026-07-14T00%3A00%3A00.000Z&page=2&page_size=10',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token',
        }),
      }),
    )
  })

  it('verifyAuditChain fetches verification result', async () => {
    setTokens('access-token', 'refresh-token')
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          valid: true,
          total_entries: 3,
          broken_at_id: null,
          message: 'Audit log hash chain is valid.',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await verifyAuditChain()

    expect(result.valid).toBe(true)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/audit/verify/',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token',
        }),
      }),
    )
  })

  it('throws ApiError on forbidden responses', async () => {
    setTokens('access-token', 'refresh-token')
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(getAuditLogs()).rejects.toMatchObject({
      status: 403,
      message: 'Forbidden',
    })
  })
})
