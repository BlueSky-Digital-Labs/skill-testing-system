import { Routes, Route } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { RootState } from '@store/index'
import { LoginPage, RegisterPage, SignIn, ForgotPassword, ResetPassword } from '@pages/auth'
import { DashboardPage } from '@pages/dashboard'
import { ProtectedRoute } from '@components/organisms/ProtectedRoute'

function App() {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth)

  return (
    <Routes>
      {/* Default route - Login page */}
      <Route path="/" element={<LoginPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* New auth flow */}
      <Route path="/auth/sign-in" element={<SignIn />} />
      <Route path="/auth/forgot" element={<ForgotPassword />} />
      <Route path="/auth/reset" element={<ResetPassword />} />
      
      {/* Dashboard routes (has its own layout) */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App
