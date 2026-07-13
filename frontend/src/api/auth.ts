export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

function getApiBase(): string {
  const configuredBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '')
  return configuredBase ? `${configuredBase}/api` : '/api'
}

function extractErrorMessage(payload: unknown, fallback: string): string {
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

async function parseResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
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

  try {
    const payload = await response.json()
    message = extractErrorMessage(payload, fallbackMessage)
  } catch {
    // Keep fallback when the error body is not JSON.
  }

  throw new ApiError(message, response.status)
}

async function postJson<T>(path: string, body: unknown, fallbackMessage: string): Promise<T> {
  const response = await fetch(`${getApiBase()}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  return parseResponse<T>(response, fallbackMessage)
}

export async function signIn(
  email: string,
  password: string,
): Promise<{ access: string; refresh: string }> {
  return postJson('/auth/token/', { email, password }, 'Invalid credentials')
}

export async function refreshToken(refresh: string): Promise<{ access: string }> {
  return postJson('/auth/token/refresh/', { refresh }, 'Unable to refresh session')
}

export async function forgotPassword(email: string): Promise<void> {
  await postJson('/auth/password/forgot/', { email }, 'Unable to process password reset request')
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await postJson(
    '/auth/password/reset/',
    { token, new_password: newPassword },
    'Unable to reset password',
  )
}

export { getApiBase }
