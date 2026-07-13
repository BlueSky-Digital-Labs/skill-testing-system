import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  cacheBrandingSettings,
  getBranding,
  isValidHexColor,
  loadCachedBrandingSettings,
  updateBranding,
  validateLogoFile,
  BRANDING_CACHE_KEY,
} from './branding'
import { clearTokens, setTokens } from './authStorage'

const sampleSettings = {
  id: '123',
  logo: null,
  primary_color: '#0A5FFF',
  secondary_color: '#111827',
  email_header_html: '',
  email_footer_html: '',
  updated_at: '2026-07-13T00:00:00.000Z',
}

describe('branding API client', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    clearTokens()
    localStorage.removeItem(BRANDING_CACHE_KEY)
  })

  it('getBranding fetches settings with auth header', async () => {
    setTokens('access-token', 'refresh-token')
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(sampleSettings), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await getBranding({ redirectOnForbidden: false })

    expect(result).toEqual(sampleSettings)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/settings',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token',
        }),
      }),
    )
    expect(loadCachedBrandingSettings()).toEqual(sampleSettings)
  })

  it('updateBranding posts JSON updates', async () => {
    setTokens('access-token', 'refresh-token')
    const updated = { ...sampleSettings, primary_color: '#FF0000' }
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(updated), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await updateBranding(
      { primary_color: '#FF0000' },
      { redirectOnForbidden: false },
    )

    expect(result.primary_color).toBe('#FF0000')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/settings/update',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer access-token',
        }),
        body: JSON.stringify({ primary_color: '#FF0000' }),
      }),
    )
  })

  it('updateBranding posts multipart form data for logo uploads', async () => {
    setTokens('access-token', 'refresh-token')
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ...sampleSettings, logo: 'http://example.com/logo.png' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const formData = new FormData()
    formData.append('logo', new File(['logo'], 'logo.png', { type: 'image/png' }))

    await updateBranding(formData, { redirectOnForbidden: false })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/settings/update',
      expect.objectContaining({
        method: 'POST',
        body: formData,
      }),
    )
  })

  it('redirects on forbidden responses when configured', async () => {
    const assignMock = vi.fn()
    vi.stubGlobal('location', { assign: assignMock })
    setTokens('access-token', 'refresh-token')

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(getBranding({ redirectOnForbidden: true })).rejects.toMatchObject({
      status: 403,
    })
    expect(assignMock).toHaveBeenCalledWith('/dashboard?access=denied')
  })

  it('caches branding settings in localStorage', () => {
    cacheBrandingSettings(sampleSettings)
    expect(loadCachedBrandingSettings()).toEqual(sampleSettings)
  })
})

describe('branding validation helpers', () => {
  it('validates hex colors', () => {
    expect(isValidHexColor('#0A5FFF')).toBe(true)
    expect(isValidHexColor('red')).toBe(false)
  })

  it('rejects logo files larger than 2MB', () => {
    const largeFile = new File([new ArrayBuffer(2 * 1024 * 1024 + 1)], 'logo.png', {
      type: 'image/png',
    })
    expect(validateLogoFile(largeFile)).toBe('Logo file must be 2MB or smaller.')
  })
})
