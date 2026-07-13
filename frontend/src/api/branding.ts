import { ApiError } from './auth'
import { getApiBase } from './auth'
import { authorizedFetch } from './http'

export interface BrandingSettings {
  id: string
  logo: string | null
  primary_color: string
  secondary_color: string
  email_header_html: string
  email_footer_html: string
  updated_at: string
}

export const BRANDING_CACHE_KEY = 'org_branding_settings'
export const DEFAULT_PRIMARY_COLOR = '#0A5FFF'
export const DEFAULT_SECONDARY_COLOR = '#111827'
const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024

type BrandingRequestOptions = {
  redirectOnForbidden?: boolean
}

function extractErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') {
    return fallback
  }

  const data = payload as Record<string, unknown>

  if (typeof data.detail === 'string') {
    return data.detail
  }

  const firstFieldError = Object.values(data).find(
    (value) => Array.isArray(value) && typeof value[0] === 'string',
  ) as string[] | undefined

  if (firstFieldError?.[0]) {
    return firstFieldError[0]
  }

  return fallback
}

async function parseBrandingResponse(
  response: Response,
  fallbackMessage: string,
  options?: BrandingRequestOptions,
): Promise<BrandingSettings> {
  if (response.status === 403 && options?.redirectOnForbidden) {
    redirectToAccessDenied()
  }

  if (response.ok) {
    return response.json() as Promise<BrandingSettings>
  }

  let message = fallbackMessage

  try {
    const payload = await response.json()
    message = extractErrorMessage(payload, fallbackMessage)
  } catch {
    // Keep fallback when the error body is not JSON.
  }

  throw new ApiError(message, response.status)
}

export function redirectToAccessDenied(): void {
  if (typeof window !== 'undefined') {
    window.location.assign('/dashboard?access=denied')
  }
}

export function cacheBrandingSettings(settings: BrandingSettings): void {
  localStorage.setItem(BRANDING_CACHE_KEY, JSON.stringify(settings))
}

export function loadCachedBrandingSettings(): BrandingSettings | null {
  const raw = localStorage.getItem(BRANDING_CACHE_KEY)
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as BrandingSettings
  } catch {
    return null
  }
}

export function isValidHexColor(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value)
}

export function validateLogoFile(file: File): string | null {
  if (file.size > MAX_LOGO_SIZE_BYTES) {
    return 'Logo file must be 2MB or smaller.'
  }

  if (!file.type.startsWith('image/')) {
    return 'Logo must be an image file.'
  }

  return null
}

export async function getBranding(
  options: BrandingRequestOptions = {},
): Promise<BrandingSettings> {
  const response = await authorizedFetch(`${getApiBase()}/admin/settings`)
  const settings = await parseBrandingResponse(
    response,
    'Unable to load branding settings',
    options,
  )
  cacheBrandingSettings(settings)
  return settings
}

export async function updateBranding(
  payload: FormData | Record<string, unknown>,
  options: BrandingRequestOptions = { redirectOnForbidden: true },
): Promise<BrandingSettings> {
  const isFormData = payload instanceof FormData

  const response = await authorizedFetch(`${getApiBase()}/admin/settings/update`, {
    method: 'POST',
    headers: isFormData ? undefined : { 'Content-Type': 'application/json' },
    body: isFormData ? payload : JSON.stringify(payload),
  })

  const settings = await parseBrandingResponse(
    response,
    'Unable to update branding settings',
    options,
  )
  cacheBrandingSettings(settings)
  return settings
}
