import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getTests, createTest, updateTest } from './tests'
import { apiFetch, postJson } from './client'

vi.mock('./client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./client')>()
  return {
    ...actual,
    apiFetch: vi.fn(),
    postJson: vi.fn(),
  }
})

describe('tests api', () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset()
    vi.mocked(postJson).mockReset()
  })

  it('loads tests from the list endpoint', async () => {
    const payload = [{ id: 'test-1', title: 'Quiz' }]
    vi.mocked(apiFetch).mockResolvedValue(
      new Response(JSON.stringify(payload), { status: 200 }),
    )

    const result = await getTests({ lifecycle: 'draft' })

    expect(apiFetch).toHaveBeenCalledWith('/tests/?lifecycle=draft')
    expect(result).toEqual(payload)
  })

  it('creates a test', async () => {
    const payload = { title: 'New test' }
    vi.mocked(postJson).mockResolvedValue({ id: 'test-2', title: 'New test' })

    const result = await createTest(payload)

    expect(postJson).toHaveBeenCalledWith('/tests/', payload, 'Unable to create test.')
    expect(result.title).toBe('New test')
  })

  it('updates a test', async () => {
    const payload = { title: 'Updated' }
    vi.mocked(apiFetch).mockResolvedValue(
      new Response(JSON.stringify({ id: 'test-1', title: 'Updated' }), {
        status: 200,
      }),
    )

    const result = await updateTest('test-1', payload)

    expect(apiFetch).toHaveBeenCalledWith('/tests/test-1/', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
    expect(result.title).toBe('Updated')
  })
})
