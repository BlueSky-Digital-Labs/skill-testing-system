import { ApiError, getApiBase, postJson } from './client'

export { ApiError, getApiBase }

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
