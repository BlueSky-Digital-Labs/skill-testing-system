import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { signIn, ApiError } from '@/api/auth'
import { setTokens } from '@/api/authStorage'
import { AppDispatch } from '@store/index'
import { setSession } from '@store/slices/authSlice'
import { Button } from '@components/atoms/Button'
import { Input } from '@components/atoms/Input'
import './AuthPages.css'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const SignIn = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch<AppDispatch>()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const validate = () => {
    const nextErrors: { email?: string; password?: string } = {}

    if (!email.trim()) {
      nextErrors.email = 'Email is required.'
    } else if (!emailPattern.test(email)) {
      nextErrors.email = 'Enter a valid email address.'
    }

    if (!password) {
      nextErrors.password = 'Password is required.'
    }

    setFieldErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitError(null)

    if (!validate()) {
      return
    }

    setIsLoading(true)

    try {
      const tokens = await signIn(email.trim(), password)
      setTokens(tokens.access, tokens.refresh)
      dispatch(setSession({ access: tokens.access }))
      navigate('/dashboard', { replace: true })
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Unable to sign in.'
      setSubmitError(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1>Sign in</h1>
          <p>Access your account with your email and password.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div aria-live="polite">
            {submitError && <div className="auth-error" role="alert">{submitError}</div>}
          </div>

          <Input
            label="Email"
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
              if (fieldErrors.email) {
                setFieldErrors((current) => ({ ...current, email: undefined }))
              }
            }}
            error={fieldErrors.email}
            fullWidth
            required
          />

          <Input
            label="Password"
            type="password"
            name="password"
            autoComplete="current-password"
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

          <Button type="submit" variant="primary" size="lg" fullWidth isLoading={isLoading}>
            Sign in
          </Button>
        </form>

        <div className="auth-footer">
          <p>
            <Link to="/auth/forgot" className="auth-link">
              Forgot your password?
            </Link>
          </p>
          <p>
            Need an account?{' '}
            <Link to="/register" className="auth-link">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default SignIn
