import { describe, expect, it } from 'vitest'

describe('api module graph', () => {
  it('loads auth, client, and http without circular initialization errors', async () => {
    await expect(import('./auth')).resolves.toBeDefined()
    await expect(import('./client')).resolves.toBeDefined()
    await expect(import('./http')).resolves.toBeDefined()
  })
})
