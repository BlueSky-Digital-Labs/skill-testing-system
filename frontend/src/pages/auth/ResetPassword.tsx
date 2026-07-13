import { FormEvent, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { resetPassword, ApiError } from '@/api/auth'
import { Button } from '@components/atoms/Button'
import { Input } from '@components/atoms/Input'
import './AuthPages.css'

const ResetPassword = () => {
  const [searchParams] = useSearchParams()
  const token = useMemo(() => searchParams.get('token') ?? '', [searchParams])
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{
    password?: string
    confirmPassword?: string
    token?: string
  }>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const validate = () => {
    const nextErrors: { password?: string; confirmPassword?: string; token?: string } = {}

    if (!token) {
      nextErrors.token = 'Reset token is missing. Use the link from your email.'
    }

    if (!password) {
      nextErrors.password = 'New password is required.'
    } else if (password.length < 8) {
      nextErrors.password = 'Password must be at least 8 characters.'
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = 'Please confirm your new password.'
    } else if (password !== confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match.'
    }

    setFieldErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitError(null)
    setSuccessMessage(null)

    if (!validate()) {
      return
    }

    setIsLoading(true)

    try {
      await resetPassword(token, password)
      setSuccessMessage('Your password has been reset successfully.')
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Unable to reset password.'
      setSubmitError(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1>Reset password</h1>
          <p>Choose a new password for your account.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div aria-live="polite">
            {fieldErrors.token && <div className="auth-error" role="alert">{fieldErrors.token}</div>}
            {submitError && <div className="auth-error" role="alert">{submitError}</div>}
            {successMessage && (
              <div className="auth-success" role="status">
                {successMessage}{' '}
                <Link to="/auth/sign-in" className="auth-link">
                  Return to sign in
                </Link>
              </div>
            )}
          </div>

          {!successMessage && (
            <>
              <Input
                label="New password"
                type="password"
                name="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value)
                  if (fieldErrors.password) {
                    setFieldErrors((current) => ({ ...current, password: undefined }))
                  }
                }}
                error={fieldErrors.password}
                fullWidth
                required
              />

              <Input
                label="Confirm new password"
                type="password"
                name="confirmPassword"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value)
                  if (fieldErrors.confirmPassword) {
                    setFieldErrors((current) => ({ ...current, confirmPassword: undefined }))
                  }
                }}
                error={fieldErrors.confirmPassword}
                fullWidth
                required
              />

              <Button type="submit" variant="primary" size="lg" fullWidth isLoading={isLoading}>
                Reset password
              </Button>
            </>
          )}
        </form>

        <div className="auth-footer">
          <p>
            <Link to="/auth/sign-in" className="auth-link">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default ResetPassword
