import { useState, FormEvent, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { RootState, AppDispatch } from '@store/index'
import { registerUser, clearError } from '@store/slices/authSlice'
import { Button } from '@components/atoms/Button'
import { Input } from '@components/atoms/Input'
import { Logo } from '@components/atoms/Logo'
import { useAuthContent } from '@hooks/useContent'
import { Eye, EyeOff } from 'lucide-react'
import './LoginPage.css'

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    password_confirm: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { isLoading, error, isAuthenticated } = useSelector((state: RootState) => state.auth)
  const authContent = useAuthContent()

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true })
    }
  }, [isAuthenticated, navigate])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    if (error) {
      dispatch(clearError())
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    
    // Client-side password confirmation check
    if (formData.password !== formData.password_confirm) {
      dispatch(clearError())
      // You might want to set a local error state here
      return
    }
    
    try {
      const result = await dispatch(registerUser(formData))
      if (result.type === 'auth/register/fulfilled') {
        // Force navigation after successful registration
        setTimeout(() => {
          navigate('/dashboard', { replace: true })
        }, 100)
      }
    } catch (error) {
      console.error('Registration error:', error)
    }
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-left">
          <div className="login-form-wrapper">
            <div className="login-header">
              <h1>{authContent.register.title}</h1>
              <p>{authContent.register.subtitle}</p>
            </div>

            <form onSubmit={handleSubmit} className="login-form">
              {error && (
                <div className="login-error">
                  {error}
                </div>
              )}

              <div className="form-group">
                <Input
                  type="email"
                  name="email"
                  placeholder={authContent.register.emailPlaceholder}
                  value={formData.email}
                  onChange={handleChange}
                  required
                  fullWidth
                />
              </div>

              <div className="form-group">
                <div className="password-input-wrapper">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder={authContent.register.passwordPlaceholder}
                    value={formData.password}
                    onChange={handleChange}
                    required
                    fullWidth
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <div className="password-input-wrapper">
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="password_confirm"
                    placeholder={authContent.register.confirmPasswordPlaceholder}
                    value={formData.password_confirm}
                    onChange={handleChange}
                    required
                    fullWidth
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                isLoading={isLoading}
                className="login-button"
              >
                {authContent.register.registerButton}
              </Button>
            </form>

            <div className="login-footer">
              <p>
                {authContent.register.hasAccount}{' '}
                <Link to="/login" className="signup-link">
                  {authContent.register.signInLink}
                </Link>
              </p>
            </div>
          </div>
        </div>

        <div className="login-right">
                        <div className="brand-section">
                <Logo size="2xl" className="logo--light" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage
