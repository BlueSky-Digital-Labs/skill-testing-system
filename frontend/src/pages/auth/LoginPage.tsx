import { useState, FormEvent, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { RootState, AppDispatch } from '@store/index'
import { loginUser, clearError } from '@store/slices/authSlice'
import { Button } from '@components/atoms/Button'
import { Input } from '@components/atoms/Input'
import { Logo } from '@components/atoms/Logo'
import { useAuthContent } from '@hooks/useContent'
import { Eye, EyeOff } from 'lucide-react'
import './LoginPage.css'

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  })
  const [showPassword, setShowPassword] = useState(false)

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
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    if (error) {
      dispatch(clearError())
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    try {
      const result = await dispatch(loginUser({
        email: formData.email,
        password: formData.password
      }))
      
      if (result.type === 'auth/login/fulfilled') {
        // Force navigation after successful login
        setTimeout(() => {
          navigate('/dashboard', { replace: true })
        }, 100)
      }
    } catch (error) {
      console.error('Login error:', error)
    }
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-left">
          <div className="login-form-wrapper">
            <div className="login-header">
              <h1>{authContent.login.title}</h1>
              <p>{authContent.login.subtitle}</p>
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
                  placeholder={authContent.login.emailPlaceholder}
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
                    placeholder={authContent.login.passwordPlaceholder}
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

              <div className="form-options">
                <label className="remember-me">
                  <input
                    type="checkbox"
                    name="rememberMe"
                    checked={formData.rememberMe}
                    onChange={handleChange}
                  />
                  <span>{authContent.login.rememberMe}</span>
                </label>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                isLoading={isLoading}
                className="login-button"
              >
                {authContent.login.loginButton}
              </Button>
            </form>

            <div className="login-footer">
              <p>
                {authContent.login.noAccount}{' '}
                <Link to="/register" className="signup-link">
                  {authContent.login.signUpLink}
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

export default LoginPage
