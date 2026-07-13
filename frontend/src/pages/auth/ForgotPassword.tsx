import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { forgotPassword, ApiError } from '@/api/auth'
import { Button } from '@components/atoms/Button'
import { Input } from '@components/atoms/Input'
import './AuthPages.css'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const ForgotPassword = () => {
  const [email, setEmail] = useState('')
  const [fieldError, setFieldError] = useState<string | undefined>()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitError(null)
    setSuccessMessage(null)

    if (!email.trim()) {
      setFieldError('Email is required.')
      return
    }

    if (!emailPattern.test(email)) {
      setFieldError('Enter a valid email address.')
      return
    }

    setFieldError(undefined)
    setIsLoading(true)

    try {
      await forgotPassword(email.trim())
      setSuccessMessage(
        'If the email exists in our system, you will receive password reset instructions shortly.',
      )
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : 'Unable to process your request.'
      setSubmitError(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1>Forgot password</h1>
          <p>Enter your email and we will send reset instructions if an account exists.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div aria-live="polite">
            {submitError && <div className="auth-error" role="alert">{submitError}</div>}
            {successMessage && <div className="auth-success" role="status">{successMessage}</div>}
          </div>

          <Input
            label="Email"
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
              if (fieldError) {
                setFieldError(undefined)
              }
            }}
            error={fieldError}
            fullWidth
            required
          />

          <Button type="submit" variant="primary" size="lg" fullWidth isLoading={isLoading}>
            Send reset link
          </Button>
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

export default ForgotPassword
