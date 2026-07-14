import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { selfRegister, ApiError } from '@/api/candidates'
import { setTokens } from '@/api/authStorage'
import { AppDispatch } from '@store/index'
import { setSession } from '@store/slices/authSlice'
import { Button } from '@components/atoms/Button'
import { TextInput } from '@components/Form/TextInput'
import { PasswordInput } from '@components/Form/PasswordInput'
import { useToast } from '@components/Toast'
import '@pages/auth/AuthPages.css'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface FieldErrors {
  email?: string
  password?: string
  password_confirm?: string
  first_name?: string
  last_name?: string
}

const SelfRegister = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch<AppDispatch>()
  const { showToast } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const validate = () => {
    const nextErrors: FieldErrors = {}

    if (!email.trim()) {
      nextErrors.email = 'Email is required.'
    } else if (!emailPattern.test(email.trim())) {
      nextErrors.email = 'Enter a valid email address.'
    }

    if (!password) {
      nextErrors.password = 'Password is required.'
    } else if (password.length < 8) {
      nextErrors.password = 'Password must be at least 8 characters.'
    }

    if (!passwordConfirm) {
      nextErrors.password_confirm = 'Please confirm your password.'
    } else if (password !== passwordConfirm) {
      nextErrors.password_confirm = 'Passwords do not match.'
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
      const session = await selfRegister({
        email: email.trim(),
        password,
        password_confirm: passwordConfirm,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      })
      setTokens(session.access, session.refresh)
      dispatch(setSession({ access: session.access }))
      showToast('Registration successful. Welcome!', 'success')
      navigate('/dashboard', { replace: true })
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors) {
        setFieldErrors((current) => ({ ...current, ...error.fieldErrors }))
      }
      const message = error instanceof ApiError
        ? error.message
        : 'Unable to complete registration.'
      setSubmitError(message)
      showToast(message, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1>Create your account</h1>
          <p>Register as a candidate to access exams and assignments.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div aria-live="polite">
            {submitError && (
              <div className="auth-error" role="alert">
                {submitError}
              </div>
            )}
          </div>

          <div className="form-row">
            <TextInput
              label="First name"
              name="first_name"
              autoComplete="given-name"
              value={firstName}
              onChange={(event) => {
                setFirstName(event.target.value)
                if (fieldErrors.first_name) {
                  setFieldErrors((current) => ({ ...current, first_name: undefined }))
                }
              }}
              error={fieldErrors.first_name}
              fullWidth
            />
            <TextInput
              label="Last name"
              name="last_name"
              autoComplete="family-name"
              value={lastName}
              onChange={(event) => {
                setLastName(event.target.value)
                if (fieldErrors.last_name) {
                  setFieldErrors((current) => ({ ...current, last_name: undefined }))
                }
              }}
              error={fieldErrors.last_name}
              fullWidth
            />
          </div>

          <TextInput
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

          <PasswordInput
            label="Password"
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

          <PasswordInput
            label="Confirm password"
            name="password_confirm"
            autoComplete="new-password"
            value={passwordConfirm}
            onChange={(event) => {
              setPasswordConfirm(event.target.value)
              if (fieldErrors.password_confirm) {
                setFieldErrors((current) => ({
                  ...current,
                  password_confirm: undefined,
                }))
              }
            }}
            error={fieldErrors.password_confirm}
            fullWidth
            required
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isLoading}
            disabled={isLoading}
          >
            Create account
          </Button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account?{' '}
            <Link to="/auth/sign-in" className="auth-link">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default SelfRegister
