import { getAccessToken } from './authStorage'

export class ApiError extends Error {
  status: number
  fieldErrors?: Record<string, string>

  constructor(
    message: string,
    status: number,
    fieldErrors?: Record<string, string>,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

export function getApiBase(): string {
  const configuredBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '')
  return configuredBase ? `${configuredBase}/api` : '/api'
}

export function extractErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') {
    return fallback
  }

  const data = payload as Record<string, unknown>

  if (typeof data.detail === 'string') {
    return data.detail
  }

  if (Array.isArray(data.non_field_errors) && typeof data.non_field_errors[0] === 'string') {
    return data.non_field_errors[0]
  }

  const firstFieldError = Object.values(data).find(
    (value) => Array.isArray(value) && typeof value[0] === 'string',
  ) as string[] | undefined

  if (firstFieldError?.[0]) {
    return firstFieldError[0]
  }

  return fallback
}

export function extractFieldErrors(payload: unknown): Record<string, string> {
  if (!payload || typeof payload !== 'object') {
    return {}
  }

  const errors: Record<string, string> = {}
  for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
    if (Array.isArray(value) && typeof value[0] === 'string') {
      errors[key] = value[0]
    }
  }
  return errors
}

export async function parseResponse<T>(
  response: Response,
  fallbackMessage: string,
): Promise<T> {
  if (response.ok) {
    if (response.status === 204) {
      return undefined as T
    }

    const text = await response.text()
    if (!text) {
      return undefined as T
    }

    return JSON.parse(text) as T
  }

  let message = fallbackMessage
  let fieldErrors: Record<string, string> | undefined

  try {
    const payload = await response.json()
    message = extractErrorMessage(payload, fallbackMessage)
    fieldErrors = extractFieldErrors(payload)
  } catch {
    // Keep fallback when the error body is not JSON.
  }

  throw new ApiError(message, response.status, fieldErrors)
}

export async function apiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const accessToken = getAccessToken()
  const headers = new Headers(init.headers)

  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json')
  }

  if (accessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }

  return fetch(`${getApiBase()}${path}`, {
    ...init,
    headers,
  })
}

export async function postJson<T>(
  path: string,
  body: unknown,
  fallbackMessage: string,
): Promise<T> {
  const response = await apiFetch(path, {
    method: 'POST',
    body: JSON.stringify(body),
  })

  return parseResponse<T>(response, fallbackMessage)
}
