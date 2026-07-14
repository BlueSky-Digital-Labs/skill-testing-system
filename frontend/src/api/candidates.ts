import {
  ApiError,
  extractErrorMessage,
  extractFieldErrors,
  getApiBase,
  postJson,
} from './client'

export interface CandidateUser {
  id: number
  email: string
  date_joined: string
  is_active: boolean
}

export interface AuthSessionResponse {
  user: CandidateUser
  access: string
  refresh: string
}

export interface SelfRegisterPayload {
  email: string
  password: string
  password_confirm: string
  first_name?: string
  last_name?: string
}

export interface AcceptInvitePayload {
  token: string
  password: string
  first_name?: string
  last_name?: string
}

export interface InviteTokenValidation {
  valid: boolean
  message?: string
}

export async function selfRegister(
  payload: SelfRegisterPayload,
): Promise<AuthSessionResponse> {
  return postJson<AuthSessionResponse>(
    '/auth/self-register/',
    payload,
    'Unable to complete registration.',
  )
}

/**
 * Probes invitation validity by submitting a deliberately weak password.
 * A token error means the invite is invalid; a password error means the token is valid.
 */
export async function validateInviteToken(token: string): Promise<InviteTokenValidation> {
  if (!token.trim()) {
    return { valid: false, message: 'Invitation token is missing.' }
  }

  const response = await fetch(`${getApiBase()}/auth/invitations/accept/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password: 'x' }),
  })

  if (response.ok) {
    return { valid: true }
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    return { valid: false, message: 'Unable to validate invitation.' }
  }

  const fieldErrors = extractFieldErrors(payload)
  if (fieldErrors.token) {
    return { valid: false, message: fieldErrors.token }
  }

  if (fieldErrors.password) {
    return { valid: true }
  }

  return {
    valid: false,
    message: extractErrorMessage(payload, 'Invalid or expired invitation.'),
  }
}

export async function acceptInvite(
  payload: AcceptInvitePayload,
): Promise<AuthSessionResponse> {
  return postJson<AuthSessionResponse>(
    '/auth/invitations/accept/',
    payload,
    'Unable to accept invitation.',
  )
}

export { ApiError }
